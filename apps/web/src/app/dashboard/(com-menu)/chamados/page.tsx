"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import type { Chamado, Unidade } from "@/lib/types";
import { AbrirChamadoDialog } from "@/components/chamados/abrir-chamado-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { useMonitoring } from "@/components/dashboard/monitoring-context";

export default function ChamadosPage() {
  const { status: socketStatus } = useMonitoring();
  const [list, setList] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);

  const load = useCallback(async () => {
    const [ch, uns] = await Promise.all([
      apiFetch<Chamado[] | null>("/api/v1/chamados"),
      apiFetch<Unidade[] | null>("/api/v1/unidades"),
    ]);
    setList(asArray(ch));
    setUnidades(asArray(uns));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <DashboardHeader title="Chamados" socketStatus={socketStatus} />
      <div className="space-y-4 p-6">
        <div className="flex justify-end">
          <AbrirChamadoDialog unidades={unidades} onSuccess={load} />
        </div>
        <ChamadosTable chamados={list} />
      </div>
    </>
  );
}
