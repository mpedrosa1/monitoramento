package store

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MemoryStore struct {
	mu                   sync.RWMutex
	unidades             []domain.Unidade
	colaboradores        []domain.Colaborador
	escalas              []domain.EscalaTrabalho
	sobreavisos          []domain.Sobreaviso
	definicoesSobreaviso []domain.EscalaSobreavisoDefinida
	chamados             []domain.Chamado
	missoes              []domain.Missao
	dispositivos         []domain.Equipamento
	veiculos             []domain.Veiculo
	veiculoPeriodosMotorista []domain.VeiculoPeriodoMotorista
	veiculoMultas        []domain.VeiculoMulta
	trocasVeiculo        []domain.TrocaVeiculo
	condutorRotaExataDivergencias []domain.CondutorRotaExataDivergencia
	notificacoes         []domain.Notificacao
	pushTokens           []domain.PushToken
	eventos              []domain.EventoMonitoramento
	despesas             []domain.Despesa
	depositosDespesa     []domain.DepositoDespesa
	ajustesSaldoDespesa  []domain.AjusteSaldoDespesa
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{}
}

func (s *MemoryStore) Ping(ctx context.Context) error { return nil }

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

func (s *MemoryStore) DeleteUnidade(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.unidades[:0]
	for _, u := range s.unidades {
		if u.ID == id {
			found = true
			continue
		}
		next = append(next, u)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.unidades = next
	return nil
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

func (s *MemoryStore) GetColaboradorByEmail(ctx context.Context, email string) (*domain.Colaborador, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.colaboradores {
		c := s.colaboradores[i]
		if strings.EqualFold(c.Email, email) || strings.EqualFold(c.EmailCorporativo, email) {
			cc := c
			return &cc, nil
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
			c.CreatedAt = s.colaboradores[i].CreatedAt
			c.UpdatedAt = time.Now().UTC()
			s.colaboradores[i] = *c
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteColaborador(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.colaboradores[:0]
	for _, c := range s.colaboradores {
		if c.ID == id {
			found = true
			continue
		}
		next = append(next, c)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.colaboradores = next
	return nil
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
			c.CreatedAt = s.chamados[i].CreatedAt
			c.UpdatedAt = time.Now().UTC()
			s.chamados[i] = *c
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteChamado(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.chamados[:0]
	for _, c := range s.chamados {
		if c.ID == id {
			found = true
			continue
		}
		next = append(next, c)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.chamados = next
	return nil
}

func (s *MemoryStore) ListMissoes(ctx context.Context) ([]domain.Missao, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Missao, len(s.missoes))
	copy(out, s.missoes)
	return out, nil
}

func (s *MemoryStore) GetMissao(ctx context.Context, id primitive.ObjectID) (*domain.Missao, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.missoes {
		if s.missoes[i].ID == id {
			m := s.missoes[i]
			return &m, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateMissao(ctx context.Context, m *domain.Missao) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	m.ID = primitive.NewObjectID()
	m.CreatedAt, m.UpdatedAt = now, now
	s.missoes = append(s.missoes, *m)
	return nil
}

func (s *MemoryStore) UpdateMissao(ctx context.Context, m *domain.Missao) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.missoes {
		if s.missoes[i].ID == m.ID {
			m.CreatedAt = s.missoes[i].CreatedAt
			m.UpdatedAt = time.Now().UTC()
			s.missoes[i] = *m
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteMissao(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.missoes[:0]
	for _, m := range s.missoes {
		if m.ID == id {
			found = true
			continue
		}
		next = append(next, m)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.missoes = next
	return nil
}

func (s *MemoryStore) CountMissoesEmAndamento(ctx context.Context) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	chamadosPorID := make(map[primitive.ObjectID]domain.Chamado, len(s.chamados))
	for _, c := range s.chamados {
		chamadosPorID[c.ID] = c
	}
	return domain.ContarMissoesEmAndamento(s.missoes, chamadosPorID), nil
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

func (s *MemoryStore) ListVeiculos(ctx context.Context) ([]domain.Veiculo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Veiculo, len(s.veiculos))
	copy(out, s.veiculos)
	return out, nil
}

func (s *MemoryStore) GetVeiculo(ctx context.Context, id primitive.ObjectID) (*domain.Veiculo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.veiculos {
		if s.veiculos[i].ID == id {
			v := s.veiculos[i]
			return &v, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) GetVeiculosByColaborador(ctx context.Context, colaboradorID primitive.ObjectID) ([]domain.Veiculo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.Veiculo
	for _, v := range s.veiculos {
		if v.ColaboradorID == colaboradorID {
			out = append(out, v)
		}
	}
	return out, nil
}

func (s *MemoryStore) CreateVeiculo(ctx context.Context, v *domain.Veiculo) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	v.ID = primitive.NewObjectID()
	v.CreatedAt, v.UpdatedAt = now, now
	s.veiculos = append(s.veiculos, *v)
	return nil
}

func (s *MemoryStore) UpdateVeiculo(ctx context.Context, v *domain.Veiculo) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.veiculos {
		if s.veiculos[i].ID == v.ID {
			v.UpdatedAt = time.Now().UTC()
			s.veiculos[i] = *v
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteVeiculo(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.veiculos[:0]
	for _, v := range s.veiculos {
		if v.ID == id {
			found = true
			continue
		}
		next = append(next, v)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.veiculos = next

	filterPeriodos := s.veiculoPeriodosMotorista[:0]
	for _, p := range s.veiculoPeriodosMotorista {
		if p.VeiculoID != id {
			filterPeriodos = append(filterPeriodos, p)
		}
	}
	s.veiculoPeriodosMotorista = filterPeriodos

	filterMultas := s.veiculoMultas[:0]
	for _, m := range s.veiculoMultas {
		if m.VeiculoID != id {
			filterMultas = append(filterMultas, m)
		}
	}
	s.veiculoMultas = filterMultas
	return nil
}

func (s *MemoryStore) CreateTrocaVeiculo(ctx context.Context, t *domain.TrocaVeiculo) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	t.ID = primitive.NewObjectID()
	t.CreatedAt = now
	s.trocasVeiculo = append(s.trocasVeiculo, *t)
	return nil
}

func (s *MemoryStore) GetTrocaVeiculo(ctx context.Context, id primitive.ObjectID) (*domain.TrocaVeiculo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.trocasVeiculo {
		if s.trocasVeiculo[i].ID == id {
			t := s.trocasVeiculo[i]
			return &t, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) UpdateTrocaVeiculo(ctx context.Context, t *domain.TrocaVeiculo) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.trocasVeiculo {
		if s.trocasVeiculo[i].ID == t.ID {
			s.trocasVeiculo[i] = *t
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) FindTrocaVeiculoPendente(ctx context.Context, solicitanteID, veiculoAlvoID primitive.ObjectID) (*domain.TrocaVeiculo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.trocasVeiculo {
		t := s.trocasVeiculo[i]
		if t.Status == domain.TrocaVeiculoStatusPendente &&
			t.SolicitanteColaboradorID == solicitanteID &&
			t.VeiculoAlvoID == veiculoAlvoID {
			return &t, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) VeiculoIDsComTrocaNaoAutorizadaPendente(ctx context.Context) ([]primitive.ObjectID, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	veiculoPorID := make(map[primitive.ObjectID]domain.Veiculo, len(s.veiculos))
	for i := range s.veiculos {
		veiculoPorID[s.veiculos[i].ID] = s.veiculos[i]
	}

	seen := map[primitive.ObjectID]bool{}
	var ids []primitive.ObjectID
	for i := range s.trocasVeiculo {
		t := s.trocasVeiculo[i]
		alvo, ok := veiculoPorID[t.VeiculoAlvoID]
		if !ok {
			continue
		}
		if !domain.TrocaPendenteSolicitanteNaoAutorizado(&t, &alvo) {
			continue
		}
		if seen[t.VeiculoAlvoID] {
			continue
		}
		seen[t.VeiculoAlvoID] = true
		ids = append(ids, t.VeiculoAlvoID)
	}
	return ids, nil
}

func (s *MemoryStore) ListNotificacoes(ctx context.Context, colaboradorID primitive.ObjectID, limit int) ([]domain.Notificacao, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.Notificacao
	for i := len(s.notificacoes) - 1; i >= 0; i-- {
		n := s.notificacoes[i]
		if n.DestinatarioColaboradorID != colaboradorID {
			continue
		}
		out = append(out, n)
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	sortNotificacoes(out)
	return out, nil
}

func sortNotificacoes(list []domain.Notificacao) {
	for i := 0; i < len(list); i++ {
		for j := i + 1; j < len(list); j++ {
			li, lj := list[i], list[j]
			swap := false
			if !li.Lida && lj.Lida {
				swap = true
			} else if li.Lida == lj.Lida && li.CreatedAt.Before(lj.CreatedAt) {
				swap = true
			}
			if swap {
				list[i], list[j] = list[j], list[i]
			}
		}
	}
}

func (s *MemoryStore) CreateNotificacao(ctx context.Context, n *domain.Notificacao) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	n.ID = primitive.NewObjectID()
	n.CreatedAt = time.Now().UTC()
	s.notificacoes = append([]domain.Notificacao{*n}, s.notificacoes...)
	return nil
}

func (s *MemoryStore) GetNotificacao(ctx context.Context, id primitive.ObjectID) (*domain.Notificacao, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.notificacoes {
		if s.notificacoes[i].ID == id {
			n := s.notificacoes[i]
			return &n, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) MarcarNotificacaoLida(ctx context.Context, id, colaboradorID primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.notificacoes {
		if s.notificacoes[i].ID == id {
			if s.notificacoes[i].DestinatarioColaboradorID != colaboradorID {
				return mongoErrNotFound()
			}
			s.notificacoes[i].Lida = true
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) UpsertPushToken(ctx context.Context, colaboradorID primitive.ObjectID, token, platform string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	filtered := s.pushTokens[:0]
	for _, pt := range s.pushTokens {
		if pt.ColaboradorID == colaboradorID && pt.Platform == platform && pt.Token != token {
			continue
		}
		filtered = append(filtered, pt)
	}
	s.pushTokens = filtered
	for i := range s.pushTokens {
		if s.pushTokens[i].Token == token {
			s.pushTokens[i].ColaboradorID = colaboradorID
			s.pushTokens[i].Platform = platform
			s.pushTokens[i].UpdatedAt = now
			return nil
		}
	}
	s.pushTokens = append(s.pushTokens, domain.PushToken{
		ID:            primitive.NewObjectID(),
		ColaboradorID: colaboradorID,
		Token:         token,
		Platform:      platform,
		UpdatedAt:     now,
	})
	return nil
}

func (s *MemoryStore) DeletePushToken(ctx context.Context, colaboradorID primitive.ObjectID, token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.pushTokens {
		if s.pushTokens[i].Token == token && s.pushTokens[i].ColaboradorID == colaboradorID {
			s.pushTokens = append(s.pushTokens[:i], s.pushTokens[i+1:]...)
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) ListPushTokens(ctx context.Context, colaboradorID primitive.ObjectID) ([]domain.PushToken, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.PushToken
	for _, pt := range s.pushTokens {
		if pt.ColaboradorID == colaboradorID {
			out = append(out, pt)
		}
	}
	return out, nil
}

func (s *MemoryStore) ListAllPushTokens(ctx context.Context) ([]domain.PushToken, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.PushToken, len(s.pushTokens))
	copy(out, s.pushTokens)
	return out, nil
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

func sortChamadosByDate(ch []domain.Chamado) {
	for i := 0; i < len(ch); i++ {
		for j := i + 1; j < len(ch); j++ {
			if ch[j].CreatedAt.After(ch[i].CreatedAt) {
				ch[i], ch[j] = ch[j], ch[i]
			}
		}
	}
}
