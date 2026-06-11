package modbus

import (
	"testing"

	"github.com/goburrow/modbus"
)

func TestNormalizeModbusRegistro(t *testing.T) {
	tests := map[string]string{
		"":                 "holding_register",
		"holding_register": "holding_register",
		"Holding register": "holding_register",
		"input_register":   "input_register",
		"Input register":   "input_register",
		"coil_status":      "coil_status",
		"Coil Status":      "coil_status",
		"input_status":     "input_status",
		"Input Status":     "input_status",
	}
	for in, want := range tests {
		if got := normalizeModbusRegistro(in); got != want {
			t.Fatalf("normalizeModbusRegistro(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestIsRetryableModbusError(t *testing.T) {
	if !isRetryableModbusError(&modbus.ModbusError{
		FunctionCode:  modbus.FuncCodeReadDiscreteInputs,
		ExceptionCode: modbus.ExceptionCodeIllegalFunction,
	}) {
		t.Fatal("illegal function should be retryable")
	}
	if isRetryableModbusError(nil) {
		t.Fatal("nil should not be retryable")
	}
}

func TestCoerceDiscreteRegisterValue(t *testing.T) {
	if coerceDiscreteRegisterValue(uint16(1)) != 1 {
		t.Fatal("uint16(1) should coerce to 1")
	}
	if coerceDiscreteRegisterValue(uint16(0)) != 0 {
		t.Fatal("uint16(0) should coerce to 0")
	}
	if coerceDiscreteRegisterValue(uint16(42)) != uint16(42) {
		t.Fatal("non-binary values should pass through")
	}
}

func TestDiscreteIntValue(t *testing.T) {
	v, err := discreteIntValue([]byte{0x01})
	if err != nil || v != 1 {
		t.Fatalf("bit set should be 1, got %d err=%v", v, err)
	}
	v, err = discreteIntValue([]byte{0x00})
	if err != nil || v != 0 {
		t.Fatalf("bit clear should be 0, got %d err=%v", v, err)
	}
}
