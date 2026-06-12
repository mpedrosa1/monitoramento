import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  colaboradorFotoFilenameSafe,
  colaboradorPicsDir,
} from "@/lib/colaborador-foto-process";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  if (!colaboradorFotoFilenameSafe(filename)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const filePath = path.join(colaboradorPicsDir(), filename);

  try {
    const data = await readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
