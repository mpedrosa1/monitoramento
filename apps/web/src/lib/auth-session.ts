import type { TipoAcessoSistema } from "@/lib/types";

export const AUTH_STORAGE_KEY = "mmrtec_auth";
export const AUTH_COOKIE_NAME = "mmrtec_token";
export const SESSION_MAX_AGE_SEC = 8 * 60 * 60;

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  tipoAcesso: TipoAcessoSistema;
  cpf?: string;
  dataAdmissao?: string;
};

export type AuthSession = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

export type LoginResponse = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(session.token)}; path=/; max-age=${SESSION_MAX_AGE_SEC}; SameSite=Lax`;
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.token || !session.expiresAt || !session.user) {
      clearAuthSession();
      return null;
    }
    if (isExpired(session.expiresAt)) {
      clearAuthSession();
      return null;
    }
    if (!session.user.tipoAcesso) {
      const tipo = jwtTipoAcesso(session.token);
      if (tipo) {
        session.user.tipoAcesso = tipo;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }
    }
    return session;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getAuthToken(): string | null {
  return loadAuthSession()?.token ?? null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function jwtExpiresAtMs(token: string): number | null {
  const data = decodeJwtPayload(token);
  const exp = data?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

/** Tipo de acesso no JWT (fallback quando a sessão local não tem o campo). */
export function jwtTipoAcesso(token: string): TipoAcessoSistema | null {
  const data = decodeJwtPayload(token);
  const tipo = data?.tipoAcesso;
  if (
    tipo === "usuario" ||
    tipo === "admin_com_financeiro" ||
    tipo === "admin_sem_financeiro" ||
    tipo === "desenvolvedor"
  ) {
    return tipo;
  }
  return null;
}

export function resolveAuthUserTipoAcesso(
  user: AuthUser | null | undefined
): TipoAcessoSistema | undefined {
  if (user?.tipoAcesso) return user.tipoAcesso;
  const token = getAuthToken();
  if (!token) return undefined;
  return jwtTipoAcesso(token) ?? undefined;
}
