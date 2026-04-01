import { z } from 'zod';
import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';
import { type AgentNameEnum, llmProviderModelNames, llmProviderParameters, ProviderTypeEnum } from './types';

const AZURE_API_VERSION = '2025-04-01-preview';

// Zod schemas for validation and defaults
export const ProviderConfigSchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum(ProviderTypeEnum).optional(),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  modelNames: z.array(z.string()).optional(),
  createdAt: z.number().default(() => Date.now()),
  azureDeploymentNames: z.array(z.string()).optional(),
  azureApiVersion: z.string().optional(),
});

export const LLMKeyRecordSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema),
});

// Interface for a single provider configuration
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Interface for storing multiple LLM provider configurations
export type LLMKeyRecord = z.infer<typeof LLMKeyRecordSchema>;

export type LLMProviderStorage = BaseStorage<LLMKeyRecord> & {
  setProvider: (providerId: string, config: ProviderConfig) => Promise<void>;
  getProvider: (providerId: string) => Promise<ProviderConfig | undefined>;
  removeProvider: (providerId: string) => Promise<void>;
  hasProvider: (providerId: string) => Promise<boolean>;
  getAllProviders: () => Promise<Record<string, ProviderConfig>>;
};

// Storage for LLM provider configurations
// use "llm-api-keys" as the key for the storage, for backward compatibility
const storage = createStorage<LLMKeyRecord>(
  'llm-api-keys',
  { providers: {} },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
    schema: LLMKeyRecordSchema,
  },
);

// Helper function to determine provider type from provider name
// Make sure to update this function if you add a new provider type
export function getProviderTypeByProviderId(providerId: string): ProviderTypeEnum {
  // Check if this is an Azure provider (either the main one or one with a custom ID)
  if (providerId === ProviderTypeEnum.AzureOpenAI) {
    return ProviderTypeEnum.AzureOpenAI;
  }

  // Handle custom Azure providers with IDs like azure_openai_2
  if (typeof providerId === 'string' && providerId.startsWith(`${ProviderTypeEnum.AzureOpenAI}_`)) {
    return ProviderTypeEnum.AzureOpenAI;
  }

  // Handle standard provider types
  switch (providerId) {
    case ProviderTypeEnum.OpenAI:
    case ProviderTypeEnum.Anthropic:
    case ProviderTypeEnum.DeepSeek:
    case ProviderTypeEnum.Gemini:
    case ProviderTypeEnum.Grok:
    case ProviderTypeEnum.Ollama:
    case ProviderTypeEnum.OpenRouter:
    case ProviderTypeEnum.Groq:
    case ProviderTypeEnum.Cerebras:
      return providerId;
    default:
      return ProviderTypeEnum.CustomOpenAI;
  }
}

// Helper function to get display name from provider id
// Make sure to update this function if you add a new provider type
export function getDefaultDisplayNameFromProviderId(providerId: string): string {
  switch (providerId) {
    case ProviderTypeEnum.OpenAI:
      return 'OpenAI';
    case ProviderTypeEnum.Anthropic:
      return 'Anthropic';
    case ProviderTypeEnum.DeepSeek:
      return 'DeepSeek';
    case ProviderTypeEnum.Gemini:
      return 'Gemini';
    case ProviderTypeEnum.Grok:
      return 'Grok';
    case ProviderTypeEnum.Ollama:
      return 'Ollama';
    case ProviderTypeEnum.AzureOpenAI:
      return 'Azure OpenAI';
    case ProviderTypeEnum.OpenRouter:
      return 'OpenRouter';
    case ProviderTypeEnum.Groq:
      return 'Groq';
    case ProviderTypeEnum.Cerebras:
      return 'Cerebras';
    case ProviderTypeEnum.Llama:
      return 'Llama';
    default:
      return providerId; // Use the provider id as display name for custom providers by default
  }
}

// Get default configuration for built-in providers
export function getDefaultProviderConfig(providerId: string): ProviderConfig {
  switch (providerId) {
    case ProviderTypeEnum.OpenAI:
    case ProviderTypeEnum.Anthropic:
    case ProviderTypeEnum.DeepSeek:
    case ProviderTypeEnum.Gemini:
    case ProviderTypeEnum.Grok:
    case ProviderTypeEnum.OpenRouter: // OpenRouter uses modelNames
    case ProviderTypeEnum.Groq: // Groq uses modelNames
    case ProviderTypeEnum.Cerebras: // Cerebras uses modelNames
    case ProviderTypeEnum.Llama: // Llama uses modelNames
      return {
        apiKey: '',
        name: getDefaultDisplayNameFromProviderId(providerId),
        type: providerId,
        baseUrl:
          providerId === ProviderTypeEnum.OpenRouter
            ? 'https://openrouter.ai/api/v1'
            : providerId === ProviderTypeEnum.Llama
              ? 'https://api.llama.com/v1'
              : undefined,
        modelNames: [...(llmProviderModelNames[providerId] || [])],
        createdAt: Date.now(),
      };

    case ProviderTypeEnum.Ollama:
      return {
        apiKey: 'ollama', // Set default API key for Ollama
        name: getDefaultDisplayNameFromProviderId(ProviderTypeEnum.Ollama),
        type: ProviderTypeEnum.Ollama,
        modelNames: llmProviderModelNames[providerId],
        baseUrl: 'http://localhost:11434',
        createdAt: Date.now(),
      };
    case ProviderTypeEnum.AzureOpenAI:
      return {
        apiKey: '', // User needs to provide API Key
        name: getDefaultDisplayNameFromProviderId(ProviderTypeEnum.AzureOpenAI),
        type: ProviderTypeEnum.AzureOpenAI,
        baseUrl: '', // User needs to provide Azure endpoint
        // modelNames: [], // Not used for Azure configuration
        azureDeploymentNames: [], // Azure deployment names
        azureApiVersion: AZURE_API_VERSION, // Provide a common default API version
        createdAt: Date.now(),
      };
    default: // Handles CustomOpenAI
      return {
        apiKey: '',
        name: getDefaultDisplayNameFromProviderId(providerId),
        type: ProviderTypeEnum.CustomOpenAI,
        baseUrl: '',
        modelNames: [], // Custom providers use modelNames
        createdAt: Date.now(),
      };
  }
}

export function getDefaultAgentModelParams(providerId: string, agentName: AgentNameEnum): Record<string, number> {
  const newParameters = llmProviderParameters[providerId as keyof typeof llmProviderParameters]?.[agentName] || {
    temperature: 0.1,
    topP: 0.1,
  };
  return newParameters;
}



export const llmProviderStore: LLMProviderStorage = {
  ...storage,
  async setProvider(providerId: string, config: ProviderConfig) {
    if (!providerId) {
      throw new Error('Provider id cannot be empty');
    }

    const providerType = config.type || getProviderTypeByProviderId(providerId);

    const completeConfig: ProviderConfig = {
      ...config,
      name: config.name || getDefaultDisplayNameFromProviderId(providerId),
      type: providerType,
    };

    const current = (await storage.get()) || { providers: {} };
    await storage.set({
      providers: {
        ...current.providers,
        [providerId]: completeConfig,
      },
    });
  },
  async getProvider(providerId: string) {
    const data = (await storage.get()) || { providers: {} };
    return data.providers[providerId];
  },
  async removeProvider(providerId: string) {
    const current = (await storage.get()) || { providers: {} };
    const newProviders = { ...current.providers };
    delete newProviders[providerId];
    await storage.set({ providers: newProviders });
  },
  async hasProvider(providerId: string) {
    const data = (await storage.get()) || { providers: {} };
    return providerId in data.providers;
  },

  async getAllProviders() {
    const data = await storage.get();
    return { ...data.providers };
  },
};
