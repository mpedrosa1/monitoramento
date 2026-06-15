package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/bsontype"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChamadoStatus string

const (
	ChamadoAberto       ChamadoStatus = "aberto"
	ChamadoEmAndamento  ChamadoStatus = "em_andamento"
	ChamadoEncerrado    ChamadoStatus = "encerrado"
)

type ColaboradorStatus string

const (
	ColaboradorAtrasado   ColaboradorStatus = "atrasado"
	ColaboradorEmMissao   ColaboradorStatus = "em_missao"
	ColaboradorEscritorio ColaboradorStatus = "escritorio"
	ColaboradorAlmoco     ColaboradorStatus = "almoco"
	ColaboradorFerias     ColaboradorStatus = "ferias"
	ColaboradorAtestado   ColaboradorStatus = "atestado"
)

type MissaoStatus string

const (
	MissaoPlanejada    MissaoStatus = "planejada"
	MissaoEmAndamento  MissaoStatus = "em_andamento"
	MissaoConcluida    MissaoStatus = "concluida"
)

type DispositivoTipo string

const (
	DispositivoPing   DispositivoTipo = "ping"
	DispositivoModbus DispositivoTipo = "modbus"
	DispositivoSNMP   DispositivoTipo = "snmp"
)

type UnidadeEquipamento struct {
	EquipamentoID primitive.ObjectID `json:"equipamentoId" bson:"equipamentoId"`
	Porta         int                `json:"porta" bson:"porta"`
	// NomeLocal apelido nesta unidade (não altera o nome no catálogo).
	NomeLocal string `json:"nomeLocal,omitempty" bson:"nomeLocal,omitempty"`
	// PaginaWeb indica interface HTTP acessível no IP da unidade.
	PaginaWeb bool `json:"paginaWeb,omitempty" bson:"paginaWeb,omitempty"`
	PortaWeb  int  `json:"portaWeb,omitempty" bson:"portaWeb,omitempty"`
	// MaquinaID agrupa sensores da mesma máquina na unidade.
	MaquinaID string `json:"maquinaId,omitempty" bson:"maquinaId,omitempty"`
	// MaquinaNome nome da máquina montada na unidade.
	MaquinaNome string `json:"maquinaNome,omitempty" bson:"maquinaNome,omitempty"`
	// SlaveID endereço Modbus do sensor no gateway (máquinas).
	SlaveID int `json:"slaveId,omitempty" bson:"slaveId,omitempty"`
}

// UnidadeEndereco endereço estruturado da unidade prisional.
type UnidadeEndereco struct {
	CEP         string `json:"cep" bson:"cep"`
	Logradouro  string `json:"logradouro" bson:"logradouro"`
	Numero      string `json:"numero" bson:"numero"`
	Complemento string `json:"complemento" bson:"complemento"`
	Bairro      string `json:"bairro" bson:"bairro"`
	Cidade      string `json:"cidade" bson:"cidade"`
	Estado      string `json:"estado" bson:"estado"`
}

// UnmarshalBSONValue aceita documento estruturado ou string legada.
func (e *UnidadeEndereco) UnmarshalBSONValue(t bsontype.Type, data []byte) error {
	if t == bsontype.String {
		var s string
		if err := bson.UnmarshalValue(t, data, &s); err != nil {
			return err
		}
		e.Logradouro = s
		return nil
	}
	type alias UnidadeEndereco
	var tmp alias
	if err := bson.UnmarshalValue(t, data, &tmp); err != nil {
		return err
	}
	*e = UnidadeEndereco(tmp)
	return nil
}

type TipoEquipamento string

const (
	TipoEquipamentoNobreak TipoEquipamento = "nobreak"
	TipoEquipamentoSensor  TipoEquipamento = "sensor"
)

type UnidadeAreaVertice struct {
	Latitude  float64 `json:"latitude" bson:"latitude"`
	Longitude float64 `json:"longitude" bson:"longitude"`
}

type Unidade struct {
	ID           primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Codigo       string               `json:"codigo" bson:"codigo"` // ID institucional
	Nome         string               `json:"nome" bson:"nome"`
	Diretores    []string             `json:"diretores" bson:"diretores"`
	Telefones    []string             `json:"telefones" bson:"telefones"`
	Emails       []string             `json:"emails" bson:"emails"`
	Endereco     UnidadeEndereco      `json:"endereco" bson:"endereco"`
	Latitude     float64              `json:"latitude" bson:"latitude"`
	Longitude    float64              `json:"longitude" bson:"longitude"`
	AreaM2       float64              `json:"areaM2,omitempty" bson:"areaM2,omitempty"`
	AreaVertices []UnidadeAreaVertice `json:"areaVertices,omitempty" bson:"areaVertices,omitempty"`
	IP           string               `json:"ip" bson:"ip"`
	Equipamentos []UnidadeEquipamento `json:"equipamentos" bson:"equipamentos"`
	IntervaloS   int                  `json:"intervaloS" bson:"intervaloS"`
	// AlertaOfflineS segundos sem resposta (IP/OID) antes de alertar no painel.
	AlertaOfflineS int `json:"alertaOfflineS" bson:"alertaOfflineS"`
	CreatedAt    time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time            `json:"updatedAt" bson:"updatedAt"`
}

type EstadoCivil string

const (
	EstadoCivilSolteiro     EstadoCivil = "solteiro"
	EstadoCivilCasado       EstadoCivil = "casado"
	EstadoCivilDivorciado    EstadoCivil = "divorciado"
	EstadoCivilViuvo        EstadoCivil = "viuvo"
	EstadoCivilUniaoEstavel EstadoCivil = "uniao_estavel"
)

type LocalTrabalho string

const (
	LocalTrabalhoCampo       LocalTrabalho = "campo"
	LocalTrabalhoEscritorio  LocalTrabalho = "escritorio"
	LocalTrabalhoOficina     LocalTrabalho = "oficina"
	LocalTrabalhoLaboratorio LocalTrabalho = "laboratorio"
)

type TipoAcessoSistema string

const (
	TipoAcessoUsuario             TipoAcessoSistema = "usuario"
	TipoAcessoAdminComFinanceiro  TipoAcessoSistema = "admin_com_financeiro"
	TipoAcessoAdminSemFinanceiro  TipoAcessoSistema = "admin_sem_financeiro"
	TipoAcessoDesenvolvedor       TipoAcessoSistema = "desenvolvedor"
)

const ColaboradorFotoURLPadrao = "/avatar-placeholder.svg"

type ColaboradorDependente struct {
	Nome           string `json:"nome" bson:"nome"`
	DataNascimento string `json:"dataNascimento,omitempty" bson:"dataNascimento,omitempty"`
	RG             string `json:"rg,omitempty" bson:"rg,omitempty"`
	CPF            string `json:"cpf,omitempty" bson:"cpf,omitempty"`
}

type Colaborador struct {
	ID                  primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Nome                string               `json:"nome" bson:"nome"`
	FotoURL             string               `json:"fotoUrl" bson:"fotoUrl"`
	DataNascimento      string               `json:"dataNascimento,omitempty" bson:"dataNascimento,omitempty"`
	CPF                 string               `json:"cpf,omitempty" bson:"cpf,omitempty"`
	RG                  string               `json:"rg,omitempty" bson:"rg,omitempty"`
	RGOrgaoEmissor      string               `json:"rgOrgaoEmissor,omitempty" bson:"rgOrgaoEmissor,omitempty"`
	TelefoneContato     string               `json:"telefoneContato,omitempty" bson:"telefoneContato,omitempty"`
	Email               string               `json:"email,omitempty" bson:"email,omitempty"`
	EstadoCivil         EstadoCivil          `json:"estadoCivil,omitempty" bson:"estadoCivil,omitempty"`
	Conjuge             string               `json:"conjuge,omitempty" bson:"conjuge,omitempty"`
	ConjugeCPF          string               `json:"conjugeCpf,omitempty" bson:"conjugeCpf,omitempty"`
	Dependentes         []ColaboradorDependente `json:"dependentes,omitempty" bson:"dependentes,omitempty"`
	Endereco            UnidadeEndereco      `json:"endereco,omitempty" bson:"endereco,omitempty"`
	Cargo               string               `json:"cargo,omitempty" bson:"cargo,omitempty"`
	DataAdmissao        string               `json:"dataAdmissao,omitempty" bson:"dataAdmissao,omitempty"`
	LocalTrabalho       LocalTrabalho        `json:"localTrabalho,omitempty" bson:"localTrabalho,omitempty"`
	TelefoneCorporativo string               `json:"telefoneCorporativo,omitempty" bson:"telefoneCorporativo,omitempty"`
	EmailCorporativo    string               `json:"emailCorporativo,omitempty" bson:"emailCorporativo,omitempty"`
	Salario             float64              `json:"salario,omitempty" bson:"salario,omitempty"`
	TipoAcesso          TipoAcessoSistema    `json:"tipoAcesso,omitempty" bson:"tipoAcesso,omitempty"`
	SenhaHash           string               `json:"-" bson:"senhaHash,omitempty"`
	Status              ColaboradorStatus    `json:"status" bson:"status"`
	UnidadeID           primitive.ObjectID   `json:"unidadeId,omitempty" bson:"unidadeId,omitempty"`
	CreatedAt           time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt           time.Time            `json:"updatedAt" bson:"updatedAt"`
}

const VeiculoFotoURLPadrao = "/veiculo-placeholder.webp"

type TrocaVeiculoStatus string

const (
	TrocaVeiculoStatusPendente  TrocaVeiculoStatus = "pendente"
	TrocaVeiculoStatusAceita    TrocaVeiculoStatus = "aceita"
	TrocaVeiculoStatusRecusada  TrocaVeiculoStatus = "recusada"
	TrocaVeiculoStatusCancelada TrocaVeiculoStatus = "cancelada"
)

type TrocaVeiculoOrigem string

const (
	TrocaVeiculoOrigemSolicitacao TrocaVeiculoOrigem = "solicitacao"
	TrocaVeiculoOrigemAdmin       TrocaVeiculoOrigem = "admin"
)

type NotificacaoTipo string

const (
	NotificacaoTrocaSolicitacao NotificacaoTipo = "troca_veiculo_solicitacao"
	NotificacaoTrocaResposta    NotificacaoTipo = "troca_veiculo_resposta"
	NotificacaoTrocaAdmin       NotificacaoTipo = "troca_veiculo_admin"
	NotificacaoChamadoAberto    NotificacaoTipo = "chamado_aberto"
	NotificacaoMissaoAgendada   NotificacaoTipo = "missao_agendada"
)

type NotificacaoPayload struct {
	TrocaID                  string `json:"trocaId,omitempty" bson:"trocaId,omitempty"`
	VeiculoAlvoID            string `json:"veiculoAlvoId,omitempty" bson:"veiculoAlvoId,omitempty"`
	VeiculoOfertadoID        string `json:"veiculoOfertadoId,omitempty" bson:"veiculoOfertadoId,omitempty"`
	SolicitanteColaboradorID string `json:"solicitanteColaboradorId,omitempty" bson:"solicitanteColaboradorId,omitempty"`
	SolicitanteNome          string `json:"solicitanteNome,omitempty" bson:"solicitanteNome,omitempty"`
	VeiculoAlvoPlaca         string `json:"veiculoAlvoPlaca,omitempty" bson:"veiculoAlvoPlaca,omitempty"`
	VeiculoOfertadoPlaca     string `json:"veiculoOfertadoPlaca,omitempty" bson:"veiculoOfertadoPlaca,omitempty"`
	Aceita                   *bool  `json:"aceita,omitempty" bson:"aceita,omitempty"`
	ChamadoID                string `json:"chamadoId,omitempty" bson:"chamadoId,omitempty"`
	ChamadoNumero            string `json:"chamadoNumero,omitempty" bson:"chamadoNumero,omitempty"`
	MissaoID                 string `json:"missaoId,omitempty" bson:"missaoId,omitempty"`
	UnidadeID                string `json:"unidadeId,omitempty" bson:"unidadeId,omitempty"`
	DataInicio               string `json:"dataInicio,omitempty" bson:"dataInicio,omitempty"`
	HoraInicio               string `json:"horaInicio,omitempty" bson:"horaInicio,omitempty"`
}

type Notificacao struct {
	ID                        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	DestinatarioColaboradorID primitive.ObjectID `json:"destinatarioColaboradorId" bson:"destinatarioColaboradorId"`
	Tipo                      NotificacaoTipo    `json:"tipo" bson:"tipo"`
	Titulo                    string             `json:"titulo" bson:"titulo"`
	Mensagem                  string             `json:"mensagem" bson:"mensagem"`
	Lida                      bool               `json:"lida" bson:"lida"`
	Payload                   NotificacaoPayload `json:"payload" bson:"payload"`
	CreatedAt                 time.Time          `json:"createdAt" bson:"createdAt"`
}

type TrocaVeiculo struct {
	ID                        primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	SolicitanteColaboradorID  primitive.ObjectID  `json:"solicitanteColaboradorId" bson:"solicitanteColaboradorId"`
	DestinatarioColaboradorID primitive.ObjectID  `json:"destinatarioColaboradorId" bson:"destinatarioColaboradorId"`
	VeiculoAlvoID             primitive.ObjectID  `json:"veiculoAlvoId" bson:"veiculoAlvoId"`
	VeiculoOfertadoID         *primitive.ObjectID `json:"veiculoOfertadoId,omitempty" bson:"veiculoOfertadoId,omitempty"`
	Status                    TrocaVeiculoStatus  `json:"status" bson:"status"`
	Origem                    TrocaVeiculoOrigem  `json:"origem" bson:"origem"`
	CreatedAt                 time.Time           `json:"createdAt" bson:"createdAt"`
	RespondidoAt              *time.Time          `json:"respondidoAt,omitempty" bson:"respondidoAt,omitempty"`
}

type Veiculo struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Placa         string             `json:"placa" bson:"placa"`
	Marca         string             `json:"marca" bson:"marca"`
	Modelo        string             `json:"modelo" bson:"modelo"`
	AnoFabricacao int                `json:"anoFabricacao,omitempty" bson:"anoFabricacao,omitempty"`
	AnoModelo     int                `json:"anoModelo,omitempty" bson:"anoModelo,omitempty"`
	Cor           string             `json:"cor,omitempty" bson:"cor,omitempty"`
	Chassi        string             `json:"chassi,omitempty" bson:"chassi,omitempty"`
	Renavam       string             `json:"renavam,omitempty" bson:"renavam,omitempty"`
	KmAtual       int                `json:"kmAtual" bson:"kmAtual"`
	FotoURL       string             `json:"fotoUrl" bson:"fotoUrl"`
	ColaboradorID primitive.ObjectID `json:"colaboradorId" bson:"colaboradorId"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type Chamado struct {
	ID                primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Numero            string             `json:"numero,omitempty" bson:"numero,omitempty"`
	Titulo            string             `json:"titulo" bson:"titulo"`
	Descricao         string             `json:"descricao" bson:"descricao"`
	Status            ChamadoStatus      `json:"status" bson:"status"`
	UnidadeID         primitive.ObjectID `json:"unidadeId" bson:"unidadeId"`
	AbertoPor         string             `json:"abertoPor,omitempty" bson:"abertoPor,omitempty"`
	Data              string             `json:"data,omitempty" bson:"data,omitempty"`
	Hora              string             `json:"hora,omitempty" bson:"hora,omitempty"`
	HoraTeste         string             `json:"horaTeste,omitempty" bson:"horaTeste,omitempty"`
	SinaisDetectados  []string           `json:"sinaisDetectados,omitempty" bson:"sinaisDetectados,omitempty"`
	SinaisOutros      string             `json:"sinaisOutros,omitempty" bson:"sinaisOutros,omitempty"`
	LocaisAfetados    string             `json:"locaisAfetados,omitempty" bson:"locaisAfetados,omitempty"`
	Comunicacao       []string           `json:"comunicacao,omitempty" bson:"comunicacao,omitempty"`
	ComunicacaoOutros string             `json:"comunicacaoOutros,omitempty" bson:"comunicacaoOutros,omitempty"`
	EmailAssunto      string             `json:"emailAssunto,omitempty" bson:"emailAssunto,omitempty"`
	EmailCorpo        string             `json:"emailCorpo,omitempty" bson:"emailCorpo,omitempty"`
	EncerradoPor      string             `json:"encerradoPor,omitempty" bson:"encerradoPor,omitempty"`
	DataEncerramento  string             `json:"dataEncerramento,omitempty" bson:"dataEncerramento,omitempty"`
	HoraEncerramento  string             `json:"horaEncerramento,omitempty" bson:"horaEncerramento,omitempty"`
	HoraTestePos      string             `json:"horaTestePos,omitempty" bson:"horaTestePos,omitempty"`
	Diagnostico       string             `json:"diagnostico,omitempty" bson:"diagnostico,omitempty"`
	AcoesRealizadas   string             `json:"acoesRealizadas,omitempty" bson:"acoesRealizadas,omitempty"`
	SinaisPosTeste    []string           `json:"sinaisPosTeste,omitempty" bson:"sinaisPosTeste,omitempty"`
	SinaisPosTesteOutros string          `json:"sinaisPosTesteOutros,omitempty" bson:"sinaisPosTesteOutros,omitempty"`
	ObservacoesEncerramento string       `json:"observacoesEncerramento,omitempty" bson:"observacoesEncerramento,omitempty"`
	EmailEncerramentoAssunto string             `json:"emailEncerramentoAssunto,omitempty" bson:"emailEncerramentoAssunto,omitempty"`
	EmailEncerramentoCorpo   string             `json:"emailEncerramentoCorpo,omitempty" bson:"emailEncerramentoCorpo,omitempty"`
	ColaboradorIDs           []primitive.ObjectID `json:"colaboradorIds,omitempty" bson:"colaboradorIds,omitempty"`
	PrevisaoChegadaData      string             `json:"previsaoChegadaData,omitempty" bson:"previsaoChegadaData,omitempty"`
	PrevisaoChegadaHora      string             `json:"previsaoChegadaHora,omitempty" bson:"previsaoChegadaHora,omitempty"`
	MissaoID                 primitive.ObjectID `json:"missaoId,omitempty" bson:"missaoId,omitempty"`
	EmailAutorizacaoAssunto  string             `json:"emailAutorizacaoAssunto,omitempty" bson:"emailAutorizacaoAssunto,omitempty"`
	EmailAutorizacaoCorpo    string             `json:"emailAutorizacaoCorpo,omitempty" bson:"emailAutorizacaoCorpo,omitempty"`
	CreatedAt                time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt                time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type Missao struct {
	ID             primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Titulo         string               `json:"titulo" bson:"titulo"`
	Status         MissaoStatus         `json:"status" bson:"status"`
	UnidadeID      primitive.ObjectID   `json:"unidadeId" bson:"unidadeId"`
	ChamadoID      primitive.ObjectID   `json:"chamadoId,omitempty" bson:"chamadoId,omitempty"`
	ColaboradorIDs []primitive.ObjectID `json:"colaboradorIds" bson:"colaboradorIds"`
	DataInicio     string               `json:"dataInicio,omitempty" bson:"dataInicio,omitempty"`
	HoraInicio     string               `json:"horaInicio,omitempty" bson:"horaInicio,omitempty"`
	ConcluidaPor   string               `json:"concluidaPor,omitempty" bson:"concluidaPor,omitempty"`
	DataConclusao  string               `json:"dataConclusao,omitempty" bson:"dataConclusao,omitempty"`
	HoraConclusao  string               `json:"horaConclusao,omitempty" bson:"horaConclusao,omitempty"`
	RelatorioConclusao string           `json:"relatorioConclusao,omitempty" bson:"relatorioConclusao,omitempty"`
	CreatedAt      time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt" bson:"updatedAt"`
}

// ModbusPonto representa um ponto de leitura Modbus por offset.
type ModbusPonto struct {
	Nome          string                `json:"nome" bson:"nome"`
	Offset        uint16                `json:"offset" bson:"offset"`
	Registro      string                `json:"registro,omitempty" bson:"registro,omitempty"`
	Unidade       string                `json:"unidade,omitempty" bson:"unidade,omitempty"`
	Multiplicador float64               `json:"multiplicador,omitempty" bson:"multiplicador,omitempty"`
	TipoDado      string                `json:"tipoDado,omitempty" bson:"tipoDado,omitempty"`
	EstadosMulti  []SnmpMultiEstadoItem `json:"estadosMulti,omitempty" bson:"estadosMulti,omitempty"`
	Descricao     string                `json:"descricao,omitempty" bson:"descricao,omitempty"`
	Desabilitado  bool                  `json:"desabilitado,omitempty" bson:"desabilitado,omitempty"`
}

type DispositivoConfig struct {
	SlaveID       byte          `json:"slaveId,omitempty" bson:"slaveId,omitempty"`
	Registradores []uint16      `json:"registradores,omitempty" bson:"registradores,omitempty"`
	PontosModbus  []ModbusPonto `json:"pontosModbus,omitempty" bson:"pontosModbus,omitempty"`
	Pontos        []SnmpPonto   `json:"pontos,omitempty" bson:"pontos,omitempty"`
	OIDs          []string      `json:"oids,omitempty" bson:"oids,omitempty"` // legado
	Community     string        `json:"community,omitempty" bson:"community,omitempty"`
}

// SnmpMultiEstadoItem mapeia valor OID → rótulo e cor de exibição.
type SnmpMultiEstadoItem struct {
	Chave    string `json:"chave" bson:"chave"`
	Exibicao string `json:"exibicao" bson:"exibicao"`
	Cor      string `json:"cor" bson:"cor"`
}

// SnmpPonto representa um ponto de dados SNMP (estilo data point SCADA).
type SnmpPonto struct {
	Nome          string                `json:"nome" bson:"nome"`
	OID           string                `json:"oid" bson:"oid"`
	Unidade       string                `json:"unidade,omitempty" bson:"unidade,omitempty"`
	Multiplicador float64               `json:"multiplicador,omitempty" bson:"multiplicador,omitempty"`
	TipoSnmp      string                `json:"tipoSnmp,omitempty" bson:"tipoSnmp,omitempty"`
	TipoDado      string                `json:"tipoDado,omitempty" bson:"tipoDado,omitempty"`
	EstadosMulti  []SnmpMultiEstadoItem `json:"estadosMulti,omitempty" bson:"estadosMulti,omitempty"`
	Descricao     string                `json:"descricao" bson:"descricao,omitempty"`
	Desabilitado  bool                  `json:"desabilitado,omitempty" bson:"desabilitado,omitempty"`
}

// Equipamento é o catálogo global (sem IP; vinculado à unidade via Unidade.Equipamentos).
type Equipamento struct {
	ID                primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Nome              string             `json:"nome" bson:"nome"`
	Marca             string             `json:"marca" bson:"marca"`
	TipoEquipamento   TipoEquipamento    `json:"tipoEquipamento" bson:"tipoEquipamento"`
	TipoSensor        string             `json:"tipoSensor,omitempty" bson:"tipoSensor,omitempty"`
	TipoMonitoramento DispositivoTipo    `json:"tipoMonitoramento" bson:"tipoMonitoramento"`
	Config            DispositivoConfig  `json:"config" bson:"config"`
	CreatedAt         time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt         time.Time          `json:"updatedAt" bson:"updatedAt"`
}

// Dispositivo mantido como alias de compatibilidade interna.
type Dispositivo = Equipamento

type EventoMonitoramento struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	DispositivoID primitive.ObjectID `json:"dispositivoId" bson:"dispositivoId"`
	Tipo         string             `json:"tipo" bson:"tipo"`
	Severidade   string             `json:"severidade" bson:"severidade"`
	Mensagem     string             `json:"mensagem" bson:"mensagem"`
	Dados        map[string]any     `json:"dados,omitempty" bson:"dados,omitempty"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt"`
}

type DeviceMetric struct {
	TargetID      string          `json:"targetId"`
	EquipamentoID string          `json:"equipamentoId"`
	UnidadeID     string          `json:"unidadeId"`
	Tipo          DispositivoTipo `json:"tipo"`
	Host          string          `json:"host"`
	Porta         int             `json:"porta,omitempty"`
	Online        bool            `json:"online"`
	LatenciaMs    float64         `json:"latenciaMs,omitempty"`
	Valores       map[string]any  `json:"valores,omitempty"`
	UpdatedAt     time.Time       `json:"updatedAt"`
	// DispositivoID legado para clientes antigos (igual a targetId).
	DispositivoID string `json:"dispositivoId"`
}

type DashboardSummary struct {
	MissoesEmAndamento int            `json:"missoesEmAndamento"`
	UltimosChamados    []Chamado      `json:"ultimosChamados"`
	Colaboradores      []Colaborador  `json:"colaboradores"`
	Metricas           []DeviceMetric `json:"metricas,omitempty"`
}
