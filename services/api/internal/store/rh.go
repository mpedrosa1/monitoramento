package store

import (
	"context"
	"errors"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ===== MemoryStore: Escalas =====

func (s *MemoryStore) ListEscalas(ctx context.Context) ([]domain.EscalaTrabalho, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.EscalaTrabalho, len(s.escalas))
	copy(out, s.escalas)
	return out, nil
}

func (s *MemoryStore) GetEscala(ctx context.Context, id primitive.ObjectID) (*domain.EscalaTrabalho, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.escalas {
		if s.escalas[i].ID == id {
			e := s.escalas[i]
			return &e, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateEscala(ctx context.Context, e *domain.EscalaTrabalho) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	e.ID = primitive.NewObjectID()
	e.CreatedAt, e.UpdatedAt = now, now
	s.escalas = append(s.escalas, *e)
	return nil
}

func (s *MemoryStore) UpdateEscala(ctx context.Context, e *domain.EscalaTrabalho) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.escalas {
		if s.escalas[i].ID == e.ID {
			e.CreatedAt = s.escalas[i].CreatedAt
			e.UpdatedAt = time.Now().UTC()
			s.escalas[i] = *e
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteEscala(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.escalas[:0]
	for _, e := range s.escalas {
		if e.ID == id {
			found = true
			continue
		}
		next = append(next, e)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.escalas = next
	return nil
}

// ===== MemoryStore: Sobreavisos =====

func (s *MemoryStore) ListSobreavisos(ctx context.Context) ([]domain.Sobreaviso, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Sobreaviso, len(s.sobreavisos))
	copy(out, s.sobreavisos)
	return out, nil
}

func (s *MemoryStore) GetSobreaviso(ctx context.Context, id primitive.ObjectID) (*domain.Sobreaviso, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.sobreavisos {
		if s.sobreavisos[i].ID == id {
			sb := s.sobreavisos[i]
			return &sb, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateSobreaviso(ctx context.Context, sb *domain.Sobreaviso) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	sb.ID = primitive.NewObjectID()
	sb.CreatedAt, sb.UpdatedAt = now, now
	s.sobreavisos = append(s.sobreavisos, *sb)
	return nil
}

func (s *MemoryStore) UpdateSobreaviso(ctx context.Context, sb *domain.Sobreaviso) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.sobreavisos {
		if s.sobreavisos[i].ID == sb.ID {
			sb.CreatedAt = s.sobreavisos[i].CreatedAt
			sb.UpdatedAt = time.Now().UTC()
			s.sobreavisos[i] = *sb
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteSobreaviso(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.sobreavisos[:0]
	for _, sb := range s.sobreavisos {
		if sb.ID == id {
			found = true
			continue
		}
		next = append(next, sb)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.sobreavisos = next
	return nil
}

// ===== MemoryStore: Definições de sobreaviso =====

func (s *MemoryStore) ListDefinicoesSobreaviso(ctx context.Context) ([]domain.EscalaSobreavisoDefinida, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.EscalaSobreavisoDefinida, len(s.definicoesSobreaviso))
	copy(out, s.definicoesSobreaviso)
	return out, nil
}

func (s *MemoryStore) UpsertDefinicaoSobreaviso(ctx context.Context, d *domain.EscalaSobreavisoDefinida) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if d.DefinidaEm.IsZero() {
		d.DefinidaEm = time.Now().UTC()
	}
	for i := range s.definicoesSobreaviso {
		if s.definicoesSobreaviso[i].Competencia == d.Competencia {
			d.ID = s.definicoesSobreaviso[i].ID
			s.definicoesSobreaviso[i] = *d
			return nil
		}
	}
	d.ID = primitive.NewObjectID()
	s.definicoesSobreaviso = append(s.definicoesSobreaviso, *d)
	return nil
}

// ===== MongoStore: Escalas =====

func (s *MongoStore) ListEscalas(ctx context.Context) ([]domain.EscalaTrabalho, error) {
	cur, err := s.col("escalas_trabalho").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "nome", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.EscalaTrabalho
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetEscala(ctx context.Context, id primitive.ObjectID) (*domain.EscalaTrabalho, error) {
	var e domain.EscalaTrabalho
	err := s.col("escalas_trabalho").FindOne(ctx, bson.M{"_id": id}).Decode(&e)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &e, nil
}

func (s *MongoStore) CreateEscala(ctx context.Context, e *domain.EscalaTrabalho) error {
	now := time.Now().UTC()
	e.CreatedAt, e.UpdatedAt = now, now
	res, err := s.col("escalas_trabalho").InsertOne(ctx, e)
	if err != nil {
		return err
	}
	e.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateEscala(ctx context.Context, e *domain.EscalaTrabalho) error {
	e.UpdatedAt = time.Now().UTC()
	result, err := s.col("escalas_trabalho").UpdateOne(ctx, bson.M{"_id": e.ID}, bson.M{"$set": e})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteEscala(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("escalas_trabalho").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

// ===== MongoStore: Sobreavisos =====

func (s *MongoStore) ListSobreavisos(ctx context.Context) ([]domain.Sobreaviso, error) {
	cur, err := s.col("sobreavisos").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "dataInicio", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.Sobreaviso
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetSobreaviso(ctx context.Context, id primitive.ObjectID) (*domain.Sobreaviso, error) {
	var sb domain.Sobreaviso
	err := s.col("sobreavisos").FindOne(ctx, bson.M{"_id": id}).Decode(&sb)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &sb, nil
}

func (s *MongoStore) CreateSobreaviso(ctx context.Context, sb *domain.Sobreaviso) error {
	now := time.Now().UTC()
	sb.CreatedAt, sb.UpdatedAt = now, now
	res, err := s.col("sobreavisos").InsertOne(ctx, sb)
	if err != nil {
		return err
	}
	sb.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateSobreaviso(ctx context.Context, sb *domain.Sobreaviso) error {
	sb.UpdatedAt = time.Now().UTC()
	result, err := s.col("sobreavisos").UpdateOne(ctx, bson.M{"_id": sb.ID}, bson.M{"$set": sb})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteSobreaviso(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("sobreavisos").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

// ===== MongoStore: Definições de sobreaviso =====

func (s *MongoStore) ListDefinicoesSobreaviso(ctx context.Context) ([]domain.EscalaSobreavisoDefinida, error) {
	cur, err := s.col("sobreavisos_definidos").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.EscalaSobreavisoDefinida
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) UpsertDefinicaoSobreaviso(ctx context.Context, d *domain.EscalaSobreavisoDefinida) error {
	if d.DefinidaEm.IsZero() {
		d.DefinidaEm = time.Now().UTC()
	}
	_, err := s.col("sobreavisos_definidos").UpdateOne(
		ctx,
		bson.M{"competencia": d.Competencia},
		bson.M{
			"$set": bson.M{
				"definidaPor":      d.DefinidaPor,
				"totalNotificados": d.TotalNotificados,
				"definidaEm":       d.DefinidaEm,
			},
			"$setOnInsert": bson.M{"_id": primitive.NewObjectID()},
		},
		options.Update().SetUpsert(true),
	)
	return err
}
