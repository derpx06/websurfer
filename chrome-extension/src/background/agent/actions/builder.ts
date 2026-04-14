import { z } from 'zod';
import { type AgentContext } from '@src/background/agent/types';
import { ActionRegistry } from './registry';
import { Action } from './base';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Utility for dynamically building action schemas for LLM tool calling.
 */
export function buildDynamicActionSchema(actions: Action[]): z.ZodType {
  let schema = z.object({});
  for (const action of actions) {
    const actionSchema = action.schema.schema;
    schema = schema.extend({
      [action.name()]: actionSchema.nullable().optional().describe(action.schema.description),
    });
  }
  return schema;
}

/**
 * ActionBuilder is now a lightweight factory that delegates action assembly to ActionRegistry.
 */
export class ActionBuilder {
  private readonly context: AgentContext;
  private readonly extractorLLM: BaseChatModel;

  constructor(context: AgentContext, extractorLLM: BaseChatModel) {
    this.context = context;
    this.extractorLLM = extractorLLM;
  }

  /**
   * Returns the default set of actions bound to the current context.
   */
  buildDefaultActions(): Action[] {
    return ActionRegistry.buildDefaultActions(this.context);
  }
}

// Export Base types for convenience
export { Action, InvalidInputError, normalizeNavigationUrl } from './base';
