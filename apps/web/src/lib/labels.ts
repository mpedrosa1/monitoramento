import { labelPermissoesAdmin } from "@/lib/acesso";
import type {
  ChamadoStatus,
  ColaboradorStatus,
  MissaoStatus,
  SnmpTipoDado,
  SnmpTipoSelecao,
  PermissoesAdmin,
  TipoAcessoSistema,
  TipoEquipamento,
  TipoMonitoramento,
} from "./types";

export function labelTipoAcesso(
  tipo: TipoAcessoSistema | string | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): string {
  return labelPermissoesAdmin(tipo, permissoesAdmin);
}

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
  em_deslocamento: "Em deslocamento",
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
  em_deslocamento: "default",
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

export const snmpTipoSelecaoLabel: Record<SnmpTipoSelecao, string> = {
  nao_selecionado: "Não selecionado",
  integer32: "Inteiro 32",
  octet_string: "String de octetos",
  object_identifier: "Identificador de objeto",
  ip_address: "Endereço IP",
  counter32: "Contador 32",
  gauge32: "Gauge 32",
  time_ticks: "Ticks de tempo",
  opaque: "Opaco",
  counter64: "Contador 64",
};

export const snmpTipoDadoLabel: Record<SnmpTipoDado, string> = {
  numerico: "Numérico",
  binario: "Binário",
  multi_estado: "Multi-estado",
  alfanumerico: "Alfanumérico",
  texto: "Alfanumérico",
  contador: "Contador",
  tempo: "Tempo (TimeTicks)",
  gauge: "Gauge",
};
