export const COR_DESCONHECIDA = "#94a3b8";

const OPERADORAS_CONHECIDAS = [
  { match: (n: string) => n.includes("TELEFONICA") || n.includes("VIVO"), rotulo: "Vivo", cor: "#7c3aed" },
  { match: (n: string) => n.includes("CLARO") || n.includes("AMERICA MOVIL"), rotulo: "Claro", cor: "#dc2626" },
  { match: (n: string) => n.includes("TIM"), rotulo: "TIM", cor: "#2563eb" },
  { match: (n: string) => n.includes("ALGAR"), rotulo: "Algar", cor: "#059669" },
] as const;

export function operadoraDesconhecida(nomeEntidade: string | undefined | null): boolean {
  return !nomeEntidade?.trim();
}

export function tecnologiaDesconhecida(tecnologia: string | undefined | null): boolean {
  return !tecnologia?.trim();
}

/** Cor do marcador por operadora (nome ANATEL). */
export function corOperadoraAntena(nomeEntidade: string | undefined | null): string {
  if (operadoraDesconhecida(nomeEntidade)) return COR_DESCONHECIDA;
  const n = nomeEntidade!.toUpperCase();
  for (const op of OPERADORAS_CONHECIDAS) {
    if (op.match(n)) return op.cor;
  }
  return COR_DESCONHECIDA;
}

export function rotuloOperadoraAntena(nomeEntidade: string | undefined | null): string {
  if (operadoraDesconhecida(nomeEntidade)) return "Desconhecida";
  const n = nomeEntidade!.toUpperCase();
  for (const op of OPERADORAS_CONHECIDAS) {
    if (op.match(n)) return op.rotulo;
  }
  const parte = nomeEntidade!.trim().split(/\s+/)[0];
  return parte || "Desconhecida";
}

export function rotuloTecnologiaAntena(tecnologia: string | undefined | null): string {
  if (tecnologiaDesconhecida(tecnologia)) return "Desconhecida";
  return tecnologia!.trim();
}

export function corTecnologiaAntena(tecnologia: string | undefined | null): string {
  if (tecnologiaDesconhecida(tecnologia)) return COR_DESCONHECIDA;
  const t = tecnologia!.toUpperCase();
  if (t.includes("5G") || t.includes("NR")) return "#0ea5e9";
  if (t.includes("LTE") || t.includes("4G")) return "#8b5cf6";
  if (t.includes("WCDMA") || t.includes("UMTS") || t.includes("3G")) return "#f59e0b";
  if (t.includes("GSM") || t.includes("2G")) return "#22c55e";
  return COR_DESCONHECIDA;
}

export type LegendaItem = { rotulo: string; cor: string; quantidade: number };

export function agruparPorOperadora(
  antenas: { nomeEntidade: string }[]
): LegendaItem[] {
  const map = new Map<string, { cor: string; quantidade: number }>();
  for (const a of antenas) {
    const rotulo = rotuloOperadoraAntena(a.nomeEntidade);
    const cor = corOperadoraAntena(a.nomeEntidade);
    const prev = map.get(rotulo);
    if (prev) prev.quantidade += 1;
    else map.set(rotulo, { cor, quantidade: 1 });
  }
  return [...map.entries()]
    .map(([rotulo, { cor, quantidade }]) => ({ rotulo, cor, quantidade }))
    .sort((a, b) => {
      if (a.rotulo === "Desconhecida") return 1;
      if (b.rotulo === "Desconhecida") return -1;
      return a.rotulo.localeCompare(b.rotulo, "pt-BR");
    });
}

export function agruparPorTecnologia(
  antenas: { tecnologia: string }[]
): LegendaItem[] {
  const map = new Map<string, { cor: string; quantidade: number }>();
  for (const a of antenas) {
    const rotulo = rotuloTecnologiaAntena(a.tecnologia);
    const cor = corTecnologiaAntena(a.tecnologia);
    const prev = map.get(rotulo);
    if (prev) prev.quantidade += 1;
    else map.set(rotulo, { cor, quantidade: 1 });
  }
  return [...map.entries()]
    .map(([rotulo, { cor, quantidade }]) => ({ rotulo, cor, quantidade }))
    .sort((a, b) => {
      if (a.rotulo === "Desconhecida") return 1;
      if (b.rotulo === "Desconhecida") return -1;
      return a.rotulo.localeCompare(b.rotulo, "pt-BR");
    });
}
