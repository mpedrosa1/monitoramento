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
	Dependentes         []ColaboradorDependente `json:"dependentes,omitempty" bson:"dependentes,omitempty"`
	Endereco            UnidadeEndereco      `json:"endereco,omitempty" bson:"endereco,omitempty"`
	Cargo               string               `json:"cargo,omitempty" bson:"cargo,omitempty"`
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
	CreatedAt      time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt" bson:"updatedAt"`
}

type DispositivoConfig struct {
	SlaveID       byte        `json:"slaveId,omitempty" bson:"slaveId,omitempty"`
	Registradores []uint16    `json:"registradores,omitempty" bson:"registradores,omitempty"`
	Pontos        []SnmpPonto `json:"pontos,omitempty" bson:"pontos,omitempty"`
	OIDs          []string    `json:"oids,omitempty" bson:"oids,omitempty"` // legado
	Community     string      `json:"community,omitempty" bson:"community,omitempty"`
}

// SnmpPonto representa um ponto de dados SNMP (estilo data point SCADA).
type SnmpPonto struct {
	Nome         string `json:"nome" bson:"nome"`
	OID          string `json:"oid" bson:"oid"`
	Unidade       string  `json:"unidade,omitempty" bson:"unidade,omitempty"`
	Multiplicador float64 `json:"multiplicador,omitempty" bson:"multiplicador,omitempty"`
	TipoDado      string  `json:"tipoDado,omitempty" bson:"tipoDado,omitempty"`
	Descricao    string `json:"descricao,omitempty" bson:"descricao,omitempty"`
	Desabilitado bool   `json:"desabilitado,omitempty" bson:"desabilitado,omitempty"`
}

// Equipamento é o catálogo global (sem IP; vinculado à unidade via Unidade.Equipamentos).
type Equipamento struct {
	ID                primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Nome              string             `json:"nome" bson:"nome"`
	Marca             string             `json:"marca" bson:"marca"`
	TipoEquipamento   TipoEquipamento    `json:"tipoEquipamento" bson:"tipoEquipamento"`
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
