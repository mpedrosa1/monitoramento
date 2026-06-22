package rotaexata

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
)

const motoristasCacheTTL = 5 * time.Minute

type Usuario struct {
	ID          int
	Nome        string
	Email       string
	CPF         string
	CNH         string
	IsMotorista bool
}

func (c *Client) VincularMotoristaAdesao(ctx context.Context, adesaoID, motoristaID int) error {
	if adesaoID <= 0 || motoristaID <= 0 {
		return fmt.Errorf("adesão ou motorista inválido")
	}
	_, err := c.post(ctx, "/motoristas", map[string]any{
		"adesao_id":    adesaoID,
		"motorista_id": motoristaID,
	})
	return err
}

func (c *Client) AdesaoIDPorPlaca(ctx context.Context, placa string) (int, error) {
	norm := NormalizePlaca(placa)
	if norm == "" {
		return 0, fmt.Errorf("placa inválida")
	}

	list, err := c.UltimaPosicaoTodos(ctx)
	if err == nil {
		for _, p := range list {
			if NormalizePlaca(p.Placa) == norm && p.AdesaoID > 0 {
				return p.AdesaoID, nil
			}
		}
	}

	body, err := c.get(ctx, "/adesoes")
	if err != nil {
		return 0, fmt.Errorf("adesão não encontrada para placa %s: %w", placa, err)
	}
	records, err := extractRecords(body)
	if err != nil {
		return 0, err
	}
	for _, rec := range records {
		p := stringField(rec, "vei_placa", "placa", "Placa")
		if NormalizePlaca(p) != norm {
			continue
		}
		id := intField(rec, "id", "adesao_id", "adesaoId")
		if id > 0 {
			return id, nil
		}
	}
	return 0, fmt.Errorf("adesão não encontrada na Rota Exata para placa %s", placa)
}

func (c *Client) cachedMotoristas(ctx context.Context) ([]Usuario, error) {
	c.motoristasMu.RLock()
	if len(c.motoristasCache) > 0 && time.Since(c.motoristasCachedAt) < motoristasCacheTTL {
		out := append([]Usuario(nil), c.motoristasCache...)
		c.motoristasMu.RUnlock()
		return out, nil
	}
	c.motoristasMu.RUnlock()

	list, err := c.ListUsuariosMotoristas(ctx)
	if err != nil {
		return nil, err
	}
	c.motoristasMu.Lock()
	c.motoristasCache = list
	c.motoristasCachedAt = time.Now()
	c.motoristasMu.Unlock()
	return append([]Usuario(nil), list...), nil
}

func (c *Client) ListUsuariosMotoristas(ctx context.Context) ([]Usuario, error) {
	const pageSize = 50
	out := make([]Usuario, 0, pageSize)
	seen := map[int]bool{}

	for page := 1; page <= 50; page++ {
		path := fmt.Sprintf("/usuarios?page=%d&limit=%d", page, pageSize)
		body, err := c.get(ctx, path)
		if err != nil {
			if page == 1 {
				return nil, err
			}
			break
		}
		batch, err := parseUsuarios(body)
		if err != nil {
			return nil, err
		}
		if len(batch) == 0 {
			break
		}
		added := 0
		for _, u := range batch {
			if !u.IsMotorista || u.ID <= 0 || seen[u.ID] {
				continue
			}
			seen[u.ID] = true
			out = append(out, u)
			added++
		}
		if len(batch) < pageSize {
			break
		}
		if added == 0 && page > 1 {
			break
		}
	}
	return out, nil
}

func (c *Client) MotoristaIDPorColaborador(
	ctx context.Context,
	colab domain.Colaborador,
) (int, error) {
	if colab.RotaExataMotoristaID != nil && *colab.RotaExataMotoristaID > 0 {
		return *colab.RotaExataMotoristaID, nil
	}

	usuarios, err := c.cachedMotoristas(ctx)
	if err != nil {
		return 0, err
	}

	for _, u := range usuarios {
		ref := domain.RotaExataMotoristaRef{
			ID:    u.ID,
			Nome:  u.Nome,
			Email: u.Email,
			CPF:   u.CPF,
			CNH:   u.CNH,
		}
		if matched := domain.MatchColaboradorPorMotoristaRotaExata(ref, []domain.Colaborador{colab}); matched != nil {
			return u.ID, nil
		}
	}
	return 0, fmt.Errorf(
		"motorista não encontrado na Rota Exata para colaborador %s",
		strings.TrimSpace(colab.Nome),
	)
}

func parseUsuarios(body []byte) ([]Usuario, error) {
	records, err := extractRecords(body)
	if err != nil {
		return nil, err
	}
	out := make([]Usuario, 0, len(records))
	for _, rec := range records {
		u := Usuario{
			ID:          intField(rec, "id"),
			Nome:        stringField(rec, "nome", "name"),
			Email:       stringField(rec, "email"),
			CPF:         stringField(rec, "cpf"),
			CNH:         stringField(rec, "cnh"),
			IsMotorista: intField(rec, "motorista") == 1,
		}
		if u.ID <= 0 {
			continue
		}
		out = append(out, u)
	}
	return out, nil
}
