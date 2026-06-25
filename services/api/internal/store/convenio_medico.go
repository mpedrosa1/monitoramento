package store

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const colFaixasConvenio = "faixas_convenio_medico"

func sortFaixasConvenio(list []domain.FaixaConvenioMedico) {
	sort.SliceStable(list, func(i, j int) bool {
		return list[i].IdadeMin < list[j].IdadeMin
	})
}

// ===== MemoryStore: Faixas do convênio médico =====

func (s *MemoryStore) ListFaixasConvenioMedico(ctx context.Context) ([]domain.FaixaConvenioMedico, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.FaixaConvenioMedico, len(s.faixasConvenio))
	copy(out, s.faixasConvenio)
	sortFaixasConvenio(out)
	return out, nil
}

func (s *MemoryStore) GetFaixaConvenioMedico(ctx context.Context, id primitive.ObjectID) (*domain.FaixaConvenioMedico, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.faixasConvenio {
		if s.faixasConvenio[i].ID == id {
			f := s.faixasConvenio[i]
			return &f, nil
		}
	}
	return nil, mongoErrNotFound()
}

func (s *MemoryStore) CreateFaixaConvenioMedico(ctx context.Context, f *domain.FaixaConvenioMedico) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	f.ID = primitive.NewObjectID()
	f.CreatedAt, f.UpdatedAt = now, now
	s.faixasConvenio = append(s.faixasConvenio, *f)
	return nil
}

func (s *MemoryStore) UpdateFaixaConvenioMedico(ctx context.Context, f *domain.FaixaConvenioMedico) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.faixasConvenio {
		if s.faixasConvenio[i].ID == f.ID {
			f.CreatedAt = s.faixasConvenio[i].CreatedAt
			f.UpdatedAt = time.Now().UTC()
			s.faixasConvenio[i] = *f
			return nil
		}
	}
	return mongoErrNotFound()
}

func (s *MemoryStore) DeleteFaixaConvenioMedico(ctx context.Context, id primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	found := false
	next := s.faixasConvenio[:0]
	for _, f := range s.faixasConvenio {
		if f.ID == id {
			found = true
			continue
		}
		next = append(next, f)
	}
	if !found {
		return mongoErrNotFound()
	}
	s.faixasConvenio = next
	return nil
}

func (s *MemoryStore) SeedFaixasConvenioMedicoIfEmpty(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.faixasConvenio) > 0 {
		return nil
	}
	now := time.Now().UTC()
	for _, f := range domain.FaixasConvenioMedicoPadrao() {
		f.ID = primitive.NewObjectID()
		f.CreatedAt, f.UpdatedAt = now, now
		s.faixasConvenio = append(s.faixasConvenio, f)
	}
	return nil
}

// ===== MongoStore: Faixas do convênio médico =====

func (s *MongoStore) ListFaixasConvenioMedico(ctx context.Context) ([]domain.FaixaConvenioMedico, error) {
	cur, err := s.col(colFaixasConvenio).Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "idadeMin", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.FaixaConvenioMedico
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetFaixaConvenioMedico(ctx context.Context, id primitive.ObjectID) (*domain.FaixaConvenioMedico, error) {
	var f domain.FaixaConvenioMedico
	err := s.col(colFaixasConvenio).FindOne(ctx, bson.M{"_id": id}).Decode(&f)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &f, nil
}

func (s *MongoStore) CreateFaixaConvenioMedico(ctx context.Context, f *domain.FaixaConvenioMedico) error {
	now := time.Now().UTC()
	f.CreatedAt, f.UpdatedAt = now, now
	res, err := s.col(colFaixasConvenio).InsertOne(ctx, f)
	if err != nil {
		return err
	}
	f.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateFaixaConvenioMedico(ctx context.Context, f *domain.FaixaConvenioMedico) error {
	f.UpdatedAt = time.Now().UTC()
	result, err := s.col(colFaixasConvenio).UpdateOne(ctx, bson.M{"_id": f.ID}, bson.M{"$set": f})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteFaixaConvenioMedico(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col(colFaixasConvenio).DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) SeedFaixasConvenioMedicoIfEmpty(ctx context.Context) error {
	count, err := s.col(colFaixasConvenio).EstimatedDocumentCount(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	now := time.Now().UTC()
	var docs []interface{}
	for _, f := range domain.FaixasConvenioMedicoPadrao() {
		f.ID = primitive.NewObjectID()
		f.CreatedAt, f.UpdatedAt = now, now
		docs = append(docs, f)
	}
	if len(docs) == 0 {
		return nil
	}
	_, err = s.col(colFaixasConvenio).InsertMany(ctx, docs)
	return err
}
