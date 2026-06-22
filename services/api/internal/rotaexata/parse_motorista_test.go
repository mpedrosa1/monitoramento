package rotaexata

import "testing"

func TestParseMotoristaNested(t *testing.T) {
	raw := rawPosicao{
		"vei_placa":   jsonRaw(`"ABC1D23"`),
		"latitude":    jsonRaw(`-23.5`),
		"longitude":   jsonRaw(`-46.6`),
		"motorista_id": jsonRaw(`69723`),
		"motorista": jsonRaw(`{
			"id":69723,
			"nome":"Ricardo Andrade",
			"email":"ricardo@mmr.tec.br",
			"cpf":"373.481.228-33",
			"cnh":"04611385547"
		}`),
	}
	p, ok := parsePosicao(raw)
	if !ok {
		t.Fatal("parsePosicao failed")
	}
	if p.Motorista == nil {
		t.Fatal("expected motorista")
	}
	if p.Motorista.ID != 69723 {
		t.Fatalf("id=%d", p.Motorista.ID)
	}
	if p.Motorista.Nome != "Ricardo Andrade" {
		t.Fatalf("nome=%q", p.Motorista.Nome)
	}
}

func jsonRaw(s string) []byte {
	return []byte(s)
}
