package modbus

import (
	"context"
	"fmt"
	"time"

	"github.com/goburrow/modbus"
	"github.com/mmrtec/monitoramento/api/internal/domain"
)

func Probe(ctx context.Context, t domain.MonitorTarget) (online bool, valores map[string]any) {
	port := t.Porta
	if port == 0 {
		port = 502
	}
	handler := modbus.NewTCPClientHandler(fmt.Sprintf("%s:%d", t.Host, port))
	handler.Timeout = 3 * time.Second
	handler.SlaveId = t.Config.SlaveID
	if handler.SlaveId == 0 {
		handler.SlaveId = 1
	}

	if err := handler.Connect(); err != nil {
		return false, map[string]any{"erro": err.Error()}
	}
	defer handler.Close()

	client := modbus.NewClient(handler)
	valores = make(map[string]any)
	regs := t.Config.Registradores
	if len(regs) == 0 {
		regs = []uint16{0}
	}

	for _, reg := range regs {
		select {
		case <-ctx.Done():
			return false, valores
		default:
		}
		results, err := client.ReadHoldingRegisters(reg, 1)
		if err != nil {
			valores[fmt.Sprintf("reg_%d", reg)] = err.Error()
			continue
		}
		if len(results) >= 2 {
			val := uint16(results[0])<<8 | uint16(results[1])
			valores[fmt.Sprintf("reg_%d", reg)] = val
		}
	}
	return true, valores
}

func MetricFromTarget(t domain.MonitorTarget, online bool, valores map[string]any) domain.DeviceMetric {
	return domain.DeviceMetric{
		TargetID:      t.TargetID,
		EquipamentoID: t.EquipamentoID.Hex(),
		UnidadeID:     t.UnidadeID.Hex(),
		Tipo:          t.Tipo,
		Host:          t.Host,
		Porta:         t.Porta,
		Online:        online,
		Valores:       valores,
		UpdatedAt:     time.Now().UTC(),
		DispositivoID: t.TargetID,
	}
}
