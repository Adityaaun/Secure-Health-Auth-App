const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function resolveUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

export async function authed(path: string, token: string, init?: RequestInit) {
  const res = await fetch(resolveUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(init?.headers || {})
    },
    ...init
  });

  if (!res.ok) {
    let msg = '';
    try { msg = await res.text(); } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}
