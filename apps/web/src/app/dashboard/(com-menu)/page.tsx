"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { ColaboradorCard } from "@/components/dashboard/colaborador-card";
import { MetricasWidget } from "@/components/dashboard/metricas-widget";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardHomePage() {
  const { status: socketStatus, metrics } = useMonitoring();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<DashboardSummary>("/api/v1/dashboard/summary");
      setSummary(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const displayMetrics =
    metrics.length > 0 ? metrics : asArray(summary?.metricas);

  return (
    <>
      <DashboardHeader title="Painel operacional" socketStatus={socketStatus} />
      <div className="space-y-6 p-6">
        {error && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error} — verifique se a API está em execução.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Missões em andamento
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {summary?.missoesEmAndamento ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Últimos chamados</CardTitle>
            </CardHeader>
            <CardContent>
              <ChamadosTable chamados={asArray(summary?.ultimosChamados)} />
              <Link
                href="/dashboard/chamados"
                className="mt-4 inline-block text-sm text-primary hover:underline"
              >
                Ver todos os chamados
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monitoramento em tempo real</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricasWidget metrics={displayMetrics} />
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Colaboradores</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {asArray(summary?.colaboradores).map((c) => (
              <ColaboradorCard key={c.id} colaborador={c} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
