const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

async function requestAuth(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur authentification.');
    error.details = data.details || [];
    error.status = response.status;
    throw error;
  }

  return data;
}

export function registerUser({ email, password }) {
  return requestAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function loginUser({ email, password }) {
  return requestAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutUser() {
  return requestAuth('/api/auth/logout', {
    method: 'POST',
  });
}

export function getCurrentUser() {
  return requestAuth('/api/auth/me');
}

export function deleteCurrentUser() {
  return requestAuth('/api/auth/me', {
    method: 'DELETE',
  });
}
