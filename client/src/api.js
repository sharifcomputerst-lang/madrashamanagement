const TOKEN_KEY = 'mms_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (res.status === 401) {
    setToken(null);
    throw { status: 401, message: data?.error || 'লগইন প্রয়োজন' };
  }
  if (!res.ok) throw { status: res.status, message: data?.error || 'সমস্যা হয়েছে' };
  return data;
}
