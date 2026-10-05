```js
const TOKEN_KEY = 'spendwise_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/**
 * Small fetch wrapper: relative /api paths, JWT attached automatically,
 * errors thrown as Error(message) using the backend's {"error": "..."} body.
 */
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Please try again.');
  }

  if (res.status === 401 && token) {
    // Token expired or invalid: send the user back to the login screen.
    clearToken();
    window.dispatchEvent(new Event('spendwise-logout'));
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  }
  return data;
}
