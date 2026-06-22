package domain

import (
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CondutorRotaExataDivergenciaStatus string

const (
	CondutorDivergenciaPendente CondutorRotaExataDivergenciaStatus = "pendente"
	CondutorDivergenciaAprovada CondutorRotaExataDivergenciaStatus = "aprovada"
	CondutorDivergenciaRecusada CondutorRotaExataDivergenciaStatus = "recusada"
)

type CondutorRotaExataDivergencia struct {
	ID                        primitive.ObjectID                 `json:"id" bson:"_id,omitempty"`
	VeiculoID                 primitive.ObjectID                 `json:"veiculoId" bson:"veiculoId"`
	MotoristaAtualID          primitive.ObjectID                 `json:"motoristaAtualId" bson:"motoristaAtualId"`
	MotoristaSugeridoID       *primitive.ObjectID                `json:"motoristaSugeridoId,omitempty" bson:"motoristaSugeridoId,omitempty"`
	RotaExataMotoristaID      int                                `json:"rotaExataMotoristaId" bson:"rotaExataMotoristaId"`
	RotaExataMotoristaNome    string                             `json:"rotaExataMotoristaNome" bson:"rotaExataMotoristaNome"`
	RotaExataMotoristaEmail   string                             `json:"rotaExataMotoristaEmail,omitempty" bson:"rotaExataMotoristaEmail,omitempty"`
	RotaExataMotoristaCPF     string                             `json:"rotaExataMotoristaCpf,omitempty" bson:"rotaExataMotoristaCpf,omitempty"`
	RotaExataMotoristaCNH     string                             `json:"rotaExataMotoristaCnh,omitempty" bson:"rotaExataMotoristaCnh,omitempty"`
	Status                    CondutorRotaExataDivergenciaStatus `json:"status" bson:"status"`
	DetectadoEm               time.Time                          `json:"detectadoEm" bson:"detectadoEm"`
	CreatedAt                 time.Time                          `json:"createdAt" bson:"createdAt"`
	UpdatedAt                 time.Time                          `json:"updatedAt" bson:"updatedAt"`
	ResolvidoEm               *time.Time                         `json:"resolvidoEm,omitempty" bson:"resolvidoEm,omitempty"`
	ResolvidoPorColaboradorID *primitive.ObjectID                `json:"resolvidoPorColaboradorId,omitempty" bson:"resolvidoPorColaboradorId,omitempty"`
}

type RotaExataMotoristaRef struct {
	ID    int
	Nome  string
	Email string
	CPF   string
	CNH   string
}

func NormalizeDocumento(s string) string {
	var b strings.Builder
	for _, r := range strings.TrimSpace(s) {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func normalizeEmail(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func MatchColaboradorPorMotoristaRotaExata(
	m RotaExataMotoristaRef,
	colaboradores []Colaborador,
) *Colaborador {
	if m.ID <= 0 && strings.TrimSpace(m.Nome) == "" &&
		strings.TrimSpace(m.Email) == "" &&
		NormalizeDocumento(m.CPF) == "" &&
		NormalizeDocumento(m.CNH) == "" {
		return nil
	}

	if m.ID > 0 {
		for i := range colaboradores {
			c := &colaboradores[i]
			if c.RotaExataMotoristaID != nil && *c.RotaExataMotoristaID == m.ID {
				return c
			}
		}
	}

	cpfRX := NormalizeDocumento(m.CPF)
	if cpfRX != "" {
		for i := range colaboradores {
			c := &colaboradores[i]
			if NormalizeDocumento(c.CPF) == cpfRX {
				return c
			}
		}
	}

	cnhRX := NormalizeDocumento(m.CNH)
	if cnhRX != "" {
		for i := range colaboradores {
			c := &colaboradores[i]
			if NormalizeDocumento(c.CNH) == cnhRX {
				return c
			}
		}
	}

	emailRX := normalizeEmail(m.Email)
	if emailRX != "" {
		for i := range colaboradores {
			c := &colaboradores[i]
			if normalizeEmail(c.EmailCorporativo) == emailRX ||
				normalizeEmail(c.Email) == emailRX {
				return c
			}
		}
	}

	return nil
}
