"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";
import {
  sortUnidadesForPainel,
  unidadeConnectivityLabel,
  unidadeConnectivityStatus,
} from "@/lib/unidade-form";
import { cn } from "@/lib/utils";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  PainelMonitoramentoSubheader,
  type PainelMonitoramentoTab,
} from "@/components/painel/painel-monitoramento-subheader";
import { PainelMapaOfflineSound } from "@/components/painel/painel-mapa-offline-sound";
import { PainelUnidadesMap } from "@/components/painel/painel-unidades-map";
import { buildMetricMap } from "@/components/unidades/unidade-detail-panel";
import { UnidadeEquipamentosGrid } from "@/components/unidades/unidade-equipamentos-grid";
import { Badge } from "@/components/ui/badge";

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
      return "border-emerald-400/50 bg-emerald-500/30 text-emerald-100";
    case "offline":
      return "border-destructive/50 bg-destructive/25 text-red-100";
    case "sem_ip":
      return "border-white/20 bg-white/10 text-sidebar-foreground/90";
  }
}

export function PainelMonitoramentoView() {
  const { status, metrics } = useMonitoring();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [catalogo, setCatalogo] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<PainelMonitoramentoTab>("equipamentos");

  const metricMap = useMemo(() => buildMetricMap(metrics), [metrics]);

  const sortedUnidades = useMemo(
    () =>
      sortUnidadesForPainel(unidades, (u) => unidadeHostOffline(u, metricMap)),
    [unidades, metricMap]
  );

  const selected = useMemo(
    () => sortedUnidades.find((u) => u.id === selectedId) ?? null,
    [sortedUnidades, selectedId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uns, eqs] = await Promise.all([
        apiFetch<Unidade[] | null>("/api/v1/unidades"),
        apiFetch<Equipamento[] | null>("/api/v1/equipamentos"),
      ]);
      setUnidades(asArray(uns));
      setCatalogo(asArray(eqs));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sortedUnidades.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sortedUnidades.some((u) => u.id === selectedId)) {
      setSelectedId(sortedUnidades[0].id);
    }
  }, [sortedUnidades, selectedId]);

  return (
    <div className="flex h-screen min-h-0 bg-background">
      <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Unidades prisionais</p>
            <p className="truncate text-xs text-muted-foreground">
              {loading
                ? "Carregando…"
                : `${sortedUnidades.length} unidade${sortedUnidades.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Carregando unidades…
            </p>
          ) : sortedUnidades.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Nenhuma unidade cadastrada.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sortedUnidades.map((u) => {
                const hostOnline = unidadeHostOnline(u, metricMap);
                const connectivity = unidadeConnectivityStatus(u, hostOnline);
                const active = u.id === selectedId;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {u.nome}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 border text-[10px] uppercase tracking-wide",
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
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardHeader title="Painel de monitoramento" socketStatus={status} />
        <PainelMonitoramentoSubheader
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <main className="min-h-0 flex-1 overflow-hidden">
          {activeTab === "equipamentos" ? (
            <div className="h-full overflow-y-auto p-6">
              {!selected && !loading ? (
                <p className="text-sm text-muted-foreground">
                  Selecione uma unidade no menu lateral.
                </p>
              ) : null}
              {selected ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      ID {selected.codigo}
                    </p>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {selected.nome}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.equipamentos?.length ?? 0} equipamento
                      {(selected.equipamentos?.length ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <UnidadeEquipamentosGrid
                    unidade={selected}
                    catalogo={catalogo}
                    metricMap={metricMap}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <PainelMapaOfflineSound
                active
                unidades={sortedUnidades}
                metricMap={metricMap}
              />
              <PainelUnidadesMap
                unidades={sortedUnidades}
                metricMap={metricMap}
                selectedId={selectedId}
                onSelectUnidade={(id) => {
                  setSelectedId(id);
                  setActiveTab("equipamentos");
                }}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
