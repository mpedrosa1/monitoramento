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

func (s *MongoStore) ListCondutorRotaExataDivergencias(
	ctx context.Context,
	status *domain.CondutorRotaExataDivergenciaStatus,
) ([]domain.CondutorRotaExataDivergencia, error) {
	filter := bson.M{}
	if status != nil {
		filter["status"] = *status
	}
	opts := options.Find().SetSort(bson.D{{Key: "detectadoEm", Value: -1}})
	cur, err := s.col("condutor_rotaexata_divergencias").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.CondutorRotaExataDivergencia
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *MongoStore) GetCondutorRotaExataDivergencia(
	ctx context.Context,
	id primitive.ObjectID,
) (*domain.CondutorRotaExataDivergencia, error) {
	var d domain.CondutorRotaExataDivergencia
	err := s.col("condutor_rotaexata_divergencias").FindOne(ctx, bson.M{"_id": id}).Decode(&d)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &d, nil
}

func (s *MongoStore) FindCondutorRotaExataDivergenciaPendenteByVeiculo(
	ctx context.Context,
	veiculoID primitive.ObjectID,
) (*domain.CondutorRotaExataDivergencia, error) {
	var d domain.CondutorRotaExataDivergencia
	err := s.col("condutor_rotaexata_divergencias").FindOne(ctx, bson.M{
		"veiculoId": veiculoID,
		"status":    domain.CondutorDivergenciaPendente,
	}).Decode(&d)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, mongoErrNotFound()
		}
		return nil, err
	}
	return &d, nil
}

func (s *MongoStore) ExistsCondutorRotaExataDivergenciaRecusada(
	ctx context.Context,
	veiculoID primitive.ObjectID,
	rotaExataMotoristaID int,
) (bool, error) {
	err := s.col("condutor_rotaexata_divergencias").FindOne(ctx, bson.M{
		"veiculoId":            veiculoID,
		"status":               domain.CondutorDivergenciaRecusada,
		"rotaExataMotoristaId": rotaExataMotoristaID,
	}).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (s *MongoStore) CreateCondutorRotaExataDivergencia(
	ctx context.Context,
	d *domain.CondutorRotaExataDivergencia,
) error {
	now := time.Now().UTC()
	if d.DetectadoEm.IsZero() {
		d.DetectadoEm = now
	}
	d.CreatedAt = now
	d.UpdatedAt = now
	res, err := s.col("condutor_rotaexata_divergencias").InsertOne(ctx, d)
	if err != nil {
		return err
	}
	d.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateCondutorRotaExataDivergencia(
	ctx context.Context,
	d *domain.CondutorRotaExataDivergencia,
) error {
	d.UpdatedAt = time.Now().UTC()
	result, err := s.col("condutor_rotaexata_divergencias").UpdateOne(
		ctx,
		bson.M{"_id": d.ID},
		bson.M{"$set": d},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteCondutorRotaExataDivergencia(
	ctx context.Context,
	id primitive.ObjectID,
) error {
	result, err := s.col("condutor_rotaexata_divergencias").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) VeiculoIDsComCondutorRotaExataDivergenciaPendente(
	ctx context.Context,
) ([]primitive.ObjectID, error) {
	cur, err := s.col("condutor_rotaexata_divergencias").Find(ctx, bson.M{
		"status": domain.CondutorDivergenciaPendente,
	})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	seen := map[primitive.ObjectID]bool{}
	var ids []primitive.ObjectID
	for cur.Next(ctx) {
		var d domain.CondutorRotaExataDivergencia
		if err := cur.Decode(&d); err != nil {
			return nil, err
		}
		if seen[d.VeiculoID] {
			continue
		}
		seen[d.VeiculoID] = true
		ids = append(ids, d.VeiculoID)
	}
	return ids, nil
}
