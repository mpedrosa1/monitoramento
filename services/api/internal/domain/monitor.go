package domain

import (
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MonitorTarget é o alvo resolvido para coleta: IP da unidade + porta da atribuição.
type MonitorTarget struct {
	TargetID      string
	EquipamentoID primitive.ObjectID
	UnidadeID     primitive.ObjectID
	Nome          string
	Tipo          DispositivoTipo
	Host          string
	Porta         int
	IntervaloS    int
	Config        DispositivoConfig
}

func (t MonitorTarget) Endpoint() string {
	if t.Porta > 0 && t.Tipo != DispositivoPing {
		return fmt.Sprintf("%s:%d", t.Host, t.Porta)
	}
	return t.Host
}

func MonitorTargetID(unidadeID, equipamentoID primitive.ObjectID) string {
	return unidadeID.Hex() + ":" + equipamentoID.Hex()
}
