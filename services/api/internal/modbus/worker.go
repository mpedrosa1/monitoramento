package modbus

import (
	"context"
	"encoding/binary"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/goburrow/modbus"
	"github.com/mmrtec/monitoramento/api/internal/domain"
)

var (
	requestTimeout = 8 * time.Second
	readDelay      = 50 * time.Millisecond
	endpointLocks  sync.Map
)

// Configure ajusta timeout e intervalo entre leituras Modbus.
func Configure(timeout time.Duration, delay time.Duration) {
	if timeout > 0 {
		requestTimeout = timeout
	}
	if delay >= 0 {
		readDelay = delay
	}
}

type TargetProbeResult struct {
	Target  domain.MonitorTarget
	Online  bool
	Valores map[string]any
}

func Probe(ctx context.Context, t domain.MonitorTarget) (online bool, valores map[string]any) {
	res := ProbeEndpoint(ctx, []domain.MonitorTarget{t})
	if len(res) == 0 {
		return false, map[string]any{"erro": "alvo modbus inválido"}
	}
	return res[0].Online, res[0].Valores
}

// ProbeEndpoint lê todos os alvos de um mesmo gateway Modbus em uma única sessão TCP.
func ProbeEndpoint(ctx context.Context, targets []domain.MonitorTarget) []TargetProbeResult {
	if len(targets) == 0 {
		return nil
	}

	ref := targets[0]
	port := ref.Porta
	if port == 0 {
		port = 502
	}
	slave := ref.Config.SlaveID
	if slave == 0 {
		slave = 1
	}

	results := make([]TargetProbeResult, len(targets))
	for i, t := range targets {
		results[i] = TargetProbeResult{
			Target:  t,
			Valores: map[string]any{},
		}
	}

	unlock := lockEndpoint(ref.Host, uint16(port), slave)
	defer unlock()

	handler := newHandler(ref.Host, uint16(port), slave)
	if err := handler.Connect(); err != nil {
		errMsg := err.Error()
		for i := range results {
			results[i].Online = false
			results[i].Valores = map[string]any{"erro": errMsg}
		}
		return results
	}
	defer handler.Close()

	client := modbus.NewClient(handler)
	for i, t := range targets {
		select {
		case <-ctx.Done():
			return results
		default:
		}
		results[i].Valores = readTargetPontos(ctx, client, t)
		results[i].Online = true
	}

	return results
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

func lockEndpoint(host string, port uint16, slave byte) func() {
	key := fmt.Sprintf("%s:%d:%d", strings.TrimSpace(host), port, slave)
	v, _ := endpointLocks.LoadOrStore(key, &sync.Mutex{})
	mu := v.(*sync.Mutex)
	mu.Lock()
	return mu.Unlock
}

func newHandler(host string, port uint16, slave byte) *modbus.TCPClientHandler {
	handler := modbus.NewTCPClientHandler(fmt.Sprintf("%s:%d", strings.TrimSpace(host), port))
	handler.Timeout = requestTimeout
	handler.SlaveId = slave
	return handler
}

func readTargetPontos(ctx context.Context, client modbus.Client, t domain.MonitorTarget) map[string]any {
	valores := make(map[string]any)

	pontos := t.Config.PontosModbus
	if len(pontos) > 0 {
		for _, p := range pontos {
			if p.Desabilitado {
				continue
			}
			select {
			case <-ctx.Done():
				return valores
			default:
			}
			key := modbusPontoKey(p)
			val, err := readModbusPoint(client, p)
			if err != nil {
				msg := err.Error()
				valores[key] = msg
				valores[fmt.Sprintf("reg_%d", p.Offset)] = msg
			} else {
				valores[key] = val
				valores[fmt.Sprintf("reg_%d", p.Offset)] = val
			}
			sleepReadDelay()
		}
		return valores
	}

	regs := t.Config.Registradores
	if len(regs) == 0 {
		regs = []uint16{0}
	}

	for _, reg := range regs {
		select {
		case <-ctx.Done():
			return valores
		default:
		}
		results, err := client.ReadHoldingRegisters(reg, 1)
		if err != nil {
			valores[fmt.Sprintf("reg_%d", reg)] = err.Error()
		} else if len(results) >= 2 {
			val := uint16(results[0])<<8 | uint16(results[1])
			valores[fmt.Sprintf("reg_%d", reg)] = val
		}
		sleepReadDelay()
	}
	return valores
}

func sleepReadDelay() {
	if readDelay <= 0 {
		return
	}
	time.Sleep(readDelay)
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

	unlock := lockEndpoint(host, port, slaveID)
	defer unlock()

	handler := newHandler(host, port, slaveID)
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
