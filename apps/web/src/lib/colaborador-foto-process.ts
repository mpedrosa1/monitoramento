import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const COLABORADOR_FOTO_SIZE_PX = 256;
export const COLABORADOR_FOTO_WEBP_QUALITY = 82;

export function colaboradorPicsDir(): string {
  return path.join(process.cwd(), "pics");
}

export function colaboradorFotoFilenameSafe(name: string): boolean {
  return /^[a-f0-9-]{36}\.webp$/i.test(name);
}

export function colaboradorFotoPathFromUrl(fotoUrl: string): string | null {
  if (!fotoUrl.startsWith("/pics/")) return null;
  const filename = path.basename(fotoUrl);
  if (!colaboradorFotoFilenameSafe(filename)) return null;
  return path.join(colaboradorPicsDir(), filename);
}

export async function processAndSaveColaboradorFoto(
  input: Buffer
): Promise<{ filename: string; url: string; bytes: number }> {
  await mkdir(colaboradorPicsDir(), { recursive: true });

  const filename = `${randomUUID()}.webp`;
  const outputPath = path.join(colaboradorPicsDir(), filename);

  const output = await sharp(input)
    .rotate()
    .resize(COLABORADOR_FOTO_SIZE_PX, COLABORADOR_FOTO_SIZE_PX, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: COLABORADOR_FOTO_WEBP_QUALITY })
    .toBuffer();

  await writeFile(outputPath, output);

  return {
    filename,
    url: `/pics/${filename}`,
    bytes: output.length,
  };
}

export async function deleteColaboradorFotoByUrl(
  fotoUrl: string | null | undefined
): Promise<void> {
  if (!fotoUrl) return;
  const filePath = colaboradorFotoPathFromUrl(fotoUrl);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    /* arquivo já removido ou inexistente */
  }
}
