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

const colAlertasEquipamento = "alertas_equipamento"

// ===== MemoryStore: Alertas de equipamento =====

func (s *MemoryStore) ListAlertasEquipamento(ctx context.Context) ([]domain.AlertaEquipamento, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.AlertaEquipamento, len(s.alertasEquipamento))
	copy(out, s.alertasEquipamento)
	return out, nil
}

func (s *MemoryStore) ListAlertasEquipamentoByAlvo(ctx context.Context, unidadeID, equipamentoID primitive.ObjectID, porta int) ([]domain.AlertaEquipamento, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []domain.AlertaEquipamento
	for _, a := range s.alertasEquipamento {
		if a.UnidadeID == unidadeID && a.EquipamentoID == equipamentoID && a.Porta == porta {
			out = append(out, a)
		}
	}
	return out, nil
}

func (s *MemoryStore) GetAlertaEquipamento(ctx context.Context, id primitive.ObjectID) (*domain.AlertaEquipamento, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.alertasEquipamento {
		if s.alertasEquipamento[i].ID == id {
			a := s.alertasEquipamento[i]
			return &a, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateAlertaEquipamento(ctx context.Context, a *domain.AlertaEquipamento) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	a.ID = primitive.NewObjectID()
	a.CreatedAt, a.UpdatedAt = now, now
	s.alertasEquipamento = append(s.alertasEquipamento, *a)
	return nil
}

func (s *MemoryStore) UpdateAlertaEquipamento(ctx context.Context, a *domain.AlertaEquipamento) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.alertasEquipamento {
		if s.alertasEquipamento[i].ID == a.ID {
			a.CreatedAt = s.alertasEquipamento[i].CreatedAt
			a.UpdatedAt = time.Now().UTC()
			s.alertasEquipamento[i] = *a
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteAlertaEquipamento(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.alertasEquipamento[:0]
	for _, a := range s.alertasEquipamento {
		if a.ID == id {
			found = true
			continue
		}
		next = append(next, a)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.alertasEquipamento = next
	return nil
}

// ===== MongoStore: Alertas de equipamento =====

func (s *MongoStore) ListAlertasEquipamento(ctx context.Context) ([]domain.AlertaEquipamento, error) {
	cur, err := s.col(colAlertasEquipamento).Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.AlertaEquipamento
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) ListAlertasEquipamentoByAlvo(ctx context.Context, unidadeID, equipamentoID primitive.ObjectID, porta int) ([]domain.AlertaEquipamento, error) {
	filter := bson.M{
		"unidadeId":     unidadeID,
		"equipamentoId": equipamentoID,
		"porta":         porta,
	}
	cur, err := s.col(colAlertasEquipamento).Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "pontoNome", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.AlertaEquipamento
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetAlertaEquipamento(ctx context.Context, id primitive.ObjectID) (*domain.AlertaEquipamento, error) {
	var a domain.AlertaEquipamento
	err := s.col(colAlertasEquipamento).FindOne(ctx, bson.M{"_id": id}).Decode(&a)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &a, nil
}

func (s *MongoStore) CreateAlertaEquipamento(ctx context.Context, a *domain.AlertaEquipamento) error {
	now := time.Now().UTC()
	a.CreatedAt, a.UpdatedAt = now, now
	res, err := s.col(colAlertasEquipamento).InsertOne(ctx, a)
	if err != nil {
		return err
	}
	a.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateAlertaEquipamento(ctx context.Context, a *domain.AlertaEquipamento) error {
	a.UpdatedAt = time.Now().UTC()
	result, err := s.col(colAlertasEquipamento).UpdateOne(ctx, bson.M{"_id": a.ID}, bson.M{"$set": a})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteAlertaEquipamento(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col(colAlertasEquipamento).DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}
