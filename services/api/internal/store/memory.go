package store

import (
	"context"
	"sync"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MemoryStore struct {
	mu            sync.RWMutex
	unidades      []domain.Unidade
	colaboradores []domain.Colaborador
	chamados      []domain.Chamado
	missoes       []domain.Missao
	dispositivos  []domain.Equipamento
	eventos       []domain.EventoMonitoramento
	seeded        bool
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{}
}

func (s *MemoryStore) Ping(ctx context.Context) error { return nil }

func (s *MemoryStore) SeedIfEmpty(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.seeded {
		return nil
	}
	seedData(s)
	s.seeded = true
	return nil
}

func (s *MemoryStore) ListUnidades(ctx context.Context) ([]domain.Unidade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Unidade, len(s.unidades))
	copy(out, s.unidades)
	return out, nil
}

func (s *MemoryStore) GetUnidade(ctx context.Context, id primitive.ObjectID) (*domain.Unidade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.unidades {
		if s.unidades[i].ID == id {
			u := s.unidades[i]
			return &u, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateUnidade(ctx context.Context, u *domain.Unidade) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	u.ID = primitive.NewObjectID()
	u.CreatedAt, u.UpdatedAt = now, now
	s.unidades = append(s.unidades, *u)
	return nil
}

func (s *MemoryStore) UpdateUnidade(ctx context.Context, u *domain.Unidade) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.unidades {
		if s.unidades[i].ID == u.ID {
			u.UpdatedAt = time.Now().UTC()
			s.unidades[i] = *u
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) ListColaboradores(ctx context.Context) ([]domain.Colaborador, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Colaborador, len(s.colaboradores))
	copy(out, s.colaboradores)
	return out, nil
}

func (s *MemoryStore) GetColaborador(ctx context.Context, id primitive.ObjectID) (*domain.Colaborador, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.colaboradores {
		if s.colaboradores[i].ID == id {
			c := s.colaboradores[i]
			return &c, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateColaborador(ctx context.Context, c *domain.Colaborador) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	c.ID = primitive.NewObjectID()
	c.CreatedAt, c.UpdatedAt = now, now
	s.colaboradores = append(s.colaboradores, *c)
	return nil
}

func (s *MemoryStore) UpdateColaborador(ctx context.Context, c *domain.Colaborador) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.colaboradores {
		if s.colaboradores[i].ID == c.ID {
			c.UpdatedAt = time.Now().UTC()
			s.colaboradores[i] = *c
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) ListChamados(ctx context.Context, limit int) ([]domain.Chamado, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ch := append([]domain.Chamado(nil), s.chamados...)
	sortChamadosByDate(ch)
	if limit > 0 && len(ch) > limit {
		ch = ch[:limit]
	}
	return ch, nil
}

func (s *MemoryStore) GetChamado(ctx context.Context, id primitive.ObjectID) (*domain.Chamado, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.chamados {
		if s.chamados[i].ID == id {
			c := s.chamados[i]
			return &c, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateChamado(ctx context.Context, c *domain.Chamado) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	c.ID = primitive.NewObjectID()
	c.CreatedAt, c.UpdatedAt = now, now
	s.chamados = append(s.chamados, *c)
	return nil
}

func (s *MemoryStore) UpdateChamado(ctx context.Context, c *domain.Chamado) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.chamados {
		if s.chamados[i].ID == c.ID {
			c.UpdatedAt = time.Now().UTC()
			s.chamados[i] = *c
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) ListMissoes(ctx context.Context) ([]domain.Missao, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Missao, len(s.missoes))
	copy(out, s.missoes)
	return out, nil
}

func (s *MemoryStore) CountMissoesEmAndamento(ctx context.Context) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	n := 0
	for _, m := range s.missoes {
		if m.Status == domain.MissaoEmAndamento {
			n++
		}
	}
	return n, nil
}

func (s *MemoryStore) ListEquipamentos(ctx context.Context) ([]domain.Equipamento, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Equipamento, len(s.dispositivos))
	copy(out, s.dispositivos)
	return out, nil
}

func (s *MemoryStore) ListDispositivos(ctx context.Context) ([]domain.Dispositivo, error) {
	return s.ListEquipamentos(ctx)
}

func (s *MemoryStore) CreateEquipamento(ctx context.Context, e *domain.Equipamento) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	e.ID = primitive.NewObjectID()
	e.CreatedAt, e.UpdatedAt = now, now
	s.dispositivos = append(s.dispositivos, *e)
	return nil
}

func (s *MemoryStore) CreateDispositivo(ctx context.Context, d *domain.Dispositivo) error {
	return s.CreateEquipamento(ctx, d)
}

func (s *MemoryStore) UpdateEquipamento(ctx context.Context, e *domain.Equipamento) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.dispositivos {
		if s.dispositivos[i].ID == e.ID {
			e.UpdatedAt = time.Now().UTC()
			s.dispositivos[i] = *e
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) UpdateDispositivo(ctx context.Context, d *domain.Dispositivo) error {
	return s.UpdateEquipamento(ctx, d)
}

func (s *MemoryStore) DeleteEquipamento(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.dispositivos[:0]
	for _, e := range s.dispositivos {
		if e.ID == id {
			found = true
			continue
		}
		next = append(next, e)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.dispositivos = next
	for i := range s.unidades {
		links := s.unidades[i].Equipamentos
		filtered := links[:0]
		for _, l := range links {
			if l.EquipamentoID != id {
				filtered = append(filtered, l)
			}
		}
		s.unidades[i].Equipamentos = filtered
	}
	return nil
}

func (s *MemoryStore) CreateEvento(ctx context.Context, e *domain.EventoMonitoramento) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	e.ID = primitive.NewObjectID()
	e.CreatedAt = time.Now().UTC()
	s.eventos = append([]domain.EventoMonitoramento{*e}, s.eventos...)
	return nil
}

func (s *MemoryStore) ListEventos(ctx context.Context, limit int) ([]domain.EventoMonitoramento, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit <= 0 || limit > len(s.eventos) {
		limit = len(s.eventos)
	}
	return append([]domain.EventoMonitoramento(nil), s.eventos[:limit]...), nil
}

func (s *MemoryStore) DashboardSummary(ctx context.Context) (*domain.DashboardSummary, error) {
	count, _ := s.CountMissoesEmAndamento(ctx)
	chamados, _ := s.ListChamados(ctx, 5)
	cols, _ := s.ListColaboradores(ctx)
	return &domain.DashboardSummary{
		MissoesEmAndamento: count,
		UltimosChamados:    chamados,
		Colaboradores:      cols,
	}, nil
}

func (s *MemoryStore) setSeedData(unidades []domain.Unidade, cols []domain.Colaborador, chamados []domain.Chamado, missoes []domain.Missao, eqs []domain.Equipamento) {
	s.unidades = unidades
	s.colaboradores = cols
	s.chamados = chamados
	s.missoes = missoes
	s.dispositivos = eqs
}

func seedData(s *MemoryStore) {
	data := BuildSeedData()
	s.setSeedData(data.Unidades, data.Colaboradores, data.Chamados, data.Missoes, data.Equipamentos)
	s.seeded = true
}

func sortChamadosByDate(ch []domain.Chamado) {
	for i := 0; i < len(ch); i++ {
		for j := i + 1; j < len(ch); j++ {
			if ch[j].CreatedAt.After(ch[i].CreatedAt) {
				ch[i], ch[j] = ch[j], ch[i]
			}
		}
	}
}
