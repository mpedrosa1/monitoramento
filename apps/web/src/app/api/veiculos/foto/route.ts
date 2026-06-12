import {
  VEICULO_FOTO_MAX_INPUT_BYTES,
  isVeiculoFotoCustomUrl,
} from "@/lib/veiculo-foto";
import {
  deleteVeiculoFotoByUrl,
  processAndSaveVeiculoFoto,
} from "@/lib/veiculo-foto-process";
import { assertCanUploadColaboradorFoto } from "@/lib/upload-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertCanUploadColaboradorFoto(request);
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
    return Response.json({ error: "Nenhuma imagem enviada." }, { status: 400 });
  }

  if (file.size > VEICULO_FOTO_MAX_INPUT_BYTES) {
    return Response.json(
      { error: "A imagem deve ter no máximo 5 MB." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Arquivo deve ser uma imagem." }, { status: 400 });
  }

  const oldFotoUrl = formData.get("oldFotoUrl");
  const oldUrl =
    typeof oldFotoUrl === "string" && isVeiculoFotoCustomUrl(oldFotoUrl)
      ? oldFotoUrl
      : undefined;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await processAndSaveVeiculoFoto(buffer);

    if (oldUrl) {
      await deleteVeiculoFotoByUrl(oldUrl);
    }

    return Response.json({
      url: saved.url,
      bytes: saved.bytes,
    });
  } catch {
    return Response.json(
      { error: "Não foi possível processar a imagem." },
      { status: 500 }
    );
  }
}
