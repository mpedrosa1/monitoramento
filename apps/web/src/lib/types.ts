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
  /** Aplicado na exibição quando tipoDado é "numerico". */
  multiplicador?: number;
  tipoDado?: SnmpTipoDado;
  descricao?: string;
  desabilitado?: boolean;
}

/** @deprecated use TipoMonitoramento — mantido para métricas WS legadas */
export type DispositivoTipo = TipoMonitoramento | "ping";

export interface UnidadeEquipamento {
  equipamentoId: string;
  porta: number;
  /** Nome de exibição nesta unidade (não altera o catálogo). */
  nomeLocal?: string;
}

export interface UnidadeEndereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface AntenaProxima {
  id: string;
  nomeEntidade: string;
  tecnologia: string;
  latitude: number;
  longitude: number;
  azimute?: string;
  potenciaW?: string;
  alturaAntena?: string;
  municipio: string;
  numEstacao: string;
  distanciaKm: number;
}

export interface Unidade {
  id: string;
  /** ID institucional (ex.: PC-01). */
  codigo: string;
  nome: string;
  diretores: string[];
  telefones: string[];
  emails: string[];
  endereco: UnidadeEndereco;
  latitude?: number;
  longitude?: number;
  ip: string;
  equipamentos: UnidadeEquipamento[];
  intervaloS: number;
  /** Segundos offline/sem resposta antes de exibir toast (padrão 60). */
  alertaOfflineS?: number;
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
  numero?: string;
  titulo: string;
  descricao: string;
  status: ChamadoStatus;
  unidadeId: string;
  abertoPor?: string;
  /** Data no formato YYYY-MM-DD */
  data?: string;
  hora?: string;
  horaTeste?: string;
  sinaisDetectados?: string[];
  sinaisOutros?: string;
  locaisAfetados?: string;
  comunicacao?: string[];
  comunicacaoOutros?: string;
  emailAssunto?: string;
  emailCorpo?: string;
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

/** Alvo de ping ICMP do IP cadastrado na unidade. */
export function monitorUnidadeHostTargetId(unidadeId: string) {
  return `${unidadeId}:host`;
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
