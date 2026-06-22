const DEFAULT_API_PORT = 8081;

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function apiUrlForHost(protocol: string, hostname: string): string {
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
}

function wsUrlForApiBase(apiBase: string): string {
  if (apiBase.startsWith("https://")) {
    return `wss://${apiBase.slice("https://".length)}/ws`;
  }
  if (apiBase.startsWith("http://")) {
    return `ws://${apiBase.slice("http://".length)}/ws`;
  }
  return `ws://127.0.0.1:${DEFAULT_API_PORT}/ws`;
}

/** URL base da API Go (sem barra final). */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    // Na LAN o host não é localhost — ignora .env com localhost fixo
    if (!isLocalHostname(hostname)) {
      return apiUrlForHost(protocol, hostname);
    }
    if (fromEnv) {
      return fromEnv.replace(/\/$/, "");
    }
    return apiUrlForHost(protocol, hostname);
  }

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}

/** URL do WebSocket de monitoramento. */
export function getWsBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (!isLocalHostname(hostname)) {
      return wsUrlForApiBase(getApiBaseUrl());
    }
    if (fromEnv) {
      return fromEnv.replace(/\/$/, "");
    }
    return wsUrlForApiBase(getApiBaseUrl());
  }

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return wsUrlForApiBase(getApiBaseUrl());
}
