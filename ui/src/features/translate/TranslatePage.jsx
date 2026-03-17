/**
 * Screen 1 – Translate
 * Two modes: (1) type text, (2) upload Excel with English content.
 * Handles 5000+ rows via chunked API calls.
 */
import { useState, useEffect, useRef } from 'react';
import { Languages, Loader2, Save, RotateCcw, Upload, FileSpreadsheet, Info, ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import { read, utils } from 'xlsx';
import { request, API_PREFIX } from '../../shared/api/client';
import { keysApi, versionsApi } from '../keys/api';

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '').slice(0, 60);
}

function detectContentType(text) {
  try { JSON.parse(text); return 'json'; } catch { return 'text'; }
}

const FLAGS = {
  fr:'🇫🇷',es:'🇪🇸',de:'🇩🇪',hi:'🇮🇳',ja:'🇯🇵',zh:'🇨🇳','zh-TW':'🇹🇼',
  ko:'🇰🇷',ar:'🇸🇦',pt:'🇧🇷',ru:'🇷🇺',it:'🇮🇹',nl:'🇳🇱',sv:'🇸🇪',
  pl:'🇵🇱',tr:'🇹🇷',th:'🇹🇭',vi:'🇻🇳',id:'🇮🇩',ms:'🇲🇾',tl:'🇵🇭',
  uk:'🇺🇦',cs:'🇨🇿',ro:'🇷🇴',el:'🇬🇷',he:'🇮🇱',hu:'🇭🇺',da:'🇩🇰',
  fi:'🇫🇮',no:'🇳🇴',sk:'🇸🇰',bg:'🇧🇬',hr:'🇭🇷',sr:'🇷🇸',lt:'🇱🇹',
  lv:'🇱🇻',et:'🇪🇪',sl:'🇸🇮',sw:'🇰🇪',bn:'🇧🇩',ta:'🇮🇳',te:'🇮🇳',
  mr:'🇮🇳',gu:'🇮🇳',kn:'🇮🇳',ml:'🇮🇳',pa:'🇮🇳',ur:'🇵🇰',ne:'🇳🇵',
  si:'🇱🇰',my:'🇲🇲',
};

const CHUNK_SIZE = 200;
const BULK_PAGE_SIZE = 20;

export default function TranslatePage() {
  const [mode, setMode] = useState('text');
  const [sourceText, setSourceText] = useState('');
  const [selectedModel, setSelectedModel] = useState('mock');
  const [availableModels, setAvailableModels] = useState({});
  const [languages, setLanguages] = useState({});
  const [translations, setTranslations] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkPage, setBulkPage] = useState(0);
  const [fileName, setFileName] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [mergeSummary, setMergeSummary] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    request(`${API_PREFIX}/translate/models`)
      .then((r) => { setAvailableModels(r.models || {}); if (r.default) setSelectedModel(r.default); })
      .catch(() => {});
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setError(null);
    setSaved(false);
    setTranslating(true);
    try {
      const res = await request(`${API_PREFIX}/translate`, {
        method: 'POST',
        body: JSON.stringify({ text: sourceText.trim(), source_language: 'en', model: selectedModel }),
      });
      setLanguages(res.languages || {});
      setTranslations(res.translations || {});
      setBulkResults(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setTranslating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setSaved(false);
    setTranslating(true);
    setTranslateProgress('Reading file...');
    try {
      const data = await file.arrayBuffer();
      const wb = read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { header: 1 });

      const skipHeaders = new Set(['english', 'text', 'source', 'source_text', 'key', 'content', 'en']);
      const texts = [];
      for (const row of rows) {
        if (!row || row.length === 0) continue;
        const val = String(row[0] || '').trim();
        if (val && !skipHeaders.has(val.toLowerCase())) texts.push(val);
      }

      if (texts.length === 0) {
        setError('No text found. Put English text in column A.');
        setTranslating(false);
        setTranslateProgress('');
        return;
      }

      const unique = [...new Set(texts)];
      setTranslateProgress(`Translating ${unique.length} items...`);

      let allResults = [];
      let langs = {};
      for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
        const chunk = unique.slice(i, i + CHUNK_SIZE);
        setTranslateProgress(`Translating ${Math.min(i + CHUNK_SIZE, unique.length)} of ${unique.length}...`);
        const res = await request(`${API_PREFIX}/translate/bulk`, {
          method: 'POST',
          body: JSON.stringify({ items: chunk, source_language: 'en', model: selectedModel }),
        });
        langs = res.languages || langs;
        allResults = allResults.concat(res.results || []);
      }

      setLanguages(langs);
      setBulkResults(allResults);
      setBulkPage(0);
      setTranslations(null);
      setTranslateProgress('');
    } catch (err) {
      setError(err.message);
      setTranslateProgress('');
    } finally {
      setTranslating(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const updateTranslation = (lang, text) => {
    setTranslations((prev) => ({ ...prev, [lang]: text }));
    setSaved(false);
  };

  const updateBulkTranslation = (idx, lang, text) => {
    setBulkResults((prev) => prev.map((item, i) =>
      i === idx ? { ...item, translations: { ...item.translations, [lang]: text } } : item
    ));
    setSaved(false);
  };

  // Build items list from single or bulk results
  const getItems = () => {
    if (translations && sourceText.trim()) {
      return [{ source_text: sourceText.trim(), translations }];
    }
    return bulkResults || [];
  };

  // Step 1: Check existing keys, compute diff, show summary
  const handlePreSave = async () => {
    setError(null);
    setSaving(true);
    setSaveProgress('Checking existing keys...');
    try {
      const items = getItems();
      const keyIds = items.map((it) => slugify(it.source_text));
      const checkRes = await request(`${API_PREFIX}/translation-keys/check-bulk`, {
        method: 'POST',
        body: JSON.stringify({ key_ids: keyIds }),
      });
      const existing = checkRes.existing || {};

      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let changedLangs = 0;
      const plan = items.map((item) => {
        const keyId = slugify(item.source_text);
        const ex = existing[keyId];
        if (!ex) {
          newCount++;
          return { ...item, keyId, status: 'new' };
        }
        const changed = {};
        const newLangs = {};
        let hasChanges = false;
        for (const [lang, text] of Object.entries(item.translations)) {
          if (!text.trim()) continue;
          const exText = ex.translations?.[lang];
          if (!exText) {
            newLangs[lang] = text;
            hasChanges = true;
            changedLangs++;
          } else if (exText !== text.trim()) {
            changed[lang] = text;
            hasChanges = true;
            changedLangs++;
          }
        }
        if (hasChanges) {
          updatedCount++;
          return { ...item, keyId, status: 'updated', changed, newLangs };
        }
        skippedCount++;
        return { ...item, keyId, status: 'skipped' };
      });

      setMergeSummary({ plan, newCount, updatedCount, skippedCount, changedLangs });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  // Step 2: Save only new + changed items
  const handleConfirmSave = async () => {
    if (!mergeSummary) return;
    setSaving(true);
    setError(null);
    const toSave = mergeSummary.plan.filter((p) => p.status !== 'skipped');
    try {
      for (let i = 0; i < toSave.length; i++) {
        const item = toSave[i];
        setSaveProgress(`Saving ${i + 1} of ${toSave.length}...`);

        if (item.status === 'new') {
          await keysApi.create({
            id: item.keyId, source_text: item.source_text,
            content_type: detectContentType(item.source_text),
            product: 'app', domain: 'general', screen: 'general', component: 'text', status: 'active',
          });
          const entries = Object.entries(item.translations).filter(([, t]) => t.trim());
          const batchSize = 10;
          for (let b = 0; b < entries.length; b += batchSize) {
            await Promise.all(entries.slice(b, b + batchSize).map(([lang, text]) =>
              versionsApi.create({ key_id: item.keyId, language: lang, text: text.trim(), status: 'active', source: selectedModel === 'mock' ? 'human' : 'ai', model: selectedModel === 'mock' ? null : selectedModel })
            ));
          }
        } else if (item.status === 'updated') {
          const langsToSave = { ...item.changed, ...item.newLangs };
          const entries = Object.entries(langsToSave);
          const batchSize = 10;
          for (let b = 0; b < entries.length; b += batchSize) {
            await Promise.all(entries.slice(b, b + batchSize).map(async ([lang, text]) => {
              if (item.changed?.[lang]) {
                try {
                  const ex = await versionsApi.getActive(item.keyId, lang);
                  if (ex) await versionsApi.update(ex.id, { status: 'deprecated' });
                } catch {}
              }
              await versionsApi.create({ key_id: item.keyId, language: lang, text: text.trim(), status: 'active', source: selectedModel === 'mock' ? 'human' : 'ai', model: selectedModel === 'mock' ? null : selectedModel });
            }));
          }
        }
      }
      setSaved(true);
      setSaveProgress('');
      setMergeSummary(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSourceText('');
    setTranslations(null);
    setBulkResults(null);
    setLanguages({});
    setSaved(false);
    setError(null);
    setFileName('');
    setSaveProgress('');
    setTranslateProgress('');
    setBulkPage(0);
    setMergeSummary(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasResults = translations || bulkResults;
  const langCodes = translations ? Object.keys(translations) : [];
  const bulkTotal = bulkResults?.length || 0;
  const bulkPages = Math.ceil(bulkTotal / BULK_PAGE_SIZE);
  const bulkSlice = bulkResults?.slice(bulkPage * BULK_PAGE_SIZE, (bulkPage + 1) * BULK_PAGE_SIZE) || [];

  return (
    <div className="page">
      <header className="page-header">
        <h1><Languages size={26} className="page-icon" /> Translate</h1>
      </header>

      {!hasResults && (
        <>
          <div className="mode-tabs">
            <button className={`mode-tab${mode === 'text' ? ' active' : ''}`} onClick={() => setMode('text')}>
              <Languages size={18} /> Enter text
            </button>
            <button className={`mode-tab${mode === 'excel' ? ' active' : ''}`} onClick={() => setMode('excel')}>
              <FileSpreadsheet size={18} /> Upload Excel
            </button>
          </div>
          {Object.keys(availableModels).length > 0 && (
            <div className="model-selector">
              <Bot size={16} />
              <label>Translation model:</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                {Object.entries(availableModels).map(([id, info]) => (
                  <option key={id} value={id}>{info.name}</option>
                ))}
              </select>
              {availableModels[selectedModel]?.description && (
                <span className="model-desc">{availableModels[selectedModel].description}</span>
              )}
            </div>
          )}
        </>
      )}

      {!hasResults && mode === 'text' && (
        <div className="card translate-input-card">
          <label className="input-label">Enter text to translate (English)</label>
          <textarea
            className="translate-input"
            value={sourceText}
            onChange={(e) => { setSourceText(e.target.value); setSaved(false); }}
            placeholder="Type a word or sentence, e.g. Welcome, Hello, Login..."
            rows={3}
            disabled={translating || saving}
          />
          <div className="translate-actions">
            <button className="btn btn-primary" onClick={handleTranslate} disabled={translating || !sourceText.trim()}>
              {translating
                ? <><Loader2 size={18} className="spin" /> Translating...</>
                : <><Languages size={18} /> Translate</>}
            </button>
          </div>
        </div>
      )}

      {!hasResults && mode === 'excel' && (
        <div className="card translate-input-card" style={{ maxWidth: 700 }}>
          <label className="input-label">Upload Excel file with English text</label>

          <div className="sample-box">
            <p className="sample-title"><Info size={16} /> Expected Excel format</p>
            <table className="sample-table">
              <thead><tr><th></th><th>A</th><th>B (optional)</th></tr></thead>
              <tbody>
                <tr><td>1</td><td className="sample-header-en">English</td><td className="sample-header">Description</td></tr>
                <tr><td>2</td><td className="sample-en">Welcome</td><td>Home screen greeting</td></tr>
                <tr><td>3</td><td className="sample-en">Login</td><td>Auth button</td></tr>
                <tr><td>4</td><td className="sample-en">Your balance is $0.00</td><td>Balance label</td></tr>
                <tr><td>5</td><td className="sample-en">Transfer complete</td><td>Success message</td></tr>
                <tr><td>...</td><td className="sample-en">...</td><td>...</td></tr>
              </tbody>
            </table>
            <ul className="sample-notes">
              <li><strong>Column A</strong> = English text (required, highlighted above)</li>
              <li>Header row auto-skipped (English, Text, Source, etc.)</li>
              <li>Supports <strong>.xlsx, .xls, .csv</strong></li>
              <li>Can handle <strong>5,000+ rows</strong> — processed in chunks</li>
              <li>Duplicates are automatically removed</li>
            </ul>
          </div>

          <div className="upload-area">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="file-input"
              id="excel-upload"
              disabled={translating}
            />
            <label htmlFor="excel-upload" className="upload-label">
              {translating
                ? <><Loader2 size={22} className="spin" /> {translateProgress || 'Processing...'}</>
                : <><Upload size={22} /> Choose file or drag here</>}
            </label>
            {fileName && !translating && <p className="file-name">{fileName}</p>}
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="success-banner">
        {bulkResults ? `All ${bulkTotal} items saved to database.` : 'All translations saved to database.'}
      </div>}

      {/* Merge summary */}
      {mergeSummary && !saved && (
        <div className="merge-summary card">
          <h3>Save Summary</h3>
          <div className="merge-stats">
            {mergeSummary.newCount > 0 && <span className="merge-badge new">✅ {mergeSummary.newCount} new keys</span>}
            {mergeSummary.updatedCount > 0 && <span className="merge-badge updated">✏️ {mergeSummary.updatedCount} keys with changes ({mergeSummary.changedLangs} translations)</span>}
            {mergeSummary.skippedCount > 0 && <span className="merge-badge skipped">⏭️ {mergeSummary.skippedCount} skipped (no changes)</span>}
          </div>
          {mergeSummary.newCount === 0 && mergeSummary.updatedCount === 0 ? (
            <p className="muted" style={{ marginTop: '0.75rem' }}>Everything is already up to date. Nothing to save.</p>
          ) : (
            <div className="merge-actions">
              {saveProgress && <span className="muted">{saveProgress}</span>}
              <button className="btn btn-primary" onClick={handleConfirmSave} disabled={saving}>
                {saving ? <><Loader2 size={18} className="spin" /> {saveProgress || 'Saving...'}</> : <><Save size={18} /> Confirm &amp; Save</>}
              </button>
              <button className="btn btn-secondary" onClick={() => setMergeSummary(null)} disabled={saving}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Single text results */}
      {translations && (
        <>
          <div className="translations-header">
            <h2>{langCodes.length} Languages {availableModels[selectedModel] && <span className="model-tag"><Bot size={14} /> {availableModels[selectedModel].name}</span>}</h2>
            <div className="translations-header-actions">
              <button className="btn btn-secondary" onClick={handleReset}><RotateCcw size={18} /> Reset</button>
              <button className="btn btn-primary" onClick={handlePreSave} disabled={saving}>
                {saving ? <><Loader2 size={18} className="spin" /> Checking...</> : <><Save size={18} /> Save all</>}
              </button>
            </div>
          </div>
          <div className="translations-grid">
            {langCodes.map((lang) => (
              <div key={lang} className="translation-cell card">
                <div className="cell-lang">
                  <span className="lang-flag">{FLAGS[lang] || '🌐'}</span>
                  {languages[lang] || lang}
                  <span className="cell-code">{lang}</span>
                </div>
                <textarea
                  className="cell-input"
                  value={translations[lang] || ''}
                  onChange={(e) => updateTranslation(lang, e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bulk Excel results */}
      {bulkResults && (
        <>
          <div className="translations-header">
            <h2>{bulkTotal} items × {Object.keys(languages).length} languages</h2>
            <div className="translations-header-actions">
              {saveProgress && <span className="muted">{saveProgress}</span>}
              <button className="btn btn-secondary" onClick={handleReset}><RotateCcw size={18} /> Reset</button>
              <button className="btn btn-primary" onClick={handlePreSave} disabled={saving}>
                {saving ? <><Loader2 size={18} className="spin" /> Checking...</> : <><Save size={18} /> Save all</>}
              </button>
            </div>
          </div>

          {bulkPages > 1 && (
            <div className="bulk-pagination">
              <button className="btn btn-secondary btn-sm" disabled={bulkPage === 0} onClick={() => setBulkPage((p) => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="page-info">
                Showing {bulkPage * BULK_PAGE_SIZE + 1}–{Math.min((bulkPage + 1) * BULK_PAGE_SIZE, bulkTotal)} of {bulkTotal}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={bulkPage >= bulkPages - 1} onClick={() => setBulkPage((p) => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}

          {bulkSlice.map((item, localIdx) => {
            const globalIdx = bulkPage * BULK_PAGE_SIZE + localIdx;
            return (
              <div key={globalIdx} className="bulk-item card">
                <div className="bulk-item-header">
                  <span className="bulk-source">
                    <span className="bulk-num">#{globalIdx + 1}</span> {item.source_text}
                  </span>
                  <span className="bulk-count">{Object.keys(item.translations).length} translations</span>
                </div>
                <div className="translations-grid compact">
                  {Object.entries(item.translations).map(([lang, text]) => (
                    <div key={lang} className="translation-cell-sm">
                      <span className="cell-lang-sm">
                        {FLAGS[lang] || '🌐'} {languages[lang] || lang}
                      </span>
                      <input
                        className="cell-input-sm"
                        value={text}
                        onChange={(e) => updateBulkTranslation(globalIdx, lang, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {bulkPages > 1 && (
            <div className="bulk-pagination">
              <button className="btn btn-secondary btn-sm" disabled={bulkPage === 0} onClick={() => setBulkPage((p) => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="page-info">Page {bulkPage + 1} of {bulkPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={bulkPage >= bulkPages - 1} onClick={() => setBulkPage((p) => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
