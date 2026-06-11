import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, jwtExpiresAtMs, jwtTipoAcesso } from "@/lib/auth-session";
import { canManageData } from "@/lib/permissions";
import type { TipoAcessoSistema } from "@/lib/types";

async function tokenFromRequest(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const jar = await cookies();
  const cookie = jar.get(AUTH_COOKIE_NAME)?.value;
  return cookie ? decodeURIComponent(cookie) : null;
}

export async function assertCanUploadColaboradorFoto(
  request: Request
): Promise<void> {
  const token = await tokenFromRequest(request);
  if (!token) {
    throw new Response(JSON.stringify({ error: "Não autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const exp = jwtExpiresAtMs(token);
  if (!exp || exp <= Date.now()) {
    throw new Response(JSON.stringify({ error: "Sessão expirada." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tipoAcesso = jwtTipoAcesso(token) as TipoAcessoSistema | null;
  if (!canManageData(tipoAcesso)) {
    throw new Response(JSON.stringify({ error: "Sem permissão para enviar foto." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
