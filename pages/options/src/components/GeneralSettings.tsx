/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useEffect } from 'react';
import { type GeneralSettingsConfig, generalSettingsStore, DEFAULT_GENERAL_SETTINGS } from '@extension/storage';
import { t } from '@extension/i18n';
import { FiSettings, FiShield } from 'react-icons/fi';

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

  const renderToggle = (
    title: string,
    desc: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    accentColor: string = 'indigo'
  ) => (
    <div className={`flex flex-col items-start justify-between gap-6 p-8 transition-all duration-300 sm:flex-row sm:items-center ${isDarkMode ? 'border-b border-white/5 last:border-0 hover:bg-white/[0.02]' : 'border-b border-slate-100 last:border-0 hover:bg-slate-50'
      }`}>
      <div className="flex-1 pr-6">
        <h3 className={`font-outfit text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        <p className={`mt-1.5 text-[13px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      </div>
      <label className="group relative inline-flex shrink-0 cursor-pointer items-center">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`peer h-8 w-14 rounded-full border transition-all duration-300 after:absolute 
          after:left-[4px] after:top-[4px] after:size-6 after:rounded-full after:shadow-2xl 
          after:backdrop-blur-md after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none
          ${isDarkMode ? 'border-white/10 bg-white/5 after:bg-white/20 peer-checked:bg-indigo-500/80 shadow-indigo-500/20' : 'border-slate-200 bg-slate-200 after:bg-white peer-checked:bg-indigo-600 shadow-sm'} 
          peer-checked:after:bg-white peer-checked:after:after:shadow-indigo-500/50`}>
        </div>
      </label>
    </div>
  );

  const renderInput = (
    title: string,
    desc: string,
    value: number,
    onChange: (val: number) => void,
    min: number,
    max: number,
    step: number = 1
  ) => (
    <div className={`flex flex-col items-start justify-between gap-6 p-8 transition-all duration-300 sm:flex-row sm:items-center ${isDarkMode ? 'border-b border-white/5 last:border-0 hover:bg-white/[0.02]' : 'border-b border-slate-100 last:border-0 hover:bg-slate-50'
      }`}>
      <div className="flex-1 pr-6">
        <h3 className={`font-outfit text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        <p className={`mt-1.5 text-[13px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number.parseInt(e.target.value, 10))}
        className={`w-32 rounded-2xl border text-center transition-all duration-300 
          ${isDarkMode ? 'border-white/10 bg-white/5 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            : 'border-slate-200 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10'} 
          px-5 py-4 font-mono text-base font-black shadow-2xl focus:outline-none`}
      />
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-12 duration-700">

      {/* Execution Limits Section */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'border-white/5 bg-[#1a1c23]/60 shadow-2xl backdrop-blur-3xl' : 'border-slate-200 bg-white shadow-xl'
        }`}>
        <div className={`flex items-center gap-6 border-b px-10 py-8 transition-colors duration-500 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className={`flex size-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
            }`}>
            <FiSettings size={24} />
          </div>
          <div>
            <h2 className={`font-outfit text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>System Runtime</h2>
            <p className={`mt-1 text-[13px] font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Safety thresholds and autonomous limits
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          {renderInput(t('options_general_maxSteps'), t('options_general_maxSteps_desc'), settings.maxSteps, val => updateSetting('maxSteps', val), 1, 50)}
          {renderInput(t('options_general_maxActions'), t('options_general_maxActions_desc'), settings.maxActionsPerStep, val => updateSetting('maxActionsPerStep', val), 1, 50)}
          {renderInput(t('options_general_maxFailures'), t('options_general_maxFailures_desc'), settings.maxFailures, val => updateSetting('maxFailures', val), 1, 10)}
          {renderInput(t('options_general_planningInterval'), t('options_general_planningInterval_desc'), settings.planningInterval, val => updateSetting('planningInterval', val), 1, 20)}
          {renderInput(t('options_general_minWaitPageLoad'), t('options_general_minWaitPageLoad_desc'), settings.minWaitPageLoad, val => updateSetting('minWaitPageLoad', val), 250, 5000, 50)}
        </div>
      </section>

      {/* Intelligence & Vision Section */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'border-indigo-500/20 bg-indigo-600/5 shadow-2xl backdrop-blur-3xl' : 'border-slate-200 bg-white shadow-xl'
        }`}>
        <div className={`flex items-center gap-6 border-b px-10 py-8 transition-colors duration-500 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className={`flex size-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
            }`}>
            <FiShield size={24} />
          </div>
          <div>
            <h2 className={`font-outfit text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Cognitive Bio-Feedback</h2>
            <p className={`mt-1 text-[13px] font-medium ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Neural monitoring and visualization systems
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          {renderToggle(t('options_general_enableVision'), t('options_general_enableVision_desc'), settings.useVision, val => updateSetting('useVision', val), 'purple')}
          {renderToggle(t('options_general_displayHighlights'), t('options_general_displayHighlights_desc'), settings.displayHighlights, val => updateSetting('displayHighlights', val), 'emerald')}
          {renderToggle(t('options_general_replayHistoricalTasks'), t('options_general_replayHistoricalTasks_desc'), settings.replayHistoricalTasks, val => updateSetting('replayHistoricalTasks', val), 'indigo')}
        </div>
      </section>
    </div>
  );
};
