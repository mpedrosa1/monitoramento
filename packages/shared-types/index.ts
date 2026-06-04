export type ChamadoStatus = "aberto" | "em_andamento" | "encerrado";

export type ColaboradorStatus =
  | "atrasado"
  | "em_missao"
  | "escritorio"
  | "almoco"
  | "ferias"
  | "atestado";

export type DispositivoTipo = "ping" | "modbus" | "snmp";

export interface Unidade {
  id: string;
  nome: string;
  codigo: string;
  endereco: string;
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

export interface DeviceMetric {
  dispositivoId: string;
  unidadeId: string;
  tipo: DispositivoTipo;
  host: string;
  online: boolean;
  latenciaMs?: number;
  valores?: Record<string, unknown>;
  updatedAt: string;
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
