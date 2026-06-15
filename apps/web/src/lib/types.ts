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

export type SnmpTipoDado =
  | "numerico"
  | "binario"
  | "multi_estado"
  | "alfanumerico"
  | "texto"
  | "contador"
  | "tempo"
  | "gauge";

/** Tipo SNMP (SMI) — Integer32, OctetString, etc. */
export type SnmpTipoSelecao =
  | "nao_selecionado"
  | "integer32"
  | "octet_string"
  | "object_identifier"
  | "ip_address"
  | "counter32"
  | "gauge32"
  | "time_ticks"
  | "opaque"
  | "counter64";

/** Mapeamento chave → exibição para pontos multi-estado. */
export interface SnmpMultiEstadoItem {
  _localId?: string;
  /** Valor retornado pelo OID. */
  chave: string;
  /** Texto exibido no lugar da chave. */
  exibicao: string;
  /** Cor em hexadecimal (#RRGGBB). */
  cor: string;
}

export type ModbusRegistro =
  | "coil_status"
  | "input_status"
  | "holding_register"
  | "input_register";

export type ModbusTipoDado =
  | "binary"
  | "uint16"
  | "int16"
  | "bcd16"
  | "uint32"
  | "int32"
  | "uint32_swapped"
  | "int32_swapped"
  | "float32"
  | "float32_swapped"
  | "float32_swapped_inverted"
  | "bcd32"
  | "uint64"
  | "int64"
  | "uint64_swapped"
  | "int64_swapped"
  | "float64"
  | "float64_swapped"
  | "string_fixed"
  | "string_variable";

/** Ponto de leitura Modbus (registrador por offset). */
export interface ModbusPonto {
  _localId?: string;
  nome: string;
  offset: number;
  registro?: ModbusRegistro;
  unidade?: string;
  multiplicador?: number;
  tipoDado?: ModbusTipoDado;
  estadosMulti?: SnmpMultiEstadoItem[];
  descricao?: string;
  desabilitado?: boolean;
}

export interface SnmpPonto {
  /** Identificador local para React (não persistido). */
  _localId?: string;
  nome: string;
  oid: string;
  /** Sufixo exibido após o valor (ex.: °C, %). */
  unidade?: string;
  /** Aplicado na exibição quando tipoDado é "numerico". */
  multiplicador?: number;
  /** Tipo SNMP (SMI) do OID. */
  tipoSnmp?: SnmpTipoSelecao;
  tipoDado?: SnmpTipoDado;
  /** Mapeamentos quando tipoDado é "multi_estado". */
  estadosMulti?: SnmpMultiEstadoItem[];
  descricao?: string;
  desabilitado?: boolean;
}

/** @deprecated use TipoMonitoramento — mantido para métricas WS legadas */
export type DispositivoTipo = TipoMonitoramento | "ping";

export interface UnidadeEquipamento {
  /** Identificador local para React (não persistido). */
  _localId?: string;
  equipamentoId: string;
  porta: number;
  /** Nome de exibição nesta unidade (não altera o catálogo). */
  nomeLocal?: string;
  /** Interface web acessível no IP da unidade. */
  paginaWeb?: boolean;
  portaWeb?: number;
  /** Agrupa sensores montados na mesma máquina. */
  maquinaId?: string;
  maquinaNome?: string;
  /** Endereço Modbus do sensor no gateway (somente em máquinas). */
  slaveId?: number;
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

export interface UnidadeAreaVertice {
  latitude: number;
  longitude: number;
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
  /** Área do perímetro em m² (polígono geodésico). */
  areaM2?: number;
  /** Vértices do polígono da área da unidade. */
  areaVertices?: UnidadeAreaVertice[];
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
  conjugeCpf?: string;
  dependentes?: ColaboradorDependente[];
  endereco?: ColaboradorEndereco;
  cargo?: string;
  dataAdmissao?: string;
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

export interface Veiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anoFabricacao?: number;
  anoModelo?: number;
  cor?: string;
  chassi?: string;
  renavam?: string;
  kmAtual?: number;
  fotoUrl: string;
  colaboradorId: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificacaoTipo =
  | "troca_veiculo_solicitacao"
  | "troca_veiculo_resposta"
  | "troca_veiculo_admin";

export interface NotificacaoPayload {
  trocaId?: string;
  veiculoAlvoId?: string;
  veiculoOfertadoId?: string;
  solicitanteColaboradorId?: string;
  solicitanteNome?: string;
  veiculoAlvoPlaca?: string;
  veiculoOfertadoPlaca?: string;
  aceita?: boolean;
}

export interface Notificacao {
  id: string;
  destinatarioColaboradorId: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  lida: boolean;
  payload: NotificacaoPayload;
  createdAt: string;
}

export type TrocaVeiculoStatus =
  | "pendente"
  | "aceita"
  | "recusada"
  | "cancelada";

export interface TrocaVeiculo {
  id: string;
  solicitanteColaboradorId: string;
  destinatarioColaboradorId: string;
  veiculoAlvoId: string;
  veiculoOfertadoId?: string;
  status: TrocaVeiculoStatus;
  origem: "solicitacao" | "admin";
  createdAt: string;
  respondidoAt?: string;
}

export type MissaoStatus = "planejada" | "em_andamento" | "concluida";

export interface Missao {
  id: string;
  titulo: string;
  status: MissaoStatus;
  unidadeId: string;
  chamadoId?: string;
  colaboradorIds: string[];
  /** Início previsto/real da missão (YYYY-MM-DD). */
  dataInicio?: string;
  horaInicio?: string;
  concluidaPor?: string;
  dataConclusao?: string;
  horaConclusao?: string;
  relatorioConclusao?: string;
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
  /** Tipo do sensor (quando tipoEquipamento é sensor). */
  tipoSensor?: string;
  tipoMonitoramento: TipoMonitoramento;
  config?: {
    slaveId?: number;
    registradores?: number[];
    pontosModbus?: ModbusPonto[];
    pontos?: SnmpPonto[];
    /** @deprecated use pontos */
    oids?: string[];
    community?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function monitorTargetId(
  unidadeId: string,
  equipamentoId: string,
  porta: number
) {
  return `${unidadeId}:${equipamentoId}:${porta}`;
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
  type: "snapshot" | "update" | "notification";
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
