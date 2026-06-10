import type { SnmpMultiEstadoItem, SnmpPonto } from "./types";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Aplica o multiplicador do ponto (tipo numérico) para exibição ao usuário. */
export function applySnmpMultiplicador(
  value: unknown,
  ponto?: SnmpPonto | null
): unknown {
  if (!ponto || ponto.tipoDado !== "numerico") return value;
  const mult = ponto.multiplicador;
  if (mult == null || mult === 1) return value;
  const n = toNumber(value);
  if (n == null) return value;
  return n * mult;
}

function chaveValorSnmp(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

const ALIASES_TRUE = new Set(["true", "1", "on", "ligado", "sim", "yes"]);
const ALIASES_FALSE = new Set([
  "false",
  "0",
  "off",
  "desligado",
  "nao",
  "não",
  "no",
]);

/** Normaliza valor lido e chave configurada para comparação em multi-estado. */
function canonicalMultiEstadoChave(value: unknown): string | null {
  if (typeof value === "boolean") return value ? "true" : "false";
  const n = toNumber(value);
  if (n === 1) return "true";
  if (n === 0) return "false";
  const s = chaveValorSnmp(value).toLowerCase();
  if (!s) return null;
  if (ALIASES_TRUE.has(s)) return "true";
  if (ALIASES_FALSE.has(s)) return "false";
  return s;
}

function canonicalMultiEstadoChaveConfig(chave: string): string {
  const s = chave.trim().toLowerCase();
  if (ALIASES_TRUE.has(s)) return "true";
  if (ALIASES_FALSE.has(s)) return "false";
  return s;
}

function findMultiEstadoItem(
  estados: SnmpMultiEstadoItem[],
  value: unknown
): SnmpMultiEstadoItem | undefined {
  const canonical = canonicalMultiEstadoChave(value);
  if (!canonical) return undefined;
  return estados.find((e) => {
    const k = e.chave.trim();
    if (!k) return false;
    return canonicalMultiEstadoChaveConfig(k) === canonical;
  });
}

function estadosMultiComChave(
  estados?: SnmpMultiEstadoItem[]
): SnmpMultiEstadoItem[] {
  return estados?.filter((e) => e.chave.trim()) ?? [];
}

/** Mensagem de erro SNMP por timeout (ex.: gosnmp). */
export function isSnmpTimeoutValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.toLowerCase().includes("timeout");
}

/** Texto e estilo para leitura no card da unidade. */
export function resolveSnmpLeituraDisplay(
  value: unknown,
  ponto?: SnmpPonto | null
): { text: string; isTimeout: boolean; color?: string } {
  if (isSnmpTimeoutValue(value)) {
    return { text: "timeout", isTimeout: true };
  }
  const display = resolveSnmpMetricDisplay(value, ponto);
  return {
    text: display.text,
    isTimeout: false,
    color: display.color,
  };
}

/** Resolve texto e cor para exibição de métricas SNMP. */
export function resolveSnmpMetricDisplay(
  value: unknown,
  ponto?: SnmpPonto | null
): { text: string; color?: string } {
  const estados = estadosMultiComChave(ponto?.estadosMulti);
  const usaMultiEstado =
    ponto?.tipoDado === "multi_estado" || estados.length > 0;

  if (usaMultiEstado && estados.length > 0) {
    const match = findMultiEstadoItem(estados, value);
    if (match) {
      const chave = chaveValorSnmp(value);
      return {
        text: match.exibicao.trim() || match.chave.trim() || chave,
        color: match.cor?.trim() || undefined,
      };
    }
    const chave = chaveValorSnmp(value);
    if (!chave) return { text: "—" };
    return { text: chave };
  }
  return { text: formatSnmpMetricValue(value, ponto) };
}

/** Formata valor SNMP para exibição (aplica multiplicador em pontos numéricos). */
export function formatSnmpMetricValue(
  value: unknown,
  ponto?: SnmpPonto | null
): string {
  if (ponto?.tipoDado === "multi_estado") {
    return resolveSnmpMetricDisplay(value, ponto).text;
  }

  const tipo = ponto?.tipoDado;
  if (tipo === "binario") {
    const n = toNumber(value);
    if (n === 1 || value === true || value === "true") return "Ligado";
    if (n === 0 || value === false || value === "false") return "Desligado";
    return value == null ? "—" : String(value);
  }

  const scaled = applySnmpMultiplicador(value, ponto);
  if (scaled == null) return "—";
  if (typeof scaled === "number") {
    const text = Number.isInteger(scaled)
      ? String(scaled)
      : scaled.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
    const unit = ponto?.unidade?.trim();
    return unit ? `${text}${unit}` : text;
  }
  const unit = ponto?.unidade?.trim();
  const text = String(scaled);
  return unit ? `${text}${unit}` : text;
}

export function findSnmpPontoByKey(
  pontos: SnmpPonto[] | undefined,
  key: string
): SnmpPonto | undefined {
  if (!pontos?.length) return undefined;
  return pontos.find((p) => p.nome === key || p.oid === key);
}
