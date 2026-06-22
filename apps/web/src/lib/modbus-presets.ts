import type {
  ModbusPonto,
  ModbusRegistro,
  ModbusTipoDado,
  SnmpTipoDado,
} from "./types";
import { randomId } from "./random-id";

export const MODBUS_REGISTROS: ModbusRegistro[] = [
  "coil_status",
  "input_status",
  "holding_register",
  "input_register",
];

export const MODBUS_TIPOS_DADO: ModbusTipoDado[] = [
  "binary",
  "uint16",
  "int16",
  "bcd16",
  "uint32",
  "int32",
  "uint32_swapped",
  "int32_swapped",
  "float32",
  "float32_swapped",
  "float32_swapped_inverted",
  "bcd32",
  "uint64",
  "int64",
  "uint64_swapped",
  "int64_swapped",
  "float64",
  "float64_swapped",
  "string_fixed",
  "string_variable",
];

export const modbusRegistroLabel: Record<ModbusRegistro, string> = {
  coil_status: "Coil Status",
  input_status: "Input Status",
  holding_register: "Holding register",
  input_register: "Input register",
};

export const modbusTipoDadoLabel: Record<ModbusTipoDado, string> = {
  binary: "Binary",
  uint16: "2 byte unsigned integer",
  int16: "2 byte signed integer",
  bcd16: "2 byte BCD",
  uint32: "4 byte unsigned integer",
  int32: "4 byte signed integer",
  uint32_swapped: "4 byte unsigned integer swapped",
  int32_swapped: "4 byte signed integer swapped",
  float32: "4 byte float",
  float32_swapped: "4 byte float swapped",
  float32_swapped_inverted: "4 byte float swapped inverted",
  bcd32: "4 byte BCD",
  uint64: "8 byte unsigned integer",
  int64: "8 byte signed integer",
  uint64_swapped: "8 byte unsigned integer swapped",
  int64_swapped: "8 byte signed integer swapped",
  float64: "8 byte float",
  float64_swapped: "8 byte float swapped",
  string_fixed: "Fixed length string",
  string_variable: "Variable length string",
};

const MODBUS_TIPOS_DADO_NUMERICOS = new Set<ModbusTipoDado>([
  "uint16",
  "int16",
  "bcd16",
  "uint32",
  "int32",
  "uint32_swapped",
  "int32_swapped",
  "float32",
  "float32_swapped",
  "float32_swapped_inverted",
  "bcd32",
  "uint64",
  "int64",
  "uint64_swapped",
  "int64_swapped",
  "float64",
  "float64_swapped",
]);

const LEGACY_SNMP_TIPO_DADO = new Set<string>([
  "numerico",
  "binario",
  "multi_estado",
  "alfanumerico",
  "texto",
  "contador",
  "tempo",
  "gauge",
]);

export function modbusRegistroComTipoDado(
  registro?: ModbusRegistro
): boolean {
  return registro === "holding_register" || registro === "input_register";
}

/** Input Status é binário e pode mapear chave → exibição. */
export function modbusRegistroComEstados(
  registro?: ModbusRegistro
): boolean {
  return registro === "input_status";
}

export function isModbusTipoDadoNumerico(tipo?: ModbusTipoDado): boolean {
  return !!tipo && MODBUS_TIPOS_DADO_NUMERICOS.has(tipo);
}

function normalizeModbusRegistro(registro?: ModbusRegistro): ModbusRegistro {
  if (registro && MODBUS_REGISTROS.includes(registro)) return registro;
  return "holding_register";
}

function migrateLegacyTipoDado(tipo?: string): ModbusTipoDado | undefined {
  if (!tipo?.trim()) return undefined;
  if (MODBUS_TIPOS_DADO.includes(tipo as ModbusTipoDado)) {
    return tipo as ModbusTipoDado;
  }
  if (!LEGACY_SNMP_TIPO_DADO.has(tipo)) return undefined;
  const map: Record<string, ModbusTipoDado> = {
    numerico: "uint16",
    binario: "binary",
    multi_estado: "uint16",
    alfanumerico: "string_fixed",
    texto: "string_fixed",
    contador: "uint32",
    tempo: "uint32",
    gauge: "uint32",
  };
  return map[tipo];
}

export function normalizeModbusTipoDado(
  tipo?: string
): ModbusTipoDado | undefined {
  return migrateLegacyTipoDado(tipo);
}

/** Converte tipo Modbus para exibição SNMP (cards de leitura). */
export function modbusTipoDadoParaDisplay(
  tipo?: ModbusTipoDado
): SnmpTipoDado {
  if (!tipo) return "numerico";
  if (tipo === "binary") return "binario";
  if (tipo === "string_fixed" || tipo === "string_variable") {
    return "alfanumerico";
  }
  return "numerico";
}

export function modbusPontoParaDisplayTipo(
  ponto: Pick<ModbusPonto, "registro" | "tipoDado" | "estadosMulti">
): SnmpTipoDado {
  const estados = ponto.estadosMulti?.filter((e) => e.chave.trim()) ?? [];
  if (estados.length > 0) return "multi_estado";
  if (modbusRegistroComEstados(ponto.registro)) return "binario";
  return modbusTipoDadoParaDisplay(ponto.tipoDado);
}

export function newModbusPonto(partial?: Partial<ModbusPonto>): ModbusPonto {
  const registro = normalizeModbusRegistro(partial?.registro);
  const comTipoDado = modbusRegistroComTipoDado(registro);
  const comEstados = modbusRegistroComEstados(registro);
  const tipoDado = comTipoDado
    ? normalizeModbusTipoDado(partial?.tipoDado) ?? "uint16"
    : undefined;

  return {
    _localId: randomId(),
    nome: "",
    offset: 0,
    unidade: "",
    descricao: "",
    desabilitado: false,
    ...partial,
    registro,
    tipoDado,
    estadosMulti: comEstados ? (partial?.estadosMulti ?? []) : undefined,
    multiplicador: isModbusTipoDadoNumerico(tipoDado)
      ? (partial?.multiplicador ?? 1)
      : undefined,
  };
}

export function normalizeModbusPontos(
  config?: {
    pontosModbus?: ModbusPonto[];
    registradores?: number[];
  }
): ModbusPonto[] {
  if (config?.pontosModbus?.length) {
    return config.pontosModbus.map((p) => {
      const registro = normalizeModbusRegistro(p.registro);
      const comTipoDado = modbusRegistroComTipoDado(registro);
      const comEstados = modbusRegistroComEstados(registro);
      const tipoDado = comTipoDado
        ? normalizeModbusTipoDado(p.tipoDado) ?? "uint16"
        : undefined;

      const estadosNormalizados = p.estadosMulti?.length
        ? p.estadosMulti.map((e) => ({
            ...e,
            _localId: e._localId ?? randomId(),
          }))
        : comEstados
          ? []
          : undefined;

      return {
        ...p,
        _localId: p._localId ?? randomId(),
        offset: Number.isFinite(p.offset) ? p.offset : 0,
        registro,
        tipoDado,
        multiplicador: isModbusTipoDadoNumerico(tipoDado)
          ? (p.multiplicador ?? 1)
          : undefined,
        estadosMulti: estadosNormalizados,
      };
    });
  }
  if (config?.registradores?.length) {
    return config.registradores.map((offset) =>
      newModbusPonto({
        nome: `Offset ${offset}`,
        offset,
        registro: "holding_register",
        tipoDado: "uint16",
      })
    );
  }
  return [];
}

export function serializeModbusPontos(pontos: ModbusPonto[]): {
  pontosModbus: ModbusPonto[];
  registradores: number[];
} {
  const serialized = pontos
    .filter((p) => Number.isFinite(p.offset) && p.offset >= 0)
    .map(({ _localId: _, ...p }) => {
      const registro = normalizeModbusRegistro(p.registro);
      const comTipoDado = modbusRegistroComTipoDado(registro);
      const comEstados = modbusRegistroComEstados(registro);
      const tipoDado = comTipoDado ? p.tipoDado ?? "uint16" : undefined;

      let base: ModbusPonto = {
        ...p,
        nome: p.nome.trim() || `Offset ${p.offset}`,
        offset: Math.min(65535, Math.max(0, Math.trunc(p.offset))),
        registro,
        tipoDado,
      };

      if (comEstados) {
        const { tipoDado: _t, multiplicador: _m, ...rest } = base;
        base = rest;
        if (base.estadosMulti?.length) {
          base.estadosMulti = base.estadosMulti
            .filter((e) => e.chave.trim())
            .map(({ chave, exibicao, cor }) => ({
              chave: chave.trim(),
              exibicao: exibicao.trim() || chave.trim(),
              cor: cor?.trim() || "#64748b",
            }));
        } else {
          const { estadosMulti: _e, ...semEstados } = base;
          base = semEstados;
        }
      } else if (!comTipoDado) {
        const { tipoDado: _t, multiplicador: _m, estadosMulti: _e, ...rest } =
          base;
        base = rest;
      } else {
        const { estadosMulti: _e, ...rest } = base;
        base = rest;
      }

      if (!isModbusTipoDadoNumerico(base.tipoDado)) {
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

  return {
    pontosModbus: serialized,
    registradores: serialized
      .filter((p) => !p.desabilitado)
      .map((p) => p.offset),
  };
}
