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

// ===== MemoryStore: Despesas =====

func (s *MemoryStore) ListDespesasByColaborador(ctx context.Context, colaboradorID primitive.ObjectID, competencia string) ([]domain.Despesa, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.Despesa
	for _, d := range s.despesas {
		if d.ColaboradorID != colaboradorID {
			continue
		}
		if competencia != "" && d.Competencia != competencia {
			continue
		}
		out = append(out, d)
	}
	return out, nil
}

func (s *MemoryStore) ListAllDespesas(ctx context.Context, competencia string) ([]domain.Despesa, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.Despesa
	for _, d := range s.despesas {
		if competencia != "" && d.Competencia != competencia {
			continue
		}
		out = append(out, d)
	}
	return out, nil
}

func (s *MemoryStore) GetDespesa(ctx context.Context, id primitive.ObjectID) (*domain.Despesa, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.despesas {
		if s.despesas[i].ID == id {
			d := s.despesas[i]
			return &d, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateDespesa(ctx context.Context, d *domain.Despesa) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	d.ID = primitive.NewObjectID()
	d.CreatedAt, d.UpdatedAt = now, now
	s.despesas = append(s.despesas, *d)
	return nil
}

func (s *MemoryStore) UpdateDespesa(ctx context.Context, d *domain.Despesa) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.despesas {
		if s.despesas[i].ID == d.ID {
			d.CreatedAt = s.despesas[i].CreatedAt
			d.UpdatedAt = time.Now().UTC()
			s.despesas[i] = *d
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteDespesa(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.despesas[:0]
	for _, d := range s.despesas {
		if d.ID == id {
			found = true
			continue
		}
		next = append(next, d)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.despesas = next
	return nil
}

func (s *MemoryStore) ListDepositosDespesa(ctx context.Context, colaboradorID primitive.ObjectID, competencia string) ([]domain.DepositoDespesa, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.DepositoDespesa
	for _, d := range s.depositosDespesa {
		if d.ColaboradorID != colaboradorID {
			continue
		}
		if competencia != "" && d.Competencia != competencia {
			continue
		}
		out = append(out, d)
	}
	return out, nil
}

func (s *MemoryStore) ListAllDepositosDespesa(ctx context.Context, competencia string) ([]domain.DepositoDespesa, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.DepositoDespesa
	for _, d := range s.depositosDespesa {
		if competencia != "" && d.Competencia != competencia {
			continue
		}
		out = append(out, d)
	}
	return out, nil
}

func (s *MemoryStore) UpsertDepositoDespesa(ctx context.Context, d *domain.DepositoDespesa) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	for i := range s.depositosDespesa {
		existing := &s.depositosDespesa[i]
		if existing.ColaboradorID == d.ColaboradorID &&
			existing.Competencia == d.Competencia &&
			existing.Modalidade == d.Modalidade {
			d.ID = existing.ID
			d.CreatedAt = existing.CreatedAt
			d.UpdatedAt = now
			s.depositosDespesa[i] = *d
			return nil
		}
	}
	d.ID = primitive.NewObjectID()
	d.CreatedAt, d.UpdatedAt = now, now
	s.depositosDespesa = append(s.depositosDespesa, *d)
	return nil
}

// ===== MongoStore: Despesas =====

func (s *MongoStore) ListDespesasByColaborador(ctx context.Context, colaboradorID primitive.ObjectID, competencia string) ([]domain.Despesa, error) {
	filter := bson.M{"colaboradorId": colaboradorID}
	if competencia != "" {
		filter["competencia"] = competencia
	}
	cur, err := s.col("despesas").Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "data", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []domain.Despesa
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *MongoStore) ListAllDespesas(ctx context.Context, competencia string) ([]domain.Despesa, error) {
	filter := bson.M{}
	if competencia != "" {
		filter["competencia"] = competencia
	}
	cur, err := s.col("despesas").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []domain.Despesa
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *MongoStore) GetDespesa(ctx context.Context, id primitive.ObjectID) (*domain.Despesa, error) {
	var d domain.Despesa
	err := s.col("despesas").FindOne(ctx, bson.M{"_id": id}).Decode(&d)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &d, nil
}

func (s *MongoStore) CreateDespesa(ctx context.Context, d *domain.Despesa) error {
	now := time.Now().UTC()
	d.CreatedAt, d.UpdatedAt = now, now
	res, err := s.col("despesas").InsertOne(ctx, d)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		d.ID = oid
	}
	return nil
}

func (s *MongoStore) UpdateDespesa(ctx context.Context, d *domain.Despesa) error {
	d.UpdatedAt = time.Now().UTC()
	result, err := s.col("despesas").UpdateOne(ctx, bson.M{"_id": d.ID}, bson.M{"$set": d})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteDespesa(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("despesas").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) ListDepositosDespesa(ctx context.Context, colaboradorID primitive.ObjectID, competencia string) ([]domain.DepositoDespesa, error) {
	filter := bson.M{"colaboradorId": colaboradorID}
	if competencia != "" {
		filter["competencia"] = competencia
	}
	cur, err := s.col("despesas_depositos").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []domain.DepositoDespesa
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *MongoStore) ListAllDepositosDespesa(ctx context.Context, competencia string) ([]domain.DepositoDespesa, error) {
	filter := bson.M{}
	if competencia != "" {
		filter["competencia"] = competencia
	}
	cur, err := s.col("despesas_depositos").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []domain.DepositoDespesa
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *MongoStore) UpsertDepositoDespesa(ctx context.Context, d *domain.DepositoDespesa) error {
	now := time.Now().UTC()
	filter := bson.M{
		"colaboradorId": d.ColaboradorID,
		"competencia":   d.Competencia,
		"modalidade":    d.Modalidade,
	}
	var existing domain.DepositoDespesa
	err := s.col("despesas_depositos").FindOne(ctx, filter).Decode(&existing)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return err
	}
	if errors.Is(err, mongo.ErrNoDocuments) {
		d.CreatedAt, d.UpdatedAt = now, now
		res, insErr := s.col("despesas_depositos").InsertOne(ctx, d)
		if insErr != nil {
			return insErr
		}
		if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
			d.ID = oid
		}
		return nil
	}
	d.ID = existing.ID
	d.CreatedAt = existing.CreatedAt
	d.UpdatedAt = now
	_, err = s.col("despesas_depositos").UpdateOne(ctx, filter, bson.M{"$set": d})
	return err
}

// ===== MemoryStore: Ajustes de saldo =====

func (s *MemoryStore) ListAjustesSaldoDespesa(ctx context.Context, colaboradorID primitive.ObjectID) ([]domain.AjusteSaldoDespesa, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.AjusteSaldoDespesa
	for _, a := range s.ajustesSaldoDespesa {
		if a.ColaboradorID == colaboradorID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (s *MemoryStore) ListAllAjustesSaldoDespesa(ctx context.Context) ([]domain.AjusteSaldoDespesa, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]domain.AjusteSaldoDespesa(nil), s.ajustesSaldoDespesa...)
	return out, nil
}

func (s *MemoryStore) UpsertAjusteSaldoDespesa(ctx context.Context, a *domain.AjusteSaldoDespesa) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	for i := range s.ajustesSaldoDespesa {
		existing := &s.ajustesSaldoDespesa[i]
		if existing.ColaboradorID == a.ColaboradorID && existing.Modalidade == a.Modalidade {
			a.ID = existing.ID
			a.CreatedAt = existing.CreatedAt
			a.UpdatedAt = now
			s.ajustesSaldoDespesa[i] = *a
			return nil
		}
	}
	a.ID = primitive.NewObjectID()
	a.CreatedAt, a.UpdatedAt = now, now
	s.ajustesSaldoDespesa = append(s.ajustesSaldoDespesa, *a)
	return nil
}

// ===== MongoStore: Ajustes de saldo =====

func (s *MongoStore) ListAjustesSaldoDespesa(ctx context.Context, colaboradorID primitive.ObjectID) ([]domain.AjusteSaldoDespesa, error) {
	cur, err := s.col("despesas_ajustes_saldo").Find(ctx, bson.M{"colaboradorId": colaboradorID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []domain.AjusteSaldoDespesa
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *MongoStore) ListAllAjustesSaldoDespesa(ctx context.Context) ([]domain.AjusteSaldoDespesa, error) {
	cur, err := s.col("despesas_ajustes_saldo").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []domain.AjusteSaldoDespesa
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *MongoStore) UpsertAjusteSaldoDespesa(ctx context.Context, a *domain.AjusteSaldoDespesa) error {
	now := time.Now().UTC()
	filter := bson.M{
		"colaboradorId": a.ColaboradorID,
		"modalidade":    a.Modalidade,
	}
	var existing domain.AjusteSaldoDespesa
	err := s.col("despesas_ajustes_saldo").FindOne(ctx, filter).Decode(&existing)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return err
	}
	if errors.Is(err, mongo.ErrNoDocuments) {
		a.CreatedAt, a.UpdatedAt = now, now
		res, insErr := s.col("despesas_ajustes_saldo").InsertOne(ctx, a)
		if insErr != nil {
			return insErr
		}
		if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
			a.ID = oid
		}
		return nil
	}
	a.ID = existing.ID
	a.CreatedAt = existing.CreatedAt
	a.UpdatedAt = now
	_, err = s.col("despesas_ajustes_saldo").UpdateOne(ctx, filter, bson.M{"$set": a})
	return err
}
