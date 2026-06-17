import type { Veiculo } from "@/lib/types";

/** Motorista atual não consta na lista de condutores autorizados. */
export function motoristaAtualForaDaListaAutorizados(veiculo: Veiculo): boolean {
  const motoristaId = veiculo.colaboradorId?.trim();
  if (!motoristaId) return false;
  const autorizados = (veiculo.colaboradoresAdicionaisIds ?? []).filter(Boolean);
  if (autorizados.length === 0) return false;
  return !autorizados.includes(motoristaId);
}

/** Motorista atual ou condutor autorizado do veículo. */
export function colaboradorAutorizadoVeiculo(
  veiculo: Veiculo,
  colaboradorId: string
): boolean {
  if (!colaboradorId.trim()) return false;
  if (veiculo.colaboradorId === colaboradorId) return true;
  return (veiculo.colaboradoresAdicionaisIds ?? []).includes(colaboradorId);
}
