package rastreamento

import (
	"context"
	"fmt"
	"log"
	"math"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/geo"
)

const (
	velocidadeDeslocamentoKmH = 2.0
	presencaUpdatesEstaveis   = 5
)

type vehiclePresenceTrack struct {
	signature     string
	stableCount   int
	nearbyUnitIDs []string
	confirmed     bool
}

type colaboradorStatusTracker struct {
	tracks map[string]*vehiclePresenceTrack
}

func newColaboradorStatusTracker() *colaboradorStatusTracker {
	return &colaboradorStatusTracker{tracks: make(map[string]*vehiclePresenceTrack)}
}

func positionSignature(pos domain.VeiculoPosicao) string {
	return fmt.Sprintf("%.4f|%.4f|%d", pos.Lat, pos.Lng, int(math.Round(pos.VelocidadeKm)))
}

func unidadesNoRaioIDs(pos domain.VeiculoPosicao, unidades []domain.Unidade, radiusKm float64) []string {
	var ids []string
	for _, u := range unidades {
		if !validCoords(u.Latitude, u.Longitude) {
			continue
		}
		dist := geo.HaversineKm(pos.Lat, pos.Lng, u.Latitude, u.Longitude)
		if dist <= radiusKm {
			ids = append(ids, u.ID.Hex())
		}
	}
	return ids
}

func sameStringSet(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	set := make(map[string]struct{}, len(b))
	for _, s := range b {
		set[s] = struct{}{}
	}
	for _, s := range a {
		if _, ok := set[s]; !ok {
			return false
		}
	}
	return true
}

func (t *colaboradorStatusTracker) updateTrack(pos domain.VeiculoPosicao, unidades []domain.Unidade, radiusKm float64) *vehiclePresenceTrack {
	nearby := unidadesNoRaioIDs(pos, unidades, radiusKm)
	sig := positionSignature(pos)

	track := t.tracks[pos.VeiculoID]
	if track == nil {
		track = &vehiclePresenceTrack{}
		t.tracks[pos.VeiculoID] = track
	}

	if len(nearby) == 0 {
		track.signature = ""
		track.stableCount = 0
		track.nearbyUnitIDs = nil
		track.confirmed = false
		return track
	}

	if track.signature == sig && sameStringSet(track.nearbyUnitIDs, nearby) {
		track.stableCount++
	} else {
		track.signature = sig
		track.stableCount = 1
		track.nearbyUnitIDs = nearby
	}
	track.confirmed = track.stableCount >= presencaUpdatesEstaveis
	return track
}

func (t *colaboradorStatusTracker) prune(active map[string]struct{}) {
	for id := range t.tracks {
		if _, ok := active[id]; !ok {
			delete(t.tracks, id)
		}
	}
}

func statusFromTrack(track *vehiclePresenceTrack, pos domain.VeiculoPosicao) domain.ColaboradorStatus {
	if track != nil && track.confirmed && len(track.nearbyUnitIDs) > 0 {
		return domain.ColaboradorEmMissao
	}
	moving := pos.VelocidadeKm >= velocidadeDeslocamentoKmH
	if moving {
		return domain.ColaboradorEmDeslocamento
	}
	return domain.ColaboradorEscritorio
}

func colaboradorStatusManual(s domain.ColaboradorStatus) bool {
	switch s {
	case domain.ColaboradorFerias, domain.ColaboradorAtestado, domain.ColaboradorAlmoco:
		return true
	default:
		return false
	}
}

func (s *Service) syncColaboradorStatusRastreamento(
	ctx context.Context,
	posicoes []domain.VeiculoPosicao,
	unidades []domain.Unidade,
) {
	if s.statusTracker == nil {
		return
	}

	veiculos, err := s.store.ListVeiculos(ctx)
	if err != nil {
		log.Printf("rastreamento status colaborador: listar veículos: %v", err)
		return
	}
	veiculoPorID := make(map[string]domain.Veiculo, len(veiculos))
	for _, v := range veiculos {
		id := v.ID.Hex()
		veiculoPorID[id] = v
	}

	active := make(map[string]struct{}, len(posicoes))
	targetByColaborador := make(map[string]domain.ColaboradorStatus)

	for _, pos := range posicoes {
		if !validCoords(pos.Lat, pos.Lng) {
			continue
		}
		active[pos.VeiculoID] = struct{}{}
		track := s.statusTracker.updateTrack(pos, unidades, domain.VeiculoPresencaRaioKm)

		v, ok := veiculoPorID[pos.VeiculoID]
		if !ok || v.ColaboradorID.IsZero() {
			continue
		}
		cid := v.ColaboradorID.Hex()
		targetByColaborador[cid] = statusFromTrack(track, pos)
	}

	s.statusTracker.prune(active)

	if len(targetByColaborador) == 0 {
		return
	}

	colaboradores, err := s.store.ListColaboradores(ctx)
	if err != nil {
		log.Printf("rastreamento status colaborador: listar colaboradores: %v", err)
		return
	}

	for _, col := range colaboradores {
		cid := col.ID.Hex()
		target, tracked := targetByColaborador[cid]
		if !tracked {
			continue
		}
		if colaboradorStatusManual(col.Status) {
			continue
		}
		if col.Status == target {
			continue
		}
		col.Status = target
		if err := s.store.UpdateColaborador(ctx, &col); err != nil {
			log.Printf("rastreamento status colaborador %s: %v", cid, err)
		}
	}
}
