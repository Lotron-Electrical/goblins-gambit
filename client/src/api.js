const BASE = import.meta.env.VITE_SERVER_URL || '';

async function request(path, options = {}) {
  const token = localStorage.getItem('gg_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function register(username, password) {
  return request('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username, password) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getProfile() {
  return request('/api/profile');
}

export async function getLeaderboard() {
  return request('/api/leaderboard');
}
