"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { DespesasResumoColaboradoresResponse } from "@/lib/types";
import { DespesasVisaoGeralTable } from "@/components/rh/despesas-visao-geral-table";
import { useRecargasDespesasPeriodo } from "@/components/rh/recargas-despesas-periodo";

export default function RecargasDespesasVisaoGeralPage() {
  const router = useRouter();
  const { ano, mes } = useRecargasDespesasPeriodo();
  const [resumo, setResumo] = useState<DespesasResumoColaboradoresResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const loadResumo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DespesasResumoColaboradoresResponse>(
        `/api/v1/despesas/resumo?ano=${ano}&mes=${mes}`
      );
      setResumo(res);
    } catch {
      setResumo(null);
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    void loadResumo();
  }, [loadResumo]);

  function irParaColaborador(id: string) {
    router.push(
      `/dashboard/recursos-humanos/recargas-e-despesas?colaborador=${id}`
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Recargas, gastos e saldos acumulados de todos os colaboradores em{" "}
        <strong>{resumo?.competencia ?? `${ano}-${String(mes).padStart(2, "0")}`}</strong>.
        Clique em um colaborador para abrir o detalhe.
      </p>
      <div className="rounded-2xl border border-border">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando resumo…
          </div>
        ) : (
          <DespesasVisaoGeralTable
            itens={resumo?.colaboradores ?? []}
            totais={resumo?.totais}
            onSelecionarColaborador={irParaColaborador}
          />
        )}
      </div>
    </div>
  );
}
