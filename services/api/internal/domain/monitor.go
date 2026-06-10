package domain

import (
	"fmt"
	"reflect"
	"strconv"

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

// MonitorTargetEqual indica se dois alvos devem usar a mesma goroutine de coleta.
func MonitorTargetEqual(a, b MonitorTarget) bool {
	return a.Host == b.Host &&
		a.Porta == b.Porta &&
		a.IntervaloS == b.IntervaloS &&
		a.Tipo == b.Tipo &&
		reflect.DeepEqual(a.Config, b.Config)
}

func MonitorTargetID(unidadeID, equipamentoID primitive.ObjectID, porta int) string {
	return unidadeID.Hex() + ":" + equipamentoID.Hex() + ":" + strconv.Itoa(porta)
}

// MonitorUnidadeHostTargetID identifica o ping ICMP do IP cadastrado na unidade.
func MonitorUnidadeHostTargetID(unidadeID primitive.ObjectID) string {
	return unidadeID.Hex() + ":host"
}
