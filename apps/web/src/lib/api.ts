const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };
  // Authorization header preparado para auth futura
  // headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Erro na API");
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
