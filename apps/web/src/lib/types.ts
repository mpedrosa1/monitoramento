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

export type EstadoCivil =
  | "solteiro"
  | "casado"
  | "divorciado"
  | "viuvo"
  | "uniao_estavel";

export type LocalTrabalho =
  | "campo"
  | "escritorio"
  | "oficina"
  | "laboratorio";

export type TipoAcessoSistema =
  | "usuario"
  | "admin_com_financeiro"
  | "admin_sem_financeiro"
  | "desenvolvedor";

export interface ColaboradorEndereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ColaboradorDependente {
  nome: string;
  dataNascimento?: string;
  rg?: string;
  cpf?: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  fotoUrl: string;
  dataNascimento?: string;
  cpf?: string;
  rg?: string;
  rgOrgaoEmissor?: string;
  telefoneContato?: string;
  email?: string;
  estadoCivil?: EstadoCivil;
  conjuge?: string;
  dependentes?: ColaboradorDependente[];
  endereco?: ColaboradorEndereco;
  cargo?: string;
  localTrabalho?: LocalTrabalho;
  telefoneCorporativo?: string;
  emailCorporativo?: string;
  salario?: number;
  tipoAcesso?: TipoAcessoSistema;
  /** Status operacional (presença / missão) — não exibido no cadastro. */
  status: ColaboradorStatus;
  unidadeId?: string;
  createdAt: string;
  updatedAt: string;
}

export type MissaoStatus = "planejada" | "em_andamento" | "concluida";

export interface Missao {
  id: string;
  titulo: string;
  status: MissaoStatus;
  unidadeId: string;
  chamadoId?: string;
  colaboradorIds: string[];
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
  encerradoPor?: string;
  dataEncerramento?: string;
  horaEncerramento?: string;
  horaTestePos?: string;
  diagnostico?: string;
  acoesRealizadas?: string;
  sinaisPosTeste?: string[];
  sinaisPosTesteOutros?: string;
  observacoesEncerramento?: string;
  emailEncerramentoAssunto?: string;
  emailEncerramentoCorpo?: string;
  colaboradorIds?: string[];
  previsaoChegadaData?: string;
  previsaoChegadaHora?: string;
  missaoId?: string;
  emailAutorizacaoAssunto?: string;
  emailAutorizacaoCorpo?: string;
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
