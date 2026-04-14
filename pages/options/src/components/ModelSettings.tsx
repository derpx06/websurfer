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
import { Button } from '@extension/ui';
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

        // Track which providers are from storage
        const fromStorage = new Set(Object.keys(allProviders));
        setProvidersFromStorage(fromStorage);

        // Only use providers from storage, don't add default ones
        setProviders(allProviders);
      } catch (error) {
        console.error('Error loading providers:', error);
        // Set empty providers on error
        setProviders({});
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
    const pillClass = isPlanner ? 'planner' : 'navigator';

    return (
      <div className="agent-card">
        <div className="agent-head">
          <div className={`agent-pill ${pillClass}`}>
            <div className="agent-pill-dot"></div>
            {isPlanner ? 'Planner' : 'Navigator'}
          </div>
          <div className="agent-role">{getAgentDescription(agentName)}</div>
        </div>

        <div className="agent-body">
          {/* Model Row */}
          <div className="model-row">
            <div className="model-label">Model</div>
            <div className="sel-wrap">
              <select
                className="model-sel"
                disabled={availableModels.length === 0}
                value={selectedModels[agentName] || ''}
                onChange={e => handleModelChange(agentName, e.target.value)}>
                <option value="">{t('options_models_chooseModel')}</option>
                {availableModels.map(({ provider, providerName, model }) => (
                  <option key={`${provider}>${model}`} value={`${provider}>${model}`}>
                    {`${providerName} > ${model}`}
                  </option>
                ))}
              </select>
              <div className="sel-arrow">
                <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {selectedModels[agentName] && !isOpenAIReasoningModel(selectedModels[agentName]) && (
            <div className="slider-row">
              <div className="model-label" style={{ minWidth: '80px' }}>{t('options_models_labels_temperature')}</div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={modelParameters[agentName].temperature}
                style={{
                  background: `linear-gradient(90deg, #38bdf8 ${(modelParameters[agentName].temperature / 2) * 100}%, rgba(13,26,46,1) ${(modelParameters[agentName].temperature / 2) * 100}%)`,
                }}
                onChange={e => handleParameterChange(agentName, 'temperature', Number.parseFloat(e.target.value))}
              />
              <div className="slider-val">{modelParameters[agentName].temperature.toFixed(2)}</div>
              <input
                type="number"
                min="0"
                max="2"
                step="0.01"
                value={modelParameters[agentName].temperature}
                onChange={e => {
                  const value = Number.parseFloat(e.target.value);
                  if (!Number.isNaN(value) && value >= 0 && value <= 2) {
                    handleParameterChange(agentName, 'temperature', value);
                  }
                }}
                className="slider-input"
              />
            </div>
          )}

          {selectedModels[agentName] &&
            !isOpenAIReasoningModel(selectedModels[agentName]) &&
            !isAnthropicModel(selectedModels[agentName]) && (
              <div className="slider-row">
                <div className="model-label" style={{ minWidth: '80px' }}>{t('options_models_labels_topP')}</div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={modelParameters[agentName].topP}
                  style={{
                    background: `linear-gradient(90deg, #38bdf8 ${modelParameters[agentName].topP * 100}%, rgba(13,26,46,1) ${modelParameters[agentName].topP * 100}%)`,
                  }}
                  onChange={e => handleParameterChange(agentName, 'topP', Number.parseFloat(e.target.value))}
                />
                <div className="slider-val">{modelParameters[agentName].topP.toFixed(3)}</div>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.001"
                  value={modelParameters[agentName].topP}
                  onChange={e => {
                    const value = Number.parseFloat(e.target.value);
                    if (!Number.isNaN(value) && value >= 0 && value <= 1) {
                      handleParameterChange(agentName, 'topP', value);
                    }
                  }}
                  className="slider-input"
                />
              </div>
            )}

          {/* Reasoning Effort (O-series models) */}
          {selectedModels[agentName] && isOpenAIReasoningModel(selectedModels[agentName]) && (
            <div className="model-row">
              <div className="model-label">{t('options_models_labels_reasoning')}</div>
              <div className="sel-wrap">
                <select
                  value={reasoningEffort[agentName] || (agentName === AgentNameEnum.Planner ? 'low' : 'minimal')}
                  onChange={e =>
                    handleReasoningEffortChange(agentName, e.target.value as 'minimal' | 'low' | 'medium' | 'high')
                  }
                  className="model-sel">
                  <option value="minimal">Minimal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <div className="sel-arrow">
                  <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          )}
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
    // Get the default provider configuration
    const config = getDefaultProviderConfig(provider);

    // Add the provider to the state
    setProviders(prev => ({
      ...prev,
      [provider]: config,
    }));

    // Mark as modified so it shows up in the UI
    setModifiedProviders(prev => new Set(prev).add(provider));

    // Set the newly added provider ref
    newlyAddedProviderRef.current = provider;

    // Scroll to the newly added provider after render
    setTimeout(() => {
      const providerElement = document.getElementById(`provider-${provider}`);
      if (providerElement) {
        providerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Sort providers to ensure newly added providers appear at the bottom
  const getSortedProviders = () => {
    // Filter providers to only include those from storage and newly added providers
    const filteredProviders = Object.entries(providers).filter(([providerId, config]) => {
      // ALSO filter out any provider missing a config or type, to satisfy TS
      if (!config || !config.type) {
        console.warn(`Filtering out provider ${providerId} with missing config or type.`);
        return false;
      }

      // Include if it's from storage
      if (providersFromStorage.has(providerId)) {
        return true;
      }

      // Include if it's a newly added provider (has been modified)
      if (modifiedProviders.has(providerId)) {
        return true;
      }

      // Exclude providers that aren't from storage and haven't been modified
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
    <div className="page" id="tab-models">
      <div className="page-header">
        <div>
          <div className="page-title">Models & Providers</div>
          <div className="page-sub">Configure LLM endpoints and agent roles</div>
        </div>
      </div>

      {/* LLM Providers Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon cyan">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>
            <div>
              <div className="card-title">LLM Providers</div>
              <div className="card-desc">API keys and endpoint configurations</div>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ padding: '0' }}>
          {getSortedProviders().length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-dim)' }}>
              {t('options_models_providers_notConfigured')}
            </div>
          ) : (
            getSortedProviders().map(([providerId, providerConfig]) => {
              if (!providerConfig || !providerConfig.type) return null;
              const isModified = modifiedProviders.has(providerId);
              const isInStorage = providersFromStorage.has(providerId);

              return (
                <div key={providerId} className="provider-item" id={`provider-${providerId}`}>
                  <div className="provider-head">
                    <div className="provider-info">
                      <div className="provider-name">{providerConfig.name || providerId}</div>
                      {isModified && !isInStorage && <div className="p-tag">New</div>}
                    </div>
                    <div className="provider-actions">
                      {isModified && !isInStorage && (
                        <button className="btn btn-sec" onClick={() => handleCancelProvider(providerId)}>
                          Cancel
                        </button>
                      )}
                      <button
                        className={`btn ${getButtonProps(providerId).variant === 'danger' ? 'btn-danger' : 'btn-prim'}`}
                        disabled={getButtonProps(providerId).disabled}
                        onClick={() =>
                          isInStorage && !isModified ? handleDelete(providerId) : handleSave(providerId)
                        }>
                        {getButtonProps(providerId).children}
                      </button>
                    </div>
                  </div>

                  <div className="provider-form">
                    {/* Setup instructions for new providers */}
                    {isModified && !isInStorage && (
                      <div className="mb-4 text-sm" style={{ color: 'var(--cyan)' }}>
                        {t('options_models_providers_setupInstructions')}
                      </div>
                    )}

                    {/* Name input for Custom Providers */}
                    {providerConfig.type === ProviderTypeEnum.CustomOpenAI && (
                      <div className="field">
                        <label className="field-label">Provider Name</label>
                        <input
                          type="text"
                          className="inp w-full"
                          placeholder="My Provider"
                          value={providerConfig.name || ''}
                          onChange={e => handleNameChange(providerId, e.target.value)}
                        />
                        {nameErrors[providerId] && (
                          <div className="text-xs mt-1" style={{ color: 'var(--red)' }}>{nameErrors[providerId]}</div>
                        )}
                      </div>
                    )}

                    {/* API Key */}
                    <div className="field">
                      <label className="field-label">API Key</label>
                      <div className="relative">
                        <input
                          type={visibleApiKeys[providerId] ? 'text' : 'password'}
                          className="inp w-full"
                          placeholder="sk-..."
                          value={providerConfig.apiKey || ''}
                          onChange={e => handleApiKeyChange(providerId, e.target.value, providerConfig.baseUrl)}
                        />
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                          onClick={() => toggleApiKeyVisibility(providerId)}>
                          {visibleApiKeys[providerId] ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Base URL / Endpoint */}
                    {(providerConfig.type === ProviderTypeEnum.CustomOpenAI ||
                      providerConfig.type === ProviderTypeEnum.Ollama ||
                      providerConfig.type === ProviderTypeEnum.AzureOpenAI ||
                      providerConfig.type === ProviderTypeEnum.OpenRouter ||
                      providerConfig.type === ProviderTypeEnum.Llama) && (
                        <div className="field">
                          <label className="field-label">
                            {providerConfig.type === ProviderTypeEnum.AzureOpenAI ? 'Azure Endpoint' : 'Base URL'}
                          </label>
                          <input
                            type="text"
                            className="inp w-full"
                            placeholder="https://api.openai.com/v1"
                            value={providerConfig.baseUrl || ''}
                            onChange={e => handleApiKeyChange(providerId, providerConfig.apiKey || '', e.target.value)}
                          />
                        </div>
                      )}

                    {/* Azure Specifics */}
                    {providerConfig.type === ProviderTypeEnum.AzureOpenAI && (
                      <>
                        <div className="field">
                          <label className="field-label">API Version</label>
                          <input
                            type="text"
                            className="inp w-full"
                            placeholder="2023-05-15"
                            value={providerConfig.azureApiVersion || ''}
                            onChange={e => handleAzureApiVersionChange(providerId, e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label className="field-label">Deployments (comma separated or enter)</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(providerConfig.azureDeploymentNames || []).map(name => (
                              <div key={name} className="p-tag badge">
                                {name}
                                <span onClick={() => removeAzureDeployment(providerId, name)} style={{ marginLeft: '4px', cursor: 'pointer' }}>×</span>
                              </div>
                            ))}
                          </div>
                          <input
                            type="text"
                            className="inp w-full"
                            placeholder="gpt-4, gpt-35-turbo"
                            value={newModelInputs[providerId] || ''}
                            onChange={e => handleModelsChange(providerId, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addAzureDeployment(providerId, (newModelInputs[providerId] || '').trim());
                              }
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* Model IDs / Tags */}
                    {providerConfig.type !== ProviderTypeEnum.AzureOpenAI && (
                      <div className="field">
                        <label className="field-label">Models (press Enter to add)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(providerConfig.modelNames || llmProviderModelNames[providerId as keyof typeof llmProviderModelNames] || []).map(model => (
                            <div key={model} className="p-tag badge">
                              {model}
                              <span onClick={() => removeModel(providerId, model)} style={{ marginLeft: '4px', cursor: 'pointer' }}>×</span>
                            </div>
                          ))}
                        </div>
                        <input
                          type="text"
                          className="inp w-full"
                          placeholder="gpt-4o, llama3..."
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
                    )}

                    {/* Ollama Alert */}
                    {providerConfig.type === ProviderTypeEnum.Ollama && (
                      <div className="p-alert info" style={{ marginTop: '12px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                        <span>Set <code>OLLAMA_ORIGINS=chrome-extension://*</code> in your environment.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Add Provider — native select avoids overflow:hidden clipping */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div className="sel-wrap">
              <select
                className="model-sel"
                value=""
                onChange={e => {
                  if (e.target.value) handleProviderSelection(e.target.value);
                }}
                style={{ width: '100%', fontWeight: '500' }}>
                <option value="" disabled>+ Add New Provider…</option>
                {Object.values(ProviderTypeEnum)
                  .filter(
                    type =>
                      type === ProviderTypeEnum.AzureOpenAI ||
                      (!providersFromStorage.has(type) && !modifiedProviders.has(type)),
                  )
                  .map(type => (
                    <option key={type} value={type}>
                      {getDefaultDisplayNameFromProviderId(type)}
                    </option>
                  ))}
                <option value={ProviderTypeEnum.CustomOpenAI}>OpenAI Compatible (Custom)</option>
              </select>
              <div className="sel-arrow">
                <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection Card */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon violet">
              <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2c-2.5 3-4 6.4-4 10s1.5 7 4 10M12 2c2.5 3 4 6.4 4 10s-1.5 7-4 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div>
              <div className="card-title">Model Selection</div>
              <div className="card-desc">Assign models and tune parameters for each agent</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {renderModelSelect(AgentNameEnum.Planner)}
          {renderModelSelect(AgentNameEnum.Navigator)}
        </div>
      </div>

      {/* STT Section */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon vio">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div>
              <div className="card-title">Speech-to-Text</div>
              <div className="card-desc">Transcribe voice commands using Gemini</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="field">
            <label className="field-label">Transcription Model</label>
            <select
              className="model-sel"
              value={selectedSpeechToTextModel}
              onChange={e => handleSpeechToTextModelChange(e.target.value)}>
              <option value="">{t('options_models_chooseModel')}</option>
              {availableModels
                .filter(({ provider }) => providers[provider]?.type === ProviderTypeEnum.Gemini)
                .map(({ provider, providerName, model }) => (
                  <option key={`${provider}>${model}`} value={`${provider}>${model}`}>
                    {`${providerName} > ${model}`}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
