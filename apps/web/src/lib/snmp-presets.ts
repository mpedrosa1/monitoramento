import type { SnmpPonto, SnmpTipoDado } from "./types";

export const SNMP_TIPOS_DADO: SnmpTipoDado[] = [
  "numerico",
  "texto",
  "contador",
  "tempo",
  "gauge",
];

export function newSnmpPonto(partial?: Partial<SnmpPonto>): SnmpPonto {
  return {
    _localId: crypto.randomUUID(),
    nome: "",
    oid: "",
    tipoDado: "numerico",
    multiplicador: 1,
    unidade: "",
    descricao: "",
    desabilitado: false,
    ...partial,
  };
}

export function normalizeSnmpPontos(
  config?: { pontos?: SnmpPonto[]; oids?: string[] }
): SnmpPonto[] {
  if (config?.pontos?.length) {
    return config.pontos.map((p) => ({
      ...p,
      _localId: p._localId ?? crypto.randomUUID(),
      multiplicador:
        p.tipoDado === "numerico" ? (p.multiplicador ?? 1) : undefined,
    }));
  }
  if (config?.oids?.length) {
    return config.oids.map((oid, i) =>
      newSnmpPonto({ nome: `Ponto ${i + 1}`, oid, tipoDado: "numerico" })
    );
  }
  return [];
}

export function serializeSnmpPontos(pontos: SnmpPonto[]): SnmpPonto[] {
  return pontos
    .filter((p) => p.oid.trim())
    .map(({ _localId: _, ...p }) => {
      const base = {
        ...p,
        nome: p.nome.trim() || p.oid.trim(),
        oid: p.oid.trim().replace(/^\./, ""),
      };
      if (base.tipoDado !== "numerico") {
        const { multiplicador: _m, ...rest } = base;
        return rest;
      }
      const mult = base.multiplicador;
      if (mult == null || mult === 1) {
        const { multiplicador: _m, ...rest } = base;
        return rest;
      }
      return base;
    });
}
