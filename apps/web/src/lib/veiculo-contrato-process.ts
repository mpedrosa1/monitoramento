import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { picsFilePathFromUrl, picsRootDir } from "@/lib/pics-files";
import { veiculoContratoFilenameSafe } from "@/lib/veiculo-contrato";

export async function processAndSaveVeiculoContrato(
  input: Buffer
): Promise<{ filename: string; url: string; bytes: number }> {
  const dir = path.join(picsRootDir(), "veiculos", "contratos");
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.pdf`;
  if (!veiculoContratoFilenameSafe(filename)) {
    throw new Error("nome de arquivo inválido");
  }
  const outputPath = path.join(dir, filename);
  await writeFile(outputPath, input);

  return {
    filename,
    url: `/pics/veiculos/contratos/${filename}`,
    bytes: input.length,
  };
}

export async function deleteVeiculoContratoByUrl(
  contratoUrl: string | null | undefined
): Promise<void> {
  if (!contratoUrl) return;
  const filePath = picsFilePathFromUrl(contratoUrl);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    /* arquivo já removido ou inexistente */
  }
}
