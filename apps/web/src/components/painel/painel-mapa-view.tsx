"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import {
  exitDocumentFullscreen,
  getFullscreenElement,
  requestElementFullscreen,
} from "@/lib/fullscreen";
import { PainelMapaGeralHud } from "@/components/painel/painel-mapa-geral-hud";
import { PainelMapaOfflineSound } from "@/components/painel/painel-mapa-offline-sound";
import { PainelMapaUnidadeHud } from "@/components/painel/painel-mapa-unidade-hud";
import { PainelUnidadesMap } from "@/components/painel/painel-unidades-map";
import type { SocketStatus } from "@/hooks/useMonitoringSocket";

export function PainelMapaView({
  unidades,
  catalogo,
  metricMap,
  socketStatus,
  mapHudUnidadeId,
  onMapHudUnidadeIdChange,
  onIrParaAbaEquipamentos,
}: {
  unidades: Unidade[];
  catalogo: Equipamento[];
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

  const mapHudUnidade = useMemo(
    () => unidades.find((u) => u.id === mapHudUnidadeId) ?? null,
    [unidades, mapHudUnidadeId]
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

      <div className="relative min-h-0 w-full flex-1">
        <div className="absolute inset-0">
          <PainelUnidadesMap
            unidades={unidades}
            metricMap={metricMap}
            layoutKey={fullscreen}
            mapFocus={mapFocus}
            areaUnidadeId={areaUnidadeId}
            onSelectUnidade={onMapHudUnidadeIdChange}
            onMapBackgroundClick={() => onMapHudUnidadeIdChange(null)}
          />
        </div>

        {fullscreen && !mapHudUnidade ? (
          <PainelMapaGeralHud
            unidades={unidades}
            metricMap={metricMap}
            onExitFullscreen={() => void leaveFullscreen()}
            onSelectUnidade={onMapHudUnidadeIdChange}
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
            fullscreen={fullscreen}
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
      </div>
    </div>
  );
}
