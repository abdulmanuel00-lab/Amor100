export const API_BASE_URL = (import.meta as any).env.VITE_APP_URL || window.location.origin;

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}
