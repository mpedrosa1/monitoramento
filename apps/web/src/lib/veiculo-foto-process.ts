import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { picsFilePathFromUrl, picsFotoFilenameSafe, picsRootDir } from "@/lib/pics-files";

export const VEICULO_FOTO_WIDTH_PX = 960;
export const VEICULO_FOTO_HEIGHT_PX = 600;
export const VEICULO_FOTO_WEBP_QUALITY = 85;

export function veiculoFotoPathFromUrl(fotoUrl: string): string | null {
  return picsFilePathFromUrl(fotoUrl);
}

export async function processAndSaveVeiculoFoto(
  input: Buffer
): Promise<{ filename: string; url: string; bytes: number }> {
  await mkdir(picsRootDir(), { recursive: true });

  const filename = `${randomUUID()}.webp`;
  if (!picsFotoFilenameSafe(filename)) {
    throw new Error("nome de arquivo inválido");
  }
  const outputPath = path.join(picsRootDir(), filename);

  const output = await sharp(input)
    .rotate()
    .resize(VEICULO_FOTO_WIDTH_PX, VEICULO_FOTO_HEIGHT_PX, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: VEICULO_FOTO_WEBP_QUALITY })
    .toBuffer();

  await writeFile(outputPath, output);

  return {
    filename,
    url: `/pics/${filename}`,
    bytes: output.length,
  };
}

export async function deleteVeiculoFotoByUrl(
  fotoUrl: string | null | undefined
): Promise<void> {
  if (!fotoUrl) return;
  const filePath = veiculoFotoPathFromUrl(fotoUrl);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    /* arquivo já removido ou inexistente */
  }
}
