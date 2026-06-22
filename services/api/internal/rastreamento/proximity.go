package rastreamento

import (
	"context"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/geo"
)

// ProximityNotifier dispara alertas de proximidade (painel + notificações).
type ProximityNotifier interface {
	NotifyVeiculoProximoUnidade(ctx context.Context, alerta domain.VeiculoProximidadeAlerta)
}

type proximityChecker struct {
	radiusKm float64
	known    map[string]bool
	seen     map[string]bool
}

func newProximityChecker(radiusKm float64) *proximityChecker {
	return &proximityChecker{
		radiusKm: radiusKm,
		known:    make(map[string]bool),
		seen:     make(map[string]bool),
	}
}

func proximityKey(veiculoID, unidadeID string) string {
	return veiculoID + "|" + unidadeID
}

func (c *proximityChecker) check(
	ctx context.Context,
	posicoes []domain.VeiculoPosicao,
	unidades []domain.Unidade,
	notify ProximityNotifier,
) {
	if notify == nil {
		return
	}

	for _, pos := range posicoes {
		if !validCoords(pos.Lat, pos.Lng) {
			continue
		}
		for _, u := range unidades {
			if !validCoords(u.Latitude, u.Longitude) {
				continue
			}
			dist := geo.HaversineKm(pos.Lat, pos.Lng, u.Latitude, u.Longitude)
			inside := dist <= c.radiusKm
			key := proximityKey(pos.VeiculoID, u.ID.Hex())

			if !c.seen[key] {
				c.seen[key] = true
				c.known[key] = inside
				continue
			}

			wasInside := c.known[key]
			c.known[key] = inside

			if inside && !wasInside {
				notify.NotifyVeiculoProximoUnidade(ctx, domain.VeiculoProximidadeAlerta{
					VeiculoID:   pos.VeiculoID,
					Placa:       pos.Placa,
					UnidadeID:   u.ID.Hex(),
					UnidadeNome: u.Nome,
					DistanciaKm: roundKm(dist),
					RaioKm:      c.radiusKm,
				})
			}
		}
	}
}

func validCoords(lat, lng float64) bool {
	return lat != 0 && lng != 0
}

func roundKm(km float64) float64 {
	return float64(int(km*10+0.5)) / 10
}
