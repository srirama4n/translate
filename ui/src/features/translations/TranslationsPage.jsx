/**
 * Screen 2 – Translations
 * Features: search, pagination, progress bars, bulk delete, add language,
 * export to Excel, flags, inline edit with versioning.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Pencil, Save, X, Loader2, Search, ChevronLeft, ChevronRight,
  FileJson, FileText, Trash2, Download, Plus, CheckSquare, Square, History, Bot, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { keysApi, versionsApi } from '../keys/api';
import { request, API_PREFIX } from '../../shared/api/client';

const LANG_NAMES = {
  en:'English',fr:'French',es:'Spanish',de:'German',hi:'Hindi',ja:'Japanese',
  zh:'Chinese (Simplified)','zh-TW':'Chinese (Traditional)',ko:'Korean',ar:'Arabic',
  pt:'Portuguese',ru:'Russian',it:'Italian',nl:'Dutch',sv:'Swedish',pl:'Polish',
  tr:'Turkish',th:'Thai',vi:'Vietnamese',id:'Indonesian',ms:'Malay',tl:'Filipino',
  uk:'Ukrainian',cs:'Czech',ro:'Romanian',el:'Greek',he:'Hebrew',hu:'Hungarian',
  da:'Danish',fi:'Finnish',no:'Norwegian',sk:'Slovak',bg:'Bulgarian',hr:'Croatian',
  sr:'Serbian',lt:'Lithuanian',lv:'Latvian',et:'Estonian',sl:'Slovenian',sw:'Swahili',
  bn:'Bengali',ta:'Tamil',te:'Telugu',mr:'Marathi',gu:'Gujarati',kn:'Kannada',
  ml:'Malayalam',pa:'Punjabi',ur:'Urdu',ne:'Nepali',si:'Sinhala',my:'Myanmar',
};

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

const ALL_LANGS = Object.keys(LANG_NAMES).filter((l) => l !== 'en');
const PAGE_SIZE = 20;
const TOTAL_LANGS = 50;

function isJson(t) { if (typeof t !== 'string') return typeof t === 'object'; try { JSON.parse(t); return true; } catch { return false; } }
function formatSource(s) { if (typeof s === 'object') return JSON.stringify(s, null, 2); if (isJson(s)) { try { return JSON.stringify(JSON.parse(s), null, 2); } catch {} } return s; }
function truncate(t, m = 80) { const s = typeof t === 'object' ? JSON.stringify(t) : String(t); return s.length > m ? s.slice(0, m) + '...' : s; }

export default function TranslationsPage() {
  const [keys, setKeys] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editLang, setEditLang] = useState(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [addLang, setAddLang] = useState('');
  const [addText, setAddText] = useState('');
  const [showAddLang, setShowAddLang] = useState(false);
  const [addTranslating, setAddTranslating] = useState(false);
  const [historyLang, setHistoryLang] = useState(null);
  const [historyVersions, setHistoryVersions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedModel, setSelectedModel] = useState('mock');
  const [availableModels, setAvailableModels] = useState({});
  const [retranslating, setRetranslating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [qualityResults, setQualityResults] = useState(null);

  useEffect(() => {
    request(`${API_PREFIX}/translate/models`)
      .then((r) => { setAvailableModels(r.models || {}); if (r.default) setSelectedModel(r.default); })
      .catch(() => {});
  }, []);

  const fetchKeys = useCallback(async (showSpinner) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const r = await keysApi.list({ search: searchTerm || undefined, skip: page * PAGE_SIZE, limit: PAGE_SIZE });
      setKeys(r.items || []);
      setTotal(r.total || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchTerm, page]);

  useEffect(() => { fetchKeys(keys.length === 0); }, [fetchKeys]);
  useEffect(() => { setPage(0); }, [searchTerm]);

  const loadVersions = useCallback(async (keyId) => {
    setLoadingDetail(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await versionsApi.list({ key_id: keyId, limit: 100 });
      const byLang = {};
      (r.items || []).forEach((v) => {
        if (v.status === 'active' && (!byLang[v.language] || v.version > byLang[v.language].version))
          byLang[v.language] = v;
      });
      setVersions(Object.values(byLang));
    } catch (e) { setError(e.message); setVersions([]); }
    finally { setLoadingDetail(false); }
  }, []);

  const selectKey = (k) => {
    setSelectedKey(k);
    setEditLang(null);
    setConfirmDelete(false);
    setShowAddLang(false);
    setQualityResults(null);
    loadVersions(k.id);
  };

  // Delete single key
  const handleDelete = async () => {
    if (!selectedKey) return;
    setDeleting(true);
    try {
      await keysApi.delete(selectedKey.id);
      setSelectedKey(null);
      setVersions([]);
      setConfirmDelete(false);
      setSuccess(`Deleted "${truncate(selectedKey.source_text, 40)}".`);
      fetchKeys();
    } catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  };

  // Bulk delete
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === keys.length) setSelected(new Set());
    else setSelected(new Set(keys.map((k) => k.id)));
  };
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    setError(null);
    try {
      for (const id of selected) await keysApi.delete(id);
      setSuccess(`Deleted ${selected.size} keys.`);
      setSelected(new Set());
      setBulkMode(false);
      if (selectedKey && selected.has(selectedKey.id)) { setSelectedKey(null); setVersions([]); }
      fetchKeys();
    } catch (e) { setError(e.message); }
    finally { setBulkDeleting(false); }
  };

  // Edit translation
  const startEdit = (v) => { setEditLang(v.language); setEditText(v.text); setSuccess(null); };
  const cancelEdit = () => { setEditLang(null); setEditText(''); };
  const handleSave = async () => {
    if (!editLang || !editText.trim() || !selectedKey) return;
    const existing = versions.find((v) => v.language === editLang);
    if (existing && existing.text === editText.trim()) { cancelEdit(); return; }
    setSaving(true);
    setError(null);
    try {
      if (existing) await versionsApi.update(existing.id, { status: 'deprecated' });
      await versionsApi.create({ key_id: selectedKey.id, language: editLang, text: editText.trim(), status: 'active', source: 'human' });
      setSuccess(`Updated ${LANG_NAMES[editLang] || editLang} (v${existing ? existing.version + 1 : 1}).`);
      cancelEdit();
      loadVersions(selectedKey.id);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // Version history
  const showHistory = async (lang) => {
    if (historyLang === lang) { setHistoryLang(null); setHistoryVersions([]); return; }
    setHistoryLang(lang);
    setLoadingHistory(true);
    try {
      const r = await versionsApi.list({ key_id: selectedKey.id, language: lang, limit: 50 });
      setHistoryVersions((r.items || []).sort((a, b) => b.version - a.version));
    } catch { setHistoryVersions([]); }
    finally { setLoadingHistory(false); }
  };
  const closeHistory = () => { setHistoryLang(null); setHistoryVersions([]); };

  // Re-translate all languages for the selected key using the chosen model
  const handleRetranslate = async () => {
    if (!selectedKey) return;
    setRetranslating(true);
    setError(null);
    setSuccess(null);
    try {
      const sourceText = typeof selectedKey.source_text === 'string' ? selectedKey.source_text : JSON.stringify(selectedKey.source_text);
      const res = await request(`${API_PREFIX}/translate`, {
        method: 'POST',
        body: JSON.stringify({ text: sourceText, source_language: 'en', model: selectedModel }),
      });
      const newTranslations = res.translations || {};
      const src = selectedModel === 'mock' ? 'human' : 'ai';
      const mdl = selectedModel === 'mock' ? null : selectedModel;
      let count = 0;
      for (const v of versions) {
        const newText = newTranslations[v.language];
        if (newText && newText !== v.text) {
          await versionsApi.update(v.id, { status: 'deprecated' });
          await versionsApi.create({ key_id: selectedKey.id, language: v.language, text: newText, status: 'active', source: src, model: mdl });
          count++;
        }
      }
      setSuccess(`Re-translated ${count} languages with ${availableModels[selectedModel]?.name || selectedModel}.`);
      loadVersions(selectedKey.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setRetranslating(false);
    }
  };

  // Add new language — auto-translate on language select
  const handleAddLangSelect = async (lang) => {
    setAddLang(lang);
    setAddText('');
    if (!lang || !selectedKey) return;
    setAddTranslating(true);
    try {
      const sourceText = typeof selectedKey.source_text === 'string' ? selectedKey.source_text : JSON.stringify(selectedKey.source_text);
      const res = await request(`${API_PREFIX}/translate`, {
        method: 'POST',
        body: JSON.stringify({ text: sourceText, source_language: 'en', model: selectedModel }),
      });
      const translated = res.translations?.[lang];
      if (translated) {
        setAddText(translated);
      } else {
        setAddText(`[${LANG_NAMES[lang] || lang}] ${sourceText}`);
      }
    } catch (e) {
      setAddText('');
      setError(`Translation failed: ${e.message}`);
    }
    finally { setAddTranslating(false); }
  };

  const handleAddLang = async () => {
    if (!addLang || !addText.trim() || !selectedKey) return;
    setSaving(true);
    setError(null);
    try {
      const src = selectedModel === 'mock' ? 'human' : 'ai';
      const mdl = selectedModel === 'mock' ? null : selectedModel;
      await versionsApi.create({ key_id: selectedKey.id, language: addLang, text: addText.trim(), status: 'active', source: src, model: mdl });
      setSuccess(`Added ${LANG_NAMES[addLang] || addLang} translation.`);
      setShowAddLang(false);
      setAddLang('');
      setAddText('');
      setAddTranslating(false);
      loadVersions(selectedKey.id);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // Export to Excel
  const handleExport = async () => {
    if (!selectedKey || versions.length === 0) return;
    const rows = versions.map((v) => ({
      Language: LANG_NAMES[v.language] || v.language,
      Code: v.language,
      Translation: v.text,
      Version: v.version,
    }));
    const ws = utils.json_to_sheet([{ Language: 'English (Source)', Code: 'en', Translation: selectedKey.source_text, Version: '-' }, ...rows]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Translations');
    writeFile(wb, `${selectedKey.id}_translations.xlsx`);
  };

  // Evaluate quality for selected key
  const handleEvaluateKey = async () => {
    if (!selectedKey) return;
    setEvaluating(true);
    setError(null);
    try {
      const res = await request(`${API_PREFIX}/quality/evaluate-key?key_id=${encodeURIComponent(selectedKey.id)}`, { method: 'POST' });
      const byLang = {};
      (res.evaluations || []).forEach((e) => { byLang[e.language] = e; });
      setQualityResults(byLang);
      setSuccess(`Quality evaluated for ${res.total} translations.`);
      loadVersions(selectedKey.id);
    } catch (e) { setError(e.message); }
    finally { setEvaluating(false); }
  };

  // Re-translate ALL keys with selected model
  const [retranslateAllProgress, setRetranslateAllProgress] = useState('');
  const [retranslatingAll, setRetranslatingAll] = useState(false);

  const handleRetranslateAll = async () => {
    setRetranslatingAll(true);
    setError(null);
    setSuccess(null);
    setRetranslateAllProgress('Loading all keys...');
    try {
      const allKeysRes = await keysApi.list({ limit: 500 });
      const allKeys = allKeysRes.items || [];
      const src = selectedModel === 'mock' ? 'human' : 'ai';
      const mdl = selectedModel === 'mock' ? null : selectedModel;
      let totalUpdated = 0;

      for (let i = 0; i < allKeys.length; i++) {
        const key = allKeys[i];
        setRetranslateAllProgress(`Translating ${i + 1} of ${allKeys.length}: ${truncate(key.source_text, 30)}`);
        const sourceText = typeof key.source_text === 'string' ? key.source_text : JSON.stringify(key.source_text);
        const res = await request(`${API_PREFIX}/translate`, {
          method: 'POST',
          body: JSON.stringify({ text: sourceText, source_language: 'en', model: selectedModel }),
        });
        const newTranslations = res.translations || {};

        const existingRes = await versionsApi.list({ key_id: key.id, status: 'active', limit: 200 });
        const existingVersions = existingRes.items || [];
        const existingByLang = {};
        existingVersions.forEach((v) => { existingByLang[v.language] = v; });

        for (const [lang, text] of Object.entries(newTranslations)) {
          if (!text.trim()) continue;
          const ex = existingByLang[lang];
          if (ex && ex.text === text.trim()) continue;
          if (ex) await versionsApi.update(ex.id, { status: 'deprecated' });
          await versionsApi.create({ key_id: key.id, language: lang, text: text.trim(), status: 'active', source: src, model: mdl });
          totalUpdated++;
        }
      }

      setSuccess(`Re-translated ${allKeys.length} keys (${totalUpdated} translations updated) with ${availableModels[selectedModel]?.name || selectedModel}.`);
      setRetranslateAllProgress('');
      if (selectedKey) loadVersions(selectedKey.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setRetranslatingAll(false);
      setRetranslateAllProgress('');
    }
  };

  const translatedLangs = new Set(versions.map((v) => v.language));
  const missingLangs = ALL_LANGS.filter((l) => !translatedLangs.has(l));
  const progress = versions.length > 0 ? Math.round((versions.length / TOTAL_LANGS) * 100) : 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <header className="page-header">
        <h1><BookOpen size={26} className="page-icon" /> Translations</h1>
        <div className="page-header-right">
          <span className="count-badge">{total} keys</span>
          {Object.keys(availableModels).length > 0 && total > 0 && (
            <div className="retranslate-all-row">
              <Bot size={16} />
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="detail-model-select">
                {Object.entries(availableModels).map(([id, info]) => (
                  <option key={id} value={id}>{info.name}</option>
                ))}
              </select>
              <button className="btn btn-purple btn-sm" onClick={handleRetranslateAll} disabled={retranslatingAll}>
                {retranslatingAll ? <><Loader2 size={14} className="spin" /> {retranslateAllProgress || 'Working...'}</> : <><RefreshCw size={14} /> Re-translate all keys</>}
              </button>
            </div>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="translations-layout">
        <div className="keys-panel card">
          <div className="keys-search">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search keys..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
            <button className={`btn-icon${bulkMode ? ' active' : ''}`} title="Bulk select" onClick={() => { setBulkMode((b) => !b); setSelected(new Set()); }}>
              <CheckSquare size={16} />
            </button>
          </div>

          {bulkMode && selected.size > 0 && (
            <div className="bulk-bar">
              <span>{selected.size} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading"><Loader2 size={24} className="spin" /></div>
          ) : keys.length === 0 ? (
            <p className="muted" style={{ padding: '1rem' }}>{searchTerm ? 'No keys match.' : 'No keys yet.'}</p>
          ) : (
            <>
              {bulkMode && (
                <div className="bulk-select-all" onClick={toggleAll}>
                  {selected.size === keys.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>{selected.size === keys.length ? 'Deselect' : 'Select'} all</span>
                </div>
              )}
              <ul className="keys-list">
                {keys.map((k) => (
                  <li key={k.id} className={`key-item${selectedKey?.id === k.id ? ' active' : ''}`}>
                    <div className="key-item-row" onClick={() => selectKey(k)}>
                      {bulkMode && (
                        <span className="key-checkbox" onClick={(e) => { e.stopPropagation(); toggleSelect(k.id); }}>
                          {selected.has(k.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </span>
                      )}
                      <div className="key-item-content">
                        <div className="key-item-top">
                          {(k.content_type === 'json' || isJson(k.source_text))
                            ? <FileJson size={14} className="key-type-icon json" />
                            : <FileText size={14} className="key-type-icon" />}
                          <span className="key-text">{truncate(k.source_text)}</span>
                        </div>
                        <span className="key-id">{k.id}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
                  <span className="page-info">{page + 1} / {totalPages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="detail-panel">
          {!selectedKey ? (
            <div className="empty-detail card"><p className="muted">Select a key to view translations.</p></div>
          ) : (
            <div className="card">
              <div className="detail-header">
                <div>
                  <h3>{truncate(selectedKey.source_text, 120)}</h3>
                  <p className="muted">{selectedKey.id}</p>
                </div>
                <div className="detail-header-actions">
                  <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={versions.length === 0} title="Export to Excel">
                    <Download size={14} /> Export
                  </button>
                  {confirmDelete ? (
                    <div className="confirm-delete">
                      <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Confirm
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete</button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-row">
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <span className="progress-label">{versions.length}/{TOTAL_LANGS} languages ({progress}%)</span>
              </div>

              {/* Model selector + Re-translate */}
              {Object.keys(availableModels).length > 0 && versions.length > 0 && (
                <div className="detail-model-row">
                  <Bot size={16} />
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="detail-model-select">
                    {Object.entries(availableModels).map(([id, info]) => (
                      <option key={id} value={id}>{info.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={handleRetranslate} disabled={retranslating}>
                    {retranslating ? <><Loader2 size={14} className="spin" /> Re-translating...</> : <><RefreshCw size={14} /> Re-translate all</>}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleEvaluateKey} disabled={evaluating}>
                    {evaluating ? <><Loader2 size={14} className="spin" /> Evaluating...</> : <><ShieldCheck size={14} /> Check quality</>}
                  </button>
                </div>
              )}

              {isJson(selectedKey.source_text) && (
                <pre className="json-preview">{formatSource(selectedKey.source_text)}</pre>
              )}

              {loadingDetail ? (
                <div className="loading"><Loader2 size={24} className="spin" /></div>
              ) : (
                <>
                  <div className="detail-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Language</th>
                          <th>Translation</th>
                          <th>Quality</th>
                          <th>Ver</th>
                          <th style={{ width: 130 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map((v) => (
                          <tr key={v.language}>
                            <td>
                              <span className="lang-flag-sm">{FLAGS[v.language] || '🌐'}</span>
                              <strong>{LANG_NAMES[v.language] || v.language}</strong>
                            </td>
                            <td className="translation-cell">
                              {editLang === v.language ? (
                                <textarea className="edit-input" value={editText} onChange={(e) => setEditText(e.target.value)} rows={isJson(v.text) ? 6 : 2} autoFocus />
                              ) : (
                                isJson(v.text) ? <pre className="json-inline">{formatSource(v.text)}</pre> : v.text
                              )}
                            </td>
                            <td>
                              {(() => {
                                const qr = qualityResults?.[v.language];
                                const score = qr ? qr.score : (v.quality_score != null ? Math.round(v.quality_score * 100) : null);
                                if (score == null) return <span className="muted">—</span>;
                                const cls = score >= 80 ? 'q-good' : score >= 50 ? 'q-ok' : 'q-bad';
                                return (
                                  <span className={`q-badge ${cls}`} title={qr?.issues?.join(', ') || ''}>
                                    {score}
                                  </span>
                                );
                              })()}
                            </td>
                            <td>v{v.version}</td>
                            <td>
                              {editLang === v.language ? (
                                <div className="action-btns">
                                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
                                  </button>
                                  <button className="btn btn-secondary btn-sm" onClick={cancelEdit}><X size={14} /></button>
                                </div>
                              ) : (
                                <div className="action-btns">
                                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(v)}><Pencil size={14} /> Edit</button>
                                  {v.version > 1 && (
                                    <button
                                      className={`btn btn-secondary btn-sm${historyLang === v.language ? ' active-history' : ''}`}
                                      onClick={() => showHistory(v.language)}
                                      title="Version history"
                                    >
                                      <History size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {versions.length === 0 && (
                          <tr><td colSpan={5} className="muted">No translations yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Version history comparison */}
                  {historyLang && (
                    <div className="history-panel card">
                      <div className="history-header">
                        <h4>
                          <History size={16} /> Version History — {FLAGS[historyLang] || '🌐'} {LANG_NAMES[historyLang] || historyLang}
                        </h4>
                        <button className="btn btn-secondary btn-sm" onClick={closeHistory}><X size={14} /></button>
                      </div>
                      {loadingHistory ? (
                        <div className="loading"><Loader2 size={20} className="spin" /></div>
                      ) : historyVersions.length < 2 ? (
                        <p className="muted">Only one version exists.</p>
                      ) : (
                        <div className="history-compare">
                          {historyVersions.map((v, i) => {
                            const prev = historyVersions[i + 1];
                            return (
                              <div key={v.id} className={`history-version${v.status === 'active' ? ' current' : ''}`}>
                                <div className="history-version-header">
                                  <span className="history-ver">v{v.version}</span>
                                  <span className={`history-status ${v.status}`}>{v.status}</span>
                                  {v.created_at && <span className="muted">{new Date(v.created_at).toLocaleDateString()}</span>}
                                </div>
                                <div className="history-diff">
                                  <div className="history-text-box">
                                    <div className="history-text">{v.text}</div>
                                  </div>
                                  {prev && v.text !== prev.text && (
                                    <div className="history-change">
                                      <span className="diff-old">{prev.text}</span>
                                      <span className="diff-arrow">→</span>
                                      <span className="diff-new">{v.text}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add new language */}
                  {missingLangs.length > 0 && (
                    showAddLang ? (
                      <div className="add-lang-form">
                        <label className="add-lang-label">Select language to translate into:</label>
                        <select value={addLang} onChange={(e) => handleAddLangSelect(e.target.value)}>
                          <option value="">Select language...</option>
                          {missingLangs.map((l) => (
                            <option key={l} value={l}>{FLAGS[l] || '🌐'} {LANG_NAMES[l] || l} ({l})</option>
                          ))}
                        </select>
                        {addTranslating && (
                          <div className="add-lang-translating"><Loader2 size={16} className="spin" /> Translating...</div>
                        )}
                        {addLang && !addTranslating && (
                          <>
                            <label className="add-lang-label">Translation (edit before saving):</label>
                            <textarea value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="Translation will appear here..." rows={2} className="edit-input" />
                          </>
                        )}
                        <div className="action-btns">
                          <button className="btn btn-primary btn-sm" onClick={handleAddLang} disabled={saving || addTranslating || !addLang || !addText.trim()}>
                            <Save size={14} /> Save
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddLang(false); setAddLang(''); setAddText(''); setAddTranslating(false); }}>
                            <X size={14} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-secondary add-lang-btn" onClick={() => setShowAddLang(true)}>
                        <Plus size={16} /> Add language ({missingLangs.length} available)
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
