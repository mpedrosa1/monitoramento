"use client";

import { useEffect } from "react";
import type { Colaborador, Unidade, Veiculo } from "@/lib/types";
import { useRastreamentoCatalogSync } from "@/components/dashboard/colaborador-rastreamento-context";

/** Injeta catálogo já carregado pela página no provider global de rastreamento. */
export function RastreamentoCatalogSync({
  unidades,
  veiculos,
  colaboradores,
}: {
  unidades: Unidade[];
  veiculos: Veiculo[];
  colaboradores: Colaborador[];
}) {
  const sync = useRastreamentoCatalogSync();

  useEffect(() => {
    sync({ unidades, veiculos, colaboradores });
  }, [unidades, veiculos, colaboradores, sync]);

  return null;
}
