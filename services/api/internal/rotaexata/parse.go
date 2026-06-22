package rotaexata

import (
	"encoding/json"
	"math"
	"strconv"
	"strings"
)

type rawPosicao map[string]json.RawMessage

func extractRecords(body []byte) ([]rawPosicao, error) {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(body, &top); err != nil {
		return nil, err
	}
	if data, ok := top["data"]; ok {
		return unmarshalRecordList(data)
	}
	var list []rawPosicao
	if err := json.Unmarshal(body, &list); err == nil && len(list) > 0 {
		return list, nil
	}
	return []rawPosicao{}, nil
}

func unmarshalRecordList(data json.RawMessage) ([]rawPosicao, error) {
	var list []rawPosicao
	if err := json.Unmarshal(data, &list); err == nil {
		return list, nil
	}
	var one rawPosicao
	if err := json.Unmarshal(data, &one); err == nil && len(one) > 0 {
		return []rawPosicao{one}, nil
	}
	return []rawPosicao{}, nil
}

func stringField(m rawPosicao, keys ...string) string {
	for _, k := range keys {
		raw, ok := m[k]
		if !ok {
			continue
		}
		var s string
		if err := json.Unmarshal(raw, &s); err == nil && strings.TrimSpace(s) != "" {
			return strings.TrimSpace(s)
		}
		var n float64
		if err := json.Unmarshal(raw, &n); err == nil {
			return strconv.FormatFloat(n, 'f', -1, 64)
		}
	}
	return ""
}

func floatField(m rawPosicao, keys ...string) float64 {
	for _, k := range keys {
		raw, ok := m[k]
		if !ok {
			continue
		}
		var f float64
		if err := json.Unmarshal(raw, &f); err == nil && !math.IsNaN(f) {
			return f
		}
		var s string
		if err := json.Unmarshal(raw, &s); err == nil {
			if v, err := strconv.ParseFloat(strings.TrimSpace(s), 64); err == nil {
				return v
			}
		}
	}
	return 0
}

func intField(m rawPosicao, keys ...string) int {
	return int(math.Round(floatField(m, keys...)))
}

// ParsedMotorista condutor vinculado ao veículo na Rota Exata.
type ParsedMotorista struct {
	ID    int
	Nome  string
	Email string
	CPF   string
	CNH   string
}

// ParsedPosicao dados normalizados de uma posição Rota Exata.
type ParsedPosicao struct {
	AdesaoID     int
	Placa        string
	Lat          float64
	Lng          float64
	VelocidadeKm float64
	OdometroKm   float64
	DataHora     string
	Endereco     string
	Motorista    *ParsedMotorista
}

func parsePosicao(m rawPosicao) (ParsedPosicao, bool) {
	m = flattenPosicaoRecord(m)
	lat := floatField(m, "latitude", "lat", "Latitude", "Lat")
	lng := floatField(m, "longitude", "lng", "long", "Longitude", "Lng", "Long")
	if !hasValidCoords(lat, lng) {
		lat, lng = coordsFromGeoJSON(m)
	}
	if !hasValidCoords(lat, lng) {
		return ParsedPosicao{}, false
	}
	placa := stringField(m, "vei_placa", "placa", "Placa", "veiculo_placa")
	if placa == "" {
		return ParsedPosicao{}, false
	}
	motorista := parseMotorista(m)
	return ParsedPosicao{
		AdesaoID:     intField(m, "adesao_id", "adesaoId", "id_adesao", "id"),
		Placa:        placa,
		Lat:          lat,
		Lng:          lng,
		VelocidadeKm: floatField(m, "velocidade", "velocidade_kmh", "velocidadeKm", "speed", "vel", "Velocidade"),
		OdometroKm:   odometroKmFromFields(m),
		DataHora:     stringField(m, "dt_posicao", "data_gps", "dt_gps", "data", "created", "updated"),
		Endereco:     stringField(m, "endereco", "address", "localizacao"),
		Motorista:    motorista,
	}, true
}

func parseMotorista(m rawPosicao) *ParsedMotorista {
	motoristaID := intField(m, "motorista_id", "motoristaId", "id_motorista")
	if raw, ok := m["motorista"]; ok {
		var mot rawPosicao
		if err := json.Unmarshal(raw, &mot); err == nil && len(mot) > 0 {
			id := intField(mot, "id", "motorista_id", "motoristaId")
			if id <= 0 {
				id = motoristaID
			}
			nome := stringField(mot, "nome", "name", "motorista_nome")
			email := stringField(mot, "email", "motorista_email")
			cpf := stringField(mot, "cpf", "motorista_cpf")
			cnh := stringField(mot, "cnh", "motorista_cnh")
			if id <= 0 && nome == "" && email == "" && cpf == "" && cnh == "" {
				return nil
			}
			return &ParsedMotorista{
				ID:    id,
				Nome:  nome,
				Email: email,
				CPF:   cpf,
				CNH:   cnh,
			}
		}
	}
	if motoristaID <= 0 {
		return nil
	}
	return &ParsedMotorista{ID: motoristaID}
}

func flattenPosicaoRecord(m rawPosicao) rawPosicao {
	if raw, ok := m["posicao"]; ok {
		var nested rawPosicao
		if err := json.Unmarshal(raw, &nested); err == nil && len(nested) > 0 {
			m = nested
		}
	}
	if raw, ok := m["adesao"]; ok {
		var adesao rawPosicao
		if err := json.Unmarshal(raw, &adesao); err == nil {
			m = copyRawPosicao(m)
			if placa := stringField(adesao, "vei_placa", "placa"); placa != "" {
				m["vei_placa"] = json.RawMessage(strconv.Quote(placa))
			}
			for _, k := range []string{"odometro_adesao", "odometro"} {
				if v, ok := adesao[k]; ok {
					m[k] = v
				}
			}
		}
	}
	return m
}

func copyRawPosicao(m rawPosicao) rawPosicao {
	out := make(rawPosicao, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

func hasValidCoords(lat, lng float64) bool {
	return math.Abs(lat) > 0.0001 && math.Abs(lng) > 0.0001
}

func coordsFromGeoJSON(m rawPosicao) (float64, float64) {
	raw, ok := m["geojson"]
	if !ok {
		return 0, 0
	}
	var gj struct {
		Coordinates []float64 `json:"coordinates"`
	}
	if err := json.Unmarshal(raw, &gj); err != nil || len(gj.Coordinates) < 2 {
		return 0, 0
	}
	// GeoJSON: [lng, lat]
	return gj.Coordinates[1], gj.Coordinates[0]
}

func odometroKmFromFields(m rawPosicao) float64 {
	// odometro_adesao já vem em quilômetros (cadastro manual).
	if v := floatField(m, "odometro_adesao"); v > 0 {
		return v
	}
	// odometro_calculado é o valor exibido no painel Rota Exata (metros inteiros).
	if v := floatField(m, "odometro_calculado"); v > 0 {
		return v / 1000
	}
	if v := floatField(m, "odometro_gps", "odometro_original", "odometro"); v > 0 {
		return v / 1000
	}
	return 0
}

func NormalizePlaca(placa string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(placa), "-", ""))
}

func extractToken(body []byte) string {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(body, &top); err != nil {
		return ""
	}
	for _, k := range []string{"token", "access_token", "authorization"} {
		if raw, ok := top[k]; ok {
			var s string
			if err := json.Unmarshal(raw, &s); err == nil && s != "" {
				return s
			}
		}
	}
	if raw, ok := top["data"]; ok {
		var nested map[string]json.RawMessage
		if err := json.Unmarshal(raw, &nested); err == nil {
			for _, k := range []string{"token", "access_token"} {
				if tRaw, ok := nested[k]; ok {
					var s string
					if err := json.Unmarshal(tRaw, &s); err == nil && s != "" {
						return s
					}
				}
			}
		}
	}
	return ""
}
