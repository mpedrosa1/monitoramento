import type {
  SnmpMultiEstadoItem,
  SnmpPonto,
  SnmpTipoDado,
  SnmpTipoSelecao,
} from "./types";
import { randomId } from "./random-id";

export const SNMP_MULTI_ESTADO_COR_PADRAO = "#64748b";

export function newSnmpMultiEstadoItem(
  partial?: Partial<SnmpMultiEstadoItem>
): SnmpMultiEstadoItem {
  return {
    _localId: randomId(),
    chave: "",
    exibicao: "",
    cor: SNMP_MULTI_ESTADO_COR_PADRAO,
    ...partial,
  };
}

function normalizeEstadosMulti(
  items?: SnmpMultiEstadoItem[]
): SnmpMultiEstadoItem[] | undefined {
  if (!items?.length) return undefined;
  return items.map((e) => ({
    ...e,
    _localId: e._localId ?? randomId(),
    chave: e.chave ?? "",
    exibicao: e.exibicao ?? "",
    cor: e.cor?.trim() || SNMP_MULTI_ESTADO_COR_PADRAO,
  }));
}

function serializeEstadosMulti(
  items?: SnmpMultiEstadoItem[]
): SnmpMultiEstadoItem[] | undefined {
  if (!items?.length) return undefined;
  const clean = items
    .filter((e) => e.chave.trim())
    .map(({ chave, exibicao, cor }) => ({
      chave: chave.trim(),
      exibicao: exibicao.trim() || chave.trim(),
      cor: cor?.trim() || SNMP_MULTI_ESTADO_COR_PADRAO,
    }));
  return clean.length ? clean : undefined;
}

export const SNMP_TIPOS_SELECAO: SnmpTipoSelecao[] = [
  "nao_selecionado",
  "integer32",
  "octet_string",
  "object_identifier",
  "ip_address",
  "counter32",
  "gauge32",
  "time_ticks",
  "opaque",
  "counter64",
];

export const SNMP_TIPOS_DADO: SnmpTipoDado[] = [
  "numerico",
  "binario",
  "multi_estado",
  "alfanumerico",
  "contador",
  "tempo",
  "gauge",
];

export function normalizeSnmpTipoDado(
  tipo?: SnmpTipoDado | string
): SnmpTipoDado | undefined {
  if (!tipo) return undefined;
  if (tipo === "texto") return "alfanumerico";
  if (SNMP_TIPOS_DADO.includes(tipo as SnmpTipoDado)) {
    return tipo as SnmpTipoDado;
  }
  return undefined;
}

export function normalizeSnmpTipoSelecao(
  tipo?: SnmpTipoSelecao | string
): SnmpTipoSelecao | undefined {
  if (!tipo) return "nao_selecionado";
  if (SNMP_TIPOS_SELECAO.includes(tipo as SnmpTipoSelecao)) {
    return tipo as SnmpTipoSelecao;
  }
  return undefined;
}

export function newSnmpPonto(partial?: Partial<SnmpPonto>): SnmpPonto {
  return {
    _localId: randomId(),
    nome: "",
    oid: "",
    tipoSnmp: "nao_selecionado",
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
    return config.pontos.map((p) => {
      const tipoDado = normalizeSnmpTipoDado(p.tipoDado) ?? "numerico";
      const estadosMulti = normalizeEstadosMulti(p.estadosMulti);
      const usaMultiEstado =
        tipoDado === "multi_estado" || (estadosMulti?.length ?? 0) > 0;

      return {
        ...p,
        _localId: p._localId ?? randomId(),
        tipoSnmp: normalizeSnmpTipoSelecao(p.tipoSnmp) ?? "nao_selecionado",
        tipoDado: usaMultiEstado ? "multi_estado" : tipoDado,
        multiplicador:
          !usaMultiEstado && tipoDado === "numerico"
            ? (p.multiplicador ?? 1)
            : undefined,
        estadosMulti: usaMultiEstado ? (estadosMulti ?? []) : undefined,
      };
    });
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
      let base: SnmpPonto = {
        ...p,
        nome: p.nome.trim() || p.oid.trim(),
        oid: p.oid.trim().replace(/^\./, ""),
      };

      if (!base.tipoSnmp || base.tipoSnmp === "nao_selecionado") {
        const { tipoSnmp: _t, ...rest } = base;
        base = rest;
      }

      if (base.tipoDado === "multi_estado") {
        base.estadosMulti = serializeEstadosMulti(base.estadosMulti);
      } else {
        const { estadosMulti: _e, ...rest } = base;
        base = rest;
      }

      if (base.tipoDado !== "numerico") {
        const { multiplicador: _m, ...rest } = base;
        base = rest;
      } else {
        const mult = base.multiplicador;
        if (mult == null || mult === 1) {
          const { multiplicador: _m, ...rest } = base;
          base = rest;
        }
      }

      return base;
    });
}
