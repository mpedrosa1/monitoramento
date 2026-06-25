package domain

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Tipos e operadores de alerta de equipamento.
const (
	AlertaTipoNumerico = "numerico"
	AlertaTipoEstado   = "estado"

	// Operadores numéricos.
	AlertaOpMaior      = "gt"    // valor > limite
	AlertaOpMenor      = "lt"    // valor < limite
	AlertaOpMaiorIgual = "gte"   // valor >= limite
	AlertaOpMenorIgual = "lte"   // valor <= limite
	AlertaOpFora       = "fora"  // valor < min OU valor > max
	AlertaOpEntre      = "entre" // min <= valor <= max

	// Operadores de estado.
	AlertaOpIgual     = "igual"
	AlertaOpDiferente = "diferente"
)

// AlertaEquipamento é a configuração (global, no servidor) de um alarme para um
// ponto de um equipamento numa unidade. O alvo é identificado por
// (UnidadeID, EquipamentoID, Porta) — o mesmo TargetID da coleta.
type AlertaEquipamento struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UnidadeID     primitive.ObjectID `json:"unidadeId" bson:"unidadeId"`
	EquipamentoID primitive.ObjectID `json:"equipamentoId" bson:"equipamentoId"`
	Porta         int                `json:"porta" bson:"porta"`

	// Snapshots para compor as mensagens sem novas consultas.
	UnidadeNome     string `json:"unidadeNome,omitempty" bson:"unidadeNome,omitempty"`
	EquipamentoNome string `json:"equipamentoNome,omitempty" bson:"equipamentoNome,omitempty"`
	PontoNome       string `json:"pontoNome" bson:"pontoNome"`
	PontoUnidade    string `json:"pontoUnidade,omitempty" bson:"pontoUnidade,omitempty"`

	Tipo     string `json:"tipo" bson:"tipo"`         // numerico | estado
	Operador string `json:"operador" bson:"operador"` // gt,lt,gte,lte,fora,entre | igual,diferente

	Valor  float64 `json:"valor,omitempty" bson:"valor,omitempty"`   // limiar (ou mínimo em fora/entre)
	Valor2 float64 `json:"valor2,omitempty" bson:"valor2,omitempty"` // máximo em fora/entre

	EstadoChave    string `json:"estadoChave,omitempty" bson:"estadoChave,omitempty"`
	EstadoExibicao string `json:"estadoExibicao,omitempty" bson:"estadoExibicao,omitempty"`

	Ativo     bool      `json:"ativo" bson:"ativo"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt"`
}

// TargetID identifica o alvo de coleta correspondente a este alerta.
func (a AlertaEquipamento) TargetID() string {
	return MonitorTargetID(a.UnidadeID, a.EquipamentoID, a.Porta)
}

// EmAlarme indica se a leitura atual satisfaz a condição do alerta.
// valorNum deve estar em unidade de engenharia (multiplicador já aplicado);
// temNum indica se há um número válido; valorTexto é a forma textual do valor.
func (a AlertaEquipamento) EmAlarme(valorNum float64, temNum bool, valorTexto string) bool {
	switch a.Tipo {
	case AlertaTipoNumerico:
		if !temNum {
			return false
		}
		switch a.Operador {
		case AlertaOpMaior:
			return valorNum > a.Valor
		case AlertaOpMenor:
			return valorNum < a.Valor
		case AlertaOpMaiorIgual:
			return valorNum >= a.Valor
		case AlertaOpMenorIgual:
			return valorNum <= a.Valor
		case AlertaOpFora:
			return valorNum < a.Valor || valorNum > a.Valor2
		case AlertaOpEntre:
			return valorNum >= a.Valor && valorNum <= a.Valor2
		}
		return false
	case AlertaTipoEstado:
		atual := strings.TrimSpace(valorTexto)
		alvo := strings.TrimSpace(a.EstadoChave)
		if a.Operador == AlertaOpDiferente {
			return atual != alvo
		}
		return atual == alvo
	}
	return false
}

func formatNumeroAlerta(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func (a AlertaEquipamento) unidadeSufixo() string {
	if a.PontoUnidade == "" {
		return ""
	}
	return a.PontoUnidade
}

// DescricaoCondicao gera um texto curto da condição (ex.: "> 45°C", "= Em falha").
func (a AlertaEquipamento) DescricaoCondicao() string {
	u := a.unidadeSufixo()
	switch a.Tipo {
	case AlertaTipoNumerico:
		switch a.Operador {
		case AlertaOpMaior:
			return fmt.Sprintf("> %s%s", formatNumeroAlerta(a.Valor), u)
		case AlertaOpMenor:
			return fmt.Sprintf("< %s%s", formatNumeroAlerta(a.Valor), u)
		case AlertaOpMaiorIgual:
			return fmt.Sprintf("≥ %s%s", formatNumeroAlerta(a.Valor), u)
		case AlertaOpMenorIgual:
			return fmt.Sprintf("≤ %s%s", formatNumeroAlerta(a.Valor), u)
		case AlertaOpFora:
			return fmt.Sprintf("fora de %s–%s%s", formatNumeroAlerta(a.Valor), formatNumeroAlerta(a.Valor2), u)
		case AlertaOpEntre:
			return fmt.Sprintf("entre %s–%s%s", formatNumeroAlerta(a.Valor), formatNumeroAlerta(a.Valor2), u)
		}
	case AlertaTipoEstado:
		rotulo := a.EstadoExibicao
		if rotulo == "" {
			rotulo = a.EstadoChave
		}
		if a.Operador == AlertaOpDiferente {
			return "≠ " + rotulo
		}
		return "= " + rotulo
	}
	return ""
}

// ValidarAlertaEquipamento normaliza e valida a configuração; retorna mensagem de
// erro (vazia quando válida).
func ValidarAlertaEquipamento(a *AlertaEquipamento) string {
	if a.UnidadeID.IsZero() || a.EquipamentoID.IsZero() {
		return "informe a unidade e o equipamento"
	}
	a.PontoNome = strings.TrimSpace(a.PontoNome)
	if a.PontoNome == "" {
		return "informe o ponto monitorado"
	}
	switch a.Tipo {
	case AlertaTipoNumerico:
		switch a.Operador {
		case AlertaOpMaior, AlertaOpMenor, AlertaOpMaiorIgual, AlertaOpMenorIgual:
		case AlertaOpFora, AlertaOpEntre:
			if a.Valor2 < a.Valor {
				return "o valor máximo não pode ser menor que o mínimo"
			}
		default:
			return "operador numérico inválido"
		}
	case AlertaTipoEstado:
		if a.Operador != AlertaOpIgual && a.Operador != AlertaOpDiferente {
			a.Operador = AlertaOpIgual
		}
		a.EstadoChave = strings.TrimSpace(a.EstadoChave)
		if a.EstadoChave == "" {
			return "informe o estado a ser monitorado"
		}
	default:
		return "tipo de alerta inválido"
	}
	return ""
}
