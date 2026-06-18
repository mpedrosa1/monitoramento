"use client";

import { useMemo, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { PainelMapaHudControlesFullscreen } from "@/components/painel/painel-mapa-hud-controls";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import { useMapaHudScale } from "@/hooks/use-mapa-hud-scale";
import {
  MAPA_HUD_LISTA_UNIDADES_WIDTH_REM,
  MAPA_HUD_LISTA_UNIDADES_WIDTH_SM_REM,
} from "@/lib/mapa-hud-scale";
import {
  sortUnidadesForPainel,
  unidadeConnectivityLabel,
  unidadeConnectivityStatus,
} from "@/lib/unidade-form";
import { cn } from "@/lib/utils";
import type { DeviceMetric, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";

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
  metricMap,
  onExitFullscreen,
  onSelectUnidade,
}: {
  unidades: Unidade[];
  metricMap: Map<string, DeviceMetric>;
  onExitFullscreen: () => void;
  onSelectUnidade: (id: string) => void;
}) {
  const [hudScale, setHudScale] = useMapaHudScale();

  const listaCssVars = useMemo(
    () => ({ "--mapa-hud-scale": hudScale }) as CSSProperties,
    [hudScale]
  );

  const sortedUnidades = useMemo(
    () =>
      sortUnidadesForPainel(unidades, (u) => unidadeHostOffline(u, metricMap)),
    [unidades, metricMap]
  );

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
      />

      <div className="absolute inset-3 sm:inset-4">
        <div
          className={cn(
            "pointer-events-auto absolute inset-y-0 left-0 flex min-h-0 flex-col",
            `w-[min(100%,calc(${MAPA_HUD_LISTA_UNIDADES_WIDTH_REM}rem*var(--mapa-hud-scale)))]`,
            `sm:w-[min(100%,calc(${MAPA_HUD_LISTA_UNIDADES_WIDTH_SM_REM}rem*var(--mapa-hud-scale)))]`
          )}
          style={listaCssVars}
        >
          <PainelMapaHudGlass className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative z-[1] shrink-0 border-b border-white/10 p-[calc(0.875rem*var(--mapa-hud-scale))]">
              <p className="font-mono text-[length:calc(0.625rem*var(--mapa-hud-scale))] uppercase tracking-[0.2em] text-muted-foreground">
                Unidades
              </p>
              <p className="mt-[calc(0.25rem*var(--mapa-hud-scale))] text-[length:calc(0.875rem*var(--mapa-hud-scale))] font-semibold leading-tight">
                {sortedUnidades.length === 0
                  ? "Nenhuma cadastrada"
                  : `${sortedUnidades.length} unidade${sortedUnidades.length === 1 ? "" : "s"}`}
              </p>
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

                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => onSelectUnidade(u.id)}
                        className="flex w-full items-center justify-between gap-[calc(0.5rem*var(--mapa-hud-scale))] rounded-lg px-[calc(0.75rem*var(--mapa-hud-scale))] py-[calc(0.625rem*var(--mapa-hud-scale))] text-left text-[length:calc(0.875rem*var(--mapa-hud-scale))] transition-colors hover:bg-background/50"
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
      </div>
    </div>
  );
}
