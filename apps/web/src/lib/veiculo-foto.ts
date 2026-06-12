import { getAuthToken } from "@/lib/auth-session";

export const VEICULO_FOTO_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const VEICULO_FOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function isVeiculoFotoCustomUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith("/pics/"));
}

export async function uploadVeiculoFoto(
  file: File,
  oldFotoUrl?: string
): Promise<string> {
  if (file.size > VEICULO_FOTO_MAX_INPUT_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido.");
  }

  const token = getAuthToken();
  const body = new FormData();
  body.append("file", file);
  if (oldFotoUrl?.trim()) {
    body.append("oldFotoUrl", oldFotoUrl.trim());
  }

  const res = await fetch("/api/veiculos/foto", {
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
    throw new Error(msg || "Erro ao enviar foto.");
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) {
    throw new Error("Resposta inválida ao enviar foto.");
  }
  return data.url;
}
