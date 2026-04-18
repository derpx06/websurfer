import { z } from 'zod';
import type { ActionResult } from '@src/background/agent/types';
import type { ActionSchema } from './schemas';

/**
 * Normalizes navigation URLs by adding missing schemes.
 * 
 * @param rawUrl The URL string to normalize.
 * @returns A fully qualified URL.
 */
export function normalizeNavigationUrl(rawUrl: string): string {
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) {
        throw new InvalidInputError('URL cannot be empty');
    }

    // Keep explicit schemes untouched (https:, http:, about:, etc.)
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedUrl)) {
        return trimmedUrl;
    }

    // Handle scheme-relative URLs like //example.com
    if (trimmedUrl.startsWith('//')) {
        return `https:${trimmedUrl}`;
    }

    // Default to HTTPS for bare domains/hosts.
    return `https://${trimmedUrl}`;
}

/**
 * Thrown when an action receives invalid input arguments.
 */
export class InvalidInputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidInputError';
    }
}

/**
 * Represents a discrete, executable task that the agent can perform in the browser.
 * Each action is associated with a Zod schema for input validation and metadata for prompting.
 */
export class Action<T = unknown> {
    constructor(
        private readonly handler: (input: T) => Promise<ActionResult>,
        public readonly schema: ActionSchema,
        // Whether this action has an index argument
        public readonly hasIndex: boolean = false,
    ) { }

    /**
     * Executes the action handler with the provided input after validation.
     * 
     * @param input Raw input object to be validated against the action's schema.
     * @returns A promise resolving to the result of the action.
     */
    async call(input: unknown): Promise<ActionResult> {
        const schema = this.schema.schema;

        // Handle empty schemas (e.g., z.object({}))
        const isEmptySchema =
            schema instanceof z.ZodObject &&
            Object.keys((schema as z.ZodObject<Record<string, z.ZodTypeAny>>).shape || {}).length === 0;

        if (isEmptySchema) {
            return await this.handler({} as T);
        }

        const parsedArgs = this.schema.schema.safeParse(input);
        if (!parsedArgs.success) {
            throw new InvalidInputError(parsedArgs.error.message);
        }
        return await this.handler(parsedArgs.data as T);
    }

    /**
     * Returns the machine-readable name of the action.
     */
    name(): string {
        return this.schema.name;
    }

    /**
     * Generates a descriptive prompt for the LLM explaining how to use this action.
     */
    prompt(): string {
        const schemaShape = (this.schema.schema as z.ZodObject<z.ZodRawShape>).shape || {};
        const schemaProperties = Object.entries(schemaShape).map(([key, value]) => {
            const zodValue = value as z.ZodTypeAny;
            const requiredStr = zodValue.isOptional() ? 'optional' : 'required';
            return `'${key}': {'type': '${zodValue.description || 'any'}', 'status': '${requiredStr}'}`;
        });

        const actionBody = schemaProperties.length > 0
            ? `{${schemaProperties.join(', ')}}`
            : '{}';

        return `${this.schema.description}:\n{'${this.name()}': ${actionBody}}`;
    }

    /**
     * Extracts the 'index' argument from the input if applicable.
     */
    getIndexArg(input: unknown): number | null {
        if (this.hasIndex && input && typeof input === 'object' && 'index' in input) {
            return (input as { index: number }).index;
        }
        return null;
    }

    /**
     * Updates the 'index' argument in the input if applicable.
     */
    setIndexArg(input: unknown, newIndex: number): boolean {
        if (this.hasIndex && input && typeof input === 'object') {
            (input as { index: number }).index = newIndex;
            return true;
        }
        return false;
    }
}
