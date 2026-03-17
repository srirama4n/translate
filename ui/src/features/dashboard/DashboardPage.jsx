/** Dashboard — stats overview */
import { useState, useEffect } from 'react';
import { BarChart3, Key, Languages, Globe, TrendingUp, Loader2 } from 'lucide-react';
import { keysApi, versionsApi } from '../keys/api';

const FLAGS = {
  fr:'🇫🇷',es:'🇪🇸',de:'🇩🇪',hi:'🇮🇳',ja:'🇯🇵',zh:'🇨🇳',ko:'🇰🇷',
  ar:'🇸🇦',pt:'🇧🇷',ru:'🇷🇺',it:'🇮🇹',nl:'🇳🇱',sv:'🇸🇪',pl:'🇵🇱',
  tr:'🇹🇷',th:'🇹🇭',vi:'🇻🇳',id:'🇮🇩',uk:'🇺🇦',cs:'🇨🇿',
};

const LANG_NAMES = {
  fr:'French',es:'Spanish',de:'German',hi:'Hindi',ja:'Japanese',zh:'Chinese',
  ko:'Korean',ar:'Arabic',pt:'Portuguese',ru:'Russian',it:'Italian',nl:'Dutch',
  sv:'Swedish',pl:'Polish',tr:'Turkish',th:'Thai',vi:'Vietnamese',id:'Indonesian',
  uk:'Ukrainian',cs:'Czech',ro:'Romanian',el:'Greek',he:'Hebrew',hu:'Hungarian',
  da:'Danish',fi:'Finnish',no:'Norwegian',
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [keysRes, versionsRes] = await Promise.all([
          keysApi.list({ limit: 1 }),
          versionsApi.list({ status: 'active', limit: 500 }),
        ]);
        if (cancelled) return;

        const totalKeys = keysRes.total || 0;
        const versions = versionsRes.items || [];
        const langCount = {};
        const keyLangSets = {};

        for (const v of versions) {
          langCount[v.language] = (langCount[v.language] || 0) + 1;
          if (!keyLangSets[v.key_id]) keyLangSets[v.key_id] = {};
          keyLangSets[v.key_id][v.language] = true;
        }

        const topLangs = Object.entries(langCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        const maxLangCount = topLangs.length > 0 ? topLangs[0][1] : 1;

        let totalLangCount = 0;
        for (const key of Object.keys(keyLangSets)) {
          totalLangCount += Object.keys(keyLangSets[key]).length;
        }
        const completeness = totalKeys > 0
          ? Math.min(Math.round((totalLangCount / (totalKeys * 50)) * 100), 100)
          : 0;

        setStats({
          totalKeys,
          totalTranslations: versions.length,
          uniqueLanguages: Object.keys(langCount).length,
          topLangs,
          maxLangCount,
          completeness,
          recentVersions: versions.slice(0, 5),
        });
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1><BarChart3 size={26} className="page-icon" /> Dashboard</h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="loading"><Loader2 size={24} className="spin" /> Loading stats...</div>
      )}

      {!loading && stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card card">
              <div className="stat-icon"><Key size={22} /></div>
              <div className="stat-value">{stats.totalKeys}</div>
              <div className="stat-label">Total Keys</div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><Languages size={22} /></div>
              <div className="stat-value">{stats.totalTranslations}</div>
              <div className="stat-label">Active Translations</div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><Globe size={22} /></div>
              <div className="stat-value">{stats.uniqueLanguages}</div>
              <div className="stat-label">Languages Used</div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><TrendingUp size={22} /></div>
              <div className="stat-value">{stats.completeness}%</div>
              <div className="stat-label">Overall Coverage</div>
            </div>
          </div>

          <div className="dashboard-row">
            <div className="card dash-panel">
              <h3>Top Languages</h3>
              {stats.topLangs.length === 0 ? (
                <p className="muted">No translations yet.</p>
              ) : (
                <div className="lang-bars">
                  {stats.topLangs.map(([lang, count]) => (
                    <div key={lang} className="lang-bar-row">
                      <span className="lang-bar-label">{FLAGS[lang] || '🌐'} {LANG_NAMES[lang] || lang}</span>
                      <div className="lang-bar-track">
                        <div className="lang-bar-fill" style={{ width: `${(count / stats.maxLangCount) * 100}%` }} />
                      </div>
                      <span className="lang-bar-count">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card dash-panel">
              <h3>Recent Translations</h3>
              {stats.recentVersions.length === 0 ? (
                <p className="muted">No translations yet.</p>
              ) : (
                <ul className="recent-list">
                  {stats.recentVersions.map((v, i) => (
                    <li key={i} className="recent-item">
                      <span className="recent-key">{v.key_id}</span>
                      <span className="recent-lang">{FLAGS[v.language] || '🌐'} {v.language}</span>
                      <span className="recent-text">{String(v.text || '').slice(0, 40)}{String(v.text || '').length > 40 ? '...' : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !stats && !error && (
        <p className="muted">No data available. Start by translating some text.</p>
      )}
    </div>
  );
}
