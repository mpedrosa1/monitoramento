import { getAuthToken } from "@/lib/auth-session";

export const VEICULO_CONTRATO_MAX_BYTES = 20 * 1024 * 1024;
export const VEICULO_CONTRATO_ACCEPT = "application/pdf";

export function veiculoContratoFilenameSafe(name: string): boolean {
  return /^[a-f0-9-]{36}\.pdf$/i.test(name);
}

export function isVeiculoContratoUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith("/pics/veiculos/contratos/"));
}

export async function uploadVeiculoContrato(
  file: File,
  oldContratoUrl?: string
): Promise<string> {
  if (file.size > VEICULO_CONTRATO_MAX_BYTES) {
    throw new Error("O contrato deve ter no máximo 20 MB.");
  }
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("Selecione um arquivo PDF.");
  }

  const token = getAuthToken();
  const body = new FormData();
  body.append("file", file);
  if (oldContratoUrl?.trim()) {
    body.append("oldContratoUrl", oldContratoUrl.trim());
  }

  const res = await fetch("/api/veiculos/contrato", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = (err as { error?: string }).error ?? res.statusText;
    if (res.status === 405) {
      throw new Error(
        "Upload indisponível. Reinicie o servidor Next.js (npm run dev) e tente novamente."
      );
    }
    throw new Error(msg || "Erro ao enviar contrato.");
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) {
    throw new Error("Resposta inválida ao enviar contrato.");
  }
  return data.url;
}
