import type {
  ChamadoStatus,
  ColaboradorStatus,
  MissaoStatus,
  SnmpTipoDado,
  TipoEquipamento,
  TipoMonitoramento,
} from "./types";

export const chamadoStatusLabel: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  encerrado: "Encerrado",
};

export const missaoStatusLabel: Record<MissaoStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export const missaoStatusVariant: Record<
  MissaoStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  planejada: "outline",
  em_andamento: "default",
  concluida: "secondary",
};

export const colaboradorStatusLabel: Record<ColaboradorStatus, string> = {
  atrasado: "Atrasado",
  em_missao: "Em missão",
  escritorio: "Escritório",
  almoco: "Horário de almoço",
  ferias: "Férias",
  atestado: "Atestado",
};

export const chamadoStatusVariant: Record<
  ChamadoStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  aberto: "destructive",
  em_andamento: "default",
  encerrado: "secondary",
};

export const colaboradorStatusVariant: Record<
  ColaboradorStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  atrasado: "destructive",
  em_missao: "default",
  escritorio: "secondary",
  almoco: "outline",
  ferias: "secondary",
  atestado: "outline",
};

export const tipoEquipamentoLabel: Record<TipoEquipamento, string> = {
  nobreak: "Nobreak",
  sensor: "Sensor",
};

export const tipoMonitoramentoLabel: Record<TipoMonitoramento, string> = {
  modbus: "Modbus",
  snmp: "SNMP",
};

export const snmpTipoDadoLabel: Record<SnmpTipoDado, string> = {
  numerico: "Numérico",
  texto: "Texto",
  contador: "Contador",
  tempo: "Tempo (TimeTicks)",
  gauge: "Gauge",
};
