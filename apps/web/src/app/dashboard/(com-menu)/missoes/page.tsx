"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import {
  emptyMissaoForm,
  formToMissaoBody,
  isAtribuidoMissaoLista,
  missaoToForm,
  validateMissaoCadastroForm,
  type MissaoFormState,
} from "@/lib/missao-form";
import { missaoStatusLabel, missaoStatusVariant } from "@/lib/labels";
import { formatInicioMissao, labelChamadoVinculadoMissao, statusEfetivoMissao } from "@/lib/missoes";
import { formatDateTimeBR } from "@/lib/time";
import type { Chamado, Colaborador, Missao, Unidade } from "@/lib/types";
import { EntityFormDialog } from "@/components/crud/entity-form-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { ExcluirMissaoDialog } from "@/components/missoes/excluir-missao-dialog";
import { MissaoDetailDialog } from "@/components/missoes/missao-detail-dialog";
import { MissaoFormFields } from "@/components/missoes/missao-form-fields";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(iso: string) {
  return formatDateTimeBR(iso);
}

export default function MissoesPage() {
  const { status: socketStatus } = useMonitoring();
  const { user } = useAuth();
  const { canManageMissoes } = usePermissions();

  const [list, setList] = useState<Missao[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  const [createForm, setCreateForm] = useState<MissaoFormState>(emptyMissaoForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Missao | null>(null);
  const [editForm, setEditForm] = useState<MissaoFormState>(emptyMissaoForm);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<Missao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Missao | null>(null);
  const [busca, setBusca] = useState("");

  const unidadePorId = useMemo(
    () => new Map(unidades.map((u) => [u.id, u])),
    [unidades]
  );

  const unidadeNome = useMemo(() => {
    return (id: string) => unidadePorId.get(id)?.nome ?? "—";
  }, [unidadePorId]);

  const colaboradorNomes = useMemo(() => {
    const map = new Map(colaboradores.map((c) => [c.id, c.nome]));
    return (ids: string[] | undefined) => {
      if (!ids?.length) return "—";
      return ids.map((id) => map.get(id) ?? id).join(", ");
    };
  }, [colaboradores]);

  const chamadoLabel = useMemo(() => {
    return (id?: string) => labelChamadoVinculadoMissao(id, chamados);
  }, [chamados]);

  const filteredList = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return list;
    return list.filter((m) => {
      const chamadoVinculado = m.chamadoId
        ? chamados.find((c) => c.id === m.chamadoId)
        : null;
      const status = statusEfetivoMissao(m, chamadoVinculado);
      const statusTexto = missaoStatusLabel[status] ?? status;
      return (
        m.titulo.toLowerCase().includes(termo) ||
        unidadeNome(m.unidadeId).toLowerCase().includes(termo) ||
        colaboradorNomes(m.colaboradorIds).toLowerCase().includes(termo) ||
        chamadoLabel(m.chamadoId).toLowerCase().includes(termo) ||
        statusTexto.toLowerCase().includes(termo)
      );
    });
  }, [list, busca, chamados, unidadeNome, colaboradorNomes, chamadoLabel]);

  const load = useCallback(async () => {
    const [mis, uns, ch, cols] = await Promise.all([
      apiFetch<Missao[] | null>("/api/v1/missoes"),
      apiFetch<Unidade[] | null>("/api/v1/unidades"),
      apiFetch<Chamado[] | null>("/api/v1/chamados"),
      apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
    ]);
    setList(asArray(mis));
    setUnidades(asArray(uns));
    setChamados(asArray(ch));
    setColaboradores(asArray(cols));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const erro = validateMissaoCadastroForm(createForm);
    if (erro) {
      window.alert(erro);
      throw new Error(erro);
    }
    await apiFetch<Missao>("/api/v1/missoes", {
      method: "POST",
      body: JSON.stringify(formToMissaoBody(createForm)),
    });
    setCreateForm(emptyMissaoForm());
    await load();
  }

  function openDetail(m: Missao) {
    setSelected(m);
    setDetailOpen(true);
  }

  function openEdit(m: Missao) {
    if (!canManageMissoes) return;
    setEditing(m);
    setEditForm(missaoToForm(m));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    const erro = validateMissaoCadastroForm(editForm);
    if (erro) {
      window.alert(erro);
      return;
    }
    setSaving(true);
    try {
      await apiFetch<Missao>(`/api/v1/missoes/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(formToMissaoBody(editForm)),
      });
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao salvar missão."
      );
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(m: Missao) {
    setDeletingTarget(m);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingTarget) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/missoes/${deletingTarget.id}`, {
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
      window.alert(
        e instanceof Error ? e.message : "Erro ao excluir missão."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DashboardHeader title="Missões" socketStatus={socketStatus} />
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          {canManageMissoes
            ? "Gerencie as missões de campo. Clique na linha para ver detalhes e localização; use o lápis para editar."
            : "Clique em uma missão para ver detalhes e localização no mapa."}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, unidade, colaborador ou chamado…"
              className="pl-8"
              aria-label="Buscar missões"
            />
          </div>
          {canManageMissoes && (
            <EntityFormDialog
              title="Nova missão"
              triggerLabel="Adicionar missão"
              onSubmit={create}
              contentClassName="sm:max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <MissaoFormFields
                form={createForm}
                onChange={(p) => setCreateForm((f) => ({ ...f, ...p }))}
                unidades={unidades}
                chamados={chamados}
                colaboradores={colaboradores}
              />
            </EntityFormDialog>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Colaboradores</TableHead>
              <TableHead>Chamado</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="text-right">Criada em</TableHead>
              {canManageMissoes && (
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageMissoes ? 8 : 7}
                  className="py-8 text-center text-muted-foreground"
                >
                  {list.length === 0
                    ? "Nenhuma missão registrada."
                    : "Nenhuma missão encontrada para a busca."}
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => openDetail(m)}
                >
                  <TableCell className="max-w-[220px] font-medium">
                    <span className="line-clamp-2">{m.titulo}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(() => {
                        const status = statusEfetivoMissao(
                          m,
                          m.chamadoId
                            ? chamados.find((c) => c.id === m.chamadoId)
                            : null
                        );
                        return (
                          <Badge variant={missaoStatusVariant[status]}>
                            {missaoStatusLabel[status] ?? status}
                          </Badge>
                        );
                      })()}
                      {isAtribuidoMissaoLista(user?.id, m) && (
                        <Badge className="border-amber-300 bg-amber-400 font-semibold text-amber-950 shadow-sm ring-1 ring-amber-300/80 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950">
                          Atribuído a você
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{unidadeNome(m.unidadeId)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {colaboradorNomes(m.colaboradorIds)}
                  </TableCell>
                  <TableCell>{chamadoLabel(m.chamadoId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatInicioMissao(
                      m,
                      m.chamadoId
                        ? chamados.find((c) => c.id === m.chamadoId)
                        : null
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </TableCell>
                  {canManageMissoes && (
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(m)}
                          aria-label={`Editar ${m.titulo}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => requestDelete(m)}
                          disabled={deleting}
                          aria-label={`Excluir ${m.titulo}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar missão
              {editing ? ` — ${editing.titulo}` : ""}
            </DialogTitle>
          </DialogHeader>
          <MissaoFormFields
            form={editForm}
            onChange={(p) => setEditForm((f) => ({ ...f, ...p }))}
            unidades={unidades}
            chamados={chamados}
            colaboradores={colaboradores}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={saving || !editing}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MissaoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        missao={selected}
        unidade={
          selected ? unidadePorId.get(selected.unidadeId) ?? null : null
        }
        chamados={chamados}
        colaboradores={colaboradores}
        user={user}
        unidades={unidades}
        onSuccess={load}
      />

      <ExcluirMissaoDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingTarget(null);
        }}
        missao={deletingTarget}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
