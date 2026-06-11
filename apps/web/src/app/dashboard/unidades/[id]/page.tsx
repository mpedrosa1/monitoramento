"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, asArray } from "@/lib/api";
import type { Equipamento, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";
import {
  unidadeAreaM2Exibicao,
  unidadeTemAreaDefinida,
} from "@/lib/unidade-area";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { usePermissions } from "@/hooks/use-permissions";
import {
  UnidadeDetailPanel,
  buildMetricMap,
  coordsFromUnidade,
} from "@/components/unidades/unidade-detail-panel";
import { UnidadeDetailMap } from "@/components/unidades/unidade-detail-map";
import { UnidadeChamadosSection } from "@/components/unidades/unidade-chamados-section";

export default function UnidadeDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { status, metrics } = useMonitoring();
  const { canManageEquipamentosUnidade } = usePermissions();
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [catalogo, setCatalogo] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const metricMap = useMemo(() => buildMetricMap(metrics), [metrics]);

  const hostOnline = useMemo(() => {
    if (!unidade?.ip?.trim()) return false;
    return metricMap.get(monitorUnidadeHostTargetId(unidade.id))?.online ?? false;
  }, [unidade, metricMap]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [uns, eqs] = await Promise.all([
        apiFetch<Unidade[] | null>("/api/v1/unidades"),
        apiFetch<Equipamento[] | null>("/api/v1/equipamentos"),
      ]);
      const found = asArray(uns).find((u) => u.id === id) ?? null;
      setUnidade(found);
      setCatalogo(asArray(eqs));
      setNotFound(!found);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const position = unidade ? coordsFromUnidade(unidade) : null;

  return (
    <>
      <DashboardHeader
        title={unidade ? unidade.nome : "Unidade"}
        socketStatus={status}
      />
      <div className="p-6">
        {loading && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}
        {notFound && !loading && (
          <p className="text-sm text-muted-foreground">Unidade não encontrada.</p>
        )}
        {unidade && !loading && (
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="min-w-0 overflow-y-auto lg:max-h-[calc(100vh-11rem)] lg:pr-2">
              <UnidadeDetailPanel
                unidade={unidade}
                catalogo={catalogo}
                metricMap={metricMap}
                hostOnline={hostOnline}
                canManage={canManageEquipamentosUnidade}
                onUnidadeUpdated={setUnidade}
              />
            </div>
            <div className="min-w-0 space-y-6 lg:sticky lg:top-4 lg:self-start">
              <UnidadeDetailMap
                position={position}
                label={unidade.nome}
                areaVertices={unidade.areaVertices}
                areaM2={
                  unidadeTemAreaDefinida(unidade)
                    ? unidadeAreaM2Exibicao(unidade)
                    : undefined
                }
              />
              <UnidadeChamadosSection unidade={unidade} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
