import { useState, useEffect, useCallback } from 'react';
import { firewallStore } from '@extension/storage';
import { t } from '@extension/i18n';

interface FirewallSettingsProps {
  isDarkMode: boolean;
}

export const FirewallSettings = ({ isDarkMode: _isDarkMode }: FirewallSettingsProps) => {
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

  const TrashIcon = () => (
    <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );

  return (
    <div className="page" id="tab-firewall">
      <div className="page-header">
        <div>
          <div className="page-title">Firewall &amp; Privacy</div>
          <div className="page-sub">Control which domains the agent is allowed to visit</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon cyan">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div className="card-title">Domain Rules</div>
              <div className="card-desc">Block or allow specific domains and URL patterns</div>
            </div>
          </div>
          <label className="toggle" title={t('options_firewall_enableToggle')}>
            <input type="checkbox" checked={isEnabled} onChange={handleToggleFirewall} />
            <div className="toggle-track">
              <div className="toggle-thumb"></div>
            </div>
          </label>
        </div>

        <div className="card-body">
          {allowList.map(url => (
            <div key={`allow-${url}`} className="rule-item">
              <div className="rule-pattern">{url}</div>
              <div className="rule-type allow">Allow</div>
              <button className="rule-del" onClick={() => handleRemoveUrl(url, 'allow')}>
                <TrashIcon />
              </button>
            </div>
          ))}

          {denyList.map(url => (
            <div key={`deny-${url}`} className="rule-item">
              <div className="rule-pattern">{url}</div>
              <div className="rule-type block">Block</div>
              <button className="rule-del" onClick={() => handleRemoveUrl(url, 'deny')}>
                <TrashIcon />
              </button>
            </div>
          ))}

          {allowList.length === 0 && denyList.length === 0 && (
            <div style={{ color: 'var(--sub)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              No rules configured yet
            </div>
          )}

          <div className="add-rule">
            <input
              className="inp"
              placeholder={t('options_firewall_placeholders_domainUrl')}
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
            />
            <select
              className="add-rule-sel"
              value={newUrlType}
              onChange={e => setNewUrlType(e.target.value as 'allow' | 'deny')}>
              <option value="allow">Allow</option>
              <option value="deny">Block</option>
            </select>
            <button className="add-rule-btn" onClick={handleAddUrl}>
              <svg fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Rule
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon green">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <div className="card-title">{t('options_firewall_howItWorks_header')}</div>
              <div className="card-desc">Understanding firewall priority and evaluation order</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {t('options_firewall_howItWorks')
            .split('\n')
            .map((rule, idx) => (
              <div key={idx} className="rule-item" style={{ border: 'none', padding: '5px 0' }}>
                <div className="rule-pattern" style={{ fontSize: '12.5px', color: 'var(--sub)' }}>
                  • {rule}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
