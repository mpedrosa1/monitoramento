import { clearAuthSession, getAuthToken } from "@/lib/auth-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions
): Promise<T> {
  const { skipAuth, ...requestInit } = init ?? {};
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(requestInit.headers ?? {}),
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, { ...requestInit, headers });

  if (res.status === 401 && !skipAuth) {
    clearAuthSession();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message = (err as { error?: string }).error ?? "Sessão expirada. Faça login novamente.";
    throw new Error(message);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message = (err as { error?: string }).error ?? "Erro na API";
    if (res.status === 403) {
      throw new Error(message || "Você não tem permissão para esta ação.");
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/** Garante array quando a API retorna `null` para lista vazia. */
export function asArray<T>(data: T[] | null | undefined): T[] {
  return Array.isArray(data) ? data : [];
}

export { API_URL };
