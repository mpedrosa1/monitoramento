"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type { Colaborador, VeiculoMulta } from "@/lib/types";
import { salarioNumeroParaInput } from "@/lib/masks";
import { VeiculoMultaFormDialog } from "@/components/veiculos/veiculo-multa-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatarDataBr(value?: string): string {
  if (!value?.trim()) return "—";
  const [a, m, d] = value.split("-");
  if (a && m && d) return `${d}/${m}/${a}`;
  return value;
}

function formatarValor(value?: number): string {
  if (value === undefined || value === null || value <= 0) return "—";
  return `R$ ${salarioNumeroParaInput(value)}`;
}

export function VeiculoMultasPanel({
  veiculoId,
  colaboradores,
  canManage,
}: {
  veiculoId: string;
  colaboradores: Colaborador[];
  canManage: boolean;
}) {
  const [multas, setMultas] = useState<VeiculoMulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VeiculoMulta | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const colaboradoresPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    for (const c of colaboradores) map.set(c.id, c);
    return map;
  }, [colaboradores]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<VeiculoMulta[] | null>(
        `/api/v1/veiculos/${veiculoId}/multas`
      );
      const lista = asArray(res).sort((a, b) => b.data.localeCompare(a.data));
      setMultas(lista);
    } finally {
      setLoading(false);
    }
  }, [veiculoId]);

  useEffect(() => {
    void load();
  }, [load]);

  function abrirNova() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEditar(m: VeiculoMulta) {
    setEditing(m);
    setFormOpen(true);
  }

  async function excluir(m: VeiculoMulta) {
    if (
      !window.confirm(
        "Excluir esta multa? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }
    setDeletingId(m.id);
    try {
      await apiFetch<void>(`/api/v1/veiculos/${veiculoId}/multas/${m.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Multas</h2>
        </div>
        {canManage ? (
          <Button size="sm" onClick={abrirNova}>
            <Plus className="mr-1.5 h-4 w-4" />
            Registrar multa
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : multas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma multa registrada para este veículo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Infração</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
                {canManage ? (
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {multas.map((m) => {
                const motorista = m.colaboradorId
                  ? colaboradoresPorId.get(m.colaboradorId)
                  : undefined;
                return (
                  <TableRow key={m.id}>
                    <TableCell>{formatarDataBr(m.data)}</TableCell>
                    <TableCell className="font-medium">{m.infracao}</TableCell>
                    <TableCell>{formatarValor(m.valor)}</TableCell>
                    <TableCell>{motorista?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={m.status === "paga" ? "secondary" : "outline"}
                        className={
                          m.status === "pendente"
                            ? "border-amber-500/50 text-amber-700 dark:text-amber-400"
                            : undefined
                        }
                      >
                        {m.status === "paga" ? "Paga" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
                      {m.observacao?.trim() || "—"}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => abrirEditar(m)}
                            aria-label="Editar multa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => void excluir(m)}
                            disabled={deletingId === m.id}
                            aria-label="Excluir multa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <VeiculoMultaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        veiculoId={veiculoId}
        multa={editing}
        colaboradores={colaboradores}
        onSuccess={load}
      />
    </section>
  );
}
