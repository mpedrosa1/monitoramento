import {
  DESPESA_COMPROVANTE_MAX_INPUT_BYTES,
  isDespesaComprovanteUrl,
} from "@/lib/despesa-comprovante";
import {
  deleteDespesaComprovanteByUrl,
  processAndSaveDespesaComprovante,
} from "@/lib/despesa-comprovante-process";
import { assertAuthenticatedUser } from "@/lib/upload-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertAuthenticatedUser(request);
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

  if (file.size > DESPESA_COMPROVANTE_MAX_INPUT_BYTES) {
    return Response.json(
      { error: "A imagem deve ter no máximo 8 MB." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Arquivo deve ser uma imagem." }, { status: 400 });
  }

  const oldUrlField = formData.get("oldComprovanteUrl");
  const oldUrl =
    typeof oldUrlField === "string" && isDespesaComprovanteUrl(oldUrlField)
      ? oldUrlField
      : undefined;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await processAndSaveDespesaComprovante(buffer);

    if (oldUrl) {
      await deleteDespesaComprovanteByUrl(oldUrl);
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
