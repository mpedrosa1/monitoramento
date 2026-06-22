package rotaexata

import "testing"

func TestParseUsuariosMotorista(t *testing.T) {
	body := []byte(`{
		"rowCount": "2",
		"data": [
			{"id": 1, "nome": "Admin", "motorista": 0, "email": "a@b.com"},
			{"id": 70269, "nome": "Fernando", "motorista": 1, "cpf": "350.125.768-61", "cnh": "03586885086", "email": "f@b.com"}
		]
	}`)
	list, err := parseUsuarios(body)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("len=%d", len(list))
	}
	if list[1].ID != 70269 || !list[1].IsMotorista {
		t.Fatalf("motorista=%+v", list[1])
	}
}
