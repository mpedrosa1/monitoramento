package modbus

import (
	"context"
	"encoding/binary"
	"errors"
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

	session := newModbusSession(ref.Host, uint16(port), slave)
	if err := session.connect(); err != nil {
		errMsg := err.Error()
		for i := range results {
			results[i].Online = false
			results[i].Valores = map[string]any{"erro": errMsg}
		}
		return results
	}
	defer session.close()

	for i, t := range targets {
		select {
		case <-ctx.Done():
			return results
		default:
		}
		results[i].Valores = readTargetPontos(ctx, session, t)
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
	handler.IdleTimeout = 0
	handler.SlaveId = slave
	return handler
}

type modbusSession struct {
	host    string
	port    uint16
	slave   byte
	handler *modbus.TCPClientHandler
	client  modbus.Client
}

func newModbusSession(host string, port uint16, slave byte) *modbusSession {
	return &modbusSession{host: strings.TrimSpace(host), port: port, slave: slave}
}

func (s *modbusSession) connect() error {
	s.close()
	s.handler = newHandler(s.host, s.port, s.slave)
	if err := s.handler.Connect(); err != nil {
		return err
	}
	s.client = modbus.NewClient(s.handler)
	return nil
}

func (s *modbusSession) close() {
	if s.handler != nil {
		_ = s.handler.Close()
		s.handler = nil
		s.client = nil
	}
}

func (s *modbusSession) reconnect() error {
	return s.connect()
}

func readTargetPontos(ctx context.Context, session *modbusSession, t domain.MonitorTarget) map[string]any {
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
			val, err := session.readPoint(p)
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
		results, err := session.client.ReadHoldingRegisters(reg, 1)
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

func normalizeModbusRegistro(registro string) string {
	switch strings.ToLower(strings.TrimSpace(registro)) {
	case "", "holding_register", "holding register", "holding":
		return "holding_register"
	case "input_register", "input register", "input":
		return "input_register"
	case "coil_status", "coil status", "coil", "coils":
		return "coil_status"
	case "input_status", "input status", "discrete_input", "discrete input", "discrete":
		return "input_status"
	default:
		return strings.TrimSpace(registro)
	}
}

func (s *modbusSession) readPoint(p domain.ModbusPonto) (any, error) {
	registro := normalizeModbusRegistro(p.Registro)

	val, err := readModbusPointNative(s.client, p, registro)
	if err != nil && isRetryableModbusError(err) {
		if reconErr := s.reconnect(); reconErr == nil {
			val, err = readModbusPointNative(s.client, p, registro)
		}
	}
	if err == nil {
		return val, nil
	}
	if registro == "holding_register" {
		return nil, err
	}
	if !isRetryableModbusError(err) {
		return nil, err
	}

	if reconErr := s.reconnect(); reconErr != nil {
		return nil, err
	}
	return readModbusPointHoldingFallback(s.client, p, registro)
}

func isRetryableModbusError(err error) bool {
	if err == nil {
		return false
	}
	var mbErr *modbus.ModbusError
	if errors.As(err, &mbErr) {
		switch mbErr.ExceptionCode {
		case modbus.ExceptionCodeIllegalFunction,
			modbus.ExceptionCodeIllegalDataAddress,
			modbus.ExceptionCodeGatewayPathUnavailable,
			modbus.ExceptionCodeGatewayTargetDeviceFailedToRespond:
			return true
		}
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "timeout") ||
		strings.Contains(msg, "timed out") ||
		strings.Contains(msg, "i/o timeout") ||
		strings.Contains(msg, "connection reset") ||
		strings.Contains(msg, "broken pipe") ||
		strings.Contains(msg, "eof") ||
		strings.Contains(msg, "use of closed network connection")
}

func readModbusPointNative(client modbus.Client, p domain.ModbusPonto, registro string) (any, error) {
	tipoDado := strings.TrimSpace(p.TipoDado)

	switch registro {
	case "coil_status":
		results, err := client.ReadCoils(p.Offset, 1)
		if err != nil {
			return nil, err
		}
		return discreteIntValue(results)
	case "input_status":
		results, err := client.ReadDiscreteInputs(p.Offset, 1)
		if err != nil {
			return nil, err
		}
		return discreteIntValue(results)
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
		return readHoldingRegisters(client, p.Offset, tipoDado)
	}
}

func discreteIntValue(results []byte) (int, error) {
	if len(results) == 0 {
		return 0, fmt.Errorf("resposta vazia do dispositivo")
	}
	if (results[0] & 0x01) != 0 {
		return 1, nil
	}
	return 0, nil
}

func readModbusPointHoldingFallback(client modbus.Client, p domain.ModbusPonto, registro string) (any, error) {
	tipoDado := strings.TrimSpace(p.TipoDado)
	switch registro {
	case "coil_status", "input_status":
		val, err := readHoldingRegisters(client, p.Offset, "uint16")
		if err != nil {
			return nil, err
		}
		return coerceDiscreteRegisterValue(val), nil
	default:
		if tipoDado == "" {
			tipoDado = "uint16"
		}
		return readHoldingRegisters(client, p.Offset, tipoDado)
	}
}

func readHoldingRegisters(client modbus.Client, offset uint16, tipoDado string) (any, error) {
	qty := registerQuantity(tipoDado)
	results, err := client.ReadHoldingRegisters(offset, qty)
	if err != nil {
		return nil, err
	}
	val := decodeRegisterValue(tipoDado, results)
	if val == nil {
		return nil, fmt.Errorf("resposta vazia do dispositivo")
	}
	return val, nil
}

func coerceDiscreteRegisterValue(val any) any {
	switch v := val.(type) {
	case uint16:
		if v <= 1 {
			return int(v)
		}
	case int16:
		if v >= 0 && v <= 1 {
			return int(v)
		}
	case uint32:
		if v <= 1 {
			return int(v)
		}
	case int32:
		if v >= 0 && v <= 1 {
			return int(v)
		}
	case int:
		if v >= 0 && v <= 1 {
			return v
		}
	case float32:
		if v == 0 || v == 1 {
			return int(v)
		}
	case float64:
		if v == 0 || v == 1 {
			return int(v)
		}
	}
	return val
}

func readModbusPoint(client modbus.Client, p domain.ModbusPonto) (any, error) {
	registro := normalizeModbusRegistro(p.Registro)
	return readModbusPointNative(client, p, registro)
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
	registro = normalizeModbusRegistro(registro)

	unlock := lockEndpoint(host, port, slaveID)
	defer unlock()

	session := newModbusSession(host, port, slaveID)
	if err := session.connect(); err != nil {
		return false, nil, err.Error()
	}
	defer session.close()

	val, err := session.readPoint(domain.ModbusPonto{
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
