import { type ProviderConfig, type ModelConfig, ProviderTypeEnum } from '@extension/storage';
import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';
import { ChatGroq } from '@langchain/groq';
import { ChatCerebras } from '@langchain/cerebras';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOllama } from '@langchain/ollama';
import { ChatDeepSeek } from '@langchain/deepseek';

const DEFAULT_MAX_TOKENS = 4096;

/**
 * Custom ChatLlama class to handle Llama API response format transformation.
 * Intercepts Llama-specific responses and maps them to OpenAI-compatible formats.
 */
class ChatLlama extends ChatOpenAI {
    async completionWithRetry(request: any, options?: any): Promise<any> {
        try {
            // @ts-ignore - Internal LangChain method access for transformation
            const response = await super.completionWithRetry(request, options);

            if (response?.completion_message?.content?.text) {
                return {
                    id: response.id || 'llama-response',
                    object: 'chat.completion',
                    created: Date.now(),
                    model: request.model,
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: response.completion_message.content.text,
                            },
                            finish_reason: response.completion_message.stop_reason || 'stop',
                        },
                    ],
                    usage: {
                        prompt_tokens: response.metrics?.find((m: any) => m.metric === 'num_prompt_tokens')?.value || 0,
                        completion_tokens: response.metrics?.find((m: any) => m.metric === 'num_completion_tokens')?.value || 0,
                        total_tokens: response.metrics?.find((m: any) => m.metric === 'num_total_tokens')?.value || 0,
                    },
                };
            }
            return response;
        } catch (error) {
            console.error(`[ChatLlama] Error during API call:`, error);
            throw error;
        }
    }
}

/**
 * Validates if the model is an OpenAI or Azure "o" series reasoning model.
 */
function isReasoningModel(modelName: string): boolean {
    const name = modelName.startsWith('openai/') ? modelName.substring(7) : modelName;
    return name.startsWith('o') || (name.startsWith('gpt-5') && !name.startsWith('gpt-5-chat'));
}

/**
 * Factory for OpenAI-compatible chat models.
 */
function createOpenAIChatModel(
    providerConfig: ProviderConfig,
    modelConfig: ModelConfig,
    extraFetchOptions?: { headers?: Record<string, string> },
): BaseChatModel {
    const args: any = {
        model: modelConfig.modelName,
        apiKey: providerConfig.apiKey,
        maxRetries: 0,
        configuration: {
            baseURL: providerConfig.baseUrl,
            defaultHeaders: extraFetchOptions?.headers,
        },
    };

    if (isReasoningModel(modelConfig.modelName)) {
        args.modelKwargs = { max_completion_tokens: DEFAULT_MAX_TOKENS };
        if (modelConfig.reasoningEffort) {
            // Handle GPT-5.1 specific constraint (no 'minimal' effort support)
            args.modelKwargs.reasoning_effort =
                (modelConfig.modelName.includes('gpt-5.1') && modelConfig.reasoningEffort === 'minimal')
                    ? 'none'
                    : modelConfig.reasoningEffort;
        }
    } else {
        args.topP = (modelConfig.parameters?.topP ?? 0.1) as number;
        args.temperature = (modelConfig.parameters?.temperature ?? 0.1) as number;
        args.maxTokens = DEFAULT_MAX_TOKENS;
    }
    return new ChatOpenAI(args);
}

/**
 * Factory for Azure-hosted OpenAI models.
 */
function createAzureChatModel(providerConfig: ProviderConfig, modelConfig: ModelConfig): BaseChatModel {
    const { baseUrl, azureDeploymentNames, azureApiVersion, apiKey } = providerConfig;

    if (!baseUrl || !azureDeploymentNames?.length || !azureApiVersion || !apiKey) {
        throw new Error('Azure configuration incomplete: Endpoint, Deployment, API Version, and Key are required.');
    }

    const instanceName = (() => {
        try {
            const hostname = new URL(baseUrl).hostname;
            return hostname.split('.')[0];
        } catch { return null; }
    })();

    if (!instanceName) {
        throw new Error(`Invalid Azure Endpoint URL format: ${baseUrl}`);
    }

    const deploymentName = modelConfig.modelName;
    const isOSeries = isReasoningModel(deploymentName);

    const args: any = {
        azureOpenAIApiInstanceName: instanceName,
        azureOpenAIApiDeploymentName: deploymentName,
        azureOpenAIApiKey: apiKey,
        azureOpenAIApiVersion: azureApiVersion,
        model: deploymentName,
        maxRetries: 0,
    };

    if (isOSeries) {
        args.modelKwargs = {
            max_completion_tokens: DEFAULT_MAX_TOKENS,
            ...(modelConfig.reasoningEffort ? { reasoning_effort: modelConfig.reasoningEffort } : {}),
        };
    } else {
        args.temperature = (modelConfig.parameters?.temperature ?? 0.1) as number;
        args.topP = (modelConfig.parameters?.topP ?? 0.1) as number;
        args.maxTokens = DEFAULT_MAX_TOKENS;
    }

    return new AzureChatOpenAI(args);
}

/**
 * Orchestrates the creation of LangChain chat models based on the user's preferred provider and model.
 * 
 * @param providerConfig Global configuration for the chosen LLM provider.
 * @param modelConfig Specific model settings chosen for the current task.
 * @returns An initialized LangChain BaseChatModel instance.
 */
export function createChatModel(providerConfig: ProviderConfig, modelConfig: ModelConfig): BaseChatModel {
    const temperature = (modelConfig.parameters?.temperature ?? 0.1) as number;
    const topP = (modelConfig.parameters?.topP ?? 0.1) as number;

    const isAzure = modelConfig.provider === ProviderTypeEnum.AzureOpenAI ||
        modelConfig.provider.startsWith(`${ProviderTypeEnum.AzureOpenAI}_`);

    if (isAzure) {
        return createAzureChatModel(providerConfig, modelConfig);
    }

    switch (modelConfig.provider) {
        case ProviderTypeEnum.OpenAI:
            return createOpenAIChatModel(providerConfig, modelConfig);

        case ProviderTypeEnum.Anthropic:
            return new ChatAnthropic({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey,
                maxTokens: DEFAULT_MAX_TOKENS,
                temperature,
                maxRetries: 0,
            });

        case ProviderTypeEnum.DeepSeek:
            return new ChatDeepSeek({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey,
                temperature,
                topP,
                maxRetries: 0,
            }) as BaseChatModel;

        case ProviderTypeEnum.Gemini:
            return new ChatGoogleGenerativeAI({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey,
                temperature,
                topP,
                maxRetries: 0,
            });

        case ProviderTypeEnum.Grok:
            return new ChatXAI({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey,
                temperature,
                topP,
                maxTokens: DEFAULT_MAX_TOKENS,
                maxRetries: 0,
            } as any) as BaseChatModel;

        case ProviderTypeEnum.Groq:
            return new ChatGroq({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey,
                temperature,
                topP,
                maxTokens: DEFAULT_MAX_TOKENS,
                maxRetries: 0,
            });

        case ProviderTypeEnum.Cerebras:
            return new ChatCerebras({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey,
                temperature,
                topP,
                maxTokens: DEFAULT_MAX_TOKENS,
                maxRetries: 0,
            });

        case ProviderTypeEnum.Ollama:
            return new ChatOllama({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey || 'ollama',
                baseUrl: providerConfig.baseUrl ?? 'http://localhost:11434',
                topP,
                temperature,
                maxTokens: DEFAULT_MAX_TOKENS,
                maxRetries: 0,
                numCtx: 64000, // Optimized context window for agent stability
            } as any);

        case ProviderTypeEnum.OpenRouter:
            return createOpenAIChatModel(providerConfig, modelConfig, {
                headers: {
                    'HTTP-Referer': 'https://WebSurfer.ai',
                    'X-Title': 'WebSurfer',
                },
            });

        case ProviderTypeEnum.Llama:
            return new ChatLlama({
                model: modelConfig.modelName,
                apiKey: providerConfig.apiKey,
                topP,
                temperature,
                maxTokens: DEFAULT_MAX_TOKENS,
                maxRetries: 0,
                configuration: { baseURL: providerConfig.baseUrl },
            });

        default:
            return createOpenAIChatModel(providerConfig, modelConfig);
    }
}
