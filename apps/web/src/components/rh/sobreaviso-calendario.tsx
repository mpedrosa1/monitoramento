"use client";

import { useMemo } from "react";
import { CalendarCheck } from "lucide-react";
import type {
  EscalaSobreavisoDefinida,
  Sobreaviso,
} from "@/lib/types";
import { feriadosNacionais } from "@/lib/feriados";

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

function fundoDaCelula(weekday: number, feriado: boolean): string {
  if (feriado) return "bg-amber-50 dark:bg-amber-400/30";
  if (weekday === 0 || weekday === 6) return "bg-amber-50 dark:bg-amber-400/30";
  return "bg-card";
}

export type SobreavisoCalendarioColaborador = {
  id: string;
  nome: string;
};

export type SobreavisoCalendarioEscala = {
  id: string;
  cor?: string;
};

export function SobreavisoCalendario({
  ano,
  mes,
  sobreavisos,
  colaboradores,
  escalas,
  definicao,
  loading,
}: {
  ano: number;
  mes: number;
  sobreavisos: Sobreaviso[];
  colaboradores: SobreavisoCalendarioColaborador[];
  escalas: SobreavisoCalendarioEscala[];
  definicao: EscalaSobreavisoDefinida | null;
  loading?: boolean;
}) {
  const hoje = new Date();
  const hojeStr = ymd(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
  const feriadosDoAno = useMemo(() => feriadosNacionais(ano), [ano]);

  const colaboradoresPorId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of colaboradores) map.set(c.id, c.nome);
    return map;
  }, [colaboradores]);

  const escalasPorId = useMemo(() => {
    const map = new Map<string, SobreavisoCalendarioEscala>();
    for (const e of escalas) map.set(e.id, e);
    return map;
  }, [escalas]);

  function corDoSobreaviso(s: Sobreaviso): string {
    if (s.escalaId) {
      const e = escalasPorId.get(s.escalaId);
      if (e?.cor) return e.cor;
    }
    return "#2563eb";
  }

  function nomeColaborador(id: string): string {
    return colaboradoresPorId.get(id) ?? "Colaborador";
  }

  function sobreavisosNoDia(dataStr: string): Sobreaviso[] {
    return sobreavisos.filter(
      (s) => s.dataInicio <= dataStr && dataStr <= s.dataFim
    );
  }

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!definicao) {
    return (
      <p className="text-sm text-muted-foreground">
        A escala de {MESES[mes - 1]} de {ano} ainda não foi definida.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
        <CalendarCheck className="h-4 w-4 shrink-0" />
        <span>
          Escala definida em{" "}
          {new Date(definicao.definidaEm).toLocaleDateString("pt-BR")}
          {definicao.definidaPor ? ` por ${definicao.definidaPor}` : ""}.
        </span>
      </div>

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
            return (
              <div
                key={dataStr}
                title={nomeFeriadoDia || undefined}
                className={[
                  "min-h-24 border-b border-r border-border p-1.5 text-left",
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
                  {isFeriado && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {itens.slice(0, 4).map((s) => (
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
                        {s.horaInicio && s.horaFim
                          ? ` · ${s.horaInicio}-${s.horaFim}`
                          : ""}
                      </span>
                    </div>
                  ))}
                  {itens.length > 4 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{itens.length - 4} mais
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { MESES };
