/** Quality tab - scores overview, issues list, evaluate all */
import { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { request, API_PREFIX } from '../../shared/api/client';
import { keysApi, versionsApi } from '../keys/api';

const LANG_NAMES = {
  fr:'French',es:'Spanish',de:'German',hi:'Hindi',ja:'Japanese',zh:'Chinese',
  ko:'Korean',ar:'Arabic',pt:'Portuguese',ru:'Russian',it:'Italian',nl:'Dutch',
};

export default function QualityPage() {
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await versionsApi.list({ status: 'active', limit: 5000 });
      const versions = res.items || [];
      let scored = 0, totalScore = 0, good = 0, ok = 0, bad = 0, unscored = 0;
      const issuesList = [];
      const byLang = {};

      for (const v of versions) {
        if (v.quality_score != null) {
          const s = Math.round(v.quality_score * 100);
          scored++;
          totalScore += s;
          if (s >= 80) good++;
          else if (s >= 50) ok++;
          else bad++;
          if (s < 70) {
            issuesList.push({ key_id: v.key_id, language: v.language, text: v.text, score: s, version: v.version });
          }
          if (!byLang[v.language]) byLang[v.language] = { total: 0, sum: 0 };
          byLang[v.language].total++;
          byLang[v.language].sum += s;
        } else {
          unscored++;
        }
      }

      const langScores = Object.entries(byLang)
        .map(([lang, d]) => ({ lang, avg: Math.round(d.sum / d.total), count: d.total }))
        .sort((a, b) => a.avg - b.avg);

      setStats({
        total: versions.length, scored, unscored,
        avg: scored > 0 ? Math.round(totalScore / scored) : 0,
        good, ok, bad, langScores,
      });
      setIssues(issuesList.sort((a, b) => a.score - b.score).slice(0, 50));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleEvaluateAll = async () => {
    setEvaluating(true);
    setError(null);
    setEvalProgress('Evaluating all translations...');
    try {
      const res = await request(`${API_PREFIX}/quality/evaluate-all?limit=5000`, { method: 'POST' });
      setSuccess(`Evaluated ${res.translations_evaluated} translations across ${res.keys_processed} keys.`);
      setEvalProgress('');
      loadData();
    } catch (e) { setError(e.message); }
    finally { setEvaluating(false); setEvalProgress(''); }
  };

  if (loading) return (
    <div className="page">
      <header className="page-header"><h1><ShieldCheck size={26} className="page-icon" /> Quality</h1></header>
      <div className="loading"><Loader2 size={24} className="spin" /></div>
    </div>
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1><ShieldCheck size={26} className="page-icon" /> Quality</h1>
        <button className="btn btn-purple btn-sm" onClick={handleEvaluateAll} disabled={evaluating}>
          {evaluating ? <><Loader2 size={14} className="spin" /> {evalProgress}</> : <><RefreshCw size={14} /> Evaluate all</>}
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card card">
              <div className="stat-value">{stats.avg}%</div>
              <div className="stat-label">Average Score</div>
            </div>
            <div className="stat-card card">
              <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.good}</div>
              <div className="stat-label">Good (80+)</div>
            </div>
            <div className="stat-card card">
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.ok}</div>
              <div className="stat-label">Needs Review (50-79)</div>
            </div>
            <div className="stat-card card">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.bad}</div>
              <div className="stat-label">Poor (&lt;50)</div>
            </div>
          </div>

          {stats.unscored > 0 && (
            <div className="info-banner"><AlertTriangle size={16} /> {stats.unscored} translations not yet scored. Click "Evaluate all" to score them.</div>
          )}

          <div className="dashboard-row">
            <div className="card dash-panel">
              <h3>Score by Language</h3>
              {stats.langScores.length === 0 ? <p className="muted">No scored translations.</p> : (
                <div className="lang-bars">
                  {stats.langScores.map(({ lang, avg, count }) => (
                    <div key={lang} className="lang-bar-row">
                      <span className="lang-bar-label">{LANG_NAMES[lang] || lang}</span>
                      <div className="lang-bar-track">
                        <div className="lang-bar-fill" style={{
                          width: `${avg}%`,
                          background: avg >= 80 ? 'var(--success)' : avg >= 50 ? 'var(--warning)' : 'var(--danger)',
                        }} />
                      </div>
                      <span className="lang-bar-count">{avg}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card dash-panel">
              <h3>Low Quality Translations ({issues.length})</h3>
              {issues.length === 0 ? <p className="muted"><CheckCircle size={16} /> All translations are above threshold.</p> : (
                <div className="issues-list">
                  {issues.slice(0, 15).map((item, i) => (
                    <div key={i} className="issue-row">
                      <span className={`q-badge ${item.score >= 50 ? 'q-ok' : 'q-bad'}`}>{item.score}</span>
                      <span className="issue-key">{item.key_id}</span>
                      <span className="issue-lang">{item.language}</span>
                      <span className="issue-text">{item.text?.slice(0, 40)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
