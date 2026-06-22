"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { MapaUnidadeFocus } from "@/lib/mapa-unidade-focus";
import type { MapaTileVisao } from "@/lib/mapa-tile-layers";
import type { Colaborador, DeviceMetric, Unidade, Veiculo, VeiculoPosicao } from "@/lib/types";

const MapInner = dynamic(
  () => import("@/components/painel/painel-unidades-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export function PainelUnidadesMap({
  unidades,
  veiculos,
  colaboradores,
  veiculoPosicoes,
  metricMap,
  onSelectUnidade,
  onMapBackgroundClick,
  layoutKey,
  mapFocus,
  areaUnidadeId,
  plotsAgrupados,
  mapTileVisao,
  mostrarInfoVeiculos,
  veiculoSelecionadoId,
  onSelecionarVeiculo,
}: {
  unidades: Unidade[];
  veiculos: Veiculo[];
  colaboradores: Colaborador[];
  veiculoPosicoes: VeiculoPosicao[];
  metricMap: Map<string, DeviceMetric>;
  onSelectUnidade?: (id: string) => void;
  onMapBackgroundClick?: () => void;
  /** Altera quando o layout do mapa muda (ex.: tela cheia) para recalcular tamanho. */
  layoutKey?: unknown;
  mapFocus?: MapaUnidadeFocus | null;
  areaUnidadeId?: string | null;
  plotsAgrupados?: boolean;
  mapTileVisao?: MapaTileVisao;
  mostrarInfoVeiculos?: boolean;
  veiculoSelecionadoId?: string | null;
  onSelecionarVeiculo?: (veiculoId: string) => void;
}) {
  return (
    <div className="h-full min-h-0 w-full">
      <MapInner
        unidades={unidades}
        veiculos={veiculos}
        colaboradores={colaboradores}
        veiculoPosicoes={veiculoPosicoes}
        metricMap={metricMap}
        onSelectUnidade={onSelectUnidade}
        onMapBackgroundClick={onMapBackgroundClick}
        layoutKey={layoutKey}
        mapFocus={mapFocus}
        areaUnidadeId={areaUnidadeId}
        plotsAgrupados={plotsAgrupados}
        mapTileVisao={mapTileVisao}
        mostrarInfoVeiculos={mostrarInfoVeiculos}
        veiculoSelecionadoId={veiculoSelecionadoId}
        onSelecionarVeiculo={onSelecionarVeiculo}
      />
    </div>
  );
}
