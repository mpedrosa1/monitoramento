import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { picsFilePathFromUrl } from "@/lib/pics-files";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path: segments } = await context.params;
  const fotoUrl =
    "/pics/" + (segments?.map((s) => s.replace(/\\/g, "/")).join("/") ?? "");
  const filePath = picsFilePathFromUrl(fotoUrl);
  if (!filePath) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Não encontrado", { status: 404 });
  }
}
