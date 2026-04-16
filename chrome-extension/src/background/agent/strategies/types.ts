import type { AgentContext, AgentOutput } from '../types';

export interface ExecutionStrategy<T = unknown> {
    execute(context: AgentContext): Promise<AgentOutput<T> | undefined>;
}
