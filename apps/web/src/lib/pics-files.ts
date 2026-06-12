import path from "node:path";

export function picsRootDir(): string {
  return path.join(process.cwd(), "pics");
}

export function picsFotoFilenameSafe(name: string): boolean {
  return /^[a-f0-9-]{36}\.webp$/i.test(name);
}

/** Resolve URL pública `/pics/...` para caminho no disco (com validação). */
export function picsFilePathFromUrl(fotoUrl: string): string | null {
  if (!fotoUrl.startsWith("/pics/")) return null;

  const relative = fotoUrl.slice("/pics/".length);
  const parts = relative.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  if (parts.length === 1) {
    if (!picsFotoFilenameSafe(parts[0])) return null;
    return path.join(picsRootDir(), parts[0]);
  }

  if (
    parts.length === 2 &&
    parts[0] === "veiculos" &&
    picsFotoFilenameSafe(parts[1])
  ) {
    return path.join(picsRootDir(), "veiculos", parts[1]);
  }

  return null;
}
