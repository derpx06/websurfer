import { useState, useCallback, useEffect } from 'react';
import { agentModelStore, generalSettingsStore } from '@extension/storage';

export const useConfig = () => {
    const [hasConfiguredModels, setHasConfiguredModels] = useState<boolean | null>(null);
    const [replayEnabled, setReplayEnabled] = useState(false);

    const checkModelConfiguration = useCallback(async () => {
        try {
            const configuredAgents = await agentModelStore.getConfiguredAgents();
            setHasConfiguredModels(configuredAgents.length > 0);
        } catch (error) {
            console.error('Error checking model configuration:', error);
            setHasConfiguredModels(false);
        }
    }, []);

    const loadGeneralSettings = useCallback(async () => {
        try {
            const settings = await generalSettingsStore.getSettings();
            setReplayEnabled(settings.replayHistoricalTasks);
        } catch (error) {
            console.error('Error loading general settings:', error);
            setReplayEnabled(false);
        }
    }, []);

    useEffect(() => {
        checkModelConfiguration();
        loadGeneralSettings();
    }, [checkModelConfiguration, loadGeneralSettings]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                checkModelConfiguration();
                loadGeneralSettings();
            }
        };

        const handleFocus = () => {
            checkModelConfiguration();
            loadGeneralSettings();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [checkModelConfiguration, loadGeneralSettings]);

    return {
        hasConfiguredModels,
        replayEnabled,
        checkModelConfiguration,
        loadGeneralSettings,
    };
};
