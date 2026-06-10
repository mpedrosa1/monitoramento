package domain

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"

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

// MonitorModbusEndpointKey agrupa alvos que compartilham o mesmo gateway Modbus TCP.
func MonitorModbusEndpointKey(t MonitorTarget) string {
	port := t.Porta
	if port <= 0 {
		port = 502
	}
	slave := t.Config.SlaveID
	if slave == 0 {
		slave = 1
	}
	return fmt.Sprintf("%s:%s:%d:%d", t.UnidadeID.Hex(), strings.TrimSpace(t.Host), port, slave)
}

// ModbusTargetGroupEqual compara grupos de alvos Modbus no mesmo endpoint.
func ModbusTargetGroupEqual(a, b []MonitorTarget) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].TargetID != b[i].TargetID {
			return false
		}
		if !MonitorTargetEqual(a[i], b[i]) {
			return false
		}
	}
	return true
}
