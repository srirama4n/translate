/** Settings tab - model config, language management, export/import */
import { useState, useEffect, useRef } from 'react';
import { Settings2, Save, Loader2, Download, Upload, Bot, Globe, X } from 'lucide-react';
import { request, API_PREFIX } from '../../shared/api/client';

const ALL_LANGUAGES = {
  fr:'French',es:'Spanish',de:'German',hi:'Hindi',ja:'Japanese',
  zh:'Chinese (Simplified)','zh-TW':'Chinese (Traditional)',ko:'Korean',ar:'Arabic',
  pt:'Portuguese',ru:'Russian',it:'Italian',nl:'Dutch',sv:'Swedish',pl:'Polish',
  tr:'Turkish',th:'Thai',vi:'Vietnamese',id:'Indonesian',ms:'Malay',tl:'Filipino',
  uk:'Ukrainian',cs:'Czech',ro:'Romanian',el:'Greek',he:'Hebrew',hu:'Hungarian',
  da:'Danish',fi:'Finnish',no:'Norwegian',sk:'Slovak',bg:'Bulgarian',hr:'Croatian',
  sr:'Serbian',lt:'Lithuanian',lv:'Latvian',et:'Estonian',sl:'Slovenian',sw:'Swahili',
  bn:'Bengali',ta:'Tamil',te:'Telugu',mr:'Marathi',gu:'Gujarati',kn:'Kannada',
  ml:'Malayalam',pa:'Punjabi',ur:'Urdu',ne:'Nepali',si:'Sinhala',my:'Myanmar',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [models, setModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [defaultModel, setDefaultModel] = useState('mock');
  const [enabledLangs, setEnabledLangs] = useState([]);
  const [priorityLangs, setPriorityLangs] = useState([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      request(`${API_PREFIX}/settings`),
      request(`${API_PREFIX}/translate/models`),
    ]).then(([s, m]) => {
      setSettings(s);
      setModels(m.models || {});
      setDefaultModel(s.default_model || 'mock');
      setEnabledLangs(s.enabled_languages || []);
      setPriorityLangs(s.priority_languages || []);
    }).catch((e) => setError(e.message))
    .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await request(`${API_PREFIX}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          default_model: defaultModel,
          enabled_languages: enabledLangs,
          priority_languages: priorityLangs,
        }),
      });
      setSuccess('Settings saved.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const toggleLang = (code) => {
    setEnabledLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  };

  const togglePriority = (code) => {
    setPriorityLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await request(`${API_PREFIX}/settings/export`);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translate_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Data exported.');
    } catch (e) { setError(e.message); }
    finally { setExporting(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await request(`${API_PREFIX}/settings/import`, {
        method: 'POST',
        body: JSON.stringify({ collections: data.collections || data, mode: 'merge' }),
      });
      const summary = Object.entries(res.stats || {})
        .map(([k, v]) => `${k}: ${v.inserted} added, ${v.skipped} skipped`)
        .join('; ');
      setSuccess(`Import complete. ${summary}`);
    } catch (e) { setError(e.message); }
    finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return (
    <div className="page">
      <header className="page-header"><h1><Settings2 size={26} className="page-icon" /> Settings</h1></header>
      <div className="loading"><Loader2 size={24} className="spin" /></div>
    </div>
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1><Settings2 size={26} className="page-icon" /> Settings</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Save settings
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="settings-grid">
        {/* Model Configuration */}
        <div className="card settings-section">
          <h3><Bot size={18} /> Default Translation Model</h3>
          <p className="muted">Select the model used by default for translations.</p>
          <div className="model-options">
            {Object.entries(models).map(([id, info]) => (
              <label key={id} className={`model-option${defaultModel === id ? ' selected' : ''}`}>
                <input type="radio" name="model" value={id} checked={defaultModel === id} onChange={() => setDefaultModel(id)} />
                <div>
                  <strong>{info.name}</strong>
                  <span className="muted">{info.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Language Management */}
        <div className="card settings-section">
          <h3><Globe size={18} /> Language Management</h3>
          <p className="muted">Enable/disable languages and set priority languages (shown first).</p>
          <div className="lang-toggles">
            <div className="lang-toggle-header">
              <span>Language</span><span>Enabled</span><span>Priority</span>
            </div>
            {Object.entries(ALL_LANGUAGES).map(([code, name]) => (
              <div key={code} className="lang-toggle-row">
                <span className="lang-toggle-name">{name} ({code})</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={enabledLangs.includes(code)} onChange={() => toggleLang(code)} />
                  <span className="toggle-slider" />
                </label>
                <label className="toggle-switch">
                  <input type="checkbox" checked={priorityLangs.includes(code)} onChange={() => togglePriority(code)} />
                  <span className="toggle-slider priority" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Export / Import */}
        <div className="card settings-section">
          <h3><Download size={18} /> Export / Import</h3>
          <p className="muted">Backup or restore all translation data as JSON.</p>
          <div className="export-import-actions">
            <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 size={18} className="spin" /> : <Download size={18} />} Export all data
            </button>
            <div className="import-area">
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="file-input" id="import-file" disabled={importing} />
              <label htmlFor="import-file" className="btn btn-secondary">
                {importing ? <><Loader2 size={18} className="spin" /> Importing...</> : <><Upload size={18} /> Import from JSON</>}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
