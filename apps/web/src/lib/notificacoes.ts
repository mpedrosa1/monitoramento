import { apiFetch } from "@/lib/api";
import type { Notificacao, TrocaVeiculo, Veiculo } from "@/lib/types";

export async function listNotificacoes(): Promise<Notificacao[]> {
  const data = await apiFetch<Notificacao[] | null>("/api/v1/notificacoes");
  return data ?? [];
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/notificacoes/${id}/lida`, { method: "PATCH" });
}

export async function solicitarTrocaVeiculo(body: {
  veiculoAlvoId: string;
  veiculoOfertadoId?: string;
}): Promise<TrocaVeiculo> {
  return apiFetch<TrocaVeiculo>("/api/v1/veiculos/trocas/solicitar", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function responderTrocaVeiculo(
  trocaId: string,
  aceitar: boolean
): Promise<TrocaVeiculo> {
  return apiFetch<TrocaVeiculo>(`/api/v1/veiculos/trocas/${trocaId}/responder`, {
    method: "POST",
    body: JSON.stringify({ aceitar }),
  });
}

export async function trocaAdminVeiculos(body: {
  veiculoAId: string;
  veiculoBId: string;
}): Promise<{ veiculoA: Veiculo; veiculoB: Veiculo }> {
  return apiFetch<{ veiculoA: Veiculo; veiculoB: Veiculo }>(
    "/api/v1/veiculos/trocas/admin",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export function isNotificacaoTrocaAcionavel(n: Notificacao): boolean {
  return (
    n.tipo === "troca_veiculo_solicitacao" &&
    !n.lida &&
    Boolean(n.payload.trocaId)
  );
}
