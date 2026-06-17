import { getAuthToken } from "@/lib/auth-session";

export const DESPESA_COMPROVANTE_MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const DESPESA_COMPROVANTE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

export function isDespesaComprovanteUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith("/pics/despesas/"));
}

export async function uploadDespesaComprovante(
  file: File,
  oldComprovanteUrl?: string
): Promise<string> {
  if (file.size > DESPESA_COMPROVANTE_MAX_INPUT_BYTES) {
    throw new Error("A imagem deve ter no máximo 8 MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido.");
  }

  const token = getAuthToken();
  const body = new FormData();
  body.append("file", file);
  if (oldComprovanteUrl?.trim()) {
    body.append("oldComprovanteUrl", oldComprovanteUrl.trim());
  }

  const res = await fetch("/api/despesas/comprovante", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (err as { error?: string }).error ?? "Erro ao enviar comprovante."
    );
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) {
    throw new Error("Resposta inválida ao enviar comprovante.");
  }
  return data.url;
}
