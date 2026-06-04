import type { SnmpPonto, SnmpTipoDado } from "./types";

export type SnmpPreset = Omit<SnmpPonto, "_localId">;

/** OIDs comuns da MIB-2 (system group), como no Scada-LTS / browsers MIB. */
export const SNMP_MIB2_PRESETS: SnmpPreset[] = [
  {
    nome: "Descrição do sistema",
    oid: "1.3.6.1.2.1.1.1.0",
    tipoDado: "texto",
    unidade: "",
    descricao: "sysDescr — fabricante, modelo e versão do firmware",
  },
  {
    nome: "Tempo ativo",
    oid: "1.3.6.1.2.1.1.3.0",
    tipoDado: "tempo",
    unidade: "timeticks",
    descricao: "sysUpTime — tempo desde o último boot do agente SNMP",
  },
  {
    nome: "Contato",
    oid: "1.3.6.1.2.1.1.4.0",
    tipoDado: "texto",
    descricao: "sysContact — pessoa responsável pelo equipamento",
  },
  {
    nome: "Nome do host",
    oid: "1.3.6.1.2.1.1.5.0",
    tipoDado: "texto",
    descricao: "sysName — hostname configurado no dispositivo",
  },
  {
    nome: "Localização",
    oid: "1.3.6.1.2.1.1.6.0",
    tipoDado: "texto",
    descricao: "sysLocation — local físico do equipamento",
  },
];

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
    }));
  }
  if (config?.oids?.length) {
    return config.oids.map((oid, i) =>
      newSnmpPonto({ nome: `Ponto ${i + 1}`, oid, tipoDado: "numerico" })
    );
  }
  return [newSnmpPonto(SNMP_MIB2_PRESETS[1])];
}

export function serializeSnmpPontos(pontos: SnmpPonto[]): SnmpPonto[] {
  return pontos
    .filter((p) => p.oid.trim())
    .map(({ _localId: _, ...p }) => ({
      ...p,
      nome: p.nome.trim() || p.oid.trim(),
      oid: p.oid.trim().replace(/^\./, ""),
    }));
}
