"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { ColaboradorListItem } from "@/components/dashboard/colaborador-list-item";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardHomePage() {
  const { status: socketStatus } = useMonitoring();
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

  return (
    <>
      <DashboardHeader title="Painel operacional" socketStatus={socketStatus} />
      <div className="space-y-6 p-6">
        {error && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error} — verifique se a API está em execução.
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(240px,300px)] lg:items-start">
          <div className="space-y-6 min-w-0">
            <Card className="max-w-sm">
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

            <Card>
              <CardHeader>
                <CardTitle>Últimos chamados</CardTitle>
              </CardHeader>
              <CardContent>
                <ChamadosTable chamados={asArray(summary?.ultimosChamados)} />
                <Link
                  href="/dashboard/chamados"
                  className="mt-4 inline-block text-sm font-medium text-foreground underline-offset-4 hover:text-ring hover:underline"
                >
                  Ver todos os chamados
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Colaboradores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
              {asArray(summary?.colaboradores).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum colaborador cadastrado.
                </p>
              ) : (
                asArray(summary?.colaboradores).map((c) => (
                  <ColaboradorListItem key={c.id} colaborador={c} />
                ))
              )}
              <Link
                href="/dashboard/colaboradores"
                className="mt-2 inline-block text-sm font-medium text-foreground underline-offset-4 hover:text-ring hover:underline"
              >
                Ver todos
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
