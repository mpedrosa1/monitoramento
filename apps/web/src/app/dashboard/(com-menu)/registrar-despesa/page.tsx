"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  formatarMoeda,
  formatarDataDespesaBr,
  detalhesDespesaTexto,
  labelCategoriaDespesa,
  labelModalidadeDespesa,
  MODALIDADE_DESPESA_OPCOES,
} from "@/lib/despesas";
import type { Despesa, DespesasMeResponse, ModalidadeDespesa } from "@/lib/types";
import { DespesaFormDialog } from "@/components/despesas/despesa-form-dialog";
import { DespesaResumoCard } from "@/components/despesas/despesa-resumo-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
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

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function RegistrarDespesaPage() {
  const { status: socketStatus } = useMonitoring();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [dados, setDados] = useState<DespesasMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | ModalidadeDespesa>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Despesa | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DespesasMeResponse>(
        `/api/v1/despesas/me?ano=${ano}&mes=${mes}`
      );
      setDados(res);
    } catch {
      setDados(null);
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    void load();
  }, [load]);

  const despesasFiltradas = useMemo(() => {
    const list = dados?.despesas ?? [];
    if (filtro === "todos") return list;
    return list.filter((d) => d.modalidade === filtro);
  }, [dados, filtro]);

  function mesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function mesSeguinte() {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  function abrirNova() {
    setEditing(null);
    setFormOpen(true);
  }

  function abrirEditar(d: Despesa) {
    setEditing(d);
    setFormOpen(true);
  }

  async function excluir(d: Despesa) {
    if (
      !window.confirm(
        `Excluir despesa de ${formatarMoeda(d.valor)} (${labelCategoriaDespesa(d.categoria)})?`
      )
    ) {
      return;
    }
    try {
      await apiFetch<void>(`/api/v1/despesas/me/${d.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <>
      <DashboardHeader title="Registrar despesa" socketStatus={socketStatus} />
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Minhas despesas</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Registre gastos com verba de{" "}
              <strong>Mobilidade</strong> (combustível e transporte) ou{" "}
              <strong>Livre</strong> (ferramentas, materiais e consumíveis).
              A empresa credita um depósito mensal em cada modalidade.
            </p>
          </div>
          <Button onClick={abrirNova}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova despesa
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={mesAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-36 text-center text-sm font-semibold">
            {MESES[mes - 1]} de {ano}
          </p>
          <Button variant="outline" size="sm" onClick={mesSeguinte}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <DespesaResumoCard
                titulo="Mobilidade"
                icon={Car}
                deposito={dados?.mobilidade.deposito ?? 0}
                gasto={dados?.mobilidade.gasto ?? 0}
                saldoAnterior={dados?.mobilidade.saldoAnterior ?? 0}
                saldo={dados?.mobilidade.saldo ?? 0}
                accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              />
              <DespesaResumoCard
                titulo="Livre"
                icon={Package}
                deposito={dados?.livre.deposito ?? 0}
                gasto={dados?.livre.gasto ?? 0}
                saldoAnterior={dados?.livre.saldoAnterior ?? 0}
                saldo={dados?.livre.saldo ?? 0}
                accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={filtro === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltro("todos")}
              >
                Todas
              </Button>
              {MODALIDADE_DESPESA_OPCOES.map((o) => (
                <Button
                  key={o.value}
                  variant={filtro === o.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltro(o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>

            <div className="rounded-2xl border border-border">
              {despesasFiltradas.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Nenhuma despesa registrada neste período.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14" />
                      <TableHead>Data</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesasFiltradas.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          {d.comprovanteUrl ? (
                            <a
                              href={d.comprovanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded border border-border"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={d.comprovanteUrl}
                                alt="Comprovante"
                                className="h-10 w-10 object-cover"
                              />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatarDataDespesaBr(d.data)}
                          {d.categoria === "combustivel" && d.hora
                            ? ` ${d.hora}`
                            : ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {labelModalidadeDespesa(d.modalidade)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] text-sm">
                          {labelCategoriaDespesa(d.categoria)}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                          {detalhesDespesaTexto(d)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatarMoeda(d.valor)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => abrirEditar(d)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void excluir(d)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </div>

      <DespesaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        despesa={editing}
        onSuccess={load}
      />
    </>
  );
}
