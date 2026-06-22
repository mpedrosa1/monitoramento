package store

import (
	"context"
	"sort"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MemoryStore) ListCondutorRotaExataDivergencias(
	ctx context.Context,
	status *domain.CondutorRotaExataDivergenciaStatus,
) ([]domain.CondutorRotaExataDivergencia, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.CondutorRotaExataDivergencia, 0)
	for _, d := range s.condutorRotaExataDivergencias {
		if status != nil && d.Status != *status {
			continue
		}
		out = append(out, d)
	}
	sortCondutorDivergencias(out)
	return out, nil
}

func (s *MemoryStore) GetCondutorRotaExataDivergencia(
	ctx context.Context,
	id primitive.ObjectID,
) (*domain.CondutorRotaExataDivergencia, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.condutorRotaExataDivergencias {
		if s.condutorRotaExataDivergencias[i].ID == id {
			d := s.condutorRotaExataDivergencias[i]
			return &d, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) FindCondutorRotaExataDivergenciaPendenteByVeiculo(
	ctx context.Context,
	veiculoID primitive.ObjectID,
) (*domain.CondutorRotaExataDivergencia, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.condutorRotaExataDivergencias {
		d := s.condutorRotaExataDivergencias[i]
		if d.VeiculoID == veiculoID && d.Status == domain.CondutorDivergenciaPendente {
			return &d, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) ExistsCondutorRotaExataDivergenciaRecusada(
	ctx context.Context,
	veiculoID primitive.ObjectID,
	rotaExataMotoristaID int,
) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.condutorRotaExataDivergencias {
		d := s.condutorRotaExataDivergencias[i]
		if d.VeiculoID == veiculoID &&
			d.Status == domain.CondutorDivergenciaRecusada &&
			d.RotaExataMotoristaID == rotaExataMotoristaID {
			return true, nil
		}
	}
	return false, nil
}

func (s *MemoryStore) CreateCondutorRotaExataDivergencia(
	ctx context.Context,
	d *domain.CondutorRotaExataDivergencia,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	d.ID = primitive.NewObjectID()
	if d.DetectadoEm.IsZero() {
		d.DetectadoEm = now
	}
	d.CreatedAt = now
	d.UpdatedAt = now
	s.condutorRotaExataDivergencias = append(s.condutorRotaExataDivergencias, *d)
	return nil
}

func (s *MemoryStore) UpdateCondutorRotaExataDivergencia(
	ctx context.Context,
	d *domain.CondutorRotaExataDivergencia,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.condutorRotaExataDivergencias {
		if s.condutorRotaExataDivergencias[i].ID == d.ID {
			d.UpdatedAt = time.Now().UTC()
			s.condutorRotaExataDivergencias[i] = *d
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteCondutorRotaExataDivergencia(
	ctx context.Context,
	id primitive.ObjectID,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	next := s.condutorRotaExataDivergencias[:0]
	found := false
	for _, d := range s.condutorRotaExataDivergencias {
		if d.ID == id {
			found = true
			continue
		}
		next = append(next, d)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.condutorRotaExataDivergencias = next
	return nil
}

func (s *MemoryStore) VeiculoIDsComCondutorRotaExataDivergenciaPendente(
	ctx context.Context,
) ([]primitive.ObjectID, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	seen := map[primitive.ObjectID]bool{}
	var ids []primitive.ObjectID
	for _, d := range s.condutorRotaExataDivergencias {
		if d.Status != domain.CondutorDivergenciaPendente {
			continue
		}
		if seen[d.VeiculoID] {
			continue
		}
		seen[d.VeiculoID] = true
		ids = append(ids, d.VeiculoID)
	}
	return ids, nil
}

func sortCondutorDivergencias(list []domain.CondutorRotaExataDivergencia) {
	sort.Slice(list, func(i, j int) bool {
		return list[i].DetectadoEm.After(list[j].DetectadoEm)
	})
}
