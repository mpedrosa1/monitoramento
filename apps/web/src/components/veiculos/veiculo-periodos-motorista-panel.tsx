"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type { Colaborador, VeiculoPeriodoMotorista } from "@/lib/types";
import { VeiculoPeriodoMotoristaFormDialog } from "@/components/veiculos/veiculo-periodo-motorista-form-dialog";
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

function formatarDataHora(data?: string, hora?: string): string {
  const dataFmt = formatarDataBr(data);
  if (dataFmt === "—") return "—";
  if (hora?.trim()) return `${dataFmt} às ${hora}`;
  return dataFmt;
}

export function VeiculoPeriodosMotoristaPanel({
  veiculoId,
  colaboradores,
  canManage,
  refreshKey,
}: {
  veiculoId: string;
  colaboradores: Colaborador[];
  canManage: boolean;
  refreshKey?: string;
}) {
  const [periodos, setPeriodos] = useState<VeiculoPeriodoMotorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VeiculoPeriodoMotorista | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const colaboradoresPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    for (const c of colaboradores) map.set(c.id, c);
    return map;
  }, [colaboradores]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<VeiculoPeriodoMotorista[] | null>(
        `/api/v1/veiculos/${veiculoId}/periodos-motorista`
      );
      const lista = asArray(res).sort((a, b) =>
        b.dataInicio.localeCompare(a.dataInicio)
      );
      setPeriodos(lista);
    } finally {
      setLoading(false);
    }
  }, [veiculoId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  function abrirNovo() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEditar(p: VeiculoPeriodoMotorista) {
    setEditing(p);
    setFormOpen(true);
  }

  async function excluir(p: VeiculoPeriodoMotorista) {
    if (
      !window.confirm(
        "Excluir este registro do histórico de motoristas? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }
    setDeletingId(p.id);
    try {
      await apiFetch<void>(
        `/api/v1/veiculos/${veiculoId}/periodos-motorista/${p.id}`,
        { method: "DELETE" }
      );
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
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">
            Histórico de motoristas
          </h2>
        </div>
        {canManage ? (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="mr-1.5 h-4 w-4" />
            Registrar período
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : periodos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum período registrado. As trocas de motorista e alterações no
          cadastro são registradas automaticamente.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motorista</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Observação</TableHead>
                {canManage ? (
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.map((p) => {
                const motorista = colaboradoresPorId.get(p.colaboradorId);
                const emAberto = !p.dataFim?.trim();
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{motorista?.nome ?? "—"}</span>
                        {emAberto ? (
                          <Badge variant="secondary" className="text-xs">
                            Atual
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatarDataHora(p.dataInicio, p.horaInicio)}</TableCell>
                    <TableCell>
                      {emAberto
                        ? "Em aberto"
                        : formatarDataHora(p.dataFim, p.horaFim)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {p.observacao?.trim() || "—"}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => abrirEditar(p)}
                            aria-label="Editar período"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => void excluir(p)}
                            disabled={deletingId === p.id}
                            aria-label="Excluir período"
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

      <VeiculoPeriodoMotoristaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        veiculoId={veiculoId}
        periodo={editing}
        colaboradores={colaboradores}
        onSuccess={load}
      />
    </section>
  );
}
