"use client";

import type { ReactNode } from "react";
import { Activity, Cpu, Network, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contarEquipamentosUnidade } from "@/components/unidades/unidade-equipamentos-grid";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import {
  unidadeConnectivityLabel,
  unidadeConnectivityStatus,
} from "@/lib/unidade-form";
import { cn } from "@/lib/utils";
import type { DeviceMetric, Unidade } from "@/lib/types";
import { monitorTargetId, monitorUnidadeHostTargetId } from "@/lib/types";

const MAPA_HUD_ROUND_BTN_CLASS =
  "pointer-events-auto h-9 w-9 rounded-full border border-white/15 bg-background/70 shadow-lg backdrop-blur-xl";

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

function resumoEquipamentos(
  unidade: Unidade,
  metricMap: Map<string, DeviceMetric>
) {
  const links = unidade.equipamentos ?? [];
  let online = 0;
  let comMetrica = 0;
  for (const link of links) {
    const metric = metricMap.get(
      monitorTargetId(unidade.id, link.equipamentoId, link.porta)
    );
    if (!metric) continue;
    comMetrica++;
    if (metric.online) online++;
  }
  return { online, comMetrica, total: links.length };
}

export function PainelMapaGeralUnidadeCard({
  unidade,
  metricMap,
  equipamentosDock,
  onClose,
  onOpenHud,
}: {
  unidade: Unidade;
  metricMap: Map<string, DeviceMetric>;
  equipamentosDock?: ReactNode;
  onClose: () => void;
  onOpenHud: () => void;
}) {
  const hostOnline = unidade.ip?.trim()
    ? (metricMap.get(monitorUnidadeHostTargetId(unidade.id))?.online ?? false)
    : false;
  const connectivity = unidadeConnectivityStatus(unidade, hostOnline);
  const grupos = contarEquipamentosUnidade(unidade);
  const equip = resumoEquipamentos(unidade, metricMap);

  const connectivityAccent =
    connectivity === "online"
      ? "online"
      : connectivity === "offline"
        ? "offline"
        : "sem_ip";

  return (
    <div className="flex h-full max-h-full min-h-0 items-start gap-2">
      <PainelMapaHudGlass
        accent={connectivityAccent}
        className="slide-in-from-left-2 flex h-full max-h-full min-h-0 w-[min(100%,calc(20rem*var(--mapa-hud-scale)))] shrink-0 flex-col overflow-hidden animate-in sm:w-[min(100%,calc(22rem*var(--mapa-hud-scale)))]"
      >
        <div className="p-[calc(0.875rem*var(--mapa-hud-scale))]">
          <p className="font-mono text-[length:calc(0.625rem*var(--mapa-hud-scale))] uppercase tracking-[0.2em] text-muted-foreground">
            Unidade
          </p>
          <h3 className="mt-[calc(0.25rem*var(--mapa-hud-scale))] truncate text-[length:calc(1rem*var(--mapa-hud-scale))] font-semibold leading-tight sm:text-[length:calc(1.125rem*var(--mapa-hud-scale))]">
            {unidade.nome}
          </h3>
          <p className="font-mono text-[length:calc(0.75rem*var(--mapa-hud-scale))] text-muted-foreground">
            ID {unidade.codigo}
          </p>

          <div className="mt-[calc(0.625rem*var(--mapa-hud-scale))] flex flex-wrap items-center gap-[calc(0.5rem*var(--mapa-hud-scale))]">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 border text-[length:calc(0.625rem*var(--mapa-hud-scale))] uppercase tracking-wide",
                statusBadgeClass(connectivity)
              )}
            >
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  connectivity === "online"
                    ? "animate-pulse bg-emerald-400"
                    : connectivity === "offline"
                      ? "bg-destructive"
                      : "bg-muted-foreground"
                )}
              />
              {unidadeConnectivityLabel(connectivity)}
            </Badge>
            {unidade.ip?.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-background/40 px-2 py-0.5 font-mono text-[length:calc(0.75rem*var(--mapa-hud-scale))] text-muted-foreground">
                <Network className="h-3 w-3 shrink-0" />
                {unidade.ip}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10">
          <div className="bg-background/40 p-[calc(0.75rem*var(--mapa-hud-scale))]">
            <div className="flex items-center gap-1.5 text-[length:calc(0.625rem*var(--mapa-hud-scale))] uppercase tracking-wide text-muted-foreground">
              <Cpu className="h-3 w-3" />
              Grupos
            </div>
            <p className="mt-1 font-mono text-[length:calc(1.5rem*var(--mapa-hud-scale))] font-semibold tabular-nums">
              {grupos}
            </p>
          </div>
          <div className="bg-background/40 p-[calc(0.75rem*var(--mapa-hud-scale))]">
            <div className="flex items-center gap-1.5 text-[length:calc(0.625rem*var(--mapa-hud-scale))] uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3 w-3" />
              Online
            </div>
            <p className="mt-1 font-mono text-[length:calc(1.5rem*var(--mapa-hud-scale))] font-semibold tabular-nums text-emerald-400">
              {equip.online}
              <span className="text-[length:calc(0.875rem*var(--mapa-hud-scale))] font-normal text-muted-foreground">
                /{equip.comMetrica || equip.total}
              </span>
            </p>
          </div>
        </div>

        {equipamentosDock}

        <div className="shrink-0 border-t border-white/10 bg-background/40 p-[calc(0.75rem*var(--mapa-hud-scale))]">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto w-full bg-background/50 text-[length:calc(0.875rem*var(--mapa-hud-scale))] backdrop-blur-sm"
            onClick={onOpenHud}
          >
            Abrir HUD da unidade
          </Button>
        </div>
      </PainelMapaHudGlass>

      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className={cn(MAPA_HUD_ROUND_BTN_CLASS, "shrink-0")}
        onClick={onClose}
        aria-label="Fechar card"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
