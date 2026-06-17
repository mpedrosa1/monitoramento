import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { picsFilePathFromUrl, picsRootDir } from "@/lib/pics-files";

export const DESPESA_COMPROVANTE_MAX_WIDTH_PX = 1280;
export const DESPESA_COMPROVANTE_WEBP_QUALITY = 78;

export function despesasPicsDir(): string {
  return path.join(picsRootDir(), "despesas");
}

export function isDespesaComprovanteUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith("/pics/despesas/"));
}

export async function processAndSaveDespesaComprovante(
  input: Buffer
): Promise<{ filename: string; url: string; bytes: number }> {
  await mkdir(despesasPicsDir(), { recursive: true });

  const filename = `${randomUUID()}.webp`;
  const outputPath = path.join(despesasPicsDir(), filename);

  const output = await sharp(input)
    .rotate()
    .resize(DESPESA_COMPROVANTE_MAX_WIDTH_PX, DESPESA_COMPROVANTE_MAX_WIDTH_PX, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: DESPESA_COMPROVANTE_WEBP_QUALITY })
    .toBuffer();

  await writeFile(outputPath, output);

  return {
    filename,
    url: `/pics/despesas/${filename}`,
    bytes: output.length,
  };
}

export async function deleteDespesaComprovanteByUrl(
  comprovanteUrl: string | null | undefined
): Promise<void> {
  if (!comprovanteUrl) return;
  const filePath = picsFilePathFromUrl(comprovanteUrl);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    /* arquivo já removido ou inexistente */
  }
}
