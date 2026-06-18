"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  CakeSlice,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type {
  Colaborador,
  EscalaSobreavisoDefinida,
  EscalaTrabalho,
  Sobreaviso,
} from "@/lib/types";
import { usePermissions } from "@/hooks/use-permissions";
import { feriadosNacionais } from "@/lib/feriados";
import {
  baixarEscalaExcel,
  imprimirEscalaPdf,
  type EscalaDiaEntrada,
  type EscalaExportData,
} from "@/lib/sobreaviso-export";
import { SobreavisoFormDialog } from "@/components/rh/sobreaviso-form-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ymd(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function formatarDataBr(value: string): string {
  const [a, m, d] = value.split("-");
  if (a && m && d) return `${d}/${m}/${a}`;
  return value;
}

function formatarHoras(horas: number): string {
  const totalMin = Math.round(horas * 60);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (min === 0) return `${h}h`;
  return `${h}h${String(min).padStart(2, "0")}`;
}

export default function SobreavisoPage() {
  const { canRhCalendarioSobreaviso } = usePermissions();
  const [sobreavisos, setSobreavisos] = useState<Sobreaviso[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [escalas, setEscalas] = useState<EscalaTrabalho[]>([]);
  const [definicoes, setDefinicoes] = useState<EscalaSobreavisoDefinida[]>([]);
  const [definindo, setDefinindo] = useState(false);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sobreaviso | null>(null);
  const [dataPadrao, setDataPadrao] = useState<string | undefined>(undefined);

  const colaboradoresPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    for (const c of colaboradores) map.set(c.id, c);
    return map;
  }, [colaboradores]);

  const escalasPorId = useMemo(() => {
    const map = new Map<string, EscalaTrabalho>();
    for (const e of escalas) map.set(e.id, e);
    return map;
  }, [escalas]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sob, cols, esc, defs] = await Promise.all([
        apiFetch<Sobreaviso[] | null>("/api/v1/sobreavisos"),
        apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
        apiFetch<EscalaTrabalho[] | null>("/api/v1/escalas"),
        apiFetch<EscalaSobreavisoDefinida[] | null>(
          "/api/v1/sobreavisos/definicoes"
        ),
      ]);
      setSobreavisos(asArray(sob));
      setColaboradores(asArray(cols));
      setEscalas(asArray(esc));
      setDefinicoes(asArray(defs));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function corDoSobreaviso(s: Sobreaviso): string {
    if (s.escalaId) {
      const e = escalasPorId.get(s.escalaId);
      if (e?.cor) return e.cor;
    }
    return "#2563eb";
  }

  function nomeColaborador(id: string): string {
    return colaboradoresPorId.get(id)?.nome ?? "Colaborador";
  }

  const sobreavisosNoDia = useCallback(
    (dataStr: string) =>
      sobreavisos.filter(
        (s) => s.dataInicio <= dataStr && dataStr <= s.dataFim
      ),
    [sobreavisos]
  );

  const sobreavisosDoMes = useMemo(() => {
    const inicioMes = ymd(ano, mes, 1);
    const fimMes = ymd(ano, mes, new Date(ano, mes, 0).getDate());
    return sobreavisos
      .filter((s) => s.dataInicio <= fimMes && s.dataFim >= inicioMes)
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  }, [sobreavisos, ano, mes]);

  // Total de horas de sobreaviso por colaborador, considerando apenas a parte
  // do período que cai dentro do mês exibido.
  const horasPorColaborador = useMemo(() => {
    const limiteInicio = new Date(ano, mes - 1, 1, 0, 0, 0).getTime();
    const limiteFim = new Date(ano, mes, 1, 0, 0, 0).getTime();
    const acc = new Map<string, number>();

    for (const s of sobreavisos) {
      const inicio = new Date(
        `${s.dataInicio}T${s.horaInicio || "00:00"}:00`
      ).getTime();
      const fim = new Date(
        `${s.dataFim}T${s.horaFim || "23:59"}:00`
      ).getTime();
      if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) continue;

      const overlapInicio = Math.max(inicio, limiteInicio);
      const overlapFim = Math.min(fim, limiteFim);
      if (overlapFim <= overlapInicio) continue;

      const horas = (overlapFim - overlapInicio) / 3_600_000;
      acc.set(s.colaboradorId, (acc.get(s.colaboradorId) ?? 0) + horas);
    }

    return Array.from(acc.entries())
      .map(([id, horas]) => ({ id, horas }))
      .sort((a, b) => b.horas - a.horas);
  }, [sobreavisos, ano, mes]);

  const totalHorasMes = useMemo(
    () => horasPorColaborador.reduce((sum, x) => sum + x.horas, 0),
    [horasPorColaborador]
  );

  // Aniversariantes por dia do mês exibido (chave = dia, valor = nomes).
  const aniversariantesPorDia = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const c of colaboradores) {
      if (!c.dataNascimento) continue;
      const partes = c.dataNascimento.split("-");
      const mesNasc = Number.parseInt(partes[1] ?? "", 10);
      const diaNasc = Number.parseInt(partes[2] ?? "", 10);
      if (mesNasc !== mes || !diaNasc) continue;
      const lista = map.get(diaNasc) ?? [];
      lista.push(c.nome);
      map.set(diaNasc, lista);
    }
    return map;
  }, [colaboradores, mes]);

  const competencia = `${ano}-${String(mes).padStart(2, "0")}`;

  const definicaoDoMes = useMemo(
    () => definicoes.find((d) => d.competencia === competencia) ?? null,
    [definicoes, competencia]
  );

  // Colaboradores distintos escalados no mês exibido.
  const colaboradoresEscaladosMes = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sobreavisosDoMes) ids.add(s.colaboradorId);
    return ids;
  }, [sobreavisosDoMes]);

  async function definirEscala() {
    if (colaboradoresEscaladosMes.size === 0) {
      window.alert(
        `Não há colaboradores escalados em ${MESES[mes - 1]} de ${ano}.`
      );
      return;
    }
    const confirmacao = definicaoDoMes
      ? `A escala de ${MESES[mes - 1]} de ${ano} já foi definida. Deseja redefinir e notificar novamente ${colaboradoresEscaladosMes.size} colaborador(es)?`
      : `Definir a escala de ${MESES[mes - 1]} de ${ano} e notificar ${colaboradoresEscaladosMes.size} colaborador(es) escalado(s)?`;
    if (!window.confirm(confirmacao)) return;

    setDefinindo(true);
    try {
      const resultado = await apiFetch<EscalaSobreavisoDefinida>(
        "/api/v1/sobreavisos/definir",
        {
          method: "POST",
          body: JSON.stringify({ ano, mes }),
        }
      );
      await load();
      window.alert(
        `Escala de ${MESES[mes - 1]} de ${ano} definida. ${resultado.totalNotificados} colaborador(es) notificado(s).`
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao definir escala");
    } finally {
      setDefinindo(false);
    }
  }

  function montarDadosExport(): EscalaExportData {
    const entradasPorDia = new Map<number, EscalaDiaEntrada[]>();
    const prefixoMes = `${ano}-${String(mes).padStart(2, "0")}-`;
    // Cada sobreaviso aparece apenas no seu dia de início (evita repetir a
    // mesma informação no dia seguinte em turnos que viram a noite).
    for (const s of sobreavisos) {
      if (!s.dataInicio.startsWith(prefixoMes)) continue;
      const dia = Number.parseInt(s.dataInicio.slice(8, 10), 10);
      if (!dia) continue;
      const entrada: EscalaDiaEntrada = {
        nome: nomeColaborador(s.colaboradorId),
        horario:
          s.horaInicio && s.horaFim
            ? `${s.horaInicio} - ${s.horaFim}`
            : s.horaInicio || s.horaFim || "",
      };
      const lista = entradasPorDia.get(dia) ?? [];
      lista.push(entrada);
      entradasPorDia.set(dia, lista);
    }
    for (const lista of entradasPorDia.values()) {
      lista.sort((a, b) => a.horario.localeCompare(b.horario));
    }
    const feriados = new Set<number>();
    const diasNoMesAtual = new Date(ano, mes, 0).getDate();
    for (let dia = 1; dia <= diasNoMesAtual; dia++) {
      if (feriadosDoAno.has(ymd(ano, mes, dia))) feriados.add(dia);
    }
    return {
      ano,
      mes,
      entradasPorDia,
      feriados,
      horas: horasPorColaborador.map(({ id, horas }) => ({
        nome: nomeColaborador(id),
        horas,
      })),
    };
  }

  function imprimirPdf() {
    imprimirEscalaPdf(montarDadosExport());
  }

  function exportarExcel() {
    baixarEscalaExcel(montarDadosExport());
  }

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

  function abrirNovo(dataStr?: string) {
    setEditing(null);
    setDataPadrao(dataStr);
    setFormOpen(true);
  }

  function editar(s: Sobreaviso) {
    setEditing(s);
    setDataPadrao(undefined);
    setFormOpen(true);
  }

  async function excluir(s: Sobreaviso) {
    if (!window.confirm(`Excluir sobreaviso de ${nomeColaborador(s.colaboradorId)}?`)) {
      return;
    }
    try {
      await apiFetch<void>(`/api/v1/sobreavisos/${s.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  // Monta as células do calendário (com offset do primeiro dia da semana).
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  const hojeStr = ymd(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
  const feriadosDoAno = useMemo(() => feriadosNacionais(ano), [ano]);

  function fundoDaCelula(weekday: number, feriado: boolean): string {
    if (feriado) return "bg-amber-50 dark:bg-amber-400/30";
    if (weekday === 0 || weekday === 6) return "bg-amber-50 dark:bg-amber-400/30";
    return "bg-card";
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Calendário de sobreaviso</h2>
          <p className="text-sm text-muted-foreground">
            Defina quem fica de sobreaviso em cada período.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {definicaoDoMes && (
          <Menu.Root>
            <Menu.Trigger
              render={
                <Button variant="outline">
                  <Printer className="mr-1.5 h-4 w-4" />
                  Imprimir escala
                </Button>
              }
            />
            <Menu.Portal>
              <Menu.Positioner
                className="z-50 outline-none"
                side="bottom"
                align="end"
                sideOffset={6}
              >
                <Menu.Popup
                  className={cn(
                    "min-w-48 origin-[var(--transform-origin)] overflow-hidden rounded-lg",
                    "border border-border bg-popover text-popover-foreground shadow-lg",
                    "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
                    "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
                    "transition-[transform,opacity] duration-100"
                  )}
                >
                  <Menu.Item
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm outline-none",
                      "data-[highlighted]:bg-muted/60"
                    )}
                    onClick={imprimirPdf}
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    Gerar PDF
                  </Menu.Item>
                  <Menu.Item
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm outline-none",
                      "data-[highlighted]:bg-muted/60"
                    )}
                    onClick={exportarExcel}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Gerar Excel
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          )}

          {canRhCalendarioSobreaviso && (
            <>
              {!definicaoDoMes && (
                <Button
                  variant="outline"
                  onClick={definirEscala}
                  disabled={definindo}
                >
                  <CalendarCheck className="mr-1.5 h-4 w-4" />
                  {definindo ? "Definindo…" : "Definir escala"}
                </Button>
              )}
              <Button onClick={() => abrirNovo()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Novo sobreaviso
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={mesAnterior}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold">
          {MESES[mes - 1]} de {ano}
        </p>
        <Button variant="outline" size="sm" onClick={mesSeguinte}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {definicaoDoMes && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CalendarCheck className="h-4 w-4 shrink-0" />
          <span>
            Escala definida em{" "}
            {new Date(definicaoDoMes.definidaEm).toLocaleDateString("pt-BR")}
            {definicaoDoMes.definidaPor
              ? ` por ${definicaoDoMes.definidaPor}`
              : ""}{" "}
            · {definicaoDoMes.totalNotificados} colaborador(es) notificado(s).
          </span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {DIAS_SEMANA.map((d, i) => (
                <div
                  key={d}
                  className={[
                    "px-2 py-2 text-center text-xs font-medium",
                    i === 0 || i === 6
                      ? "text-foreground/70"
                      : "text-muted-foreground",
                  ].join(" ")}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {celulas.map((dia, idx) => {
                const weekday = idx % 7;
                if (dia === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className={[
                        "min-h-24 border-b border-r border-border",
                        weekday === 0 || weekday === 6
                          ? "bg-amber-50/25 dark:bg-amber-950/[0.07]"
                          : "bg-muted/10",
                      ].join(" ")}
                    />
                  );
                }
                const dataStr = ymd(ano, mes, dia);
                const itens = sobreavisosNoDia(dataStr);
                const isHoje = dataStr === hojeStr;
                const nomeFeriadoDia = feriadosDoAno.get(dataStr);
                const isFeriado = Boolean(nomeFeriadoDia);
                const aniversariantes = aniversariantesPorDia.get(dia) ?? [];
                const titleParts = [
                  nomeFeriadoDia,
                  aniversariantes.length
                    ? `Aniversário: ${aniversariantes.join(", ")}`
                    : "",
                ].filter(Boolean);
                return (
                  <button
                    key={dataStr}
                    type="button"
                    title={titleParts.join(" • ") || undefined}
                    onClick={() => canRhCalendarioSobreaviso && abrirNovo(dataStr)}
                    className={[
                      "min-h-24 cursor-pointer border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/60",
                      fundoDaCelula(weekday, isFeriado),
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={[
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                          isHoje
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {dia}
                      </span>
                      <span className="flex items-center gap-1">
                        {aniversariantes.length > 0 && (
                          <CakeSlice className="h-3.5 w-3.5 text-pink-500" />
                        )}
                        {isFeriado && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        )}
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {aniversariantes.map((nome) => (
                        <div
                          key={`agg-${nome}`}
                          className="flex items-center gap-1 rounded bg-pink-500/10 px-1 py-0.5 text-[11px] text-pink-700 dark:text-pink-300"
                        >
                          <CakeSlice className="h-3 w-3 shrink-0" />
                          <span className="truncate">{nome}</span>
                        </div>
                      ))}
                      {itens.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px]"
                          style={{
                            backgroundColor: `${corDoSobreaviso(s)}1a`,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: corDoSobreaviso(s) }}
                          />
                          <span className="truncate">
                            {nomeColaborador(s.colaboradorId)}
                          </span>
                        </div>
                      ))}
                      {itens.length > 3 && (
                        <p className="px-1 text-[10px] text-muted-foreground">
                          +{itens.length - 3} mais
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Horas de sobreaviso por colaborador — {MESES[mes - 1]}
            </h3>
            {horasPorColaborador.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma hora de sobreaviso neste mês.
              </p>
            ) : (
              <div className="rounded-2xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">
                        Horas no mês
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {horasPorColaborador.map(({ id, horas }) => (
                      <TableRow key={id}>
                        <TableCell className="font-medium">
                          {nomeColaborador(id)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatarHoras(horas)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatarHoras(totalHorasMes)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Sobreavisos em {MESES[mes - 1]}
            </h3>
            {sobreavisosDoMes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum sobreaviso neste mês.
              </p>
            ) : (
              <ul className="space-y-2">
                {sobreavisosDoMes.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: corDoSobreaviso(s) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {nomeColaborador(s.colaboradorId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatarDataBr(s.dataInicio)}
                        {s.horaInicio ? ` ${s.horaInicio}` : ""} —{" "}
                        {formatarDataBr(s.dataFim)}
                        {s.horaFim ? ` ${s.horaFim}` : ""}
                        {s.escalaId && escalasPorId.get(s.escalaId)
                          ? ` · ${escalasPorId.get(s.escalaId)!.nome}`
                          : ""}
                        {s.observacao ? ` · ${s.observacao}` : ""}
                      </p>
                    </div>
                    {canRhCalendarioSobreaviso && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editar(s)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => excluir(s)}
                          aria-label="Excluir sobreaviso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <SobreavisoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sobreaviso={editing}
        dataPadrao={dataPadrao}
        colaboradores={colaboradores}
        escalas={escalas}
        onSuccess={load}
      />
    </div>
  );
}
