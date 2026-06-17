"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Colaborador } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { ColaboradorDetail } from "@/components/colaboradores/colaborador-detail";

export default function MeusDadosPage() {
  const { status: socketStatus } = useMonitoring();
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [escaladoSobreaviso, setEscaladoSobreaviso] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErro(false);
    try {
      const [me, status] = await Promise.all([
        apiFetch<Colaborador>("/api/v1/colaboradores/me"),
        apiFetch<{ escalado: boolean }>("/api/v1/sobreavisos/me/escalado"),
      ]);
      setColaborador(me);
      setEscaladoSobreaviso(status.escalado);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <DashboardHeader title="Meus Dados" socketStatus={socketStatus} />
      <div className="p-6">
        {loading && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}
        {erro && !loading && (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar seus dados.
          </p>
        )}
        {colaborador && !loading && (
          <ColaboradorDetail
            colaborador={colaborador}
            canManage={false}
            onChanged={load}
            voltarHref="/dashboard"
            escaladoSobreaviso={escaladoSobreaviso}
          />
        )}
      </div>
    </>
  );
}
