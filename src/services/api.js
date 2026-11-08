const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let accessToken = null;

function readIdentity(token) {
  try {
    const encoded = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

async function request(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ tại ${API_URL}.`);
  }

  if (response.status === 401 && retry && path !== '/auth/signin') {
    const refreshed = await fetch(`${API_URL}/auth/refresh-accessToken`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    if (refreshed?.ok) {
      const data = await refreshed.json();
      accessToken = data.accessToken;
      return request(path, options, false);
    }
    accessToken = null;
    window.dispatchEvent(new Event('session-expired'));
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message;
    throw new Error(Array.isArray(message) ? message.join(', ') : message || 'Có lỗi xảy ra. Vui lòng thử lại.');
  }
  return data;
}

export const api = {
  async signIn(userName, password) {
    const result = await request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ userName, password }),
    });
    accessToken = result.accessToken;
    return readIdentity(accessToken);
  },
  async restoreSession() {
    const response = await fetch(`${API_URL}/auth/refresh-accessToken`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    if (!response?.ok) return false;
    accessToken = (await response.json()).accessToken;
    return readIdentity(accessToken);
  },
  async signOut() {
    try {
      await request('/auth/signout', { method: 'POST' }, false);
    } finally {
      accessToken = null;
    }
  },
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
};
