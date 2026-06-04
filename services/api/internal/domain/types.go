package domain

import (
	"time"

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
}

type TipoEquipamento string

const (
	TipoEquipamentoNobreak TipoEquipamento = "nobreak"
	TipoEquipamentoSensor  TipoEquipamento = "sensor"
)

type Unidade struct {
	ID           primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Nome         string               `json:"nome" bson:"nome"`
	Codigo       string               `json:"codigo" bson:"codigo"`
	Endereco     string               `json:"endereco" bson:"endereco"`
	IP           string               `json:"ip" bson:"ip"`
	IntervaloS   int                  `json:"intervaloS" bson:"intervaloS"`
	Equipamentos []UnidadeEquipamento `json:"equipamentos" bson:"equipamentos"`
	CreatedAt    time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time            `json:"updatedAt" bson:"updatedAt"`
}

type Colaborador struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Nome      string             `json:"nome" bson:"nome"`
	FotoURL   string             `json:"fotoUrl" bson:"fotoUrl"`
	Status    ColaboradorStatus  `json:"status" bson:"status"`
	UnidadeID primitive.ObjectID `json:"unidadeId" bson:"unidadeId"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type Chamado struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Titulo    string             `json:"titulo" bson:"titulo"`
	Descricao string             `json:"descricao" bson:"descricao"`
	Status    ChamadoStatus      `json:"status" bson:"status"`
	UnidadeID primitive.ObjectID `json:"unidadeId" bson:"unidadeId"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type Missao struct {
	ID              primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Titulo          string               `json:"titulo" bson:"titulo"`
	Status          MissaoStatus         `json:"status" bson:"status"`
	UnidadeID       primitive.ObjectID   `json:"unidadeId" bson:"unidadeId"`
	ColaboradorIDs  []primitive.ObjectID `json:"colaboradorIds" bson:"colaboradorIds"`
	CreatedAt       time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt       time.Time            `json:"updatedAt" bson:"updatedAt"`
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
