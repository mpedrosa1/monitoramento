"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { colaboradorStatusLabel } from "@/lib/labels";
import type { Colaborador } from "@/lib/types";
import { AdicionarColaboradorDialog } from "@/components/colaboradores/adicionar-colaborador-dialog";
import { EditarColaboradorDialog } from "@/components/colaboradores/editar-colaborador-dialog";
import { ExcluirColaboradorDialog } from "@/components/colaboradores/excluir-colaborador-dialog";
import { ColaboradorCard } from "@/components/dashboard/colaborador-card";
import { usePermissions } from "@/hooks/use-permissions";
import { Input } from "@/components/ui/input";

export default function ColaboradoresRhPage() {
  const { canCrudColaboradores } = usePermissions();
  const [list, setList] = useState<Colaborador[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<Colaborador | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [busca, setBusca] = useState("");

  const filteredList = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return list;
    return list.filter((c) => {
      const status = colaboradorStatusLabel[c.status] ?? c.status;
      return (
        c.nome.toLowerCase().includes(termo) ||
        (c.cargo ?? "").toLowerCase().includes(termo) ||
        (c.cpf ?? "").toLowerCase().includes(termo) ||
        (c.email ?? "").toLowerCase().includes(termo) ||
        (c.emailCorporativo ?? "").toLowerCase().includes(termo) ||
        status.toLowerCase().includes(termo)
      );
    });
  }, [list, busca]);

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
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cargo, CPF ou e-mail…"
              className="pl-8"
              aria-label="Buscar colaboradores"
            />
          </div>
          {canCrudColaboradores && <AdicionarColaboradorDialog onSuccess={load} />}
        </div>
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum colaborador cadastrado.
          </p>
        ) : filteredList.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum colaborador encontrado para a busca.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 justify-items-center">
            {filteredList.map((c) => (
              <ColaboradorCard
                key={c.id}
                colaborador={c}
                onEdit={canCrudColaboradores ? openEdit : undefined}
                onDelete={canCrudColaboradores ? requestDelete : undefined}
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
