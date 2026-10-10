// =========================================================
// BACKEND API — the single source of truth for the
// Express backend base URL and small fetch helpers.
// The backend is spawned by Electron on http://localhost:3000.
// =========================================================

export const API_BASE = "http://localhost:3000";

export async function apiGet(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  return res.json();
}

// Lightweight health check — resolves to a boolean.
export async function apiHealth() {
  try {
    const res = await fetch(`${API_BASE}/`);
    return res.ok;
  } catch {
    return false;
  }
}