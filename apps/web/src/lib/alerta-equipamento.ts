import type {
  AlertaEquipamento,
  AlertaOperador,
  AlertaTipo,
  Equipamento,
} from "@/lib/types";
import { normalizeSnmpPontos } from "@/lib/snmp-presets";
import {
  modbusPontoParaDisplayTipo,
  normalizeModbusPontos,
} from "@/lib/modbus-presets";

export interface EstadoOpcao {
  chave: string;
  exibicao: string;
}

/** Ponto de um equipamento passível de alarme. */
export interface PontoAlertavel {
  nome: string;
  unidade?: string;
  tipo: AlertaTipo;
  estados: EstadoOpcao[];
}

export const OPERADORES_NUMERICO: {
  value: AlertaOperador;
  label: string;
  faixa: boolean;
}[] = [
  { value: "gt", label: "Maior que (>)", faixa: false },
  { value: "gte", label: "Maior ou igual (≥)", faixa: false },
  { value: "lt", label: "Menor que (<)", faixa: false },
  { value: "lte", label: "Menor ou igual (≤)", faixa: false },
  { value: "fora", label: "Fora da faixa", faixa: true },
  { value: "entre", label: "Dentro da faixa", faixa: true },
];

export const OPERADORES_ESTADO: { value: AlertaOperador; label: string }[] = [
  { value: "igual", label: "Igual a" },
  { value: "diferente", label: "Diferente de" },
];

export function operadorUsaFaixa(op: AlertaOperador): boolean {
  return op === "fora" || op === "entre";
}

function tipoDadoParaAlerta(tipoDado?: string): AlertaTipo {
  return tipoDado === "binario" || tipoDado === "multi_estado"
    ? "estado"
    : "numerico";
}

function estadosDoPonto(
  tipoDado: string | undefined,
  estadosMulti:
    | { chave?: string | number; exibicao?: string }[]
    | undefined
): EstadoOpcao[] {
  const base = (estadosMulti ?? [])
    .filter((e) => e.chave !== undefined && e.chave !== null)
    .map((e) => ({
      chave: String(e.chave),
      exibicao: e.exibicao?.trim() || String(e.chave),
    }));
  if (base.length > 0) return base;
  if (tipoDado === "binario") {
    return [
      { chave: "0", exibicao: "0" },
      { chave: "1", exibicao: "1" },
    ];
  }
  return [];
}

/** Lista os pontos de um equipamento que podem ter alarme configurado. */
export function pontosAlertaveis(eq?: Equipamento): PontoAlertavel[] {
  if (!eq) return [];
  const out: PontoAlertavel[] = [];

  if (eq.tipoMonitoramento === "snmp") {
    for (const p of normalizeSnmpPontos(eq.config)) {
      if (p.desabilitado || !p.nome?.trim()) continue;
      out.push({
        nome: p.nome.trim(),
        unidade: p.unidade,
        tipo: tipoDadoParaAlerta(p.tipoDado),
        estados: estadosDoPonto(p.tipoDado, p.estadosMulti),
      });
    }
  } else if (eq.tipoMonitoramento === "modbus") {
    for (const p of normalizeModbusPontos(eq.config)) {
      if (p.desabilitado || !p.nome?.trim()) continue;
      const displayTipo = modbusPontoParaDisplayTipo(p);
      out.push({
        nome: p.nome.trim(),
        unidade: p.unidade,
        tipo: tipoDadoParaAlerta(displayTipo),
        estados: estadosDoPonto(displayTipo, p.estadosMulti),
      });
    }
  }

  return out;
}

function fmtNum(v?: number): string {
  return (v ?? 0).toLocaleString("pt-BR");
}

/** Resumo legível da condição (ex.: "> 45°C", "= Em falha"). */
export function resumoAlerta(a: AlertaEquipamento): string {
  const u = a.pontoUnidade ?? "";
  if (a.tipo === "numerico") {
    switch (a.operador) {
      case "gt":
        return `> ${fmtNum(a.valor)}${u}`;
      case "gte":
        return `≥ ${fmtNum(a.valor)}${u}`;
      case "lt":
        return `< ${fmtNum(a.valor)}${u}`;
      case "lte":
        return `≤ ${fmtNum(a.valor)}${u}`;
      case "fora":
        return `fora de ${fmtNum(a.valor)}–${fmtNum(a.valor2)}${u}`;
      case "entre":
        return `entre ${fmtNum(a.valor)}–${fmtNum(a.valor2)}${u}`;
      default:
        return "";
    }
  }
  const rotulo = a.estadoExibicao?.trim() || a.estadoChave || "";
  return a.operador === "diferente" ? `≠ ${rotulo}` : `= ${rotulo}`;
}
