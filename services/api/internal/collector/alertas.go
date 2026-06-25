package collector

import (
	"context"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
)

// RefreshAlertas recarrega as configurações de alarme do banco e reindexa por
// TargetID. Chamado no start e sempre que um alerta é criado/editado/excluído.
func (c *Collector) RefreshAlertas() {
	if c.store == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	lista, err := c.store.ListAlertasEquipamento(ctx)
	if err != nil {
		log.Printf("collector: carregar alertas: %v", err)
		return
	}
	idx := make(map[string][]domain.AlertaEquipamento)
	existentes := make(map[string]struct{}, len(lista))
	for _, a := range lista {
		idx[a.TargetID()] = append(idx[a.TargetID()], a)
		existentes[a.ID.Hex()] = struct{}{}
	}
	c.alertasMu.Lock()
	c.alertas = idx
	for key := range c.alertaAtivo {
		if _, ok := existentes[key]; !ok {
			delete(c.alertaAtivo, key)
		}
	}
	c.alertasMu.Unlock()
	log.Printf("collector: %d alerta(s) de equipamento carregado(s)", len(lista))
}

// avaliarAlertas verifica as condições configuradas para o alvo e dispara
// notificações nas transições normal↔alarme.
func (c *Collector) avaliarAlertas(t domain.MonitorTarget, metric domain.DeviceMetric) {
	c.alertasMu.RLock()
	lista := c.alertas[metric.TargetID]
	c.alertasMu.RUnlock()
	if len(lista) == 0 || !metric.Online {
		return
	}

	for _, a := range lista {
		if !a.Ativo {
			continue
		}
		raw, mult, achou := valorPontoAlerta(t, metric.Valores, a.PontoNome)
		if !achou {
			continue
		}
		if mult == 0 {
			mult = 1
		}
		num, temNum := toFloat(raw)
		if temNum {
			num *= mult
		}
		texto := formatValorTexto(raw)
		emAlarme := a.EmAlarme(num, temNum, texto)

		key := a.ID.Hex()
		c.alertasMu.Lock()
		prev, visto := c.alertaAtivo[key]
		if visto && prev == emAlarme {
			c.alertasMu.Unlock()
			continue
		}
		c.alertaAtivo[key] = emAlarme
		c.alertasMu.Unlock()

		// Primeira avaliação que já nasce normal não gera notificação.
		if !visto && !emAlarme {
			continue
		}
		c.dispatchAlerta(a, emAlarme, texto, temNum, num)
	}
}

func (c *Collector) dispatchAlerta(a domain.AlertaEquipamento, emAlarme bool, texto string, temNum bool, num float64) {
	if c.notificador == nil {
		return
	}
	local := a.EquipamentoNome
	if local == "" {
		local = a.PontoNome
	}
	if a.UnidadeNome != "" {
		local += " (" + a.UnidadeNome + ")"
	}

	valorAtual := texto
	if temNum {
		valorAtual = strconv.FormatFloat(num, 'f', -1, 64) + a.PontoUnidade
	}

	payload := domain.NotificacaoPayload{
		UnidadeID:           a.UnidadeID.Hex(),
		EquipamentoID:       a.EquipamentoID.Hex(),
		AlertaEquipamentoID: a.ID.Hex(),
		UnidadeNome:         a.UnidadeNome,
	}

	var titulo, msg string
	var tipo domain.NotificacaoTipo
	if emAlarme {
		tipo = domain.NotificacaoAlertaEquipamento
		titulo = "Alerta: " + a.PontoNome
		msg = fmt.Sprintf("%s — %s %s (atual: %s)", local, a.PontoNome, a.DescricaoCondicao(), valorAtual)
	} else {
		tipo = domain.NotificacaoAlertaNormalizado
		titulo = "Normalizado: " + a.PontoNome
		msg = fmt.Sprintf("%s — %s voltou ao normal (atual: %s)", local, a.PontoNome, valorAtual)
	}
	c.notificador.NotificarAlertaEquipamento(titulo, msg, tipo, payload)
}

// valorPontoAlerta localiza o valor cru de um ponto pelo nome e o multiplicador
// configurado, tentando chaves alternativas (OID / registrador) quando preciso.
func valorPontoAlerta(t domain.MonitorTarget, valores map[string]any, pontoNome string) (raw any, mult float64, achou bool) {
	if valores == nil {
		return nil, 1, false
	}
	nome := strings.TrimSpace(pontoNome)
	if v, ok := valores[nome]; ok {
		return v, multPonto(t, nome), true
	}
	for _, p := range t.Config.Pontos {
		if strings.TrimSpace(p.Nome) != nome {
			continue
		}
		oid := strings.TrimPrefix(strings.TrimSpace(p.OID), ".")
		if v, ok := valores[oid]; ok {
			return v, p.Multiplicador, true
		}
	}
	for _, p := range t.Config.PontosModbus {
		if strings.TrimSpace(p.Nome) != nome {
			continue
		}
		for _, k := range []string{fmt.Sprintf("reg_%d", p.Offset), fmt.Sprintf("offset_%d", p.Offset)} {
			if v, ok := valores[k]; ok {
				return v, p.Multiplicador, true
			}
		}
	}
	return nil, 1, false
}

func multPonto(t domain.MonitorTarget, nome string) float64 {
	for _, p := range t.Config.Pontos {
		if strings.TrimSpace(p.Nome) == nome {
			return p.Multiplicador
		}
	}
	for _, p := range t.Config.PontosModbus {
		if strings.TrimSpace(p.Nome) == nome {
			return p.Multiplicador
		}
	}
	return 1
}

func toFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int8:
		return float64(n), true
	case int16:
		return float64(n), true
	case int32:
		return float64(n), true
	case int64:
		return float64(n), true
	case uint:
		return float64(n), true
	case uint8:
		return float64(n), true
	case uint16:
		return float64(n), true
	case uint32:
		return float64(n), true
	case uint64:
		return float64(n), true
	case string:
		s := strings.ReplaceAll(strings.TrimSpace(n), ",", ".")
		f, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return 0, false
		}
		return f, true
	}
	return 0, false
}

func formatValorTexto(v any) string {
	switch n := v.(type) {
	case string:
		return strings.TrimSpace(n)
	case float64:
		if n == math.Trunc(n) && !math.IsInf(n, 0) {
			return strconv.FormatInt(int64(n), 10)
		}
		return strconv.FormatFloat(n, 'f', -1, 64)
	case float32:
		return formatValorTexto(float64(n))
	default:
		return fmt.Sprintf("%v", v)
	}
}
