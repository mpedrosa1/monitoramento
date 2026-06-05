"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import { ultimosChamadosAbertosDaUnidade } from "@/lib/chamados";
import type { Chamado, Unidade } from "@/lib/types";
import { AbrirChamadoDialog } from "@/components/chamados/abrir-chamado-dialog";
import { EditarChamadoDialog } from "@/components/chamados/editar-chamado-dialog";
import { ChamadosTable } from "@/components/dashboard/chamados-table";

export function UnidadeChamadosSection({ unidade }: { unidade: Unidade }) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Chamado | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function openEdit(chamado: Chamado) {
    setEditing(chamado);
    setEditOpen(true);
  }

  async function remove(chamado: Chamado) {
    const label = chamado.numero
      ? formatNumeroExibicao(chamado.numero)
      : chamado.titulo;
    const ok = window.confirm(`Excluir o chamado ${label}?`);
    if (!ok) return;

    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/chamados/${chamado.id}`, {
        method: "DELETE",
      });
      if (editing?.id === chamado.id) {
        setEditOpen(false);
        setEditing(null);
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao excluir";
      window.alert(
        msg === "Method Not Allowed"
          ? "A API em execução não suporta exclusão. Reinicie o backend (go run ./cmd/api ou scripts/run-api.ps1)."
          : msg
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Chamados</h3>
        <AbrirChamadoDialog
          unidades={unidadesDialogo}
          chamados={chamados}
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
        <ChamadosTable
          chamados={ultimosAbertos}
          onEdit={openEdit}
          onDelete={remove}
          deleting={deleting}
        />
      )}

      <EditarChamadoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        chamado={editing}
        unidades={unidadesDialogo}
        fixedUnidadeId={unidade.id}
        onSuccess={load}
      />
    </section>
  );
}
