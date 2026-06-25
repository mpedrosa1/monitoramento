package domain

import "testing"

func TestAlertaEmAlarmeNumerico(t *testing.T) {
	casos := []struct {
		nome     string
		op       string
		valor    float64
		valor2   float64
		leitura  float64
		esperado bool
	}{
		{"maior acima", AlertaOpMaior, 45, 0, 50, true},
		{"maior abaixo", AlertaOpMaior, 45, 0, 40, false},
		{"menor abaixo", AlertaOpMenor, 200, 0, 180, true},
		{"menor igual nao dispara", AlertaOpMenor, 200, 0, 200, false},
		{"maiorigual no limite", AlertaOpMaiorIgual, 90, 0, 90, true},
		{"menorigual no limite", AlertaOpMenorIgual, 10, 0, 10, true},
		{"fora abaixo", AlertaOpFora, 10, 30, 5, true},
		{"fora acima", AlertaOpFora, 10, 30, 35, true},
		{"fora dentro", AlertaOpFora, 10, 30, 20, false},
		{"entre dentro", AlertaOpEntre, 10, 30, 20, true},
		{"entre fora", AlertaOpEntre, 10, 30, 35, false},
	}
	for _, c := range casos {
		a := AlertaEquipamento{Tipo: AlertaTipoNumerico, Operador: c.op, Valor: c.valor, Valor2: c.valor2}
		if got := a.EmAlarme(c.leitura, true, ""); got != c.esperado {
			t.Errorf("%s: EmAlarme(%v) = %v, esperado %v", c.nome, c.leitura, got, c.esperado)
		}
	}
}

func TestAlertaEmAlarmeNumericoSemNumero(t *testing.T) {
	a := AlertaEquipamento{Tipo: AlertaTipoNumerico, Operador: AlertaOpMaior, Valor: 10}
	if a.EmAlarme(0, false, "abc") {
		t.Error("sem número não deve disparar alarme numérico")
	}
}

func TestAlertaEmAlarmeEstado(t *testing.T) {
	igual := AlertaEquipamento{Tipo: AlertaTipoEstado, Operador: AlertaOpIgual, EstadoChave: "1"}
	if !igual.EmAlarme(0, false, "1") {
		t.Error("estado igual a '1' deveria disparar")
	}
	if igual.EmAlarme(0, false, "0") {
		t.Error("estado '0' não deveria disparar para igual='1'")
	}

	diferente := AlertaEquipamento{Tipo: AlertaTipoEstado, Operador: AlertaOpDiferente, EstadoChave: "0"}
	if !diferente.EmAlarme(0, false, "2") {
		t.Error("estado diferente de '0' deveria disparar")
	}
	if diferente.EmAlarme(0, false, "0") {
		t.Error("estado '0' não deveria disparar para diferente='0'")
	}
}
