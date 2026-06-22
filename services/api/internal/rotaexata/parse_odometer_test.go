package rotaexata

import "testing"

func TestOdometroKmFromFields_prefereOdometroAdesao(t *testing.T) {
	m := rawPosicao{
		"odometro_calculado": []byte(`69096859`),
		"odometro_adesao":    []byte(`45230`),
	}
	got := odometroKmFromFields(m)
	if got != 45230 {
		t.Fatalf("esperado 45230 km, obteve %v", got)
	}
}

func TestOdometroKmFromFields_calculadoEmMetros(t *testing.T) {
	m := rawPosicao{
		"odometro_calculado": []byte(`69096859`),
		"odometro_gps":       []byte(`61575017`),
	}
	got := odometroKmFromFields(m)
	if got != 69096.859 {
		t.Fatalf("esperado 69096.859 km, obteve %v", got)
	}
}

func TestOdometroKmFromFields_gpsEmMetros(t *testing.T) {
	m := rawPosicao{
		"odometro_gps": []byte(`125500`),
	}
	got := odometroKmFromFields(m)
	if got != 125.5 {
		t.Fatalf("esperado 125.5 km, obteve %v", got)
	}
}

func TestOdometroKmFromFields_adesaoAninhado(t *testing.T) {
	m := rawPosicao{
		"odometro_calculado": []byte(`31842000`),
		"odometro_gps":       []byte(`61575017`),
		"adesao":             []byte(`{"odometro_adesao":31842,"vei_placa":"ABC1D23"}`),
	}
	m = flattenPosicaoRecord(m)
	got := odometroKmFromFields(m)
	if got != 31842 {
		t.Fatalf("esperado 31842 km da adesão, obteve %v", got)
	}
}
