package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// EscalaTrabalho representa uma escala de trabalho baseada em turnos fixos
// (ex.: 12x36, 24x48, 5x2) que pode ser atribuída a colaboradores.
type EscalaTrabalho struct {
	ID             primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Nome           string               `json:"nome" bson:"nome"`
	Tipo           string               `json:"tipo" bson:"tipo"`
	HoraInicio     string               `json:"horaInicio,omitempty" bson:"horaInicio,omitempty"`
	HoraFim        string               `json:"horaFim,omitempty" bson:"horaFim,omitempty"`
	Cor            string               `json:"cor,omitempty" bson:"cor,omitempty"`
	Observacao     string               `json:"observacao,omitempty" bson:"observacao,omitempty"`
	ColaboradorIDs []primitive.ObjectID `json:"colaboradorIds" bson:"colaboradorIds"`
	Ativo          bool                 `json:"ativo" bson:"ativo"`
	CreatedAt      time.Time            `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt" bson:"updatedAt"`
}

// EscalaSobreavisoDefinida registra que o calendário de sobreaviso de um mês
// (competência "yyyy-mm") foi oficialmente definido/publicado.
type EscalaSobreavisoDefinida struct {
	ID               primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Competencia      string             `json:"competencia" bson:"competencia"`
	DefinidaPor      string             `json:"definidaPor,omitempty" bson:"definidaPor,omitempty"`
	TotalNotificados int                `json:"totalNotificados" bson:"totalNotificados"`
	DefinidaEm       time.Time          `json:"definidaEm" bson:"definidaEm"`
}

// Sobreaviso representa um período em que um colaborador fica de sobreaviso
// (on-call), exibido no calendário de sobreaviso.
type Sobreaviso struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	ColaboradorID primitive.ObjectID  `json:"colaboradorId" bson:"colaboradorId"`
	EscalaID      *primitive.ObjectID `json:"escalaId,omitempty" bson:"escalaId,omitempty"`
	DataInicio    string              `json:"dataInicio" bson:"dataInicio"`
	HoraInicio    string              `json:"horaInicio,omitempty" bson:"horaInicio,omitempty"`
	DataFim       string              `json:"dataFim" bson:"dataFim"`
	HoraFim       string              `json:"horaFim,omitempty" bson:"horaFim,omitempty"`
	Observacao    string              `json:"observacao,omitempty" bson:"observacao,omitempty"`
	CreatedAt     time.Time           `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time           `json:"updatedAt" bson:"updatedAt"`
}
