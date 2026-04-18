import { Executor } from '../agent/executor';
import type BrowserContext from '../browser/context';
import {
    agentModelStore,
    AgentNameEnum,
    firewallStore,
    generalSettingsStore,
    llmProviderStore,
} from '@extension/storage';
import { t } from '@extension/i18n';
import { createChatModel } from '../agent/factory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Responsible for instantiating the Executor with all necessary dependencies.
 * This factory gathers LLM configurations, firewall settings, and general preferences
 * from the extension's storage layer to build a fully initialized agent execution environment.
 */
export class ExecutorFactory {
    /**
     * Initializes a new Executor instance for a specific task.
     * 
     * @param taskId The unique identifier for the current task session.
     * @param task The user request string.
     * @param browserContext The browser context that the agent will control.
     * @returns A promise resolving to a fully configured Executor instance.
     * @throws Error if no LLM providers or navigator models are configured.
     */
    public static async create(taskId: string, task: string, browserContext: BrowserContext): Promise<Executor> {
        // ... implementation
        const providers = await llmProviderStore.getAllProviders();
        if (Object.keys(providers).length === 0) {
            throw new Error(t('bg_setup_noApiKeys'));
        }

        await agentModelStore.cleanupLegacyValidatorSettings();
        const agentModels = await agentModelStore.getAllAgentModels();

        for (const agentModel of Object.values(agentModels)) {
            if (!providers[agentModel.provider]) {
                throw new Error(t('bg_setup_noProvider', [agentModel.provider]));
            }
        }

        const navigatorModel = agentModels[AgentNameEnum.Navigator];
        if (!navigatorModel) throw new Error(t('bg_setup_noNavigatorModel'));

        const navigatorProviderConfig = providers[navigatorModel.provider];
        const navigatorLLM = createChatModel(navigatorProviderConfig, navigatorModel);

        let plannerLLM: BaseChatModel | null = null;
        const plannerModel = agentModels[AgentNameEnum.Planner];
        if (plannerModel) {
            const plannerProviderConfig = providers[plannerModel.provider];
            plannerLLM = createChatModel(plannerProviderConfig, plannerModel);
        }

        const firewall = await firewallStore.getFirewall();
        browserContext.updateConfig({
            allowedUrls: firewall.enabled ? firewall.allowList : [],
            deniedUrls: firewall.enabled ? firewall.denyList : [],
        });

        const generalSettings = await generalSettingsStore.getSettings();
        browserContext.updateConfig({
            minimumWaitPageLoadTime: generalSettings.minWaitPageLoad / 1000.0,
            displayHighlights: generalSettings.displayHighlights,
        });

        return new Executor(task, taskId, browserContext, navigatorLLM, {
            plannerLLM: plannerLLM ?? navigatorLLM,
            agentOptions: {
                maxSteps: generalSettings.maxSteps,
                maxFailures: generalSettings.maxFailures,
                maxActionsPerStep: generalSettings.maxActionsPerStep,
                useVision: generalSettings.useVision,
                useVisionForPlanner: true,
                planningInterval: generalSettings.planningInterval,
            },
            generalSettings: generalSettings,
        });
    }
}
