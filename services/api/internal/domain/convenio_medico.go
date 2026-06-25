package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FaixaConvenioMedico representa uma faixa etária da tabela do convênio médico,
// com a mensalidade cheia (Valor) e a parcela descontada na folha (DescontoFolha,
// que para os dependentes corresponde a 25% do valor).
//
// IdadeMax <= 0 indica faixa sem limite superior (ex.: "59+").
type FaixaConvenioMedico struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	IdadeMin      int                `json:"idadeMin" bson:"idadeMin"`
	IdadeMax      int                `json:"idadeMax" bson:"idadeMax"`
	Valor         float64            `json:"valor" bson:"valor"`
	DescontoFolha float64            `json:"descontoFolha" bson:"descontoFolha"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}

// FaixasConvenioMedicoPadrao retorna a tabela UNIMED informada inicialmente.
// Usada para popular o banco quando ainda não há faixas cadastradas. As faixas
// 24–28 e 59+ não foram fornecidas e devem ser cadastradas pelo administrador.
func FaixasConvenioMedicoPadrao() []FaixaConvenioMedico {
	return []FaixaConvenioMedico{
		{IdadeMin: 0, IdadeMax: 18, Valor: 345.40, DescontoFolha: 86.35},
		{IdadeMin: 19, IdadeMax: 23, Valor: 406.99, DescontoFolha: 101.75},
		{IdadeMin: 29, IdadeMax: 33, Valor: 507.85, DescontoFolha: 126.96},
		{IdadeMin: 34, IdadeMax: 38, Valor: 536.86, DescontoFolha: 134.22},
		{IdadeMin: 39, IdadeMax: 43, Valor: 618.97, DescontoFolha: 154.74},
		{IdadeMin: 44, IdadeMax: 48, Valor: 845.97, DescontoFolha: 211.49},
		{IdadeMin: 49, IdadeMax: 53, Valor: 1168.53, DescontoFolha: 292.13},
		{IdadeMin: 54, IdadeMax: 58, Valor: 1535.04, DescontoFolha: 383.76},
	}
}
