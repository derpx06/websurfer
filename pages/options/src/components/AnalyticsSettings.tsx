import React, { useState, useEffect } from 'react';
import { analyticsSettingsStore, chatHistoryStore } from '@extension/storage';
import type { AnalyticsSettingsConfig } from '@extension/storage';

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

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({ isDarkMode: _isDarkMode }) => {
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
      <div className="page" id="tab-analytics">
        <div className="page-header">
          <div>
            <div className="page-title">Analytics</div>
            <div className="page-sub">Usage statistics and task history</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="stat-card">
                <div style={{ background: 'var(--surface2)', borderRadius: '6px', height: '36px', width: '60px', margin: '0 auto 8px' }}></div>
                <div style={{ background: 'var(--surface2)', borderRadius: '4px', height: '12px', width: '80px', margin: '0 auto' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" id="tab-analytics">
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">Real usage statistics from your local session history</div>
        </div>
      </div>

      {/* Real stats from storage */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon green">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <div className="card-title">Last 30 Days</div>
              <div className="card-desc">Derived from local chat history — all data stays on your device</div>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          <div className="stat-card">
            <div className="stat-val" style={{ color: 'var(--cyan)' }}>{formatNumber(stats.last30DaySessions)}</div>
            <div className="stat-label">Conversations</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color: 'var(--violet)' }}>{formatNumber(stats.last30DayMessages)}</div>
            <div className="stat-label">Messages Exchanged</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color: 'var(--green)' }}>{stats.avgMessagesPerSession}</div>
            <div className="stat-label">Avg Msgs / Task</div>
          </div>
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon cyan">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className="card-title">All-Time</div>
              <div className="card-desc">Total since you first installed WebSurfer</div>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          <div className="stat-card">
            <div className="stat-val" style={{ color: 'var(--cyan)' }}>{formatNumber(stats.totalSessions)}</div>
            <div className="stat-label">Total Conversations</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color: 'var(--amber)' }}>{formatNumber(stats.totalMessages)}</div>
            <div className="stat-label">Total Messages</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color: 'var(--sub)', fontSize: '18px' }}>{daysSince(stats.oldestSessionDate)}</div>
            <div className="stat-label">Since First Session</div>
          </div>
        </div>
      </div>

      {/* Token note */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon amber">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div className="card-title">Token Tracking</div>
              <div className="card-desc">Not yet instrumented in this build</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="p-alert info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              Token consumption tracking requires instrumentation at the LLM call level.
              This isn't implemented in the current build — the stats above are derived from local chat history which is always available.
            </span>
          </div>
        </div>
      </div>

      {/* Privacy toggle */}
      {settings && (
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon violet">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div className="card-title">Anonymous Telemetry</div>
                <div className="card-desc">Help improve WebSurfer with aggregate usage data</div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-title">Share anonymous usage data</div>
                <div className="toggle-desc">No personal info, URLs, or prompt content is ever sent</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => handleToggleAnalytics(e.target.checked)}
                />
                <div className="toggle-track">
                  <div className="toggle-thumb"></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
