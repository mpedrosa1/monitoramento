"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Colaborador, DeviceMetric, Equipamento, Unidade, Veiculo, VeiculoPosicao } from "@/lib/types";
import {
  exitDocumentFullscreen,
  getFullscreenElement,
  requestElementFullscreen,
} from "@/lib/fullscreen";
import { PainelMapaGeralHud } from "@/components/painel/painel-mapa-geral-hud";
import { MapHudProjectionProvider } from "@/components/painel/mapa-hud-projection";
import { PainelMapaOfflineSound } from "@/components/painel/painel-mapa-offline-sound";
import { PainelMapaVeiculoProximidadeAlertas } from "@/components/painel/painel-mapa-veiculo-proximidade-alertas";
import {
  usePresencasHudUnidade,
  useVeiculoRastreamentoTracker,
} from "@/hooks/use-veiculo-rastreamento-tracker";
import { PainelMapaUnidadeHud } from "@/components/painel/painel-mapa-unidade-hud";
import type { VeiculoHudSelecao } from "@/components/painel/painel-mapa-hud-veiculo-card";
import { PainelUnidadesMap } from "@/components/painel/painel-unidades-map";
import type { MapaTileVisao } from "@/lib/mapa-tile-layers";
import type { SocketStatus } from "@/hooks/useMonitoringSocket";

export function PainelMapaView({
  unidades,
  catalogo,
  veiculos,
  colaboradores,
  veiculoPosicoes,
  metricMap,
  socketStatus,
  mapHudUnidadeId,
  onMapHudUnidadeIdChange,
  onIrParaAbaEquipamentos,
}: {
  unidades: Unidade[];
  catalogo: Equipamento[];
  veiculos: Veiculo[];
  colaboradores: Colaborador[];
  veiculoPosicoes: VeiculoPosicao[];
  metricMap: Map<string, DeviceMetric>;
  socketStatus?: SocketStatus;
  mapHudUnidadeId: string | null;
  onMapHudUnidadeIdChange: (id: string | null) => void;
  onIrParaAbaEquipamentos: (unidade: Unidade) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [mapFocus, setMapFocus] = useState<{
    unidadeId: string;
    token: number;
  } | null>(null);
  const [areaUnidadeId, setAreaUnidadeId] = useState<string | null>(null);
  const [geralCardUnidadeId, setGeralCardUnidadeId] = useState<string | null>(
    null
  );
  const [plotsAgrupados, setPlotsAgrupados] = useState(true);
  const [mapTileVisao, setMapTileVisao] = useState<MapaTileVisao>("rua");
  const [linhasCoordenadasVisiveis, setLinhasCoordenadasVisiveis] =
    useState(true);
  const [veiculosInfoVisiveis, setVeiculosInfoVisiveis] = useState(true);
  const [veiculoSelecionadoId, setVeiculoSelecionadoId] = useState<
    string | null
  >(null);

  const mapHudUnidade = useMemo(
    () => unidades.find((u) => u.id === mapHudUnidadeId) ?? null,
    [unidades, mapHudUnidadeId]
  );

  const hudMapaAtivo = fullscreen || Boolean(mapHudUnidade);

  const { presencasPorUnidade } = useVeiculoRastreamentoTracker(
    veiculoPosicoes,
    unidades,
    veiculos,
    colaboradores
  );
  const presencasHudUnidade = usePresencasHudUnidade(
    presencasPorUnidade,
    mapHudUnidadeId
  );

  const veiculoHudSelecionado = useMemo((): VeiculoHudSelecao | null => {
    if (!veiculoSelecionadoId) return null;
    const posicao = veiculoPosicoes.find(
      (p) => p.veiculoId === veiculoSelecionadoId
    );
    if (!posicao) return null;
    const veiculo = veiculos.find((v) => v.id === veiculoSelecionadoId);
    const motorista = veiculo
      ? colaboradores.find((c) => c.id === veiculo.colaboradorId)
      : undefined;
    return { posicao, veiculo, motorista };
  }, [veiculoSelecionadoId, veiculoPosicoes, veiculos, colaboradores]);

  const handleSelecionarVeiculo = useCallback(
    (veiculoId: string) => {
      if (!hudMapaAtivo) return;
      setVeiculoSelecionadoId((prev) => (prev === veiculoId ? null : veiculoId));
    },
    [hudMapaAtivo]
  );

  const syncFullscreenState = useCallback(() => {
    const active = getFullscreenElement() === rootRef.current;
    setFullscreen(active);
    if (active) {
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, [syncFullscreenState]);

  useEffect(() => {
    return () => {
      if (getFullscreenElement() === rootRef.current) {
        void exitDocumentFullscreen();
      }
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      await requestElementFullscreen(el);
      setFullscreen(true);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 500);
    } catch {
      /* usuário cancelou ou navegador bloqueou */
    }
  }, []);

  const leaveFullscreen = useCallback(async () => {
    try {
      await exitDocumentFullscreen();
    } finally {
      setFullscreen(false);
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
    }
  }, []);

  useEffect(() => {
    setMapFocus(null);
    setAreaUnidadeId(null);
  }, [mapHudUnidadeId]);

  useEffect(() => {
    if (!fullscreen) setGeralCardUnidadeId(null);
  }, [fullscreen]);

  useEffect(() => {
    if (mapHudUnidadeId) setGeralCardUnidadeId(null);
  }, [mapHudUnidadeId]);

  useEffect(() => {
    if (!hudMapaAtivo) setVeiculoSelecionadoId(null);
  }, [hudMapaAtivo]);

  const zoomParaUnidade = useCallback((unidadeId: string) => {
    setMapFocus((prev) => ({
      unidadeId,
      token: (prev?.token ?? 0) + 1,
    }));
    setAreaUnidadeId(unidadeId);
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "painel-mapa-fs-root relative flex h-full min-h-0 flex-col bg-background"
      )}
    >
      <PainelMapaOfflineSound active unidades={unidades} metricMap={metricMap} />
      <PainelMapaVeiculoProximidadeAlertas active />

      <div className="relative min-h-0 w-full flex-1">
        <MapHudProjectionProvider>
        <div className="absolute inset-0">
          <PainelUnidadesMap
            unidades={unidades}
            veiculos={veiculos}
            colaboradores={colaboradores}
            veiculoPosicoes={veiculoPosicoes}
            metricMap={metricMap}
            layoutKey={fullscreen}
            mapFocus={mapFocus}
            areaUnidadeId={areaUnidadeId}
            plotsAgrupados={plotsAgrupados}
            mapTileVisao={mapTileVisao}
            mostrarInfoVeiculos={veiculosInfoVisiveis}
            veiculoSelecionadoId={veiculoSelecionadoId}
            onSelecionarVeiculo={
              hudMapaAtivo ? handleSelecionarVeiculo : undefined
            }
            onSelectUnidade={(id) => {
              setVeiculoSelecionadoId(null);
              if (fullscreen && !mapHudUnidade) {
                setGeralCardUnidadeId(id);
                return;
              }
              onMapHudUnidadeIdChange(id);
            }}
            onMapBackgroundClick={() => {
              setGeralCardUnidadeId(null);
              setVeiculoSelecionadoId(null);
            }}
          />
        </div>

        {fullscreen && !mapHudUnidade ? (
          <PainelMapaGeralHud
            unidades={unidades}
            catalogo={catalogo}
            metricMap={metricMap}
            cardUnidadeId={geralCardUnidadeId}
            onCardUnidadeIdChange={setGeralCardUnidadeId}
            plotsAgrupados={plotsAgrupados}
            onPlotsAgrupadosChange={setPlotsAgrupados}
            mapTileVisao={mapTileVisao}
            onMapTileVisaoChange={setMapTileVisao}
            linhasCoordenadasVisiveis={linhasCoordenadasVisiveis}
            onLinhasCoordenadasVisiveisChange={setLinhasCoordenadasVisiveis}
            veiculosInfoVisiveis={veiculosInfoVisiveis}
            onVeiculosInfoVisiveisChange={setVeiculosInfoVisiveis}
            veiculoSelecionado={veiculoHudSelecionado}
            onFecharVeiculoSelecionado={() => setVeiculoSelecionadoId(null)}
            onOpenHudUnidade={(id) => {
              setGeralCardUnidadeId(null);
              onMapHudUnidadeIdChange(id);
            }}
            onExitFullscreen={() => void leaveFullscreen()}
          />
        ) : null}

        {!mapHudUnidade && !fullscreen ? (
          <div className="pointer-events-none absolute right-3 top-3 z-[500] sm:right-4 sm:top-4">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="pointer-events-auto h-9 w-9 rounded-full border border-white/15 bg-background/70 shadow-lg backdrop-blur-xl"
              onClick={() => void enterFullscreen()}
              aria-label="Mapa em tela cheia"
              title="Tela cheia"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {mapHudUnidade ? (
          <PainelMapaUnidadeHud
            unidade={mapHudUnidade}
            catalogo={catalogo}
            metricMap={metricMap}
            presencasColaboradores={presencasHudUnidade}
            fullscreen={fullscreen}
            plotsAgrupados={plotsAgrupados}
            onPlotsAgrupadosChange={setPlotsAgrupados}
            mapTileVisao={mapTileVisao}
            onMapTileVisaoChange={setMapTileVisao}
            linhasCoordenadasVisiveis={linhasCoordenadasVisiveis}
            onLinhasCoordenadasVisiveisChange={setLinhasCoordenadasVisiveis}
            veiculosInfoVisiveis={veiculosInfoVisiveis}
            onVeiculosInfoVisiveisChange={setVeiculosInfoVisiveis}
            veiculoSelecionado={veiculoHudSelecionado}
            onFecharVeiculoSelecionado={() => setVeiculoSelecionadoId(null)}
            onExitFullscreen={
              fullscreen ? () => void leaveFullscreen() : undefined
            }
            onVoltarHudGeral={
              fullscreen ? () => onMapHudUnidadeIdChange(null) : undefined
            }
            onClose={() => onMapHudUnidadeIdChange(null)}
            onIrParaAbaEquipamentos={
              fullscreen
                ? undefined
                : () => onIrParaAbaEquipamentos(mapHudUnidade)
            }
            onZoomParaLocalizacao={() => zoomParaUnidade(mapHudUnidade.id)}
          />
        ) : null}
        </MapHudProjectionProvider>
      </div>
    </div>
  );
}
