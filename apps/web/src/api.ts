
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export function getToken() {
  return sessionStorage.getItem("nexo_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || `Error HTTP ${response.status}`);
  }

  return body as T;
}
