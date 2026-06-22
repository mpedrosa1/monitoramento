"use client";

import { useColaboradorRastreamento } from "@/components/dashboard/colaborador-rastreamento-context";
import type { PresencaColaboradorHud } from "@/lib/veiculo-presenca-unidade";

export function usePresencasColaboradorUnidade(
  unidadeId: string | null
): PresencaColaboradorHud[] {
  const { presencasNaUnidade } = useColaboradorRastreamento();
  if (!unidadeId) return [];
  return presencasNaUnidade(unidadeId);
}
