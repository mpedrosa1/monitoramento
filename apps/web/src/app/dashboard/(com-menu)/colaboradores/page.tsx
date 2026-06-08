"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import type { Colaborador } from "@/lib/types";
import { AdicionarColaboradorDialog } from "@/components/colaboradores/adicionar-colaborador-dialog";
import { EditarColaboradorDialog } from "@/components/colaboradores/editar-colaborador-dialog";
import { ExcluirColaboradorDialog } from "@/components/colaboradores/excluir-colaborador-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ColaboradorCard } from "@/components/dashboard/colaborador-card";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { usePermissions } from "@/hooks/use-permissions";

export default function ColaboradoresPage() {
  const { status: socketStatus } = useMonitoring();
  const { canManageData } = usePermissions();
  const [list, setList] = useState<Colaborador[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<Colaborador | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const cols = await apiFetch<Colaborador[] | null>("/api/v1/colaboradores");
    setList(asArray(cols));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(colaborador: Colaborador) {
    setEditing(colaborador);
    setEditOpen(true);
  }

  function requestDelete(colaborador: Colaborador) {
    setDeletingTarget(colaborador);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingTarget) return;

    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/colaboradores/${deletingTarget.id}`, {
        method: "DELETE",
      });
      if (editing?.id === deletingTarget.id) {
        setEditOpen(false);
        setEditing(null);
      }
      setDeleteOpen(false);
      setDeletingTarget(null);
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
      <DashboardHeader
        title="Colaboradores"
        socketStatus={socketStatus}
      />
      <div className="space-y-6 p-6">
        {canManageData && (
          <div className="flex justify-end">
            <AdicionarColaboradorDialog onSuccess={load} />
          </div>
        )}
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum colaborador cadastrado.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {list.map((c) => (
              <ColaboradorCard
                key={c.id}
                colaborador={c}
                onEdit={canManageData ? openEdit : undefined}
                onDelete={canManageData ? requestDelete : undefined}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </div>

      <EditarColaboradorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        colaborador={editing}
        onSuccess={load}
      />

      <ExcluirColaboradorDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingTarget(null);
        }}
        colaborador={deletingTarget}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
