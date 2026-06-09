import type { SnmpPonto } from "./types";

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

/** Formata valor SNMP para exibição (aplica multiplicador em pontos numéricos). */
export function formatSnmpMetricValue(
  value: unknown,
  ponto?: SnmpPonto | null
): string {
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
