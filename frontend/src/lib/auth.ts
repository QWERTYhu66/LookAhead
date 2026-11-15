/** Demo session stored in the browser. Aaron's pages import this; the file was missing from the merge. */

const KEY = "lookahead_session";

export type Session = {
  token: string;
  user?: { id: string; name: string };
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getSession()?.token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
