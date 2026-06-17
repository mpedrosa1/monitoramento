"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { EscalaSobreavisoDefinida, Sobreaviso } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import {
  MESES,
  SobreavisoCalendario,
  type SobreavisoCalendarioColaborador,
  type SobreavisoCalendarioEscala,
} from "@/components/rh/sobreaviso-calendario";
import { Button } from "@/components/ui/button";

type CalendarioResponse = {
  definida: boolean;
  definicao?: EscalaSobreavisoDefinida;
  sobreavisos: Sobreaviso[];
  escalas: SobreavisoCalendarioEscala[];
  colaboradores: SobreavisoCalendarioColaborador[];
};

export default function MeuSobreavisoPage() {
  const router = useRouter();
  const { status: socketStatus } = useMonitoring();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [acessoNegado, setAcessoNegado] = useState(false);
  const [dados, setDados] = useState<CalendarioResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setAcessoNegado(false);
    try {
      const res = await apiFetch<CalendarioResponse>(
        `/api/v1/sobreavisos/calendario?ano=${ano}&mes=${mes}`
      );
      setDados(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("permissão") || msg.includes("acesso negado")) {
        setAcessoNegado(true);
      }
      setDados(null);
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const status = await apiFetch<{ escalado: boolean }>(
          "/api/v1/sobreavisos/me/escalado"
        );
        if (!status.escalado) {
          router.replace("/dashboard/meus-dados");
        }
      } catch {
        router.replace("/dashboard/meus-dados");
      }
    })();
  }, [router]);

  function mesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function mesSeguinte() {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  return (
    <>
      <DashboardHeader title="Meu sobreaviso" socketStatus={socketStatus} />
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => router.push("/dashboard/meus-dados")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={mesAnterior}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-36 text-center text-sm font-semibold">
              {MESES[mes - 1]} de {ano}
            </p>
            <Button variant="outline" size="sm" onClick={mesSeguinte}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {acessoNegado ? (
          <p className="text-sm text-muted-foreground">
            Você não tem acesso ao calendário de sobreaviso.
          </p>
        ) : (
          <SobreavisoCalendario
            ano={ano}
            mes={mes}
            sobreavisos={dados?.sobreavisos ?? []}
            colaboradores={dados?.colaboradores ?? []}
            escalas={dados?.escalas ?? []}
            definicao={dados?.definida ? (dados.definicao ?? null) : null}
            loading={loading}
          />
        )}
      </div>
    </>
  );
}
