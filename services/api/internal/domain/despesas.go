package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ModalidadeDespesa string

const (
	DespesaMobilidade ModalidadeDespesa = "mobilidade"
	DespesaLivre      ModalidadeDespesa = "livre"
)

type CategoriaDespesa string

const (
	CategoriaCombustivel     CategoriaDespesa = "combustivel"
	CategoriaTransporteApp   CategoriaDespesa = "transporte_app"
	CategoriaFerramentas     CategoriaDespesa = "ferramentas"
	CategoriaMateriais       CategoriaDespesa = "materiais"
	CategoriaConsumiveis     CategoriaDespesa = "consumiveis"
)

type AppTransporte string

const (
	AppTransporteUber    AppTransporte = "uber"
	AppTransporte99      AppTransporte = "99"
	AppTransporteIndrive AppTransporte = "indrive"
	AppTransporteOutro   AppTransporte = "outro"
)

func AppTransporteValido(a AppTransporte) bool {
	switch a {
	case AppTransporteUber, AppTransporte99, AppTransporteIndrive, AppTransporteOutro:
		return true
	default:
		return false
	}
}

func CategoriaValidaParaModalidade(m ModalidadeDespesa, c CategoriaDespesa) bool {
	switch m {
	case DespesaMobilidade:
		return c == CategoriaCombustivel || c == CategoriaTransporteApp
	case DespesaLivre:
		return c == CategoriaFerramentas || c == CategoriaMateriais || c == CategoriaConsumiveis
	default:
		return false
	}
}

// Despesa é um gasto registrado pelo colaborador (verba mobilidade ou livre).
type Despesa struct {
	ID             primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	ColaboradorID  primitive.ObjectID  `json:"colaboradorId" bson:"colaboradorId"`
	Modalidade     ModalidadeDespesa   `json:"modalidade" bson:"modalidade"`
	Categoria      CategoriaDespesa    `json:"categoria" bson:"categoria"`
	Valor          float64             `json:"valor" bson:"valor"`
	Data           string              `json:"data" bson:"data"` // yyyy-mm-dd
	Competencia    string              `json:"competencia" bson:"competencia"` // yyyy-mm
	Descricao      string              `json:"descricao,omitempty" bson:"descricao,omitempty"`
	ComprovanteURL string              `json:"comprovanteUrl,omitempty" bson:"comprovanteUrl,omitempty"`
	// Campos adicionais para categoria combustível.
	Hora           string              `json:"hora,omitempty" bson:"hora,omitempty"` // HH:mm
	VeiculoID      *primitive.ObjectID `json:"veiculoId,omitempty" bson:"veiculoId,omitempty"`
	VeiculoPessoal bool                `json:"veiculoPessoal,omitempty" bson:"veiculoPessoal,omitempty"`
	Placa          string              `json:"placa,omitempty" bson:"placa,omitempty"`
	Hodometro          int                 `json:"hodometro,omitempty" bson:"hodometro,omitempty"`
	// Campos adicionais para transporte por aplicativo.
	AppTransporte      AppTransporte       `json:"appTransporte,omitempty" bson:"appTransporte,omitempty"`
	AppTransporteOutro string              `json:"appTransporteOutro,omitempty" bson:"appTransporteOutro,omitempty"`
	CreatedAt          time.Time           `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time           `json:"updatedAt" bson:"updatedAt"`
}

// DepositoDespesa é o crédito mensal da empresa por modalidade.
type DepositoDespesa struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ColaboradorID primitive.ObjectID `json:"colaboradorId" bson:"colaboradorId"`
	Competencia   string             `json:"competencia" bson:"competencia"` // yyyy-mm
	Modalidade    ModalidadeDespesa  `json:"modalidade" bson:"modalidade"`
	Valor         float64            `json:"valor" bson:"valor"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}

// AjusteSaldoDespesa redefine o saldo a partir de um momento; movimentações anteriores
// deixam de compor o acumulado e só entram recargas/despesas posteriores ao ajuste.
type AjusteSaldoDespesa struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ColaboradorID primitive.ObjectID `json:"colaboradorId" bson:"colaboradorId"`
	Competencia   string             `json:"competencia" bson:"competencia"` // yyyy-mm
	Modalidade    ModalidadeDespesa  `json:"modalidade" bson:"modalidade"`
	Saldo         float64            `json:"saldo" bson:"saldo"`
	AjustadoEm    time.Time          `json:"ajustadoEm" bson:"ajustadoEm"`
	AjustadoPor   string             `json:"ajustadoPor,omitempty" bson:"ajustadoPor,omitempty"`
	Observacao    string             `json:"observacao,omitempty" bson:"observacao,omitempty"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}
