"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { descricaoEscalaTipo, labelEscalaTipo } from "@/lib/escala-presets";
import type { Colaborador, EscalaTrabalho } from "@/lib/types";
import { usePermissions } from "@/hooks/use-permissions";
import { EscalaFormDialog } from "@/components/rh/escala-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EscalasPage() {
  const { canRhEscalaTrabalho } = usePermissions();
  const [escalas, setEscalas] = useState<EscalaTrabalho[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EscalaTrabalho | null>(null);
  const [deleting, setDeleting] = useState<EscalaTrabalho | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const colaboradoresPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    for (const c of colaboradores) map.set(c.id, c);
    return map;
  }, [colaboradores]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [esc, cols] = await Promise.all([
        apiFetch<EscalaTrabalho[] | null>("/api/v1/escalas"),
        apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
      ]);
      setEscalas(asArray(esc));
      setColaboradores(asArray(cols));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function novaEscala() {
    setEditing(null);
    setFormOpen(true);
  }

  function editarEscala(e: EscalaTrabalho) {
    setEditing(e);
    setFormOpen(true);
  }

  async function confirmarExclusao() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiFetch<void>(`/api/v1/escalas/${deleting.id}`, {
        method: "DELETE",
      });
      setDeleting(null);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Escalas de trabalho</h2>
          <p className="text-sm text-muted-foreground">
            Crie e configure escalas por turnos fixos e atribua colaboradores.
          </p>
        </div>
        {canRhEscalaTrabalho && (
          <Button onClick={novaEscala}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova escala
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : escalas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma escala cadastrada ainda.
          </p>
          {canRhEscalaTrabalho && (
            <Button className="mt-4" variant="outline" onClick={novaEscala}>
              <Plus className="mr-1.5 h-4 w-4" />
              Criar a primeira escala
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {escalas.map((e) => (
            <article
              key={e.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: e.cor || "#2563eb" }}
                  />
                  <div>
                    <h3 className="font-semibold leading-tight">{e.nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      {labelEscalaTipo(e.tipo)}
                    </p>
                  </div>
                </div>
                {!e.ativo && (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    Inativa
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {descricaoEscalaTipo(e.tipo) || e.observacao}
              </p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {(e.horaInicio || e.horaFim) && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {e.horaInicio || "—"} às {e.horaFim || "—"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {e.colaboradorIds.length} colaborador
                  {e.colaboradorIds.length === 1 ? "" : "es"}
                </span>
              </div>

              {e.colaboradorIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {e.colaboradorIds.slice(0, 6).map((id) => {
                    const c = colaboradoresPorId.get(id);
                    if (!c) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="max-w-full truncate text-[11px]"
                      >
                        {c.nome}
                      </Badge>
                    );
                  })}
                  {e.colaboradorIds.length > 6 && (
                    <Badge variant="outline" className="text-[11px]">
                      +{e.colaboradorIds.length - 6}
                    </Badge>
                  )}
                </div>
              )}

              {canRhEscalaTrabalho && (
                <div className="mt-4 flex justify-end gap-1 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editarEscala(e)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(e)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <EscalaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        escala={editing}
        colaboradores={colaboradores}
        onSuccess={load}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir escala</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir a escala{" "}
              <span className="font-medium text-foreground">
                {deleting?.nome}
              </span>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
