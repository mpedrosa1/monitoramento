"use client";

import { useMemo } from "react";
import type { Unidade } from "@/lib/types";
import { coordsFromUnidade } from "@/components/unidades/unidade-detail-panel";
import { MissaoMap } from "@/components/missoes/missao-map";

export function MissaoLocalizacaoRotaSection({ unidade }: { unidade: Unidade }) {
  const position = useMemo(() => {
    const c = coordsFromUnidade(unidade);
    return c ? { lat: c.lat, lng: c.lng } : null;
  }, [unidade]);

  const mapLabel = `${unidade.codigo} — ${unidade.nome}`;

  return (
    <section className="space-y-2">
      <p className="text-sm font-semibold">Localização e rota</p>
      {!position ? (
        <p className="text-xs text-muted-foreground">
          Coordenadas não cadastradas para esta unidade. O mapa exibe a região
          central de referência.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Autorize o navegador a usar sua localização para traçar a rota até a
          unidade.
        </p>
      )}
      <MissaoMap destination={position} label={mapLabel} />
    </section>
  );
}
