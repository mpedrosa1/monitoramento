"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Car,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import {
  detalhesDespesaTexto,
  formatarDataDespesaBr,
  formatarMoeda,
  labelCategoriaDespesa,
  labelModalidadeDespesa,
  MODALIDADE_DESPESA_OPCOES,
} from "@/lib/despesas";
import type {
  Colaborador,
  DepositoDespesa,
  Despesa,
  DespesasMeResponse,
  ModalidadeDespesa,
} from "@/lib/types";
import { DespesaFormDialog } from "@/components/despesas/despesa-form-dialog";
import { DespesaResumoCard } from "@/components/despesas/despesa-resumo-card";
import { BalancearSaldoDialog } from "@/components/rh/balancear-saldo-dialog";
import { useRecargasDespesasPeriodo } from "@/components/rh/recargas-despesas-periodo";
import { RecargaFormDialog } from "@/components/rh/recarga-form-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatarAtualizadoEm(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecargasDespesasPage() {
  const searchParams = useSearchParams();
  const { canManageData, canManageRecargas } = usePermissions();
  const { ano, mes, competencia } = useRecargasDespesasPeriodo();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorId, setColaboradorId] = useState("");
  const [dados, setDados] = useState<DespesasMeResponse | null>(null);
  const [loadingCols, setLoadingCols] = useState(true);
  const [loadingDados, setLoadingDados] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | ModalidadeDespesa>("todos");
  const [recargaDialogOpen, setRecargaDialogOpen] = useState(false);
  const [editingRecarga, setEditingRecarga] = useState<DepositoDespesa | null>(
    null
  );
  const [despesaDialogOpen, setDespesaDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [balancearOpen, setBalancearOpen] = useState(false);
  const [balancearModalidade, setBalancearModalidade] =
    useState<ModalidadeDespesa>("mobilidade");

  const colaboradoresOrdenados = useMemo(
    () =>
      [...colaboradores].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      ),
    [colaboradores]
  );

  const colaboradorSelecionado = useMemo(
    () => colaboradores.find((c) => c.id === colaboradorId) ?? null,
    [colaboradores, colaboradorId]
  );

  useEffect(() => {
    void (async () => {
      setLoadingCols(true);
      try {
        const cols = await apiFetch<Colaborador[] | null>(
          "/api/v1/colaboradores"
        );
        setColaboradores(asArray(cols));
      } catch {
        setColaboradores([]);
      } finally {
        setLoadingCols(false);
      }
    })();
  }, []);

  useEffect(() => {
    const id = searchParams.get("colaborador");
    if (id) setColaboradorId(id);
  }, [searchParams]);

  const loadDados = useCallback(async () => {
    if (!colaboradorId) {
      setDados(null);
      return;
    }
    setLoadingDados(true);
    try {
      const res = await apiFetch<DespesasMeResponse>(
        `/api/v1/despesas/colaboradores/${colaboradorId}?ano=${ano}&mes=${mes}`
      );
      setDados(res);
    } catch {
      setDados(null);
    } finally {
      setLoadingDados(false);
    }
  }, [colaboradorId, ano, mes]);

  useEffect(() => {
    void loadDados();
  }, [loadDados]);

  const despesasFiltradas = useMemo(() => {
    const list = dados?.despesas ?? [];
    if (filtro === "todos") return list;
    return list.filter((d) => d.modalidade === filtro);
  }, [dados, filtro]);

  const recargas = useMemo(() => {
    return (dados?.depositos ?? [])
      .filter((d) => d.valor > 0)
      .slice()
      .sort((a, b) => a.modalidade.localeCompare(b.modalidade));
  }, [dados]);

  const modalidadesOcupadas = useMemo(
    () => recargas.map((r) => r.modalidade),
    [recargas]
  );

  const podeNovaRecarga =
    modalidadesOcupadas.length < MODALIDADE_DESPESA_OPCOES.length;

  function abrirNovaRecarga() {
    setEditingRecarga(null);
    setRecargaDialogOpen(true);
  }

  function abrirEditarRecarga(recarga: DepositoDespesa) {
    setEditingRecarga(recarga);
    setRecargaDialogOpen(true);
  }

  function abrirNovaDespesa() {
    setEditingDespesa(null);
    setDespesaDialogOpen(true);
  }

  function abrirEditarDespesa(d: Despesa) {
    setEditingDespesa(d);
    setDespesaDialogOpen(true);
  }

  function abrirBalancear(modalidade: ModalidadeDespesa) {
    setBalancearModalidade(modalidade);
    setBalancearOpen(true);
  }

  const saldoBalancearAtual =
    balancearModalidade === "mobilidade"
      ? (dados?.mobilidade.saldo ?? 0)
      : (dados?.livre.saldo ?? 0);

  async function excluirDespesa(d: Despesa) {
    if (
      !window.confirm(
        `Excluir despesa de ${formatarMoeda(d.valor)} (${labelCategoriaDespesa(d.categoria)})?`
      )
    ) {
      return;
    }
    try {
      await apiFetch<void>(
        `/api/v1/despesas/colaboradores/${colaboradorId}/${d.id}`,
        { method: "DELETE" }
      );
      await loadDados();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:max-w-md">
        <div className="grid gap-2">
          <Label>Colaborador</Label>
          {loadingCols ? (
            <div className="flex h-9 items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : (
            <Select
              value={colaboradorId || null}
              onValueChange={(v) => setColaboradorId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um colaborador…">
                  {colaboradorSelecionado?.nome}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colaboradoresOrdenados.map((c) => (
                  <SelectItem key={c.id} value={c.id} label={c.nome}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!colaboradorId ? (
        <p className="text-sm text-muted-foreground">
          Selecione um colaborador para gerenciar recargas e visualizar despesas.
        </p>
      ) : loadingDados ? (
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
              saldoAjustado={dados?.mobilidade.saldoAjustado}
              depositoLabel="Recarga"
              accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              onBalancear={
                canManageRecargas ? () => abrirBalancear("mobilidade") : undefined
              }
            />
            <DespesaResumoCard
              titulo="Livre"
              icon={Package}
              deposito={dados?.livre.deposito ?? 0}
              gasto={dados?.livre.gasto ?? 0}
              saldoAnterior={dados?.livre.saldoAnterior ?? 0}
              saldo={dados?.livre.saldo ?? 0}
              saldoAjustado={dados?.livre.saldoAjustado}
              depositoLabel="Recarga"
              accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              onBalancear={
                canManageRecargas ? () => abrirBalancear("livre") : undefined
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Recargas do mês</h3>
              {canManageRecargas ? (
                <Button
                  size="sm"
                  onClick={abrirNovaRecarga}
                  disabled={!podeNovaRecarga}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova recarga
                </Button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border">
              {recargas.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Nenhuma recarga registrada neste período.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modalidade</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recargas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {labelModalidadeDespesa(r.modalidade)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatarMoeda(r.valor)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatarAtualizadoEm(r.updatedAt)}
                        </TableCell>
                        <TableCell>
                          {canManageRecargas ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => abrirEditarRecarga(r)}
                              aria-label="Editar recarga"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Despesas registradas</h3>
              <div className="flex flex-wrap items-center gap-2">
                {canManageData ? (
                  <Button size="sm" onClick={abrirNovaDespesa}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nova despesa
                  </Button>
                ) : null}
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
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
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
                          {canManageData ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => abrirEditarDespesa(d)}
                                aria-label="Editar despesa"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void excluirDespesa(d)}
                                aria-label="Excluir despesa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}

      {colaboradorId && (
        <>
          <RecargaFormDialog
            open={recargaDialogOpen}
            onOpenChange={setRecargaDialogOpen}
            recarga={editingRecarga}
            colaboradorId={colaboradorId}
            competencia={competencia}
            modalidadesOcupadas={modalidadesOcupadas}
            onSuccess={loadDados}
          />
          <DespesaFormDialog
            open={despesaDialogOpen}
            onOpenChange={setDespesaDialogOpen}
            despesa={editingDespesa}
            colaboradorId={colaboradorId}
            colaboradorNome={colaboradorSelecionado?.nome}
            onSuccess={loadDados}
          />
          <BalancearSaldoDialog
            open={balancearOpen}
            onOpenChange={setBalancearOpen}
            colaboradorId={colaboradorId}
            colaboradorNome={colaboradorSelecionado?.nome}
            competencia={competencia}
            modalidade={balancearModalidade}
            saldoAtual={saldoBalancearAtual}
            onSuccess={loadDados}
          />
        </>
      )}
    </>
  );
}
