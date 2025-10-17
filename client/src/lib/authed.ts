export async function authed(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, {
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
