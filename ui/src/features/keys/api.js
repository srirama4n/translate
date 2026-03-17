import { request, API_PREFIX } from '../../shared/api/client';

const BASE = `${API_PREFIX}/translation-keys`;

export const keysApi = {
  list: (params) => {
    const clean = {};
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) clean[k] = v; });
    const q = new URLSearchParams(clean).toString();
    return request(`${BASE}${q ? `?${q}` : ''}`);
  },
  get: (id) => request(`${BASE}/${encodeURIComponent(id)}`),
  create: (body) => request(BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

const V_BASE = `${API_PREFIX}/translation-versions`;

export const versionsApi = {
  list: (params) => {
    const clean = {};
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) clean[k] = v; });
    const q = new URLSearchParams(clean).toString();
    return request(`${V_BASE}${q ? `?${q}` : ''}`);
  },
  getActive: (keyId, lang) =>
    request(`${V_BASE}/active?key_id=${encodeURIComponent(keyId)}&language=${encodeURIComponent(lang)}`),
  create: (body) => request(V_BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`${V_BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
