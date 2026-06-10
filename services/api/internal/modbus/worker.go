package modbus

import (
	"context"
	"encoding/binary"
	"fmt"
	"math"
	"strings"
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

	pontos := t.Config.PontosModbus
	if len(pontos) > 0 {
		for _, p := range pontos {
			if p.Desabilitado {
				continue
			}
			select {
			case <-ctx.Done():
				return false, valores
			default:
			}
			key := modbusPontoKey(p)
			val, err := readModbusPoint(client, p)
			if err != nil {
				msg := err.Error()
				valores[key] = msg
				valores[fmt.Sprintf("reg_%d", p.Offset)] = msg
				continue
			}
			valores[key] = val
			valores[fmt.Sprintf("reg_%d", p.Offset)] = val
		}
		return true, valores
	}

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

func modbusPontoKey(p domain.ModbusPonto) string {
	key := strings.TrimSpace(p.Nome)
	if key == "" {
		return fmt.Sprintf("offset_%d", p.Offset)
	}
	return key
}

func readModbusPoint(client modbus.Client, p domain.ModbusPonto) (any, error) {
	registro := strings.TrimSpace(p.Registro)
	if registro == "" {
		registro = "holding_register"
	}
	tipoDado := strings.TrimSpace(p.TipoDado)

	switch registro {
	case "coil_status":
		results, err := client.ReadCoils(p.Offset, 1)
		if err != nil {
			return nil, err
		}
		if len(results) == 0 {
			return nil, fmt.Errorf("resposta vazia do dispositivo")
		}
		return results[0] == 1, nil
	case "input_status":
		results, err := client.ReadDiscreteInputs(p.Offset, 1)
		if err != nil {
			return nil, err
		}
		if len(results) == 0 {
			return nil, fmt.Errorf("resposta vazia do dispositivo")
		}
		return results[0] == 1, nil
	case "input_register":
		qty := registerQuantity(tipoDado)
		results, err := client.ReadInputRegisters(p.Offset, qty)
		if err != nil {
			return nil, err
		}
		val := decodeRegisterValue(tipoDado, results)
		if val == nil {
			return nil, fmt.Errorf("resposta vazia do dispositivo")
		}
		return val, nil
	default:
		qty := registerQuantity(tipoDado)
		results, err := client.ReadHoldingRegisters(p.Offset, qty)
		if err != nil {
			return nil, err
		}
		val := decodeRegisterValue(tipoDado, results)
		if val == nil {
			return nil, fmt.Errorf("resposta vazia do dispositivo")
		}
		return val, nil
	}
}

func registerQuantity(tipoDado string) uint16 {
	switch strings.TrimSpace(tipoDado) {
	case "uint32", "int32", "uint32_swapped", "int32_swapped", "float32", "float32_swapped", "float32_swapped_inverted", "bcd32":
		return 2
	case "uint64", "int64", "uint64_swapped", "int64_swapped", "float64", "float64_swapped":
		return 4
	default:
		return 1
	}
}

func decodeRegisterValue(tipoDado string, results []byte) any {
	if len(results) < 2 {
		return nil
	}
	tipo := strings.TrimSpace(tipoDado)
	if tipo == "" {
		tipo = "uint16"
	}

	switch tipo {
	case "binary":
		return uint16(results[0])<<8 | uint16(results[1])
	case "uint16":
		return uint16(results[0])<<8 | uint16(results[1])
	case "int16":
		return int16(uint16(results[0])<<8 | uint16(results[1]))
	case "bcd16":
		return uint16(results[0])<<8 | uint16(results[1])
	case "uint32":
		if len(results) < 4 {
			return nil
		}
		return binary.BigEndian.Uint32(results[:4])
	case "int32":
		if len(results) < 4 {
			return nil
		}
		return int32(binary.BigEndian.Uint32(results[:4]))
	case "uint32_swapped":
		if len(results) < 4 {
			return nil
		}
		return binary.BigEndian.Uint32([]byte{results[2], results[3], results[0], results[1]})
	case "int32_swapped":
		if len(results) < 4 {
			return nil
		}
		return int32(binary.BigEndian.Uint32([]byte{results[2], results[3], results[0], results[1]}))
	case "float32":
		if len(results) < 4 {
			return nil
		}
		return math.Float32frombits(binary.BigEndian.Uint32(results[:4]))
	case "float32_swapped":
		if len(results) < 4 {
			return nil
		}
		return math.Float32frombits(binary.BigEndian.Uint32([]byte{results[2], results[3], results[0], results[1]}))
	case "float32_swapped_inverted":
		if len(results) < 4 {
			return nil
		}
		return math.Float32frombits(binary.BigEndian.Uint32([]byte{results[3], results[2], results[1], results[0]}))
	case "bcd32":
		if len(results) < 4 {
			return nil
		}
		return binary.BigEndian.Uint32(results[:4])
	case "uint64":
		if len(results) < 8 {
			return nil
		}
		return binary.BigEndian.Uint64(results[:8])
	case "int64":
		if len(results) < 8 {
			return nil
		}
		return int64(binary.BigEndian.Uint64(results[:8]))
	case "uint64_swapped":
		if len(results) < 8 {
			return nil
		}
		swapped := make([]byte, 8)
		for i := 0; i < 8; i += 2 {
			swapped[i], swapped[i+1] = results[i+1], results[i]
		}
		return binary.BigEndian.Uint64(swapped)
	case "int64_swapped":
		if len(results) < 8 {
			return nil
		}
		swapped := make([]byte, 8)
		for i := 0; i < 8; i += 2 {
			swapped[i], swapped[i+1] = results[i+1], results[i]
		}
		return int64(binary.BigEndian.Uint64(swapped))
	case "float64":
		if len(results) < 8 {
			return nil
		}
		return math.Float64frombits(binary.BigEndian.Uint64(results[:8]))
	case "float64_swapped":
		if len(results) < 8 {
			return nil
		}
		swapped := make([]byte, 8)
		for i := 0; i < 8; i += 2 {
			swapped[i], swapped[i+1] = results[i+1], results[i]
		}
		return math.Float64frombits(binary.BigEndian.Uint64(swapped))
	case "string_fixed", "string_variable":
		return strings.TrimRight(string(results), "\x00")
	default:
		return uint16(results[0])<<8 | uint16(results[1])
	}
}

// TestOffset consulta um offset Modbus e devolve o valor lido.
func TestOffset(host string, port uint16, slaveID byte, registro string, offset uint16, tipoDado string) (online bool, value any, errMsg string) {
	if strings.TrimSpace(host) == "" {
		return false, nil, "informe o host (IP)"
	}
	if port == 0 {
		port = 502
	}
	if slaveID == 0 {
		slaveID = 1
	}
	registro = strings.TrimSpace(registro)
	if registro == "" {
		registro = "holding_register"
	}

	handler := modbus.NewTCPClientHandler(fmt.Sprintf("%s:%d", strings.TrimSpace(host), port))
	handler.Timeout = 5 * time.Second
	handler.SlaveId = slaveID

	if err := handler.Connect(); err != nil {
		return false, nil, err.Error()
	}
	defer handler.Close()

	client := modbus.NewClient(handler)

	val, err := readModbusPoint(client, domain.ModbusPonto{
		Offset:   offset,
		Registro: registro,
		TipoDado: tipoDado,
	})
	if err != nil {
		if err.Error() == "resposta vazia do dispositivo" {
			return true, nil, err.Error()
		}
		return false, nil, err.Error()
	}
	return true, val, ""
}
