import {
  isVeiculoContratoUrl,
  VEICULO_CONTRATO_ACCEPT,
  VEICULO_CONTRATO_MAX_BYTES,
} from "@/lib/veiculo-contrato";
import {
  deleteVeiculoContratoByUrl,
  processAndSaveVeiculoContrato,
} from "@/lib/veiculo-contrato-process";
import { assertCanUploadVeiculoContrato } from "@/lib/upload-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertCanUploadVeiculoContrato(request);
  } catch (res) {
    return res as Response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Formulário inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  if (file.size > VEICULO_CONTRATO_MAX_BYTES) {
    return Response.json(
      { error: "O contrato deve ter no máximo 20 MB." },
      { status: 400 }
    );
  }

  const isPdf =
    file.type === VEICULO_CONTRATO_ACCEPT ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return Response.json({ error: "Arquivo deve ser um PDF." }, { status: 400 });
  }

  const oldUrlField = formData.get("oldContratoUrl");
  const oldUrl =
    typeof oldUrlField === "string" && isVeiculoContratoUrl(oldUrlField)
      ? oldUrlField
      : undefined;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await processAndSaveVeiculoContrato(buffer);

    if (oldUrl) {
      await deleteVeiculoContratoByUrl(oldUrl);
    }

    return Response.json({
      url: saved.url,
      bytes: saved.bytes,
    });
  } catch {
    return Response.json(
      { error: "Não foi possível salvar o contrato." },
      { status: 500 }
    );
  }
}
