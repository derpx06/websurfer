import { useState, useEffect, useCallback } from 'react';
import { firewallStore } from '@extension/storage';
import { t } from '@extension/i18n';
import { FiShield, FiPlus, FiTrash2, FiSlash, FiTarget, FiChevronRight } from 'react-icons/fi';

interface FirewallSettingsProps {
  isDarkMode: boolean;
}

export const FirewallSettings = ({ isDarkMode }: FirewallSettingsProps) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [allowList, setAllowList] = useState<string[]>([]);
  const [denyList, setDenyList] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newUrlType, setNewUrlType] = useState<'allow' | 'deny'>('allow');

  const loadFirewallSettings = useCallback(async () => {
    const settings = await firewallStore.getFirewall();
    setIsEnabled(settings.enabled);
    setAllowList(settings.allowList);
    setDenyList(settings.denyList);
  }, []);

  useEffect(() => {
    loadFirewallSettings();
  }, [loadFirewallSettings]);

  const handleToggleFirewall = async () => {
    await firewallStore.updateFirewall({ enabled: !isEnabled });
    await loadFirewallSettings();
  };

  const handleAddUrl = async () => {
    const cleanUrl = newUrl.trim().replace(/^https?:\/\//, '');
    if (!cleanUrl) return;
    if (newUrlType === 'allow') {
      await firewallStore.addToAllowList(cleanUrl);
    } else {
      await firewallStore.addToDenyList(cleanUrl);
    }
    await loadFirewallSettings();
    setNewUrl('');
  };

  const handleRemoveUrl = async (url: string, listType: 'allow' | 'deny') => {
    if (listType === 'allow') {
      await firewallStore.removeFromAllowList(url);
    } else {
      await firewallStore.removeFromDenyList(url);
    }
    await loadFirewallSettings();
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Firewall Status & Rules Section */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'bg-[#1a1c23]/60 border-white/5 shadow-2xl backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-xl'
        }`}>
        <div className={`border-b px-10 py-8 flex items-center justify-between gap-6 transition-colors duration-500 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className="flex items-center gap-6">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
              }`}>
              <FiShield size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black font-outfit tracking-tight text-white">Domain Sentinel</h2>
              <p className={`text-[13px] font-medium mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                Hardware-level domain filtering and validation
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 group">
            <input type="checkbox" className="sr-only peer" checked={isEnabled} onChange={handleToggleFirewall} />
            <div className={`w-14 h-8 bg-white/5 border border-white/10 peer-focus:outline-none rounded-full peer transition-all duration-300 
              peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] 
              after:bg-white/20 after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-2xl after:backdrop-blur-md
              ${isDarkMode ? 'peer-checked:bg-cyan-500/80' : 'peer-checked:bg-cyan-500'} 
              peer-checked:after:bg-white peer-checked:after:after:shadow-cyan-500/50`}>
            </div>
          </label>
        </div>

        <div className="p-10">
          {/* Active Rules List */}
          <div className="space-y-3 mb-10 min-h-[100px]">
            {allowList.map(url => (
              <div key={`allow-${url}`} className={`group/item flex items-center justify-between px-6 py-4 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'}`}>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Allow</span>
                  <span className={`font-mono text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{url}</span>
                </div>
                <button onClick={() => handleRemoveUrl(url, 'allow')} className={`p-2.5 rounded-xl transition-all duration-300 opacity-0 group-hover/item:opacity-100 ${isDarkMode ? 'hover:bg-red-500/20 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}

            {denyList.map(url => (
              <div key={`deny-${url}`} className={`group/item flex items-center justify-between px-6 py-4 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'}`}>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-lg ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}`}>Block</span>
                  <span className={`font-mono text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{url}</span>
                </div>
                <button onClick={() => handleRemoveUrl(url, 'deny')} className={`p-2.5 rounded-xl transition-all duration-300 opacity-0 group-hover/item:opacity-100 ${isDarkMode ? 'hover:bg-red-500/20 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}

            {allowList.length === 0 && denyList.length === 0 && (
              <div className={`py-16 text-center rounded-[2.5rem] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-slate-100 bg-slate-50/30'}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-white text-slate-300 shadow-sm'}`}>
                    <FiSlash size={32} />
                  </div>
                  <span className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Zero Rules Implemented</span>
                </div>
              </div>
            )}
          </div>

          {/* Add Rule Interface */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-5 rounded-[2rem] border transition-all duration-500 group-within:shadow-2xl ${isDarkMode ? 'bg-black/20 border-white/5 focus-within:border-indigo-500/30' : 'bg-slate-50 border-slate-200'}`}>
            <div className="relative flex-1">
              <FiTarget className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 opacity-50" />
              <input
                type="text"
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-white/5 text-white placeholder-slate-600' : 'bg-white text-slate-900 placeholder-slate-400 shadow-sm'} text-[14px] font-bold font-mono transition-all`}
                placeholder={t('options_firewall_placeholders_domainUrl')}
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
              />
            </div>
            <div className="relative">
              <select
                className={`h-full min-w-[120px] px-6 py-4 rounded-2xl border-0 focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-white/5 text-white cursor-pointer' : 'bg-white text-slate-900 cursor-pointer shadow-sm'} text-[13px] font-black uppercase tracking-wider appearance-none outline-none`}
                value={newUrlType}
                onChange={e => setNewUrlType(e.target.value as 'allow' | 'deny')}>
                <option value="allow" className={isDarkMode ? 'bg-[#1a1c23]' : ''}>Allow</option>
                <option value="deny" className={isDarkMode ? 'bg-[#1a1c23]' : ''}>Block</option>
              </select>
            </div>
            <button
              onClick={handleAddUrl}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all transform active:scale-95"
            >
              <FiPlus size={16} />
              Deploy Rule
            </button>
          </div>
        </div>
      </section>

      {/* Protocol Information */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'bg-emerald-600/5 border-emerald-500/20 shadow-2xl backdrop-blur-3xl' : 'bg-white shadow-xl border-slate-200'
        }`}>
        <div className={`border-b px-10 py-8 flex items-center gap-6 transition-colors duration-500 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            }`}>
            <FiShield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black font-outfit tracking-tight text-white">{t('options_firewall_howItWorks_header')}</h2>
            <p className={`text-[13px] font-medium mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Security protocols and evaluation order
            </p>
          </div>
        </div>
        <div className="p-10 space-y-5">
          {t('options_firewall_howItWorks')
            .split('\n')
            .map((rule, idx) => (
              <div key={idx} className="flex items-start gap-5 group/item">
                <div className={`mt-1.5 flex-shrink-0 transition-transform group-hover/item:translate-x-1 ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>
                  <FiChevronRight size={14} className="opacity-70" />
                </div>
                <p className={`text-[13px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{rule}</p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};
