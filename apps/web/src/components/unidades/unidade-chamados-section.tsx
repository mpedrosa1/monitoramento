"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import { ultimosChamadosAbertosDaUnidade } from "@/lib/chamados";
import type { Chamado, Unidade } from "@/lib/types";
import { AbrirChamadoDialog } from "@/components/chamados/abrir-chamado-dialog";
import { ChamadosTable } from "@/components/dashboard/chamados-table";

export function UnidadeChamadosSection({ unidade }: { unidade: Unidade }) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetch<Chamado[] | null>("/api/v1/chamados");
      setChamados(asArray(list));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ultimosAbertos = useMemo(
    () => ultimosChamadosAbertosDaUnidade(chamados, unidade.id, 5),
    [chamados, unidade.id]
  );

  const unidadesDialogo = useMemo(() => [unidade], [unidade]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Chamados</h3>
        <AbrirChamadoDialog
          unidades={unidadesDialogo}
          fixedUnidadeId={unidade.id}
          onSuccess={load}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando chamados…</p>
      ) : ultimosAbertos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum chamado aberto nesta unidade.
        </p>
      ) : (
        <ChamadosTable chamados={ultimosAbertos} />
      )}
    </section>
  );
}
