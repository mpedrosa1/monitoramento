package store

import (
	"context"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoStore struct {
	client *mongo.Client
	db     *mongo.Database
}

func NewMongoStore(ctx context.Context, uri, dbName string) (*MongoStore, error) {
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	db := client.Database(dbName)
	s := &MongoStore{client: client, db: db}
	if err := s.ensureIndexes(ctx); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *MongoStore) ensureIndexes(ctx context.Context) error {
	indexes := []struct {
		coll string
		keys bson.D
	}{
		{"chamados", bson.D{{Key: "createdAt", Value: -1}}},
		{"colaboradores", bson.D{{Key: "unidadeId", Value: 1}}},
		{"equipamentos", bson.D{{Key: "nome", Value: 1}}},
		{"eventos_monitoramento", bson.D{{Key: "createdAt", Value: -1}}},
	}
	for _, idx := range indexes {
		_, err := s.db.Collection(idx.coll).Indexes().CreateOne(ctx, mongo.IndexModel{Keys: idx.keys})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *MongoStore) Ping(ctx context.Context) error {
	return s.client.Ping(ctx, nil)
}

func (s *MongoStore) col(name string) *mongo.Collection {
	return s.db.Collection(name)
}

func (s *MongoStore) ListUnidades(ctx context.Context) ([]domain.Unidade, error) {
	cur, err := s.col("unidades").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "nome", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.Unidade
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetUnidade(ctx context.Context, id primitive.ObjectID) (*domain.Unidade, error) {
	var u domain.Unidade
	err := s.col("unidades").FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *MongoStore) CreateUnidade(ctx context.Context, u *domain.Unidade) error {
	now := time.Now().UTC()
	u.CreatedAt, u.UpdatedAt = now, now
	res, err := s.col("unidades").InsertOne(ctx, u)
	if err != nil {
		return err
	}
	u.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateUnidade(ctx context.Context, u *domain.Unidade) error {
	u.UpdatedAt = time.Now().UTC()
	result, err := s.col("unidades").UpdateOne(ctx, bson.M{"_id": u.ID}, bson.M{"$set": u})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteUnidade(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("unidades").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) ListColaboradores(ctx context.Context) ([]domain.Colaborador, error) {
	cur, err := s.col("colaboradores").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "nome", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.Colaborador
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetColaborador(ctx context.Context, id primitive.ObjectID) (*domain.Colaborador, error) {
	var c domain.Colaborador
	err := s.col("colaboradores").FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *MongoStore) CreateColaborador(ctx context.Context, c *domain.Colaborador) error {
	now := time.Now().UTC()
	c.CreatedAt, c.UpdatedAt = now, now
	res, err := s.col("colaboradores").InsertOne(ctx, c)
	if err != nil {
		return err
	}
	c.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateColaborador(ctx context.Context, c *domain.Colaborador) error {
	c.UpdatedAt = time.Now().UTC()
	_, err := s.col("colaboradores").UpdateOne(ctx, bson.M{"_id": c.ID}, bson.M{"$set": c})
	return err
}

func (s *MongoStore) ListChamados(ctx context.Context, limit int) ([]domain.Chamado, error) {
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cur, err := s.col("chamados").Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.Chamado
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) GetChamado(ctx context.Context, id primitive.ObjectID) (*domain.Chamado, error) {
	var c domain.Chamado
	err := s.col("chamados").FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *MongoStore) CreateChamado(ctx context.Context, c *domain.Chamado) error {
	now := time.Now().UTC()
	c.CreatedAt, c.UpdatedAt = now, now
	res, err := s.col("chamados").InsertOne(ctx, c)
	if err != nil {
		return err
	}
	c.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) UpdateChamado(ctx context.Context, c *domain.Chamado) error {
	c.UpdatedAt = time.Now().UTC()
	result, err := s.col("chamados").UpdateOne(ctx, bson.M{"_id": c.ID}, bson.M{"$set": c})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) DeleteChamado(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("chamados").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) ListMissoes(ctx context.Context) ([]domain.Missao, error) {
	cur, err := s.col("missoes").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.Missao
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) CountMissoesEmAndamento(ctx context.Context) (int, error) {
	n, err := s.col("missoes").CountDocuments(ctx, bson.M{"status": domain.MissaoEmAndamento})
	return int(n), err
}

func (s *MongoStore) ListEquipamentos(ctx context.Context) ([]domain.Equipamento, error) {
	cur, err := s.col("equipamentos").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "nome", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.Equipamento
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if len(out) > 0 {
		return out, nil
	}
	// fallback coleção legada
	cur2, err := s.col("dispositivos").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "nome", Value: 1}}))
	if err != nil {
		return out, nil
	}
	defer cur2.Close(ctx)
	return out, cur2.All(ctx, &out)
}

func (s *MongoStore) ListDispositivos(ctx context.Context) ([]domain.Dispositivo, error) {
	return s.ListEquipamentos(ctx)
}

func (s *MongoStore) CreateEquipamento(ctx context.Context, e *domain.Equipamento) error {
	now := time.Now().UTC()
	e.CreatedAt, e.UpdatedAt = now, now
	res, err := s.col("equipamentos").InsertOne(ctx, e)
	if err != nil {
		return err
	}
	e.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) CreateDispositivo(ctx context.Context, d *domain.Dispositivo) error {
	return s.CreateEquipamento(ctx, d)
}

func (s *MongoStore) UpdateEquipamento(ctx context.Context, e *domain.Equipamento) error {
	e.UpdatedAt = time.Now().UTC()
	result, err := s.col("equipamentos").UpdateOne(ctx, bson.M{"_id": e.ID}, bson.M{"$set": e})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongoErrNotFound()
	}
	return nil
}

func (s *MongoStore) UpdateDispositivo(ctx context.Context, d *domain.Dispositivo) error {
	return s.UpdateEquipamento(ctx, d)
}

func (s *MongoStore) DeleteEquipamento(ctx context.Context, id primitive.ObjectID) error {
	result, err := s.col("equipamentos").DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		result, err = s.col("dispositivos").DeleteOne(ctx, bson.M{"_id": id})
		if err != nil {
			return err
		}
		if result.DeletedCount == 0 {
			return mongoErrNotFound()
		}
	}
	_, err = s.col("unidades").UpdateMany(
		ctx,
		bson.M{"equipamentos.equipamentoId": id},
		bson.M{"$pull": bson.M{"equipamentos": bson.M{"equipamentoId": id}}},
	)
	return err
}

func (s *MongoStore) CreateEvento(ctx context.Context, e *domain.EventoMonitoramento) error {
	e.CreatedAt = time.Now().UTC()
	res, err := s.col("eventos_monitoramento").InsertOne(ctx, e)
	if err != nil {
		return err
	}
	e.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) ListEventos(ctx context.Context, limit int) ([]domain.EventoMonitoramento, error) {
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(int64(limit))
	cur, err := s.col("eventos_monitoramento").Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []domain.EventoMonitoramento
	return out, cur.All(ctx, &out)
}

func (s *MongoStore) DashboardSummary(ctx context.Context) (*domain.DashboardSummary, error) {
	count, err := s.CountMissoesEmAndamento(ctx)
	if err != nil {
		return nil, err
	}
	chamados, err := s.ListChamados(ctx, 5)
	if err != nil {
		return nil, err
	}
	cols, err := s.ListColaboradores(ctx)
	if err != nil {
		return nil, err
	}
	return &domain.DashboardSummary{
		MissoesEmAndamento: count,
		UltimosChamados:    chamados,
		Colaboradores:      cols,
	}, nil
}
