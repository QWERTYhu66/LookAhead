"use client";

export type SessionUser = { id: string; name: string; email: string };
export type Session = { token: string; user: SessionUser };

const SESSION_KEY = "lookahead.session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function createSession(email: string, name?: string): Session {
  const normalized = email.trim().toLowerCase();
  const user: SessionUser = {
    id: `user_${btoa(normalized).replace(/[^a-z0-9]/gi, "").slice(0, 18)}`,
    name: name?.trim() || normalized.split("@")[0] || "LookAhead user",
    email: normalized,
  };
  const session = { token: `local_${crypto.randomUUID()}`, user };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}

export function authHeaders(): HeadersInit {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}
