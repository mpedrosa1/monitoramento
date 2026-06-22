package rotaexata

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

func (c *Client) OdometroKmResumoDia(ctx context.Context, adesaoID int, data string) (float64, error) {
	if adesaoID <= 0 {
		return 0, fmt.Errorf("adesao_id inválido")
	}
	if data == "" {
		data = time.Now().Format("2006-01-02")
	}
	body, err := c.get(ctx, fmt.Sprintf("/resumo-dia/%d/%s", adesaoID, data))
	if err != nil {
		return 0, err
	}
	var top map[string]json.RawMessage
	if err := json.Unmarshal(body, &top); err != nil {
		return 0, err
	}
	rawPos, ok := top["posicao"]
	if !ok {
		return 0, fmt.Errorf("resumo-dia sem posicao")
	}
	var pos rawPosicao
	if err := json.Unmarshal(rawPos, &pos); err != nil {
		return 0, err
	}
	km := odometroKmFromFields(pos)
	if km <= 0 {
		return 0, fmt.Errorf("odômetro não encontrado no resumo-dia")
	}
	return km, nil
}
