package store

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MemoryStore) ListVeiculoPeriodosMotorista(ctx context.Context, veiculoID primitive.ObjectID) ([]domain.VeiculoPeriodoMotorista, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.VeiculoPeriodoMotorista
	for _, p := range s.veiculoPeriodosMotorista {
		if p.VeiculoID == veiculoID {
			out = append(out, p)
		}
	}
	sortPeriodosMotorista(out)
	return out, nil
}

func (s *MemoryStore) GetVeiculoPeriodoMotorista(ctx context.Context, id primitive.ObjectID) (*domain.VeiculoPeriodoMotorista, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.veiculoPeriodosMotorista {
		if s.veiculoPeriodosMotorista[i].ID == id {
			p := s.veiculoPeriodosMotorista[i]
			return &p, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateVeiculoPeriodoMotorista(ctx context.Context, p *domain.VeiculoPeriodoMotorista) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	p.ID = primitive.NewObjectID()
	p.CreatedAt, p.UpdatedAt = now, now
	s.veiculoPeriodosMotorista = append(s.veiculoPeriodosMotorista, *p)
	return nil
}

func (s *MemoryStore) UpdateVeiculoPeriodoMotorista(ctx context.Context, p *domain.VeiculoPeriodoMotorista) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.veiculoPeriodosMotorista {
		if s.veiculoPeriodosMotorista[i].ID == p.ID {
			p.UpdatedAt = time.Now().UTC()
			s.veiculoPeriodosMotorista[i] = *p
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteVeiculoPeriodoMotorista(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.veiculoPeriodosMotorista[:0]
	for _, p := range s.veiculoPeriodosMotorista {
		if p.ID == id {
			found = true
			continue
		}
		next = append(next, p)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.veiculoPeriodosMotorista = next
	return nil
}

func (s *MemoryStore) FecharPeriodoMotoristaAberto(ctx context.Context, veiculoID primitive.ObjectID, dataFim, horaFim string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	dataFim = strings.TrimSpace(dataFim)
	horaFim = strings.TrimSpace(horaFim)
	for i := range s.veiculoPeriodosMotorista {
		p := &s.veiculoPeriodosMotorista[i]
		if p.VeiculoID == veiculoID && strings.TrimSpace(p.DataFim) == "" {
			p.DataFim = dataFim
			p.HoraFim = horaFim
			p.UpdatedAt = time.Now().UTC()
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteVeiculoHistoricoPorVeiculo(ctx context.Context, veiculoID primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	filterPeriodos := s.veiculoPeriodosMotorista[:0]
	for _, p := range s.veiculoPeriodosMotorista {
		if p.VeiculoID != veiculoID {
			filterPeriodos = append(filterPeriodos, p)
		}
	}
	s.veiculoPeriodosMotorista = filterPeriodos

	filterMultas := s.veiculoMultas[:0]
	for _, m := range s.veiculoMultas {
		if m.VeiculoID != veiculoID {
			filterMultas = append(filterMultas, m)
		}
	}
	s.veiculoMultas = filterMultas
	return nil
}

func (s *MemoryStore) ListVeiculoMultas(ctx context.Context, veiculoID primitive.ObjectID) ([]domain.VeiculoMulta, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.VeiculoMulta
	for _, m := range s.veiculoMultas {
		if m.VeiculoID == veiculoID {
			out = append(out, m)
		}
	}
	sortMultas(out)
	return out, nil
}

func (s *MemoryStore) GetVeiculoMulta(ctx context.Context, id primitive.ObjectID) (*domain.VeiculoMulta, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.veiculoMultas {
		if s.veiculoMultas[i].ID == id {
			m := s.veiculoMultas[i]
			return &m, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateVeiculoMulta(ctx context.Context, m *domain.VeiculoMulta) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	m.ID = primitive.NewObjectID()
	m.CreatedAt, m.UpdatedAt = now, now
	s.veiculoMultas = append(s.veiculoMultas, *m)
	return nil
}

func (s *MemoryStore) UpdateVeiculoMulta(ctx context.Context, m *domain.VeiculoMulta) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.veiculoMultas {
		if s.veiculoMultas[i].ID == m.ID {
			m.UpdatedAt = time.Now().UTC()
			s.veiculoMultas[i] = *m
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteVeiculoMulta(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.veiculoMultas[:0]
	for _, m := range s.veiculoMultas {
		if m.ID == id {
			found = true
			continue
		}
		next = append(next, m)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.veiculoMultas = next
	return nil
}

func sortPeriodosMotorista(list []domain.VeiculoPeriodoMotorista) {
	sort.Slice(list, func(i, j int) bool {
		if list[i].DataInicio == list[j].DataInicio {
			return list[i].CreatedAt.After(list[j].CreatedAt)
		}
		return list[i].DataInicio > list[j].DataInicio
	})
}

func sortMultas(list []domain.VeiculoMulta) {
	sort.Slice(list, func(i, j int) bool {
		if list[i].Data == list[j].Data {
			return list[i].CreatedAt.After(list[j].CreatedAt)
		}
		return list[i].Data > list[j].Data
	})
}

func (s *MongoStore) ListVeiculoPeriodosMotorista(ctx context.Context, veiculoID primitive.ObjectID) ([]domain.VeiculoPeriodoMotorista, error) {
	opts := options.Find().SetSort(bson.D{
		{Key: "dataInicio", Value: -1},
		{Key: "createdAt", Value: -1},
	})
	cur, err := s.col("veiculo_periodos_motorista").Find(ctx, bson.M{"veiculoId": veiculoID}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.VeiculoPeriodoMotorista
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetVeiculoPeriodoMotorista(ctx context.Context, id primitive.ObjectID) (*domain.VeiculoPeriodoMotorista, error) {
	var p domain.VeiculoPeriodoMotorista
	err := s.col("veiculo_periodos_motorista").FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err != nil {
		if isMongoNotFound(err) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &p, nil
}

func (s *MongoStore) CreateVeiculoPeriodoMotorista(ctx context.Context, p *domain.VeiculoPeriodoMotorista) error {
	now := time.Now().UTC()
	p.CreatedAt, p.UpdatedAt = now, now
	res, err := s.col("veiculo_periodos_motorista").InsertOne(ctx, p)
	if err != nil {
		return err
	}
	p.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateVeiculoPeriodoMotorista(ctx context.Context, p *domain.VeiculoPeriodoMotorista) error {
	p.UpdatedAt = time.Now().UTC()
	result, err := s.col("veiculo_periodos_motorista").UpdateOne(ctx, bson.M{"_id": p.ID}, bson.M{"$set": p})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteVeiculoPeriodoMotorista(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("veiculo_periodos_motorista").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) FecharPeriodoMotoristaAberto(ctx context.Context, veiculoID primitive.ObjectID, dataFim, horaFim string) error {
	dataFim = strings.TrimSpace(dataFim)
	horaFim = strings.TrimSpace(horaFim)
	now := time.Now().UTC()
	result, err := s.col("veiculo_periodos_motorista").UpdateOne(
		ctx,
		bson.M{"veiculoId": veiculoID, "dataFim": bson.M{"$in": []any{"", nil}}},
		bson.M{"$set": bson.M{"dataFim": dataFim, "horaFim": horaFim, "updatedAt": now}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteVeiculoHistoricoPorVeiculo(ctx context.Context, veiculoID primitive.ObjectID) error {
	if _, err := s.col("veiculo_periodos_motorista").DeleteMany(ctx, bson.M{"veiculoId": veiculoID}); err != nil {
		return err
	}
	_, err := s.col("veiculo_multas").DeleteMany(ctx, bson.M{"veiculoId": veiculoID})
	return err
}

func (s *MongoStore) ListVeiculoMultas(ctx context.Context, veiculoID primitive.ObjectID) ([]domain.VeiculoMulta, error) {
	opts := options.Find().SetSort(bson.D{
		{Key: "data", Value: -1},
		{Key: "createdAt", Value: -1},
	})
	cur, err := s.col("veiculo_multas").Find(ctx, bson.M{"veiculoId": veiculoID}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.VeiculoMulta
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetVeiculoMulta(ctx context.Context, id primitive.ObjectID) (*domain.VeiculoMulta, error) {
	var m domain.VeiculoMulta
	err := s.col("veiculo_multas").FindOne(ctx, bson.M{"_id": id}).Decode(&m)
	if err != nil {
		if isMongoNotFound(err) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &m, nil
}

func (s *MongoStore) CreateVeiculoMulta(ctx context.Context, m *domain.VeiculoMulta) error {
	now := time.Now().UTC()
	m.CreatedAt, m.UpdatedAt = now, now
	res, err := s.col("veiculo_multas").InsertOne(ctx, m)
	if err != nil {
		return err
	}
	m.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateVeiculoMulta(ctx context.Context, m *domain.VeiculoMulta) error {
	m.UpdatedAt = time.Now().UTC()
	result, err := s.col("veiculo_multas").UpdateOne(ctx, bson.M{"_id": m.ID}, bson.M{"$set": m})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteVeiculoMulta(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("veiculo_multas").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func isMongoNotFound(err error) bool {
	return errors.Is(err, mongo.ErrNoDocuments)
}
