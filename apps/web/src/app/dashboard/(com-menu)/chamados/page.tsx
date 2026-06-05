"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import type { Chamado, Unidade } from "@/lib/types";
import { AbrirChamadoDialog } from "@/components/chamados/abrir-chamado-dialog";
import { EditarChamadoDialog } from "@/components/chamados/editar-chamado-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { useMonitoring } from "@/components/dashboard/monitoring-context";

export default function ChamadosPage() {
  const { status: socketStatus } = useMonitoring();
  const [list, setList] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Chamado | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    <>
      <DashboardHeader title="Chamados" socketStatus={socketStatus} />
      <div className="space-y-4 p-6">
        <div className="flex justify-end">
          <AbrirChamadoDialog
            unidades={unidades}
            chamados={list}
            onSuccess={load}
          />
        </div>
        <ChamadosTable
          chamados={list}
          onEdit={openEdit}
          onDelete={remove}
          deleting={deleting}
        />
      </div>

      <EditarChamadoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        chamado={editing}
        unidades={unidades}
        onSuccess={load}
      />
    </>
  );
}
