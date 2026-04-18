/* eslint-disable @typescript-eslint/no-unused-vars, jsx-a11y/label-has-associated-control */
/*
 * Changes:
 * - Added a searchable select component with filtering capability for model selection
 * - Implemented keyboard navigation and accessibility for the custom dropdown
 * - Added search functionality that filters models based on user input
 * - Added keyboard event handlers to close dropdowns with Escape key
 * - Styling for both light and dark mode themes
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { FiCpu, FiChevronDown, FiTrendingUp, FiShield, FiX, FiCheck, FiEye, FiEyeOff, FiTarget, FiAlertCircle } from 'react-icons/fi';
import {
  llmProviderStore,
  agentModelStore,
  speechToTextModelStore,
  AgentNameEnum,
  llmProviderModelNames,
  ProviderTypeEnum,
  getDefaultDisplayNameFromProviderId,
  getDefaultProviderConfig,
  getDefaultAgentModelParams,
  getProviderTypeByProviderId,
  type ProviderConfig,
} from '@extension/storage';

import { t } from '@extension/i18n';

// Helper function to check if a model is an OpenAI reasoning model (O-series or GPT-5 models)
function isOpenAIReasoningModel(modelName: string): boolean {
  // Extract the model name without provider prefix if present
  let modelNameWithoutProvider = modelName;
  if (modelName.includes('>')) {
    // Handle "provider>model" format
    modelNameWithoutProvider = modelName.split('>')[1];
  }
  if (modelNameWithoutProvider.startsWith('openai/')) {
    modelNameWithoutProvider = modelNameWithoutProvider.substring(7);
  }
  return (
    modelNameWithoutProvider.startsWith('o') ||
    (modelNameWithoutProvider.startsWith('gpt-5') && !modelNameWithoutProvider.startsWith('gpt-5-chat'))
  );
}

function isAnthropicModel(modelName: string): boolean {
  // Extract the model name without provider prefix if present
  let modelNameWithoutProvider = modelName;

  if (modelName.includes('>')) {
    // Handle "provider>model" format
    modelNameWithoutProvider = modelName.split('>')[1];
  }

  // Check if the model starts with 'claude-'
  return modelNameWithoutProvider.startsWith('claude-');
}

interface ModelSettingsProps {
  isDarkMode?: boolean; // Controls dark/light theme styling
}

export const ModelSettings = ({ isDarkMode = false }: ModelSettingsProps) => {
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({});
  const [modifiedProviders, setModifiedProviders] = useState<Set<string>>(new Set());
  const [providersFromStorage, setProvidersFromStorage] = useState<Set<string>>(new Set());
  const [selectedModels, setSelectedModels] = useState<Record<AgentNameEnum, string>>({
    [AgentNameEnum.Navigator]: '',
    [AgentNameEnum.Planner]: '',
  });
  const [modelParameters, setModelParameters] = useState<Record<AgentNameEnum, { temperature: number; topP: number }>>({
    [AgentNameEnum.Navigator]: { temperature: 0, topP: 0 },
    [AgentNameEnum.Planner]: { temperature: 0, topP: 0 },
  });

  // State for reasoning effort for O-series models
  const [reasoningEffort, setReasoningEffort] = useState<
    Record<AgentNameEnum, 'minimal' | 'low' | 'medium' | 'high' | undefined>
  >({
    [AgentNameEnum.Navigator]: undefined,
    [AgentNameEnum.Planner]: undefined,
  });
  const [newModelInputs, setNewModelInputs] = useState<Record<string, string>>({});
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const newlyAddedProviderRef = useRef<string | null>(null);
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({});
  // Add state for tracking API key visibility
  const [visibleApiKeys, setVisibleApiKeys] = useState<Record<string, boolean>>({});
  // Create a non-async wrapper for use in render functions
  const [availableModels, setAvailableModels] = useState<
    Array<{ provider: string; providerName: string; model: string }>
  >([]);
  // State for model input handling

  const [selectedSpeechToTextModel, setSelectedSpeechToTextModel] = useState<string>('');

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const allProviders = await llmProviderStore.getAllProviders();
        console.log('allProviders', allProviders);

        const migrationProviders = { ...allProviders };
        Object.keys(migrationProviders).forEach(id => {
          if (!migrationProviders[id].type) {
            migrationProviders[id].type = getProviderTypeByProviderId(id);
          }
        });

        // Track which providers are from storage
        const fromStorage = new Set(Object.keys(migrationProviders));
        setProvidersFromStorage(fromStorage);

        // Merge with existing state to avoid overwriting newly added providers
        setProviders(prev => ({
          ...migrationProviders,
          ...prev,
        }));
      } catch (error) {
        console.error('Error loading providers:', error);
        // Set empty providers on error
        setProviders(prev => prev);
        // No providers from storage on error
        setProvidersFromStorage(new Set());
      }
    };

    loadProviders();
  }, []);

  // Load existing agent models and parameters on mount
  useEffect(() => {
    const loadAgentModels = async () => {
      try {
        const models: Record<AgentNameEnum, string> = {
          [AgentNameEnum.Planner]: '',
          [AgentNameEnum.Navigator]: '',
        };

        for (const agent of Object.values(AgentNameEnum)) {
          const config = await agentModelStore.getAgentModel(agent);
          if (config) {
            // Store in provider>model format
            models[agent] = `${config.provider}>${config.modelName}`;
            if (config.parameters?.temperature !== undefined || config.parameters?.topP !== undefined) {
              setModelParameters(prev => ({
                ...prev,
                [agent]: {
                  temperature: config.parameters?.temperature ?? prev[agent].temperature,
                  topP: config.parameters?.topP ?? prev[agent].topP,
                },
              }));
            }
            // Also load reasoningEffort if available
            if (config.reasoningEffort) {
              setReasoningEffort(prev => ({
                ...prev,
                [agent]: config.reasoningEffort as 'minimal' | 'low' | 'medium' | 'high',
              }));
            }
          }
        }
        setSelectedModels(models);
      } catch (error) {
        console.error('Error loading agent models:', error);
      }
    };

    loadAgentModels();
  }, []);

  useEffect(() => {
    const loadSpeechToTextModel = async () => {
      try {
        const config = await speechToTextModelStore.getSpeechToTextModel();
        if (config) {
          setSelectedSpeechToTextModel(`${config.provider}>${config.modelName}`);
        }
      } catch (error) {
        console.error('Error loading speech-to-text model:', error);
      }
    };

    loadSpeechToTextModel();
  }, []);

  // Auto-focus the input field when a new provider is added
  useEffect(() => {
    // Only focus if we have a newly added provider reference
    if (newlyAddedProviderRef.current && providers[newlyAddedProviderRef.current]) {
      const providerId = newlyAddedProviderRef.current;
      const config = providers[providerId];

      // For custom providers, focus on the name input
      if (config.type === ProviderTypeEnum.CustomOpenAI) {
        const nameInput = document.getElementById(`${providerId}-name`);
        if (nameInput) {
          nameInput.focus();
        }
      } else {
        // For default providers, focus on the API key input
        const apiKeyInput = document.getElementById(`${providerId}-api-key`);
        if (apiKeyInput) {
          apiKeyInput.focus();
        }
      }

      // Clear the ref after focusing
      newlyAddedProviderRef.current = null;
    }
  }, [providers]);

  // Add a click outside handler to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isProviderSelectorOpen && !target.closest('.provider-selector-container')) {
        setIsProviderSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProviderSelectorOpen]);

  // Create a memoized version of getAvailableModels
  const getAvailableModelsCallback = useCallback(async () => {
    const models: Array<{ provider: string; providerName: string; model: string }> = [];

    try {
      // Load providers directly from storage
      const storedProviders = await llmProviderStore.getAllProviders();

      // Only use providers that are actually in storage
      for (const [provider, config] of Object.entries(storedProviders)) {
        if (config.type === ProviderTypeEnum.AzureOpenAI) {
          // Handle Azure providers specially - use deployment names as models
          const deploymentNames = config.azureDeploymentNames || [];

          models.push(
            ...deploymentNames.map(deployment => ({
              provider,
              providerName: config.name || provider,
              model: deployment,
            })),
          );
        } else {
          // Standard handling for non-Azure providers
          const providerModels =
            config.modelNames || llmProviderModelNames[provider as keyof typeof llmProviderModelNames] || [];
          models.push(
            ...providerModels.map(model => ({
              provider,
              providerName: config.name || provider,
              model,
            })),
          );
        }
      }
    } catch (error) {
      console.error('Error loading providers for model selection:', error);
    }

    return models;
  }, []);

  // Update available models whenever providers change
  useEffect(() => {
    const updateAvailableModels = async () => {
      const models = await getAvailableModelsCallback();
      setAvailableModels(models);
    };

    updateAvailableModels();
  }, [getAvailableModelsCallback]); // Only depends on the callback

  const handleApiKeyChange = (provider: string, apiKey: string, baseUrl?: string) => {
    setModifiedProviders(prev => new Set(prev).add(provider));
    setProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey: apiKey.trim(),
        baseUrl: baseUrl !== undefined ? baseUrl.trim() : prev[provider]?.baseUrl,
      },
    }));
  };

  // Add a toggle handler for API key visibility
  const toggleApiKeyVisibility = (provider: string) => {
    setVisibleApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const handleNameChange = (provider: string, name: string) => {
    setModifiedProviders(prev => new Set(prev).add(provider));
    setProviders(prev => {
      const updated = {
        ...prev,
        [provider]: {
          ...prev[provider],
          name: name.trim(),
        },
      };
      return updated;
    });
  };

  const handleModelsChange = (provider: string, modelsString: string) => {
    setNewModelInputs(prev => ({
      ...prev,
      [provider]: modelsString,
    }));
  };

  const addModel = (provider: string, model: string) => {
    if (!model.trim()) return;

    setModifiedProviders(prev => new Set(prev).add(provider));
    setProviders(prev => {
      const providerData = prev[provider] || {};

      // Get current models - either from provider config or default models
      let currentModels = providerData.modelNames;
      if (currentModels === undefined) {
        currentModels = [...(llmProviderModelNames[provider as keyof typeof llmProviderModelNames] || [])];
      }

      // Don't add duplicates
      if (currentModels.includes(model.trim())) return prev;

      return {
        ...prev,
        [provider]: {
          ...providerData,
          modelNames: [...currentModels, model.trim()],
        },
      };
    });

    // Clear the input
    setNewModelInputs(prev => ({
      ...prev,
      [provider]: '',
    }));
  };

  const removeModel = (provider: string, modelToRemove: string) => {
    setModifiedProviders(prev => new Set(prev).add(provider));

    setProviders(prev => {
      const providerData = prev[provider] || {};

      // If modelNames doesn't exist in the provider data yet, we need to initialize it
      // with the default models from llmProviderModelNames first
      if (!providerData.modelNames) {
        const defaultModels = llmProviderModelNames[provider as keyof typeof llmProviderModelNames] || [];
        const filteredModels = defaultModels.filter(model => model !== modelToRemove);

        return {
          ...prev,
          [provider]: {
            ...providerData,
            modelNames: filteredModels,
          },
        };
      }

      // If modelNames already exists, just filter out the model to remove
      return {
        ...prev,
        [provider]: {
          ...providerData,
          modelNames: providerData.modelNames.filter(model => model !== modelToRemove),
        },
      };
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, provider: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const value = newModelInputs[provider] || '';
      addModel(provider, value);
    }
  };

  const getButtonProps = (provider: string) => {
    const isInStorage = providersFromStorage.has(provider);
    const isModified = modifiedProviders.has(provider);

    // For deletion, we only care if it's in storage and not modified
    if (isInStorage && !isModified) {
      return {
        theme: isDarkMode ? 'dark' : 'light',
        variant: 'danger' as const,
        children: t('options_models_providers_btnDelete'),
        disabled: false,
      };
    }

    // For saving, we need to check if it has the required inputs
    let hasInput = false;
    const providerType = providers[provider]?.type;
    const config = providers[provider];

    if (providerType === ProviderTypeEnum.CustomOpenAI) {
      hasInput = Boolean(config?.baseUrl?.trim()); // Custom needs Base URL, name checked elsewhere
    } else if (providerType === ProviderTypeEnum.Ollama) {
      hasInput = Boolean(config?.baseUrl?.trim()); // Ollama needs Base URL
    } else if (providerType === ProviderTypeEnum.AzureOpenAI) {
      // Azure needs API Key, Endpoint, Deployment Names, and API Version
      hasInput =
        Boolean(config?.apiKey?.trim()) &&
        Boolean(config?.baseUrl?.trim()) &&
        Boolean(config?.azureDeploymentNames?.length) &&
        Boolean(config?.azureApiVersion?.trim());
    } else if (providerType === ProviderTypeEnum.OpenRouter) {
      // OpenRouter needs API Key and optionally Base URL (has default)
      hasInput = Boolean(config?.apiKey?.trim()) && Boolean(config?.baseUrl?.trim());
    } else if (providerType === ProviderTypeEnum.Llama) {
      // Llama needs API Key and Base URL
      hasInput = Boolean(config?.apiKey?.trim()) && Boolean(config?.baseUrl?.trim());
    } else {
      // Other built-in providers just need API Key
      hasInput = Boolean(config?.apiKey?.trim());
    }

    return {
      theme: isDarkMode ? 'dark' : 'light',
      variant: 'primary' as const,
      children: t('options_models_providers_btnSave'),
      disabled: !hasInput || !isModified,
    };
  };

  const handleSave = async (provider: string) => {
    try {
      // Check if name contains spaces for custom providers
      if (providers[provider].type === ProviderTypeEnum.CustomOpenAI && providers[provider].name?.includes(' ')) {
        setNameErrors(prev => ({
          ...prev,
          [provider]: t('options_models_providers_errors_spacesNotAllowed'),
        }));
        return;
      }

      // Check if base URL is required but missing for custom_openai, ollama, azure_openai or openrouter
      // Note: Groq and Cerebras do not require base URL as they use the default endpoint
      if (
        (providers[provider].type === ProviderTypeEnum.CustomOpenAI ||
          providers[provider].type === ProviderTypeEnum.Ollama ||
          providers[provider].type === ProviderTypeEnum.AzureOpenAI ||
          providers[provider].type === ProviderTypeEnum.OpenRouter ||
          providers[provider].type === ProviderTypeEnum.Llama) &&
        (!providers[provider].baseUrl || !providers[provider].baseUrl.trim())
      ) {
        alert(t('options_models_providers_errors_baseUrlRequired', getDefaultDisplayNameFromProviderId(provider)));
        return;
      }

      // Ensure modelNames is provided
      let modelNames = providers[provider].modelNames;
      if (!modelNames) {
        // Use default model names if not explicitly set
        modelNames = [...(llmProviderModelNames[provider as keyof typeof llmProviderModelNames] || [])];
      }

      // Prepare data for saving using the correctly typed config from state
      // We can directly pass the relevant parts of the state config
      // Create a copy to avoid modifying state directly if needed, though setProvider likely handles it
      const configToSave: Partial<ProviderConfig> = { ...providers[provider] }; // Use Partial to allow deleting modelNames

      // Explicitly set required fields that might be missing in partial state updates (though unlikely now)
      configToSave.apiKey = providers[provider].apiKey || '';
      configToSave.name = providers[provider].name || getDefaultDisplayNameFromProviderId(provider);
      configToSave.type = providers[provider].type;
      configToSave.createdAt = providers[provider].createdAt || Date.now();
      // baseUrl, azureDeploymentName, azureApiVersion should be correctly set by handlers

      if (providers[provider].type === ProviderTypeEnum.AzureOpenAI) {
        // Ensure modelNames is NOT included for Azure
        configToSave.modelNames = undefined;
      } else {
        // Ensure modelNames IS included for non-Azure
        // Use existing modelNames from state, or default if somehow missing
        configToSave.modelNames =
          providers[provider].modelNames || llmProviderModelNames[provider as keyof typeof llmProviderModelNames] || [];
      }

      // Pass the cleaned config to setProvider
      // Cast to ProviderConfig as we've ensured necessary fields based on type
      await llmProviderStore.setProvider(provider, configToSave as ProviderConfig);

      // Clear any name errors on successful save
      setNameErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[provider];
        return newErrors;
      });

      // Add to providersFromStorage since it's now saved
      setProvidersFromStorage(prev => new Set(prev).add(provider));

      setModifiedProviders(prev => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });

      // Refresh available models
      const models = await getAvailableModelsCallback();
      setAvailableModels(models);
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };

  const handleDelete = async (provider: string) => {
    try {
      // Delete the provider from storage regardless of its API key value
      await llmProviderStore.removeProvider(provider);

      // Remove from providersFromStorage
      setProvidersFromStorage(prev => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });

      // Remove from providers state
      setProviders(prev => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });

      // Also remove from modifiedProviders if it's there
      setModifiedProviders(prev => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });

      // Refresh available models
      const models = await getAvailableModelsCallback();
      setAvailableModels(models);
    } catch (error) {
      console.error('Error deleting provider:', error);
    }
  };

  const handleCancelProvider = (providerId: string) => {
    // Remove the provider from the state
    setProviders(prev => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });

    // Remove from modified providers
    setModifiedProviders(prev => {
      const next = new Set(prev);
      next.delete(providerId);
      return next;
    });
  };

  const handleModelChange = async (agentName: AgentNameEnum, modelValue: string) => {
    // modelValue will be in format "provider>model"
    const [provider, model] = modelValue.split('>');

    console.log(`[handleModelChange] Setting ${agentName} model: provider=${provider}, model=${model}`);

    // Set parameters based on provider type
    const newParameters = getDefaultAgentModelParams(provider, agentName);

    setModelParameters(prev => ({
      ...prev,
      [agentName]: newParameters,
    }));

    // Store both provider and model name in the format "provider>model"
    setSelectedModels(prev => ({
      ...prev,
      [agentName]: modelValue, // Store the full provider>model value
    }));

    try {
      if (model) {
        const providerConfig = providers[provider];

        // For Azure, verify the model is in the deployment names list
        if (providerConfig && providerConfig.type === ProviderTypeEnum.AzureOpenAI) {
          console.log(`[handleModelChange] Azure model selected: ${model}`);
        }

        // Reset reasoning effort if switching models
        if (isOpenAIReasoningModel(modelValue)) {
          // Set default reasoning effort based on agent type
          const defaultReasoningEffort = agentName === AgentNameEnum.Planner ? 'low' : 'minimal';
          setReasoningEffort(prev => ({
            ...prev,
            [agentName]: prev[agentName] || defaultReasoningEffort,
          }));
        } else {
          // Clear reasoning effort for non-O-series models
          setReasoningEffort(prev => ({
            ...prev,
            [agentName]: undefined,
          }));
        }

        // For Anthropic Opus models, only pass temperature, not topP
        const parametersToSave = isAnthropicModel(modelValue)
          ? { temperature: newParameters.temperature }
          : newParameters;

        await agentModelStore.setAgentModel(agentName, {
          provider,
          modelName: model,
          parameters: parametersToSave,
          reasoningEffort: isOpenAIReasoningModel(modelValue)
            ? reasoningEffort[agentName] || (agentName === AgentNameEnum.Planner ? 'low' : 'minimal')
            : undefined,
        });
      } else {
        // Reset storage if no model is selected
        await agentModelStore.resetAgentModel(agentName);
      }
    } catch (error) {
      console.error('Error saving agent model:', error);
    }
  };

  const handleReasoningEffortChange = async (
    agentName: AgentNameEnum,
    value: 'minimal' | 'low' | 'medium' | 'high',
  ) => {
    setReasoningEffort(prev => ({
      ...prev,
      [agentName]: value,
    }));

    // Only update if we have a selected model
    if (selectedModels[agentName] && isOpenAIReasoningModel(selectedModels[agentName])) {
      try {
        // Extract provider and model from the "provider>model" format
        const [provider, modelName] = selectedModels[agentName].split('>');

        if (provider && modelName) {
          await agentModelStore.setAgentModel(agentName, {
            provider,
            modelName,
            parameters: modelParameters[agentName],
            reasoningEffort: value,
          });
        }
      } catch (error) {
        console.error('Error saving reasoning effort:', error);
      }
    }
  };

  const handleParameterChange = async (agentName: AgentNameEnum, paramName: 'temperature' | 'topP', value: number) => {
    const newParameters = {
      ...modelParameters[agentName],
      [paramName]: value,
    };

    setModelParameters(prev => ({
      ...prev,
      [agentName]: newParameters,
    }));

    // Only update if we have a selected model
    if (selectedModels[agentName]) {
      try {
        // Extract provider and model from the "provider>model" format
        const [provider, modelName] = selectedModels[agentName].split('>');

        if (provider && modelName) {
          // For Anthropic Opus models, only pass temperature, not topP
          const parametersToSave = isAnthropicModel(selectedModels[agentName])
            ? { temperature: newParameters.temperature }
            : newParameters;

          await agentModelStore.setAgentModel(agentName, {
            provider,
            modelName,
            parameters: parametersToSave,
          });
        }
      } catch (error) {
        console.error('Error saving agent parameters:', error);
      }
    }
  };

  const handleSpeechToTextModelChange = async (modelValue: string) => {
    setSelectedSpeechToTextModel(modelValue);

    try {
      if (modelValue) {
        // Parse the "provider>model" format
        const [provider, modelName] = modelValue.split('>');

        // Save to proper storage
        await speechToTextModelStore.setSpeechToTextModel({
          provider,
          modelName,
        });
      } else {
        // Reset if no model selected
        await speechToTextModelStore.resetSpeechToTextModel();
      }
    } catch (error) {
      console.error('Error saving speech-to-text model:', error);
    }
  };

  const renderModelSelect = (agentName: AgentNameEnum) => {
    const isPlanner = agentName === AgentNameEnum.Planner;
    const isDark = isDarkMode;

    return (
      <div className={`group/agent relative overflow-hidden rounded-[2rem] border transition-all duration-500 hover:scale-[1.01] ${isDark ? 'border-white/5 bg-white/[0.02] shadow-2xl' : 'border-slate-200 bg-slate-50 shadow-lg'
        } mb-8 p-8`}>
        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${isPlanner
              ? (isDark ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-indigo-100 text-indigo-700')
              : (isDark ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30' : 'bg-cyan-100 text-cyan-700')
              }`}>
              {isPlanner ? 'Strategic Planner' : 'Execution Navigator'}
            </div>
          </div>
          <div className={`max-w-sm text-[13px] font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {getAgentDescription(agentName)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Model Selection Field */}
          <div className={`group/field relative rounded-2xl border p-6 transition-all duration-300 ${isDark ? 'border-white/5 bg-black/20 hover:border-indigo-500/30' : 'border-slate-200 bg-white shadow-sm hover:border-indigo-300'
            }`}>
            <label className="mb-3 ml-1 block text-[10px] font-black uppercase tracking-widest opacity-40">Assigned Neural Model</label>
            <div className="relative">
              <select
                className={`w-full cursor-pointer appearance-none bg-transparent pr-10 text-sm font-bold outline-none focus:ring-0 ${isDark ? 'text-white' : 'text-slate-900'
                  }`}
                disabled={availableModels.length === 0}
                value={selectedModels[agentName] || ''}
                onChange={e => handleModelChange(agentName, e.target.value)}
              >
                <option value="" className="bg-[#1a1c23]">Unassigned</option>
                {availableModels.map(({ provider, providerName, model }) => (
                  <option key={`${provider}>${model}`} value={`${provider}>${model}`} className="bg-[#1a1c23]">
                    {`${providerName} | ${model}`}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-40 transition-transform group-hover/field:scale-110" />
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {selectedModels[agentName] && !isOpenAIReasoningModel(selectedModels[agentName]) && (
              <div className={`rounded-2xl border p-6 ${isDark ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-white shadow-sm'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Creativity (Temp)</label>
                  <span className={`font-mono text-xs font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {modelParameters[agentName].temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={modelParameters[agentName].temperature}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-indigo-500/10 accent-indigo-500"
                  onChange={e => handleParameterChange(agentName, 'temperature', Number.parseFloat(e.target.value))}
                />
              </div>
            )}

            {selectedModels[agentName] &&
              !isOpenAIReasoningModel(selectedModels[agentName]) &&
              !isAnthropicModel(selectedModels[agentName]) && (
                <div className={`rounded-2xl border p-6 ${isDark ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className="mb-4 flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Nucleus Sampling (TopP)</label>
                    <span className={`font-mono text-xs font-black ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      {modelParameters[agentName].topP.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={modelParameters[agentName].topP}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cyan-500/10 accent-cyan-500"
                    onChange={e => handleParameterChange(agentName, 'topP', Number.parseFloat(e.target.value))}
                  />
                </div>
              )}

            {/* Reasoning Effort (O-series models) */}
            {selectedModels[agentName] && isOpenAIReasoningModel(selectedModels[agentName]) && (
              <div className={`col-span-1 rounded-2xl border p-6 md:col-span-2 ${isDark ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-white shadow-sm'}`}>
                <label className="mb-4 block text-[10px] font-black uppercase tracking-widest opacity-40">Cognitive Effort</label>
                <div className="flex gap-2">
                  {(['minimal', 'low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => handleReasoningEffortChange(agentName, level)}
                      className={`flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-tighter transition-all duration-300 ${(reasoningEffort[agentName] || (agentName === AgentNameEnum.Planner ? 'low' : 'minimal')) === level
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/50'
                        : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


  const getAgentDescription = (agentName: AgentNameEnum) => {
    switch (agentName) {
      case AgentNameEnum.Navigator:
        return t('options_models_agents_navigator');
      case AgentNameEnum.Planner:
        return t('options_models_agents_planner');
      default:
        return '';
    }
  };

  const getMaxCustomProviderNumber = () => {
    let maxNumber = 0;
    for (const providerId of Object.keys(providers)) {
      if (providerId.startsWith('custom_openai_')) {
        const match = providerId.match(/custom_openai_(\d+)/);
        if (match) {
          const number = Number.parseInt(match[1], 10);
          maxNumber = Math.max(maxNumber, number);
        }
      }
    }
    return maxNumber;
  };

  const addCustomProvider = () => {
    const nextNumber = getMaxCustomProviderNumber() + 1;
    const providerId = `custom_openai_${nextNumber}`;

    setProviders(prev => ({
      ...prev,
      [providerId]: {
        apiKey: '',
        name: `CustomProvider${nextNumber}`,
        type: ProviderTypeEnum.CustomOpenAI,
        baseUrl: '',
        modelNames: [],
        createdAt: Date.now(),
      },
    }));

    setModifiedProviders(prev => new Set(prev).add(providerId));

    // Set the newly added provider ref
    newlyAddedProviderRef.current = providerId;

    // Scroll to the newly added provider after render
    setTimeout(() => {
      const providerElement = document.getElementById(`provider-${providerId}`);
      if (providerElement) {
        providerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const addBuiltInProvider = (provider: string) => {
    console.log(`[ModelSettings] Adding built-in provider: ${provider}`);
    try {
      // Get the default provider configuration
      const config = getDefaultProviderConfig(provider);
      console.log(`[ModelSettings] Default config for ${provider}:`, config);

      if (!config) {
        throw new Error(`Failed to get default config for ${provider}`);
      }

      // Add the provider to the state
      setProviders(prev => {
        console.log(`[ModelSettings] Updating providers state. Previous:`, prev);
        const next = {
          ...prev,
          [provider]: config,
        };
        console.log(`[ModelSettings] New providers state:`, next);
        return next;
      });

      // Mark as modified so it shows up in the UI
      setModifiedProviders(prev => {
        const next = new Set(prev).add(provider);
        console.log(`[ModelSettings] Updated modifiedProviders:`, Array.from(next));
        return next;
      });

      // Set the newly added provider ref
      newlyAddedProviderRef.current = provider;

      // Scroll into view
      setTimeout(() => {
        const providerElement = document.getElementById(`provider-${provider}`);
        if (providerElement) {
          providerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.warn(`[ModelSettings] Could not find element provider-${provider} for scrolling`);
        }
      }, 200);
    } catch (err) {
      console.error(`[ModelSettings] Failed to add built-in provider:`, err);
      alert(`Error adding provider: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Sort providers to ensure newly added providers appear at the bottom
  const getSortedProviders = () => {
    // Filter providers to only include those from storage and newly added providers
    // Filter providers to only include those from storage and newly added providers
    const filteredProviders = Object.entries(providers).filter(([providerId, config]) => {
      // Be VERY permissive in the filter
      if (!config) return false;

      // Always include if it has a type (which it should if added via UI)
      if (config.type) {
        // If it's already in storage, show it
        if (providersFromStorage.has(providerId)) return true;
        // If it's in modified set, show it
        if (modifiedProviders.has(providerId)) return true;
      }

      // Fallback: if it's not a known hidden one, maybe show it anyway?
      // No, stick to the main logic but add more logging
      return false;
    });

    // Sort the filtered providers
    return filteredProviders.sort(([keyA, configA], [keyB, configB]) => {
      // Separate newly added providers from stored providers
      const isNewA = !providersFromStorage.has(keyA) && modifiedProviders.has(keyA);
      const isNewB = !providersFromStorage.has(keyB) && modifiedProviders.has(keyB);

      // If one is new and one is stored, new ones go to the end
      if (isNewA && !isNewB) return 1;
      if (!isNewA && isNewB) return -1;

      // If both are new or both are stored, sort by createdAt
      if (configA.createdAt && configB.createdAt) {
        return configA.createdAt - configB.createdAt; // Sort in ascending order (oldest first)
      }

      // If only one has createdAt, put the one without createdAt at the end
      if (configA.createdAt) return -1;
      if (configB.createdAt) return 1;

      // If neither has createdAt, sort by type and then name
      const isCustomA = configA.type === ProviderTypeEnum.CustomOpenAI;
      const isCustomB = configB.type === ProviderTypeEnum.CustomOpenAI;

      if (isCustomA && !isCustomB) {
        return 1; // Custom providers come after non-custom
      }

      if (!isCustomA && isCustomB) {
        return -1; // Non-custom providers come before custom
      }

      // Sort alphabetically by name within each group
      return (configA.name || keyA).localeCompare(configB.name || keyB);
    });
  };

  const handleProviderSelection = (providerType: string) => {
    // Close the dropdown immediately
    setIsProviderSelectorOpen(false);

    // Handle custom provider
    if (providerType === ProviderTypeEnum.CustomOpenAI) {
      addCustomProvider();
      return;
    }

    // Handle Azure OpenAI specially to allow multiple instances
    if (providerType === ProviderTypeEnum.AzureOpenAI) {
      addAzureProvider();
      return;
    }

    // Handle built-in supported providers
    addBuiltInProvider(providerType);
  };

  // New function to add Azure providers with unique IDs
  const addAzureProvider = () => {
    // Count existing Azure providers
    const azureProviders = Object.keys(providers).filter(
      key => key === ProviderTypeEnum.AzureOpenAI || key.startsWith(`${ProviderTypeEnum.AzureOpenAI}_`),
    );
    const nextNumber = azureProviders.length + 1;

    // Create unique ID
    const providerId =
      nextNumber === 1 ? ProviderTypeEnum.AzureOpenAI : `${ProviderTypeEnum.AzureOpenAI}_${nextNumber}`;

    // Create config with appropriate name
    const config = getDefaultProviderConfig(ProviderTypeEnum.AzureOpenAI);
    config.name = `Azure OpenAI ${nextNumber}`;

    // Add to providers
    setProviders(prev => ({
      ...prev,
      [providerId]: config,
    }));

    setModifiedProviders(prev => new Set(prev).add(providerId));
    newlyAddedProviderRef.current = providerId;

    // Scroll to the newly added provider after render
    setTimeout(() => {
      const providerElement = document.getElementById(`provider-${providerId}`);
      if (providerElement) {
        providerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Add and remove Azure deployments
  const addAzureDeployment = (provider: string, deploymentName: string) => {
    if (!deploymentName.trim()) return;

    setModifiedProviders(prev => new Set(prev).add(provider));
    setProviders(prev => {
      const providerData = prev[provider] || {};

      // Initialize or use existing deploymentNames array
      const deploymentNames = providerData.azureDeploymentNames || [];

      // Don't add duplicates
      if (deploymentNames.includes(deploymentName.trim())) return prev;

      return {
        ...prev,
        [provider]: {
          ...providerData,
          azureDeploymentNames: [...deploymentNames, deploymentName.trim()],
        },
      };
    });

    // Clear the input
    setNewModelInputs(prev => ({
      ...prev,
      [provider]: '',
    }));
  };

  const removeAzureDeployment = (provider: string, deploymentToRemove: string) => {
    setModifiedProviders(prev => new Set(prev).add(provider));

    setProviders(prev => {
      const providerData = prev[provider] || {};

      // Get current deployments
      const deploymentNames = providerData.azureDeploymentNames || [];

      // Filter out the deployment to remove
      const filteredDeployments = deploymentNames.filter(name => name !== deploymentToRemove);

      return {
        ...prev,
        [provider]: {
          ...providerData,
          azureDeploymentNames: filteredDeployments,
        },
      };
    });
  };

  const handleAzureApiVersionChange = (provider: string, apiVersion: string) => {
    setModifiedProviders(prev => new Set(prev).add(provider));
    setProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        azureApiVersion: apiVersion.trim(),
      },
    }));
  };

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 space-y-12 duration-700 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>

      {/* LLM Providers Section */}
      <div className="mb-6 flex items-center justify-between px-4">
        <div>
          <h2 className="font-outfit text-3xl font-black tracking-tight">Intelligence Nodes</h2>
          <p className={`mt-1 text-sm font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            Neural endpoint configurations & hardware acceleration
          </p>
        </div>

        <div className="group/add provider-selector-container relative">
          <button
            onClick={() => {
              console.log('[ModelSettings] Toggling provider selector. Current state:', !isProviderSelectorOpen);
              setIsProviderSelectorOpen(!isProviderSelectorOpen);
            }}
            className={`flex items-center gap-3 rounded-2xl px-8 py-4 text-xs font-black uppercase tracking-widest shadow-xl transition-all duration-300 hover:scale-105 active:scale-95${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
          >
            Add New Neural Provider
            <FiChevronDown className={`transition-transform duration-300 ${isProviderSelectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProviderSelectorOpen && (
            <div className={`animate-in fade-in zoom-in-95 absolute right-0 z-[999] mt-4 w-72 overflow-hidden rounded-[2rem] border p-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl duration-200 ${isDarkMode ? 'border-white/10 bg-slate-900/95' : 'border-slate-200 bg-white/95'
              }`}>
              <div className="mb-2 px-4 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Select Architecture</p>
              </div>
              {Object.values(ProviderTypeEnum)
                .filter(type => type !== ProviderTypeEnum.CustomOpenAI)
                .map(type => {
                  const isAdded = providersFromStorage.has(type) || modifiedProviders.has(type);
                  const isAzure = type === ProviderTypeEnum.AzureOpenAI;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        console.log(`[ModelSettings] User selected provider type: ${type}`);
                        handleProviderSelection(type);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-[14px] font-bold transition-all duration-200 ${isDarkMode
                        ? 'text-slate-300 hover:bg-indigo-500/20 hover:text-white'
                        : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                        } ${isAdded && !isAzure ? 'cursor-not-allowed opacity-40' : ''}`}
                      disabled={isAdded && !isAzure}
                    >
                      <span>{getDefaultDisplayNameFromProviderId(type)}</span>
                      {isAdded && !isAzure && <FiCheck size={14} className="text-emerald-500" />}
                    </button>
                  );
                })}
              <div className="my-2 border-t border-white/5"></div>
              <button
                onClick={() => handleProviderSelection(ProviderTypeEnum.CustomOpenAI)}
                className={`w-full rounded-2xl px-5 py-3.5 text-left text-[14px] font-bold transition-all duration-200 ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
              >
                Custom OpenAI Compatible
              </button>
            </div>
          )}
        </div>
      </div>

      <section className={`group overflow-visible rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'border-white/5 bg-[#1a1c23]/60 shadow-2xl backdrop-blur-3xl' : 'border-slate-200 bg-white/80 shadow-xl'
        }`}>

        <div className="divide-y divide-white/[0.03]">
          {getSortedProviders().length === 0 ? (
            <div className="p-20 text-center">
              <div className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                <FiCpu size={32} />
              </div>
              <h3 className="mb-2 text-xl font-bold">No Active Proccessors</h3>
              <p className={`mx-auto max-w-xs text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Connect an AI provider to enable WebSurfer&#39;s autonomous navigation capabilities.
              </p>
            </div>
          ) : (
            getSortedProviders().map(([providerId, providerConfig]) => {
              if (!providerConfig || !providerConfig.type) return null;
              const isModified = modifiedProviders.has(providerId);
              const isInStorage = providersFromStorage.has(providerId);

              return (
                <div key={providerId} id={`provider-${providerId}`} className="p-10 transition-all duration-300 hover:bg-white/[0.02]">
                  <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter shadow-sm ${isInStorage
                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                        : (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700')
                        }`}>
                        {isInStorage ? 'Live Node' : 'Draft Intake'}
                      </div>
                      <h3 className="font-outfit text-xl font-black uppercase tracking-tight">{providerConfig.name || providerId}</h3>
                      {isModified && !isInStorage && (
                        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-400">Awaiting Sync</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {isModified && !isInStorage && (
                        <button
                          className="rounded-2xl px-5 py-2.5 text-sm font-bold opacity-60 transition-opacity hover:opacity-100"
                          onClick={() => handleCancelProvider(providerId)}
                        >
                          Discard
                        </button>
                      )}
                      <button
                        className={`flex items-center justify-center gap-2 rounded-2xl px-8 py-3 text-[13px] font-black uppercase tracking-widest shadow-2xl transition-all duration-300 active:scale-95 disabled:opacity-30${getButtonProps(providerId).variant === 'danger'
                          ? 'bg-red-500/10 text-red-500 shadow-red-500/10 ring-1 ring-red-500/20 hover:bg-red-500 hover:text-white'
                          : 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-indigo-500/40'
                          }`}
                        disabled={getButtonProps(providerId).disabled}
                        onClick={() => isInStorage && !isModified ? handleDelete(providerId) : handleSave(providerId)}
                      >
                        {getButtonProps(providerId).children}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {providerConfig.type === ProviderTypeEnum.CustomOpenAI && (
                      <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Identity Label</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g. Local Research Engine"
                          value={providerConfig.name || ''}
                          onChange={e => handleNameChange(providerId, e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Encryption Key</label>
                      <div className="group relative">
                        <input
                          type={visibleApiKeys[providerId] ? 'text' : 'password'}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-mono text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                          placeholder="••••••••••••••••"
                          value={providerConfig.apiKey || ''}
                          onChange={e => handleApiKeyChange(providerId, e.target.value, providerConfig.baseUrl)}
                        />
                        <button
                          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 transition-opacity hover:opacity-100"
                          onClick={() => toggleApiKeyVisibility(providerId)}
                        >
                          {visibleApiKeys[providerId] ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>

                    {(providerConfig.type === ProviderTypeEnum.CustomOpenAI ||
                      providerConfig.type === ProviderTypeEnum.Ollama ||
                      providerConfig.type === ProviderTypeEnum.AzureOpenAI ||
                      providerConfig.type === ProviderTypeEnum.OpenRouter ||
                      providerConfig.type === ProviderTypeEnum.Llama) && (
                        <div className="space-y-3">
                          <label className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Networking Endpoint</label>
                          <input
                            type="text"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-mono text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://api.openai.com/v1"
                            value={providerConfig.baseUrl || ''}
                            onChange={e => handleApiKeyChange(providerId, providerConfig.apiKey || '', e.target.value)}
                          />
                        </div>
                      )}

                    {providerConfig.type === ProviderTypeEnum.Ollama && (
                      <div className="flex items-start gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 md:col-span-2">
                        <div className="mt-1 text-amber-500"><FiShield /></div>
                        <p className="text-[13px] font-medium leading-relaxed text-amber-500/80">
                          Critical: Ensure CORS permissions are active. Run Ollama with <code className="rounded bg-black/20 px-1.5 py-0.5 font-bold text-amber-500">OLLAMA_ORIGINS=chrome-extension://*</code>
                        </p>
                      </div>
                    )}
                  </div>

                  {providerConfig.type !== ProviderTypeEnum.AzureOpenAI && (
                    <div className="mt-8 space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Intelligence Matrix (Models)</label>
                      <div className="flex min-h-[80px] flex-wrap gap-2.5 rounded-[2rem] border border-white/5 bg-black/20 p-6">
                        {(providerConfig.modelNames || llmProviderModelNames[providerId as keyof typeof llmProviderModelNames] || []).map(model => (
                          <div key={model} className="group/tag flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-xs font-black uppercase tracking-tight text-indigo-400 transition-all hover:bg-indigo-500 hover:text-white">
                            {model}
                            <button onClick={() => removeModel(providerId, model)} className="opacity-0 transition-opacity group-hover/tag:opacity-100">
                              <FiX size={10} />
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          className="ml-2 border-none bg-transparent text-xs font-bold text-white outline-none placeholder:text-white/20"
                          placeholder="Add Model ID..."
                          value={newModelInputs[providerId] || ''}
                          onChange={e => handleModelsChange(providerId, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addModel(providerId, (newModelInputs[providerId] || '').trim());
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Agent Calibration Section */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'border-indigo-500/20 bg-indigo-600/5 shadow-2xl backdrop-blur-3xl' : 'border-slate-200 bg-white shadow-xl'
        }`}>
        <div className={`flex items-center gap-6 border-b px-10 py-8 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className={`flex size-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
            }`}>
            <FiShield size={24} />
          </div>
          <div>
            <h2 className="font-outfit text-2xl font-black tracking-tight text-white">Agent Calibration</h2>
            <p className={`mt-1 text-[13px] font-medium ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
              Assigned cognitive roles and parameter tuning
            </p>
          </div>
        </div>
        <div className="space-y-8 p-10">
          {renderModelSelect(AgentNameEnum.Planner)}
          {renderModelSelect(AgentNameEnum.Navigator)}
        </div>
      </section>

      {/* Voice Transcription Section */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5 shadow-2xl backdrop-blur-3xl' : 'border-slate-200 bg-white shadow-xl'
        }`}>
        <div className={`flex items-center gap-6 border-b px-10 py-8 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className={`flex size-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            }`}>
            <FiTrendingUp size={24} />
          </div>
          <div>
            <h2 className="font-outfit text-2xl font-black tracking-tight text-white">Vocal Intelligence</h2>
            <p className={`mt-1 text-[13px] font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Real-time speech analysis and transcription
            </p>
          </div>
        </div>
        <div className="p-10">
          <div className="max-w-md space-y-4">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Primary Audio Processor</label>
            <div className="group/sel relative">
              <select
                className={`w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                value={selectedSpeechToTextModel}
                onChange={e => handleSpeechToTextModelChange(e.target.value)}
              >
                <option value="" className="bg-[#1a1c23]">Disable Voice Command</option>
                {availableModels
                  .filter(({ provider }) => providers[provider]?.type === ProviderTypeEnum.Gemini)
                  .map(({ provider, providerName, model }) => (
                    <option key={`${provider}>${model}`} value={`${provider}>${model}`} className="bg-[#1a1c23]">
                      {`${providerName} | ${model}`}
                    </option>
                  ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 opacity-40 transition-opacity group-hover/sel:opacity-100" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
