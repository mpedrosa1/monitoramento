export type ChamadoStatus = "aberto" | "em_andamento" | "encerrado";

export type ColaboradorStatus =
  | "atrasado"
  | "em_missao"
  | "escritorio"
  | "almoco"
  | "ferias"
  | "atestado";

export type TipoEquipamento = "nobreak" | "sensor";

export type TipoMonitoramento = "modbus" | "snmp";

export type SnmpTipoDado = "numerico" | "texto" | "contador" | "tempo" | "gauge";

export interface SnmpPonto {
  /** Identificador local para React (não persistido). */
  _localId?: string;
  nome: string;
  oid: string;
  unidade?: string;
  tipoDado?: SnmpTipoDado;
  descricao?: string;
  desabilitado?: boolean;
}

/** @deprecated use TipoMonitoramento — mantido para métricas WS legadas */
export type DispositivoTipo = TipoMonitoramento | "ping";

export interface UnidadeEquipamento {
  equipamentoId: string;
  porta: number;
}

export interface Unidade {
  id: string;
  nome: string;
  codigo: string;
  endereco: string;
  ip: string;
  intervaloS: number;
  equipamentos: UnidadeEquipamento[];
  createdAt: string;
  updatedAt: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  fotoUrl: string;
  status: ColaboradorStatus;
  unidadeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chamado {
  id: string;
  titulo: string;
  descricao: string;
  status: ChamadoStatus;
  unidadeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Equipamento {
  id: string;
  nome: string;
  marca: string;
  tipoEquipamento: TipoEquipamento;
  tipoMonitoramento: TipoMonitoramento;
  config?: {
    slaveId?: number;
    registradores?: number[];
    pontos?: SnmpPonto[];
    /** @deprecated use pontos */
    oids?: string[];
    community?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function monitorTargetId(unidadeId: string, equipamentoId: string) {
  return `${unidadeId}:${equipamentoId}`;
}

export interface DeviceMetric {
  targetId: string;
  equipamentoId: string;
  unidadeId: string;
  tipo: DispositivoTipo;
  host: string;
  porta?: number;
  online: boolean;
  latenciaMs?: number;
  valores?: Record<string, unknown>;
  updatedAt: string;
  dispositivoId: string;
}

export interface DashboardSummary {
  missoesEmAndamento: number;
  ultimosChamados: Chamado[];
  colaboradores: Colaborador[];
  metricas?: DeviceMetric[];
}

export interface WSMessage<T = unknown> {
  type: "snapshot" | "update";
  payload: T;
}

export interface EventoMonitoramento {
  id: string;
  dispositivoId: string;
  tipo: string;
  severidade: string;
  mensagem: string;
  createdAt: string;
}
