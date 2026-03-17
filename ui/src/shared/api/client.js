/**
 * Shared API client - base request logic.
 * Feature-specific endpoints live in each feature's api.js
 */
// Parcel: process.env. In dev with proxy use relative path; else full URL.
const API_BASE = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && !process.env.VITE_API_URL)
  ? '' : (typeof process !== 'undefined' ? process.env.VITE_API_URL : null) || 'http://localhost:8000';
const API_PREFIX = '/api';

export async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(err.detail) ? err.detail[0]?.msg : err.detail || res.statusText);
  }
  if (res.status === 204) return;
  return res.json();
}

export { API_PREFIX };
