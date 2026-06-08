/** Utilitários de sessão compatíveis com Edge (middleware Next.js). */

export const AUTH_COOKIE_NAME = "mmrtec_token";

export function jwtExpiresAtMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json) as { exp?: number };
    return data.exp ? data.exp * 1000 : null;
  } catch {
    return null;
  }
}
