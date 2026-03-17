/** Glossary tab - translation memory entries, consistency check */
import { useState, useEffect, useCallback } from 'react';
import { Database, Loader2, Search, Plus, X, Save, AlertTriangle } from 'lucide-react';
import { request, API_PREFIX } from '../../shared/api/client';
import { versionsApi } from '../keys/api';

export default function GlossaryPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addSource, setAddSource] = useState('');
  const [addLang, setAddLang] = useState('fr');
  const [addTranslation, setAddTranslation] = useState('');
  const [saving, setSaving] = useState(false);
  const [inconsistencies, setInconsistencies] = useState([]);
  const [checking, setChecking] = useState(false);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      const res = await request(`${API_PREFIX}/translation-memory?${params}`);
      let filtered = res.items || [];
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        filtered = filtered.filter((m) =>
          m.source_text?.toLowerCase().includes(s) ||
          JSON.stringify(m.translations || {}).toLowerCase().includes(s)
        );
      }
      setItems(filtered);
      setTotal(res.total || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchTerm]);

  useEffect(() => { fetchMemory(); }, [fetchMemory]);

  const handleAdd = async () => {
    if (!addSource.trim() || !addTranslation.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await request(`${API_PREFIX}/translation-memory`, {
        method: 'POST',
        body: JSON.stringify({
          source_text: addSource.trim(),
          source_language: 'en',
          context: { domain: 'glossary', screen: 'general', component: 'term' },
          translations: { [addLang]: addTranslation.trim() },
        }),
      });
      setSuccess('Glossary entry added.');
      setShowAdd(false);
      setAddSource('');
      setAddTranslation('');
      fetchMemory();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await request(`${API_PREFIX}/translation-memory/${id}`, { method: 'DELETE' });
      setSuccess('Entry deleted.');
      fetchMemory();
    } catch (e) { setError(e.message); }
  };

  const checkConsistency = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await versionsApi.list({ status: 'active', limit: 5000 });
      const versions = res.items || [];
      const byText = {};
      versions.forEach((v) => {
        const key = `${v.language}:${v.text?.toLowerCase().trim()}`;
        if (!byText[key]) byText[key] = [];
        byText[key].push(v.key_id);
      });
      const dupes = [];
      const bySource = {};
      versions.forEach((v) => {
        const sk = `${v.key_id}:${v.language}`;
        if (!bySource[sk]) bySource[sk] = v.text;
      });
      const sourceTexts = {};
      versions.forEach((v) => {
        if (!sourceTexts[v.language]) sourceTexts[v.language] = {};
        const t = v.text?.toLowerCase().trim();
        if (t) {
          if (!sourceTexts[v.language][t]) sourceTexts[v.language][t] = [];
          sourceTexts[v.language][t].push(v.key_id);
        }
      });
      Object.entries(sourceTexts).forEach(([lang, texts]) => {
        Object.entries(texts).forEach(([text, keys]) => {
          if (keys.length > 1) {
            dupes.push({ language: lang, text, keys: [...new Set(keys)] });
          }
        });
      });
      setInconsistencies(dupes.slice(0, 20));
      setSuccess(`Checked ${versions.length} translations. Found ${dupes.length} duplicate translations.`);
    } catch (e) { setError(e.message); }
    finally { setChecking(false); }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1><Database size={26} className="page-icon" /> Glossary</h1>
        <div className="page-header-right">
          <span className="count-badge">{total} entries</span>
          <button className="btn btn-secondary btn-sm" onClick={checkConsistency} disabled={checking}>
            {checking ? <Loader2 size={14} className="spin" /> : <AlertTriangle size={14} />} Consistency check
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add entry
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {showAdd && (
        <div className="card" style={{ marginBottom: '1rem', maxWidth: 500 }}>
          <h3 style={{ margin: '0 0 0.75rem' }}>Add Glossary Entry</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input placeholder="English term" value={addSource} onChange={(e) => setAddSource(e.target.value)} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select value={addLang} onChange={(e) => setAddLang(e.target.value)} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <option value="fr">French</option><option value="es">Spanish</option><option value="de">German</option>
                <option value="ja">Japanese</option><option value="zh">Chinese</option><option value="ko">Korean</option>
              </select>
              <input placeholder="Translation" value={addTranslation} onChange={(e) => setAddTranslation(e.target.value)} style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
            </div>
            <div className="action-btns">
              <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}><Save size={14} /> Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}><X size={14} /> Cancel</button>
            </div>
          </div>
        </div>
      )}

      {inconsistencies.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}><AlertTriangle size={16} /> Duplicate Translations Found</h3>
          <div className="issues-list">
            {inconsistencies.map((d, i) => (
              <div key={i} className="issue-row">
                <span className="audit-lang">{d.language}</span>
                <span className="issue-text">"{d.text?.slice(0, 40)}"</span>
                <span className="muted">used in: {d.keys.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="filters" style={{ marginBottom: '1rem' }}>
        <input placeholder="Search glossary..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading"><Loader2 size={24} className="spin" /></div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted">No glossary entries. Click "Add entry" to create one.</p>
        </div>
      ) : (
        <div className="glossary-grid">
          {items.map((m) => (
            <div key={m.id} className="card glossary-card">
              <div className="glossary-source">{m.source_text}</div>
              {m.context && <div className="muted" style={{ fontSize: '0.75rem' }}>{m.context.domain}</div>}
              <div className="glossary-translations">
                {m.translations && Object.entries(m.translations).map(([lang, text]) => (
                  <div key={lang} className="glossary-trans"><strong>{lang}:</strong> {text}</div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => handleDelete(m.id)}>
                <X size={12} /> Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
