"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import { chamadoStatusLabel } from "@/lib/labels";
import type { Chamado, Unidade } from "@/lib/types";
import { AbrirChamadoDialog } from "@/components/chamados/abrir-chamado-dialog";
import { ChamadoDetailDialog } from "@/components/chamados/chamado-detail-dialog";
import { EditarChamadoDialog } from "@/components/chamados/editar-chamado-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { usePermissions } from "@/hooks/use-permissions";
import { Input } from "@/components/ui/input";

export default function ChamadosPage() {
  const { status: socketStatus } = useMonitoring();
  const { canCrudChamados } = usePermissions();
  const [list, setList] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Chamado | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Chamado | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busca, setBusca] = useState("");

  const unidadePorId = useMemo(
    () => new Map(unidades.map((u) => [u.id, u])),
    [unidades]
  );

  const unidadeLabel = useCallback(
    (id: string) => unidadePorId.get(id)?.nome ?? "—",
    [unidadePorId]
  );

  const filteredList = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return list;
    return list.filter((c) => {
      const unidade = unidadePorId.get(c.unidadeId);
      const status = chamadoStatusLabel[c.status] ?? c.status;
      const numero = c.numero ? formatNumeroExibicao(c.numero) : "";
      return (
        numero.toLowerCase().includes(termo) ||
        c.titulo.toLowerCase().includes(termo) ||
        (c.descricao ?? "").toLowerCase().includes(termo) ||
        status.toLowerCase().includes(termo) ||
        (unidade?.nome ?? "").toLowerCase().includes(termo) ||
        (unidade?.codigo ?? "").toLowerCase().includes(termo)
      );
    });
  }, [list, busca, unidadePorId]);

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
    <>
      <DashboardHeader title="Chamados" socketStatus={socketStatus} />
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número, título, unidade ou status…"
              className="pl-8"
              aria-label="Buscar chamados"
            />
          </div>
          {canCrudChamados && (
            <AbrirChamadoDialog
              unidades={unidades}
              chamados={list}
              onSuccess={load}
            />
          )}
        </div>
        <ChamadosTable
          chamados={filteredList}
          onRowClick={openDetail}
          onEdit={canCrudChamados ? openEdit : undefined}
          onDelete={canCrudChamados ? remove : undefined}
          deleting={deleting}
          unidadeLabel={unidadeLabel}
          emptyMessage={
            list.length === 0
              ? "Nenhum chamado registrado."
              : "Nenhum chamado encontrado para a busca."
          }
        />
      </div>

      <ChamadoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        chamado={selected}
        unidades={unidades}
        onSuccess={load}
      />

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
