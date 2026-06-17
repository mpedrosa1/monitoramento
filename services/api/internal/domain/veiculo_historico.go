package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VeiculoMultaStatus string

const (
	VeiculoMultaStatusPendente VeiculoMultaStatus = "pendente"
	VeiculoMultaStatusPaga     VeiculoMultaStatus = "paga"
)

// VeiculoPeriodoMotorista registra quem foi motorista do veículo em um intervalo.
type VeiculoPeriodoMotorista struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	VeiculoID     primitive.ObjectID `json:"veiculoId" bson:"veiculoId"`
	ColaboradorID primitive.ObjectID `json:"colaboradorId" bson:"colaboradorId"`
	DataInicio    string             `json:"dataInicio" bson:"dataInicio"`
	HoraInicio    string             `json:"horaInicio,omitempty" bson:"horaInicio,omitempty"`
	DataFim       string             `json:"dataFim,omitempty" bson:"dataFim,omitempty"`
	HoraFim       string             `json:"horaFim,omitempty" bson:"horaFim,omitempty"`
	Observacao    string             `json:"observacao,omitempty" bson:"observacao,omitempty"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}

// VeiculoMulta registra multa de trânsito vinculada ao veículo.
type VeiculoMulta struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	VeiculoID     primitive.ObjectID `json:"veiculoId" bson:"veiculoId"`
	ColaboradorID primitive.ObjectID `json:"colaboradorId,omitempty" bson:"colaboradorId,omitempty"`
	Data          string             `json:"data" bson:"data"`
	Infracao      string             `json:"infracao" bson:"infracao"`
	Valor         float64            `json:"valor,omitempty" bson:"valor,omitempty"`
	Status        VeiculoMultaStatus `json:"status" bson:"status"`
	Observacao    string             `json:"observacao,omitempty" bson:"observacao,omitempty"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}

func DataHojeISO() string {
	return agoraBrasil().Format("2006-01-02")
}

func HoraAgoraISO() string {
	return agoraBrasil().Format("15:04")
}

func agoraBrasil() time.Time {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.FixedZone("BRT", -3*60*60)
	}
	return time.Now().In(loc)
}
