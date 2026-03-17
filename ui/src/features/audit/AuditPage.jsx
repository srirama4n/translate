/** Audit tab - activity feed with filters and diff */
import { useState, useEffect, useCallback } from 'react';
import { History, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { request, API_PREFIX } from '../../shared/api/client';

const PAGE_SIZE = 20;
const CHANGE_COLORS = {
  create: 'var(--success)', update: 'var(--primary)', delete: 'var(--danger)',
  approve: 'var(--success)', reject: 'var(--danger)', rollback: 'var(--warning)',
};

export default function AuditPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyFilter, setKeyFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
      if (keyFilter) params.set('key_id', keyFilter);
      if (langFilter) params.set('language', langFilter);
      if (typeFilter) params.set('change_type', typeFilter);
      const res = await request(`${API_PREFIX}/translation-audit?${params}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, keyFilter, langFilter, typeFilter]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);
  useEffect(() => { setPage(0); }, [keyFilter, langFilter, typeFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <header className="page-header">
        <h1><History size={26} className="page-icon" /> Audit Log</h1>
        <span className="count-badge">{total} records</span>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters" style={{ marginBottom: '1rem' }}>
        <input placeholder="Filter by key_id" value={keyFilter} onChange={(e) => setKeyFilter(e.target.value)} />
        <input placeholder="Filter by language" value={langFilter} onChange={(e) => setLangFilter(e.target.value)} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="rollback">Rollback</option>
        </select>
      </div>

      {loading ? (
        <div className="loading"><Loader2 size={24} className="spin" /></div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted">No audit records found.</p>
        </div>
      ) : (
        <>
          <div className="audit-list">
            {items.map((item) => (
              <div key={item.id} className="audit-item card">
                <div className="audit-item-header">
                  <span className="audit-type" style={{ background: `${CHANGE_COLORS[item.change_type] || 'var(--text-muted)'}22`, color: CHANGE_COLORS[item.change_type] || 'var(--text-muted)' }}>
                    {item.change_type}
                  </span>
                  <span className="audit-key">{item.key_id}</span>
                  {item.language && <span className="audit-lang">{item.language}</span>}
                  <span className="audit-by">{item.changed_by || 'system'}</span>
                  {item.timestamp && <span className="muted">{new Date(item.timestamp).toLocaleString()}</span>}
                </div>
                {(item.old_text || item.new_text) && (
                  <div className="audit-diff">
                    {item.old_text && <span className="diff-old">{item.old_text}</span>}
                    {item.old_text && item.new_text && <span className="diff-arrow">→</span>}
                    {item.new_text && <span className="diff-new">{item.new_text}</span>}
                  </div>
                )}
                {item.change_reason && <p className="muted" style={{ margin: '0.25rem 0 0' }}>{item.change_reason}</p>}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="bulk-pagination">
              <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Prev</button>
              <span className="page-info">{page + 1} / {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
