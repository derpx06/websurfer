import { useState, useEffect } from 'react';
import { type GeneralSettingsConfig, generalSettingsStore, DEFAULT_GENERAL_SETTINGS } from '@extension/storage';
import { t } from '@extension/i18n';

interface GeneralSettingsProps {
  isDarkMode?: boolean;
}

export const GeneralSettings = ({ isDarkMode = false }: GeneralSettingsProps) => {
  const [settings, setSettings] = useState<GeneralSettingsConfig>(DEFAULT_GENERAL_SETTINGS);

  useEffect(() => {
    // Load initial settings
    generalSettingsStore.getSettings().then(setSettings);
  }, []);

  const updateSetting = async <K extends keyof GeneralSettingsConfig>(key: K, value: GeneralSettingsConfig[K]) => {
    // Optimistically update the local state for responsiveness
    setSettings(prevSettings => ({ ...prevSettings, [key]: value }));

    // Call the store to update the setting
    await generalSettingsStore.updateSettings({ [key]: value } as Partial<GeneralSettingsConfig>);

    // After the store update (which might have side effects, e.g., useVision affecting displayHighlights),
    // fetch the latest settings from the store and update the local state again to ensure UI consistency.
    const latestSettings = await generalSettingsStore.getSettings();
    setSettings(latestSettings);
  };

  return (
    <div className="page" id="tab-general">
      <div className="page-header">
        <div>
          <div className="page-title">General</div>
          <div className="page-sub">Appearance, behaviour and extension preferences</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon amber">
              <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <div className="card-title">Preferences</div>
              <div className="card-desc">Extension behaviour and UI settings</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {/* Max Steps */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_maxSteps')}</div>
              <div className="toggle-desc">{t('options_general_maxSteps_desc')}</div>
            </div>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.maxSteps}
              onChange={e => updateSetting('maxSteps', Number.parseInt(e.target.value, 10))}
              className="inp"
              style={{ width: '80px' }}
            />
          </div>

          {/* Max Actions Per Step */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_maxActions')}</div>
              <div className="toggle-desc">{t('options_general_maxActions_desc')}</div>
            </div>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.maxActionsPerStep}
              onChange={e => updateSetting('maxActionsPerStep', Number.parseInt(e.target.value, 10))}
              className="inp"
              style={{ width: '80px' }}
            />
          </div>

          {/* Max Failures */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_maxFailures')}</div>
              <div className="toggle-desc">{t('options_general_maxFailures_desc')}</div>
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxFailures}
              onChange={e => updateSetting('maxFailures', Number.parseInt(e.target.value, 10))}
              className="inp"
              style={{ width: '80px' }}
            />
          </div>

          {/* Enable Vision */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_enableVision')}</div>
              <div className="toggle-desc">{t('options_general_enableVision_desc')}</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.useVision}
                onChange={e => updateSetting('useVision', e.target.checked)}
              />
              <div className="toggle-track">
                <div className="toggle-thumb"></div>
              </div>
            </label>
          </div>

          {/* Display Highlights */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_displayHighlights')}</div>
              <div className="toggle-desc">{t('options_general_displayHighlights_desc')}</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.displayHighlights}
                onChange={e => updateSetting('displayHighlights', e.target.checked)}
              />
              <div className="toggle-track">
                <div className="toggle-thumb"></div>
              </div>
            </label>
          </div>

          {/* Planning Interval */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_planningInterval')}</div>
              <div className="toggle-desc">{t('options_general_planningInterval_desc')}</div>
            </div>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.planningInterval}
              onChange={e => updateSetting('planningInterval', Number.parseInt(e.target.value, 10))}
              className="inp"
              style={{ width: '80px' }}
            />
          </div>

          {/* Min Wait Page Load */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_minWaitPageLoad')}</div>
              <div className="toggle-desc">{t('options_general_minWaitPageLoad_desc')}</div>
            </div>
            <input
              type="number"
              min={250}
              max={5000}
              step={50}
              value={settings.minWaitPageLoad}
              onChange={e => updateSetting('minWaitPageLoad', Number.parseInt(e.target.value, 10))}
              className="inp"
              style={{ width: '80px' }}
            />
          </div>

          {/* Replay Historical Tasks */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-title">{t('options_general_replayHistoricalTasks')}</div>
              <div className="toggle-desc">{t('options_general_replayHistoricalTasks_desc')}</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.replayHistoricalTasks}
                onChange={e => updateSetting('replayHistoricalTasks', e.target.checked)}
              />
              <div className="toggle-track">
                <div className="toggle-thumb"></div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
