"use client";

import { useMemo, useRef } from "react";
import {
  presencasNaUnidade,
  processRastreamentoColaboradores,
  type PresencaColaboradorHud,
  type VehicleTrack,
} from "@/lib/veiculo-presenca-unidade";
import type { Colaborador, ColaboradorStatus, Unidade, Veiculo, VeiculoPosicao } from "@/lib/types";

/**
 * Rastreamento com estado persistente entre atualizações GPS.
 * Usa unidades/veículos/colaboradores já carregados pela tela (sem fetch extra).
 */
export function useVeiculoRastreamentoTracker(
  veiculoPosicoes: VeiculoPosicao[],
  unidades: Unidade[],
  veiculos: Veiculo[],
  colaboradores: Colaborador[]
) {
  const trackerRef = useRef<Map<string, VehicleTrack>>(new Map());

  return useMemo(
    () =>
      processRastreamentoColaboradores(
        trackerRef.current,
        veiculoPosicoes,
        unidades,
        veiculos,
        colaboradores
      ),
    [veiculoPosicoes, unidades, veiculos, colaboradores]
  );
}

export function usePresencasHudUnidade(
  presencasPorUnidade: Map<string, PresencaColaboradorHud[]>,
  unidadeId: string | null
): PresencaColaboradorHud[] {
  return useMemo(
    () => (unidadeId ? presencasNaUnidade(presencasPorUnidade, unidadeId) : []),
    [presencasPorUnidade, unidadeId]
  );
}

export type { ColaboradorStatus, PresencaColaboradorHud };
