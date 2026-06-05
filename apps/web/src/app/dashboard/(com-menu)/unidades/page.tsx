"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type { Equipamento, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";
import {
  emptyUnidadeForm,
  formToUnidadeBody,
  formatUnidadeEndereco,
  isValidUnidadeCodigo,
  sortUnidadesByCodigo,
  unidadeToForm,
  type UnidadeFormState,
} from "@/lib/unidade-form";
import { buildMetricMap } from "@/components/unidades/unidade-detail-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EntityFormDialog } from "@/components/crud/entity-form-dialog";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { UnidadeFormFields } from "@/components/unidades/unidade-form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function openUnidadeDetailTab(id: string) {
  const url = `${window.location.origin}/dashboard/unidades/${id}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function UnidadesPage() {
  const { status, metrics } = useMonitoring();
  const [list, setList] = useState<Unidade[]>([]);
  const [catalogo, setCatalogo] = useState<Equipamento[]>([]);
  const [createForm, setCreateForm] = useState<UnidadeFormState>(emptyUnidadeForm);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Unidade | null>(null);
  const [editForm, setEditForm] = useState<UnidadeFormState>(emptyUnidadeForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const metricMap = useMemo(() => buildMetricMap(metrics), [metrics]);

  function unidadeHostOnline(u: Unidade): boolean {
    if (!u.ip?.trim()) return false;
    const m = metricMap.get(monitorUnidadeHostTargetId(u.id));
    return m?.online ?? false;
  }

  const equipNome = useMemo(() => {
    const map = new Map(catalogo.map((e) => [e.id, e.nome]));
    return (id: string) => map.get(id) ?? id;
  }, [catalogo]);

  const sortedList = useMemo(() => sortUnidadesByCodigo(list), [list]);

  const load = useCallback(async () => {
    const [uns, eqs] = await Promise.all([
      apiFetch<Unidade[] | null>("/api/v1/unidades"),
      apiFetch<Equipamento[] | null>("/api/v1/equipamentos"),
    ]);
    setList(asArray(uns));
    setCatalogo(asArray(eqs));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patchCreate(patch: Partial<UnidadeFormState>) {
    setCreateForm((f) => ({ ...f, ...patch }));
  }

  function patchEdit(patch: Partial<UnidadeFormState>) {
    setEditForm((f) => ({ ...f, ...patch }));
  }

  async function create() {
    if (!createValid) return;
    try {
      await apiFetch<Unidade>("/api/v1/unidades", {
        method: "POST",
        body: JSON.stringify(formToUnidadeBody(createForm)),
      });
      setCreateForm(emptyUnidadeForm());
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      window.alert(msg);
    }
  }

  function openEdit(u: Unidade) {
    setEditing(u);
    setEditForm(unidadeToForm(u));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch<Unidade>(`/api/v1/unidades/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(formToUnidadeBody(editForm, editing)),
      });
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: Unidade) {
    const ok = window.confirm(
      `Excluir a unidade "${u.nome}"? Chamados e colaboradores vinculados podem ficar com referência órfã.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/unidades/${u.id}`, { method: "DELETE" });
      if (editing?.id === u.id) {
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

  const createValid =
    isValidUnidadeCodigo(createForm.codigo) && createForm.nome.trim() !== "";
  const editValid =
    isValidUnidadeCodigo(editForm.codigo) && editForm.nome.trim() !== "";

  return (
    <>
      <DashboardHeader title="Unidades Prisionais" socketStatus={status} />
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Cadastre unidades com identificação, contatos, endereço, IP e
          equipamentos. Clique na linha para abrir os detalhes em uma nova aba;
          use o ícone de lápis para editar.
        </p>
        <div className="flex justify-end">
          <EntityFormDialog
            title="Nova unidade"
            triggerLabel="Adicionar unidade"
            onSubmit={create}
            contentClassName="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <UnidadeFormFields
              form={createForm}
              onChange={patchCreate}
              catalogo={catalogo}
              equipNome={equipNome}
            />
          </EntityFormDialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Intervalo (s)</TableHead>
              <TableHead>Equip.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhuma unidade cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              sortedList.map((u) => {
                const hostOnline = unidadeHostOnline(u);
                return (
                <TableRow
                  key={u.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => openUnidadeDetailTab(u.id)}
                >
                  <TableCell className="font-mono text-xs">{u.codigo}</TableCell>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {formatUnidadeEndereco(
                      unidadeToForm(u).endereco
                    )}
                  </TableCell>
                  <TableCell>{u.ip || "—"}</TableCell>
                  <TableCell>{u.intervaloS || 30}</TableCell>
                  <TableCell>{asArray(u.equipamentos).length}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant={hostOnline ? "default" : "destructive"}
                    >
                      {hostOnline ? "ONLINE" : "OFFLINE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(u)}
                        aria-label={`Editar ${u.nome}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(u)}
                        disabled={deleting}
                        aria-label={`Excluir ${u.nome}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar unidade
              {editing ? ` — ${editing.nome}` : ""}
            </DialogTitle>
          </DialogHeader>
          <UnidadeFormFields
            form={editForm}
            onChange={patchEdit}
            catalogo={catalogo}
            equipNome={equipNome}
            metricMap={metricMap}
            unidadeMongoId={editing?.id}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => editing && remove(editing)}
              disabled={deleting || !editing}
            >
              {deleting ? "Excluindo…" : "Excluir unidade"}
            </Button>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveEdit} disabled={saving || !editValid}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
