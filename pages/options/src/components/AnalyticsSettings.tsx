import React, { useState, useEffect } from 'react';
import { analyticsSettingsStore, chatHistoryStore } from '@extension/storage';
import type { AnalyticsSettingsConfig } from '@extension/storage';
import { FiBarChart2, FiActivity, FiClock, FiAlertCircle, FiShield, FiDatabase } from 'react-icons/fi';

interface AnalyticsSettingsProps {
  isDarkMode: boolean;
}

interface RealStats {
  totalSessions: number;
  totalMessages: number;
  last30DaySessions: number;
  last30DayMessages: number;
  avgMessagesPerSession: number;
  oldestSessionDate: number | null;
}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({ isDarkMode }) => {
  const [settings, setSettings] = useState<AnalyticsSettingsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RealStats>({
    totalSessions: 0,
    totalMessages: 0,
    last30DaySessions: 0,
    last30DayMessages: 0,
    avgMessagesPerSession: 0,
    oldestSessionDate: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [currentSettings, sessions] = await Promise.all([
          analyticsSettingsStore.getSettings(),
          chatHistoryStore.getSessionsMetadata(),
        ]);
        setSettings(currentSettings);

        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount ?? 0), 0);
        const last30 = sessions.filter(s => s.createdAt >= thirtyDaysAgo);
        const last30Messages = last30.reduce((sum, s) => sum + (s.messageCount ?? 0), 0);
        const oldest = sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null;

        setStats({
          totalSessions: sessions.length,
          totalMessages,
          last30DaySessions: last30.length,
          last30DayMessages: last30Messages,
          avgMessagesPerSession: sessions.length > 0 ? Math.round(totalMessages / sessions.length) : 0,
          oldestSessionDate: oldest,
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
    const unsub = analyticsSettingsStore.subscribe(load);
    return () => unsub();
  }, []);

  const handleToggleAnalytics = async (enabled: boolean) => {
    if (!settings) return;
    try {
      await analyticsSettingsStore.updateSettings({ enabled });
      setSettings({ ...settings, enabled });
    } catch (error) {
      console.error('Failed to update analytics settings:', error);
    }
  };

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const daysSince = (ts: number | null) => {
    if (!ts) return '—';
    const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  if (loading) {
    return (
      <div className="space-y-8 p-4">
        <div className={`h-10 w-48 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-40 rounded-[2rem] ${isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-slate-50 border border-slate-100'}`}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* 30-Day Velocity Section */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20 shadow-2xl backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-xl'
        }`}>
        <div className={`border-b px-10 py-8 flex items-center gap-6 transition-colors duration-500 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
            }`}>
            <FiActivity size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black font-outfit tracking-tight text-white italic uppercase">30-Day Velocity</h2>
            <p className={`text-[13px] font-medium mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
              Dynamic performance metrics from your local terminal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10">
          <div className="flex flex-col group/stat">
            <span className={`text-6xl font-black tracking-tighter transition-all duration-500 group-hover/stat:scale-105 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
              {formatNumber(stats.last30DaySessions)}
            </span>
            <span className={`mt-4 text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tasks Executed</span>
          </div>
          <div className="flex flex-col group/stat">
            <span className={`text-6xl font-black tracking-tighter transition-all duration-500 group-hover/stat:scale-105 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {formatNumber(stats.last30DayMessages)}
            </span>
            <span className={`mt-4 text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Packets Processed</span>
          </div>
          <div className="flex flex-col group/stat">
            <span className={`text-6xl font-black tracking-tighter transition-all duration-500 group-hover/stat:scale-105 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {stats.avgMessagesPerSession}
            </span>
            <span className={`mt-4 text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Efficiency Score</span>
          </div>
        </div>
      </section>

      {/* All-Time Historical Logs */}
      <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'bg-[#1a1c23]/60 border-white/5 shadow-2xl backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-xl'
        }`}>
        <div className={`border-b px-10 py-8 flex items-center gap-6 transition-colors duration-500 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
            }`}>
            <FiClock size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black font-outfit tracking-tight text-white italic uppercase">Historical Logs</h2>
            <p className={`text-[13px] font-medium mt-1 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
              Total cumulative telemetry since system initialization
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10">
          <div className="flex flex-col group/stat">
            <span className={`text-6xl font-black tracking-tighter transition-all duration-500 group-hover/stat:scale-105 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {formatNumber(stats.totalSessions)}
            </span>
            <span className={`mt-4 text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Operations</span>
          </div>
          <div className="flex flex-col group/stat">
            <span className={`text-6xl font-black tracking-tighter transition-all duration-500 group-hover/stat:scale-105 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`}>
              {formatNumber(stats.totalMessages)}
            </span>
            <span className={`mt-4 text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>System Signals</span>
          </div>
          <div className="flex flex-col justify-center group/stat">
            <span className={`text-3xl font-black tracking-tight italic transition-all duration-500 group-hover/stat:translate-x-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {daysSince(stats.oldestSessionDate)}
            </span>
            <span className={`mt-4 text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Uptime Record</span>
          </div>
        </div>
      </section>

      {/* Instrumentation Note */}
      <section className={`overflow-hidden rounded-[2rem] border p-8 transition-all duration-500 ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'
        }`}>
        <div className="flex items-start gap-6">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-200 text-amber-700'
            }`}>
            <FiAlertCircle size={24} />
          </div>
          <div>
            <h3 className={`text-lg font-black font-outfit uppercase tracking-tight ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
              Telemetry Instrumentation Required
            </h3>
            <p className={`mt-2 text-[14px] leading-relaxed font-semibold opacity-80 ${isDarkMode ? 'text-amber-200/60' : 'text-amber-700/70'}`}>
              Detailed token consumption tracking and cost analysis require advanced instrumentation. This protocol is currently in standby.
              Existing telemetry is derived strictly from your local data core.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Toggle Section */}
      {settings && (
        <section className={`group overflow-hidden rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl ${isDarkMode ? 'bg-indigo-600/5 border-white/5 shadow-2xl backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-xl'
          }`}>
          <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-inner ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                }`}>
                <FiShield size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black font-outfit uppercase tracking-tight text-white">Anonymous Data Core</h3>
                <p className={`mt-1 text-[13px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Securely share system-level diagnostics. No personal identifiers or data logs are ever exported.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 group">
              <input type="checkbox" className="sr-only peer" checked={settings.enabled} onChange={e => handleToggleAnalytics(e.target.checked)} />
              <div className={`w-14 h-8 bg-white/5 border border-white/10 peer-focus:outline-none rounded-full peer transition-all duration-300 
                peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] 
                after:bg-white/20 after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-2xl after:backdrop-blur-md
                ${isDarkMode ? 'peer-checked:bg-indigo-500/80 shadow-indigo-500/20' : 'peer-checked:bg-indigo-600 shadow-indigo-500/10'} 
                peer-checked:after:bg-white`}>
              </div>
            </label>
          </div>
        </section>
      )}
    </div>
  );
};
