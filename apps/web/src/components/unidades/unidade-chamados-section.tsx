"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import { ultimosChamadosDaUnidade } from "@/lib/chamados";
import type { Chamado, Unidade } from "@/lib/types";
import { AbrirChamadoDialog } from "@/components/chamados/abrir-chamado-dialog";
import { ChamadoDetailDialog } from "@/components/chamados/chamado-detail-dialog";
import { EditarChamadoDialog } from "@/components/chamados/editar-chamado-dialog";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { usePermissions } from "@/hooks/use-permissions";

export function UnidadeChamadosSection({ unidade }: { unidade: Unidade }) {
  const { canManageData } = usePermissions();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Chamado | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Chamado | null>(null);
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

  const ultimos = useMemo(
    () => ultimosChamadosDaUnidade(chamados, unidade.id, 5),
    [chamados, unidade.id]
  );

  const unidadesDialogo = useMemo(() => [unidade], [unidade]);

  function openDetail(chamado: Chamado) {
    setSelected(chamado);
    setDetailOpen(true);
  }

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
      if (selected?.id === chamado.id) {
        setDetailOpen(false);
        setSelected(null);
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
        {canManageData && (
          <AbrirChamadoDialog
            unidades={unidadesDialogo}
            chamados={chamados}
            fixedUnidadeId={unidade.id}
            onSuccess={load}
          />
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando chamados…</p>
      ) : ultimos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum chamado nesta unidade.
        </p>
      ) : (
        <ChamadosTable
          chamados={ultimos}
          onRowClick={openDetail}
          onEdit={canManageData ? openEdit : undefined}
          onDelete={canManageData ? remove : undefined}
          deleting={deleting}
        />
      )}

      <ChamadoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        chamado={selected}
        unidades={unidadesDialogo}
        onSuccess={load}
      />

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
