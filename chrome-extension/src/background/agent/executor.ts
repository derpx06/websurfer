import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { type ActionResult, AgentContext, type AgentOptions, type AgentOutput } from './types';
import { t } from '@extension/i18n';
import { NavigatorAgent, NavigatorActionRegistry } from './agents/navigator';
import { PlannerAgent, type PlannerOutput } from './agents/planner';
import { NavigatorPrompt } from './prompts/navigator';
import { PlannerPrompt } from './prompts/planner';
import { createLogger } from '@src/background/log';
import MessageManager from './messages/service';
import type BrowserContext from '../browser/context';
import { ActionBuilder } from './actions/builder';
import { EventManager } from './event/manager';
import { Actors, type EventCallback, EventType, ExecutionState } from './event/types';
import {
  ChatModelAuthError,
  ChatModelBadRequestError,
  ChatModelForbiddenError,
  ChatModelRateLimitError,
  ExtensionConflictError,
  RequestCancelledError,
  MaxStepsReachedError,
  MaxFailuresReachedError,
  ChatModelPaymentRequiredError,
} from './agents/errors';
import { URLNotAllowedError } from '../browser/views';
import { chatHistoryStore } from '@extension/storage/lib/chat';
import type { AgentStepHistory } from './history';
import type { GeneralSettingsConfig } from '@extension/storage';
import { analytics } from '../services/analytics';
import { PlanningStrategy } from './strategies/planner';
import { NavigationStrategy } from './strategies/navigator';
import { safeGetTabUrl } from '../browser/util';
import { CheckpointManager } from './checkpoint';
import { LoopDetector } from './loopDetector';
import { ReplayManager } from './replay';

const logger = createLogger('Executor');

export interface ExecutorExtraArgs {
  plannerLLM?: BaseChatModel;
  extractorLLM?: BaseChatModel;
  agentOptions?: Partial<AgentOptions>;
  generalSettings?: GeneralSettingsConfig;
}

/**
 * The Executor class is the central orchestration engine of the WebSurfer agent.
 * It manages the lifecycle of a task by coordinating between a Planner agent (high-level strategy)
 * and a Navigator agent (low-level browser actions).
 * 
 * The execution loop generally follows four phases per step:
 * 1. Planning: Determining the next optimal sub-task.
 * 2. Execution: Translating sub-tasks into concrete browser interactions.
 * 3. Monitoring: Detecting loops and verifying progress.
 * 4. Checkpointing: Persisting state for task resumption.
 */
export class Executor {
  private readonly navigator: NavigatorAgent;
  private readonly planner: PlannerAgent;
  private readonly context: AgentContext;
  private readonly plannerPrompt: PlannerPrompt;
  private readonly navigatorPrompt: NavigatorPrompt;
  private readonly generalSettings: GeneralSettingsConfig | undefined;
  private readonly planningStrategy: PlanningStrategy;
  private readonly navigationStrategy: NavigationStrategy;
  private readonly checkpointManager: CheckpointManager;
  private readonly replayManager: ReplayManager;
  private tasks: string[] = [];

  /**
   * Initializes a new Executor instance with the necessary agents and strategies.
   * 
   * @param task The initial high-level user request.
   * @param taskId Unique identifier for the current session.
   * @param browserContext The Playwright-based browser interface.
   * @param navigatorLLM The chat model used for navigation decisions.
   * @param extraArgs Optional configuration for specialized LLMs and settings.
   */
  constructor(
    task: string,
    taskId: string,
    browserContext: BrowserContext,
    navigatorLLM: BaseChatModel,
    extraArgs?: Partial<ExecutorExtraArgs>,
  ) {
    const messageManager = new MessageManager();

    // Allow specialized LLMs for different roles, falling back to the primary navigator LLM
    const plannerLLM = extraArgs?.plannerLLM ?? navigatorLLM;
    const extractorLLM = extraArgs?.extractorLLM ?? navigatorLLM;

    const eventManager = new EventManager();
    const context = new AgentContext(
      taskId,
      browserContext,
      messageManager,
      eventManager,
      extraArgs?.agentOptions ?? {},
    );

    this.generalSettings = extraArgs?.generalSettings;
    this.tasks.push(task);

    // Prompts define the behavior and constraints for each agent type
    this.navigatorPrompt = new NavigatorPrompt(context.options.maxActionsPerStep);
    this.plannerPrompt = new PlannerPrompt();

    // Registry manages the set of available tool-calling actions
    const actionBuilder = new ActionBuilder(context, extractorLLM);
    const navigatorActionRegistry = new NavigatorActionRegistry(actionBuilder.buildDefaultActions());

    // Initialize specialized agents
    this.navigator = new NavigatorAgent(navigatorActionRegistry, {
      chatLLM: navigatorLLM,
      context: context,
      prompt: this.navigatorPrompt,
    });

    this.planner = new PlannerAgent({
      chatLLM: plannerLLM,
      context: context,
      prompt: this.plannerPrompt,
    });

    // Strategy wrappers encapsulate the execution logic for each agent role
    this.planningStrategy = new PlanningStrategy(this.planner);
    this.navigationStrategy = new NavigationStrategy(this.navigator);

    // Auxiliary managers handle persistence, monitoring, and debugging
    this.checkpointManager = new CheckpointManager(context, this.generalSettings);
    this.replayManager = new ReplayManager(context, this.navigator);

    this.context = context;
    // Initialize message history with the base system prompt and user task
    this.context.messageManager.initTaskMessages(this.navigatorPrompt.getSystemMessage(), task);
  }

  /**
   * Subscribes a listener to execution-related events (e.g., TASK_START, STEP_OK).
   * 
   * @param callback Function to be called when an execution event occurs.
   */
  subscribeExecutionEvents(callback: EventCallback): void {
    this.context.eventManager.subscribe(EventType.EXECUTION, callback);
  }

  /**
   * Unsubscribes all listeners from execution events.
   */
  clearExecutionEvents(): void {
    this.context.eventManager.clearSubscribers(EventType.EXECUTION);
  }

  /**
   * Appends a new sub-task or follow-up instruction to the current execution.
   * This is used when a user provides refinement during a live session.
   * 
   * @param task The follow-up task description.
   */
  addFollowUpTask(task: string): void {
    this.tasks.push(task);
    this.context.messageManager.addNewTask(task);

    // Filter out results that shouldn't be kept in memory to maintain context window efficiency.
    // Only results tagged for memory inclusion are retained.
    this.context.actionResults = this.context.actionResults.filter(result => result.includeInMemory);
  }

  /**
   * Restores critical context state from a checkpoint
   */
  public restoreContext(historyStr: string) {
    this.checkpointManager.restoreContext(historyStr);
  }

  /**
   * Starts the main execution loop for the current task.
   * This method runs until the task is completed, failed, or manually stopped.
   * It orchestrates the flow between planning, navigation, monitoring, and checkpointing.
   */
  async execute(): Promise<void> {
    logger.info(`🚀 Executing task: ${this.tasks[this.tasks.length - 1]}`);

    // Initialize step counter and fetch limits from context options
    const context = this.context;
    context.nSteps = 0;
    const allowedMaxSteps = this.context.options.maxSteps;

    try {
      // Signal task start to the UI and analytics
      this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_START, this.context.taskId);
      void analytics.trackTaskStart(this.context.taskId);

      let step = 0;
      let latestPlanOutput: AgentOutput<PlannerOutput> | null = null;
      let navigatorDone = false;

      // Main Iterative Loop
      for (step = 0; step < allowedMaxSteps; step++) {
        context.stepInfo = {
          stepNumber: context.nSteps,
          maxSteps: context.options.maxSteps,
        };

        // --- Phase 1: Tab Stability Check ---
        // Ensure the browser tab is stable and has a valid URL before proceeding
        const tabId = this.context.browserContext.currentTabId;
        if (tabId) {
          let stableUrl = null;
          for (let retry = 0; retry < 5; retry++) {
            stableUrl = await safeGetTabUrl(tabId);
            if (stableUrl) break;
            logger.info(`Tab ${tabId} URL is undefined (navigating?), retrying in 500ms... (${retry + 1}/5)`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        logger.info(`🔄 Step ${step + 1} / ${allowedMaxSteps}`);

        // Stop check: Handles manual stops, pauses, or failure limits
        if (await this.shouldStop()) {
          break;
        }

        // --- Phase 2: Planning & Strategy ---
        // The Planner is invoked periodically or when a sub-task is marked done
        if (this.planningStrategy && (context.nSteps % context.options.planningInterval === 0 || navigatorDone || context.loopDetected)) {
          navigatorDone = false;

          let wasLoopDetected = false;
          if (context.loopDetected) {
            logger.info('Running planner due to loop detection!');
            wasLoopDetected = true;
          }

          // Add current browser state to memory if needed to provide better context to the model
          if (this.tasks.length > 1 || context.nSteps > 0) {
            await this.navigator.addStateMessageToMemory();
            context.stateMessageAdded = true;
          }

          // Reset loop flag after state message captures it
          if (wasLoopDetected) {
            context.loopDetected = false;
          }

          // Run the planning strategy to get the next optimal sub-task
          latestPlanOutput = await this.planningStrategy.execute(context);

          // If the Planner decides the task is finished, exit the loop
          if (latestPlanOutput?.result?.done) {
            break;
          }

          // Stop if the planner returns a terminal error
          if (latestPlanOutput?.error) {
            throw new Error(latestPlanOutput.error);
          }
        }

        // --- Phase 3: Checkpoint Preparation ---
        // Update rollback URLs for sub-tasks to enable state recovery on failure
        const pendingTasks = context.taskStack.filter(t => t.status !== 'done');
        if (pendingTasks.length > 0) {
          const activeTask = pendingTasks[pendingTasks.length - 1];
          if (!activeTask.rollbackUrl) {
            const browserState = await context.browserContext.getCachedState();
            if (browserState && browserState.url) {
              activeTask.rollbackUrl = browserState.url;
              logger.info(`Set rollbackUrl for current sub-task: ${activeTask.rollbackUrl}`);
            }
          }
        }

        // --- Phase 4: Execution (Navigation) ---
        // The Navigator translates plans into actual browser actions
        let navOutput;
        try {
          navOutput = await this.navigationStrategy.execute(context);
        } catch (error) {
          // Special handling for consecutive failures - attempt to rollback to previous sub-task state
          if (error instanceof MaxFailuresReachedError) {
            const currentPending = context.taskStack.filter(t => t.status !== 'done');
            if (currentPending.length > 0 && currentPending[currentPending.length - 1].rollbackUrl) {
              const activeTask = currentPending[currentPending.length - 1];
              logger.warning(`Max failures reached! Initiating state rollback to ${activeTask.rollbackUrl!}`);
              await context.browserContext.navigateTo(activeTask.rollbackUrl!);

              // Reset failure count and force a planning run next step
              context.consecutiveFailures = 0;
              activeTask.status = 'failed';
              navigatorDone = true;
            } else {
              throw error; // No rollback possible, escalate error
            }
          } else {
            throw error;
          }
        }

        // Check if the current navigation sub-task is marked as done
        navigatorDone = navOutput?.result?.done ?? navigatorDone;

        // --- Phase 5: Monitoring & Persistence ---
        // Check for repetitive loops and save progress
        if (LoopDetector.detect(context)) {
          context.loopDetected = true;
          navigatorDone = true;
          await new Promise(r => setTimeout(r, 2000));
        }

        // Periodic checkpoint 
        await this.checkpointManager.saveCheckpoint(step, this.tasks[0]);

        // Agent Sight: Emit a thumbnail of the current browser state for the UI preview
        await this.captureAndEmitSight();

        if (navigatorDone) {
          logger.info('🔄 Navigator indicates completion - will be validated by next planner run');
        }
      }

      // Determine task completion status
      const isCompleted = latestPlanOutput?.result?.done === true;

      if (isCompleted) {
        // Emit final answer if available, otherwise use task ID
        const finalMessage = this.context.finalAnswer || this.context.taskId;
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_OK, finalMessage);

        // Track task completion
        void analytics.trackTaskComplete(this.context.taskId);
      } else if (step >= allowedMaxSteps) {
        logger.error('❌ Task failed: Max steps reached');
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_FAIL, t('exec_errors_maxStepsReached'));

        // Track task failure with specific error category
        const maxStepsError = new MaxStepsReachedError(t('exec_errors_maxStepsReached'));
        const errorCategory = analytics.categorizeError(maxStepsError);
        void analytics.trackTaskFailed(this.context.taskId, errorCategory);
      } else if (this.context.stopped) {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_CANCEL, t('exec_task_cancel'));

        // Track task cancellation
        void analytics.trackTaskCancelled(this.context.taskId);
      } else {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_PAUSE, t('exec_task_pause'));
        // Note: We don't track pause as it's not a final state
      }
    } catch (error) {
      if (error instanceof RequestCancelledError) {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_CANCEL, t('exec_task_cancel'));

        // Track task cancellation
        void analytics.trackTaskCancelled(this.context.taskId);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_FAIL, t('exec_task_fail', [errorMessage]));

        // Track task failure with detailed error categorization
        const errorCategory = analytics.categorizeError(error instanceof Error ? error : errorMessage);
        void analytics.trackTaskFailed(this.context.taskId, errorCategory);
      }
    } finally {
      if (import.meta.env.DEV) {
        logger.debug('Executor history', JSON.stringify(this.context.history, null, 2));
      }
      // store the history only if replay is enabled
      if (this.generalSettings?.replayHistoricalTasks) {
        const historyString = JSON.stringify(this.context.history);
        logger.info(`Executor history size: ${historyString.length}`);
        await chatHistoryStore.storeAgentStepHistory(this.context.taskId, this.tasks[0], historyString);
      } else {
        logger.info('Replay historical tasks is disabled, skipping history storage');
      }
    }
  }



  /**
   * Internal guard to determine if the execution loop should terminate.
   * It checks for manual stops, handles pause states, and monitors consecutive failure limits.
   * 
   * @returns {Promise<boolean>} True if the loop should break.
   */
  private async shouldStop(): Promise<boolean> {
    // Immediate break if the stop signal was received
    if (this.context.stopped) {
      logger.info('Agent stopped');
      return true;
    }

    // Spin-wait logic for handle pause state
    while (this.context.paused) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (this.context.stopped) {
        return true;
      }
    }

    // Terminate if the agent is stuck in a failure-retry loop exceeding the maximum allowed limit
    if (this.context.consecutiveFailures >= this.context.options.maxFailures) {
      logger.error(`Stopping due to ${this.context.options.maxFailures} consecutive failures`);
      return true;
    }

    return false;
  }

  /**
   * Signals the executor to stop further actions and release resources.
   */
  async cancel(): Promise<void> {
    this.context.stop();
  }

  /**
   * Resumes the executor from a paused state.
   */
  async resume(): Promise<void> {
    this.context.resume();
  }

  /**
   * Resumes execution after incorporating direct human feedback.
   * Direct input is useful when the agent is stuck or lacks specific credentials.
   * 
   * @param input The text provided by the user.
   */
  async resumeWithInput(input: string): Promise<void> {
    const logger = createLogger('Executor:resumeWithInput');
    logger.info(`Injecting human input: ${input}`);

    // Inject human response directly into the scratchpad so subsequent LLM calls see it.
    this.context.scratchpad += `\n[Human Input at Step ${this.context.nSteps}]: ${input}`;

    // Trigger the resume signal.
    await this.resume();
  }

  /**
   * Temporarily suspends the execution loop.
   */
  async pause(): Promise<void> {
    this.context.pause();
  }

  /**
   * Cleans up internal browser resources (Playwright pages/contexts).
   */
  async cleanup(): Promise<void> {
    try {
      await this.context.browserContext.cleanup();
    } catch (error) {
      logger.error(`Failed to cleanup browser context: ${error}`);
    }
  }

  async getCurrentTaskId(): Promise<string> {
    return this.context.taskId;
  }

  /**
   * Replays a saved history of actions with error handling and retry logic.
   *
   * @param history - The history to replay
   * @param maxRetries - Maximum number of retries per action
   * @param skipFailures - Whether to skip failed actions or stop execution
   * @param delayBetweenActions - Delay between actions in seconds
   * @returns List of action results
   */
  async replayHistory(
    sessionId: string,
    maxRetries = 3,
    skipFailures = true,
    delayBetweenActions = 2.0,
  ): Promise<ActionResult[]> {
    return this.replayManager.replayHistory(sessionId, this.tasks[0], maxRetries, skipFailures, delayBetweenActions);
  }

  /**
   * Captures a downscaled screenshot of the active tab and broadcasts it as a SIGHT_UPDATE event.
   * This provides the UI with a real-time (but computationally cheap) preview of the agent's view.
   */
  private async captureAndEmitSight(): Promise<void> {
    try {
      const page = await this.context.browserContext.getCurrentPage();
      const screenshot = await page.takeScreenshot(); // BrowserContext already handles basic capture
      // For now, we relay the full screenshot, but in the future we can downscale here if needed.
      if (screenshot) {
        await this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.SIGHT_UPDATE,
          'Sight update',
          screenshot,
        );
      }
    } catch (error) {
      logger.warning('Failed to capture agent sight update:', error);
    }
  }
}
