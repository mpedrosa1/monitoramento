"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PainelMapaGeralUnidadeCard } from "@/components/painel/painel-mapa-geral-unidade-card";
import { PainelMapaHudControlesFullscreen } from "@/components/painel/painel-mapa-hud-controls";
import { PainelMapaHudEquipamentosFlutuantes } from "@/components/painel/painel-mapa-hud-equipamentos-flutuantes";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import {
  PainelMapaHudVeiculoCard,
  type VeiculoHudSelecao,
} from "@/components/painel/painel-mapa-hud-veiculo-card";
import { useGeralEquipamentosMapState } from "@/hooks/use-geral-equipamentos-map-state";
import { useMapaHudScale } from "@/hooks/use-mapa-hud-scale";
import { veiculoCardStorageKeyGeral } from "@/lib/mapa-hud-layout-storage";
import {
  MAPA_HUD_LISTA_UNIDADES_WIDTH_REM,
  MAPA_HUD_LISTA_UNIDADES_WIDTH_SM_REM,
} from "@/lib/mapa-hud-scale";
import type { MapaTileVisao } from "@/lib/mapa-tile-layers";
import {
  sortUnidadesForPainel,
  unidadeConnectivityLabel,
  unidadeConnectivityStatus,
} from "@/lib/unidade-form";
import { cn } from "@/lib/utils";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";

const MAPA_HUD_ROUND_BTN_CLASS =
  "pointer-events-auto h-9 w-9 rounded-full border border-white/15 bg-background/70 shadow-lg backdrop-blur-xl";

function unidadeHostOnline(
  u: Unidade,
  metricMap: Map<string, DeviceMetric>
): boolean {
  if (!u.ip?.trim()) return false;
  return metricMap.get(monitorUnidadeHostTargetId(u.id))?.online ?? false;
}

function unidadeHostOffline(
  u: Unidade,
  metricMap: Map<string, DeviceMetric>
): boolean {
  if (!u.ip?.trim()) return false;
  return !unidadeHostOnline(u, metricMap);
}

function statusBadgeClass(
  status: ReturnType<typeof unidadeConnectivityStatus>
): string {
  switch (status) {
    case "online":
      return "border-emerald-400/50 bg-emerald-500/20 text-emerald-100";
    case "offline":
      return "border-destructive/50 bg-destructive/20 text-red-100";
    case "sem_ip":
      return "border-white/20 bg-white/10 text-foreground/90";
  }
}

export function PainelMapaGeralHud({
  unidades,
  catalogo,
  metricMap,
  cardUnidadeId,
  onCardUnidadeIdChange,
  onOpenHudUnidade,
  onExitFullscreen,
  plotsAgrupados,
  onPlotsAgrupadosChange,
  mapTileVisao,
  onMapTileVisaoChange,
  linhasCoordenadasVisiveis,
  onLinhasCoordenadasVisiveisChange,
  veiculosInfoVisiveis,
  onVeiculosInfoVisiveisChange,
  raioAlertaVisivel,
  onRaioAlertaVisivelChange,
  veiculoSelecionado,
  onFecharVeiculoSelecionado,
}: {
  unidades: Unidade[];
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  cardUnidadeId: string | null;
  onCardUnidadeIdChange: (id: string | null) => void;
  onOpenHudUnidade: (id: string) => void;
  onExitFullscreen: () => void;
  plotsAgrupados: boolean;
  onPlotsAgrupadosChange: (agrupados: boolean) => void;
  mapTileVisao: MapaTileVisao;
  onMapTileVisaoChange: (visao: MapaTileVisao) => void;
  linhasCoordenadasVisiveis: boolean;
  onLinhasCoordenadasVisiveisChange: (visiveis: boolean) => void;
  veiculosInfoVisiveis: boolean;
  onVeiculosInfoVisiveisChange: (visiveis: boolean) => void;
  raioAlertaVisivel: boolean;
  onRaioAlertaVisivelChange: (visivel: boolean) => void;
  veiculoSelecionado: VeiculoHudSelecao | null;
  onFecharVeiculoSelecionado: () => void;
}) {
  const [hudScale, setHudScale] = useMapaHudScale();
  const [listaVisivel, setListaVisivel] = useState(true);
  const equipState = useGeralEquipamentosMapState();
  const equipDockRef = useRef<HTMLDivElement>(null);

  const listaCssVars = useMemo(
    () => ({ "--mapa-hud-scale": hudScale }) as CSSProperties,
    [hudScale]
  );

  const sortedUnidades = useMemo(
    () =>
      sortUnidadesForPainel(unidades, (u) => unidadeHostOffline(u, metricMap)),
    [unidades, metricMap]
  );

  const cardUnidade = useMemo(
    () => unidades.find((u) => u.id === cardUnidadeId) ?? null,
    [unidades, cardUnidadeId]
  );

  function handleSelectUnidade(id: string) {
    onCardUnidadeIdChange(id);
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1100]"
      role="region"
      aria-label="Visão geral do mapa"
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/55 via-transparent to-background/45"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--background)_100%)] opacity-35"
        aria-hidden
      />

      <PainelMapaHudControlesFullscreen
        hudScale={hudScale}
        onHudScaleChange={setHudScale}
        onExitFullscreen={onExitFullscreen}
        plotsAgrupados={plotsAgrupados}
        onPlotsAgrupadosChange={onPlotsAgrupadosChange}
        mapTileVisao={mapTileVisao}
        onMapTileVisaoChange={onMapTileVisaoChange}
        linhasCoordenadasVisiveis={linhasCoordenadasVisiveis}
        onLinhasCoordenadasVisiveisChange={onLinhasCoordenadasVisiveisChange}
        veiculosInfoVisiveis={veiculosInfoVisiveis}
        onVeiculosInfoVisiveisChange={onVeiculosInfoVisiveisChange}
        raioAlertaVisivel={raioAlertaVisivel}
        onRaioAlertaVisivelChange={onRaioAlertaVisivelChange}
      />

      {!listaVisivel ? (
        <div className="pointer-events-auto absolute left-3 top-3 z-[1200] sm:left-4 sm:top-4">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className={MAPA_HUD_ROUND_BTN_CLASS}
            onClick={() => setListaVisivel(true)}
            aria-label="Exibir lista de unidades"
            title="Exibir unidades"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <PainelMapaHudEquipamentosFlutuantes
        mapLayer="map-only"
        unidades={unidades}
        catalogo={catalogo}
        metricMap={metricMap}
        hudScale={hudScale}
        geralState={equipState}
        activeDockRef={equipDockRef}
        activeDockUnidadeId={cardUnidadeId}
        showUnidadeLabel
        linhasCoordenadasVisiveis={linhasCoordenadasVisiveis}
        overlayClassName="z-[10]"
      />

      <div className="absolute inset-3 flex min-h-0 flex-row items-stretch gap-2 sm:inset-4">
        {listaVisivel ? (
        <div
          className={cn(
            "pointer-events-auto flex min-h-0 shrink-0 flex-col self-stretch",
            `w-[min(100%,calc(${MAPA_HUD_LISTA_UNIDADES_WIDTH_REM}rem*var(--mapa-hud-scale)))]`,
            `sm:w-[min(100%,calc(${MAPA_HUD_LISTA_UNIDADES_WIDTH_SM_REM}rem*var(--mapa-hud-scale)))]`
          )}
          style={listaCssVars}
        >
          <PainelMapaHudGlass className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative z-[1] shrink-0 border-b border-white/10 p-[calc(0.875rem*var(--mapa-hud-scale))]">
              <div className="flex items-start justify-between gap-[calc(0.5rem*var(--mapa-hud-scale))]">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[length:calc(0.625rem*var(--mapa-hud-scale))] uppercase tracking-[0.2em] text-muted-foreground">
                    Unidades
                  </p>
                  <p className="mt-[calc(0.25rem*var(--mapa-hud-scale))] text-[length:calc(0.875rem*var(--mapa-hud-scale))] font-semibold leading-tight">
                    {sortedUnidades.length === 0
                      ? "Nenhuma cadastrada"
                      : `${sortedUnidades.length} unidade${sortedUnidades.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-[calc(1.75rem*var(--mapa-hud-scale))] w-[calc(1.75rem*var(--mapa-hud-scale))] shrink-0 rounded-full"
                  onClick={() => setListaVisivel(false)}
                  aria-label="Ocultar lista de unidades"
                  title="Ocultar lista"
                >
                  <PanelLeftClose className="h-[calc(0.875rem*var(--mapa-hud-scale))] w-[calc(0.875rem*var(--mapa-hud-scale))]" />
                </Button>
              </div>
            </div>

            {sortedUnidades.length === 0 ? (
              <p className="relative z-[1] p-[calc(0.875rem*var(--mapa-hud-scale))] text-[length:calc(0.875rem*var(--mapa-hud-scale))] text-muted-foreground">
                Nenhuma unidade cadastrada.
              </p>
            ) : (
              <ul className="relative z-[1] min-h-0 flex-1 space-y-[calc(0.125rem*var(--mapa-hud-scale))] overflow-y-auto overscroll-contain p-[calc(0.5rem*var(--mapa-hud-scale))]">
                {sortedUnidades.map((u) => {
                  const hostOnline = unidadeHostOnline(u, metricMap);
                  const connectivity = unidadeConnectivityStatus(u, hostOnline);
                  const active = u.id === cardUnidadeId;

                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectUnidade(u.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-[calc(0.5rem*var(--mapa-hud-scale))] rounded-lg px-[calc(0.75rem*var(--mapa-hud-scale))] py-[calc(0.625rem*var(--mapa-hud-scale))] text-left text-[length:calc(0.875rem*var(--mapa-hud-scale))] transition-colors",
                          active
                            ? "bg-background/60"
                            : "hover:bg-background/50"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {u.nome}
                          </span>
                          <span className="mt-[calc(0.125rem*var(--mapa-hud-scale))] block truncate font-mono text-[length:calc(0.625rem*var(--mapa-hud-scale))] text-muted-foreground">
                            ID {u.codigo}
                          </span>
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 border text-[length:calc(0.625rem*var(--mapa-hud-scale))] uppercase tracking-wide",
                            statusBadgeClass(connectivity)
                          )}
                        >
                          {unidadeConnectivityLabel(connectivity)}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PainelMapaHudGlass>
        </div>
        ) : null}

        {cardUnidade ? (
          <PainelMapaHudEquipamentosFlutuantes
            mapLayer="dock-only"
            unidade={cardUnidade}
            catalogo={catalogo}
            metricMap={metricMap}
            hudScale={hudScale}
            geralState={equipState}
            dockAberta
            builtInDock={false}
            externalDockRef={equipDockRef}
          >
            {(equipamentosDock) => (
              <div
                className="pointer-events-auto flex min-h-0 max-h-full shrink-0 self-stretch"
                style={listaCssVars}
              >
                <PainelMapaGeralUnidadeCard
                  unidade={cardUnidade}
                  metricMap={metricMap}
                  equipamentosDock={equipamentosDock}
                  onClose={() => onCardUnidadeIdChange(null)}
                  onOpenHud={() => onOpenHudUnidade(cardUnidade.id)}
                />
              </div>
            )}
          </PainelMapaHudEquipamentosFlutuantes>
        ) : null}
      </div>

      {veiculoSelecionado ? (
        <PainelMapaHudVeiculoCard
          selecao={veiculoSelecionado}
          hudScale={hudScale}
          positionStorageKey={veiculoCardStorageKeyGeral()}
          onClose={onFecharVeiculoSelecionado}
        />
      ) : null}
    </div>
  );
}
