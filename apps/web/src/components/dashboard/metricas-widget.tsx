"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import {
  findSnmpPontoByKey,
  formatSnmpMetricValue,
} from "@/lib/snmp-display";
import type { DeviceMetric, Equipamento } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricasWidget({ metrics }: { metrics: DeviceMetric[] }) {
  const [catalog, setCatalog] = useState<Equipamento[]>([]);

  useEffect(() => {
    apiFetch<Equipamento[] | null>("/api/v1/equipamentos")
      .then((data) => setCatalog(asArray(data)))
      .catch(() => setCatalog([]));
  }, []);

  const byEquipamentoId = useMemo(
    () => new Map(catalog.map((e) => [e.id, e])),
    [catalog]
  );

  if (metrics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aguardando métricas do monitoramento em tempo real…
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => {
        const eq = byEquipamentoId.get(m.equipamentoId);
        const pontos = eq?.config?.pontos;
        const valorEntries = m.valores
          ? Object.entries(m.valores).filter(([k]) => k !== "erro")
          : [];

        return (
          <Card key={m.targetId || m.dispositivoId} className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {m.host}
                  {m.porta ? `:${m.porta}` : ""}
                </span>
                <Badge variant={m.online ? "default" : "destructive"}>
                  {m.online ? "Online" : "Offline"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>Tipo: {m.tipo.toUpperCase()}</p>
              {m.latenciaMs != null && m.latenciaMs > 0 && (
                <p>Latência: {m.latenciaMs.toFixed(1)} ms</p>
              )}
              {valorEntries.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-border/60 pt-2">
                  {valorEntries.map(([key, raw]) => {
                    const ponto = findSnmpPontoByKey(pontos, key);
                    return (
                      <li key={key}>
                        <span className="text-foreground/90">{key}:</span>{" "}
                        {formatSnmpMetricValue(raw, ponto)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
