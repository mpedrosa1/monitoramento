package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type unidadeEquipamentoIn struct {
	EquipamentoID string `json:"equipamentoId"`
	Porta         int    `json:"porta"`
	NomeLocal     string `json:"nomeLocal,omitempty"`
}

type unidadeBodyIn struct {
	Codigo       string                 `json:"codigo"`
	Nome         string                 `json:"nome"`
	Diretores    []string               `json:"diretores"`
	Telefones    []string               `json:"telefones"`
	Emails       []string               `json:"emails"`
	Endereco     json.RawMessage        `json:"endereco"`
	Latitude     *float64               `json:"latitude"`
	Longitude    *float64               `json:"longitude"`
	IP           string                 `json:"ip"`
	Equipamentos []unidadeEquipamentoIn `json:"equipamentos"`
	IntervaloS     json.RawMessage `json:"intervaloS"`
	AlertaOfflineS json.RawMessage `json:"alertaOfflineS"`
}

func decodeUnidadeBody(r io.Reader) (domain.Unidade, error) {
	var in unidadeBodyIn
	if err := json.NewDecoder(r).Decode(&in); err != nil {
		return domain.Unidade{}, fmt.Errorf("json inválido: %w", err)
	}

	endereco, err := parseUnidadeEnderecoJSON(in.Endereco)
	if err != nil {
		return domain.Unidade{}, err
	}

	equipamentos, err := parseUnidadeEquipamentos(in.Equipamentos)
	if err != nil {
		return domain.Unidade{}, err
	}

	u := domain.Unidade{
		Codigo:       sanitizeUnidadeCodigo(in.Codigo),
		Nome:         strings.TrimSpace(in.Nome),
		Diretores:    in.Diretores,
		Telefones:    in.Telefones,
		Emails:       in.Emails,
		Endereco:     endereco,
		IP:           strings.TrimSpace(in.IP),
		Equipamentos: equipamentos,
		IntervaloS:     parseIntervaloS(in.IntervaloS),
		AlertaOfflineS: parseAlertaOfflineS(in.AlertaOfflineS),
	}
	if in.Latitude != nil {
		u.Latitude = *in.Latitude
	}
	if in.Longitude != nil {
		u.Longitude = *in.Longitude
	}
	if u.Codigo == "" {
		return domain.Unidade{}, fmt.Errorf("codigo (ID) deve conter apenas números")
	}
	return u, nil
}

func parseUnidadeEnderecoJSON(raw json.RawMessage) (domain.UnidadeEndereco, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return domain.UnidadeEndereco{}, nil
	}
	var o domain.UnidadeEndereco
	if err := json.Unmarshal(raw, &o); err == nil {
		return o, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return domain.UnidadeEndereco{Logradouro: strings.TrimSpace(s)}, nil
	}
	return domain.UnidadeEndereco{}, fmt.Errorf("endereco inválido")
}

func parseUnidadeEquipamentos(in []unidadeEquipamentoIn) ([]domain.UnidadeEquipamento, error) {
	if len(in) == 0 {
		return []domain.UnidadeEquipamento{}, nil
	}
	out := make([]domain.UnidadeEquipamento, 0, len(in))
	for i, eq := range in {
		hex := strings.TrimSpace(eq.EquipamentoID)
		if hex == "" {
			continue
		}
		oid, err := primitive.ObjectIDFromHex(hex)
		if err != nil {
			return nil, fmt.Errorf("equipamentoId inválido no item %d", i+1)
		}
		out = append(out, domain.UnidadeEquipamento{
			EquipamentoID: oid,
			Porta:         eq.Porta,
			NomeLocal:     strings.TrimSpace(eq.NomeLocal),
		})
	}
	return out, nil
}

func parseIntervaloS(raw json.RawMessage) int {
	if len(raw) == 0 || string(raw) == "null" {
		return 30
	}
	var i int
	if err := json.Unmarshal(raw, &i); err == nil && i > 0 {
		return i
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil && f > 0 {
		return int(f)
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		if n, err := strconv.Atoi(strings.TrimSpace(s)); err == nil && n > 0 {
			return n
		}
	}
	return 30
}

func parseAlertaOfflineS(raw json.RawMessage) int {
	if len(raw) == 0 || string(raw) == "null" {
		return 60
	}
	var i int
	if err := json.Unmarshal(raw, &i); err == nil && i > 0 {
		return i
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil && f > 0 {
		return int(f)
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		if n, err := strconv.Atoi(strings.TrimSpace(s)); err == nil && n > 0 {
			return n
		}
	}
	return 60
}

func sanitizeUnidadeCodigo(raw string) string {
	var b strings.Builder
	for _, r := range raw {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func compareUnidadeCodigo(a, b string) int {
	na, ea := strconv.Atoi(a)
	nb, eb := strconv.Atoi(b)
	if ea == nil && eb == nil {
		switch {
		case na < nb:
			return -1
		case na > nb:
			return 1
		default:
			return 0
		}
	}
	return strings.Compare(a, b)
}
