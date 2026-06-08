package store

import (
	"context"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Store interface {
	Ping(ctx context.Context) error

	ListUnidades(ctx context.Context) ([]domain.Unidade, error)
	GetUnidade(ctx context.Context, id primitive.ObjectID) (*domain.Unidade, error)
	CreateUnidade(ctx context.Context, u *domain.Unidade) error
	UpdateUnidade(ctx context.Context, u *domain.Unidade) error
	DeleteUnidade(ctx context.Context, id primitive.ObjectID) error

	ListColaboradores(ctx context.Context) ([]domain.Colaborador, error)
	GetColaborador(ctx context.Context, id primitive.ObjectID) (*domain.Colaborador, error)
	GetColaboradorByEmail(ctx context.Context, email string) (*domain.Colaborador, error)
	CreateColaborador(ctx context.Context, c *domain.Colaborador) error
	UpdateColaborador(ctx context.Context, c *domain.Colaborador) error
	DeleteColaborador(ctx context.Context, id primitive.ObjectID) error

	ListChamados(ctx context.Context, limit int) ([]domain.Chamado, error)
	GetChamado(ctx context.Context, id primitive.ObjectID) (*domain.Chamado, error)
	CreateChamado(ctx context.Context, c *domain.Chamado) error
	UpdateChamado(ctx context.Context, c *domain.Chamado) error
	DeleteChamado(ctx context.Context, id primitive.ObjectID) error

	ListMissoes(ctx context.Context) ([]domain.Missao, error)
	GetMissao(ctx context.Context, id primitive.ObjectID) (*domain.Missao, error)
	CreateMissao(ctx context.Context, m *domain.Missao) error
	UpdateMissao(ctx context.Context, m *domain.Missao) error
	DeleteMissao(ctx context.Context, id primitive.ObjectID) error
	CountMissoesEmAndamento(ctx context.Context) (int, error)

	ListEquipamentos(ctx context.Context) ([]domain.Equipamento, error)
	CreateEquipamento(ctx context.Context, e *domain.Equipamento) error
	UpdateEquipamento(ctx context.Context, e *domain.Equipamento) error
	DeleteEquipamento(ctx context.Context, id primitive.ObjectID) error

	// ListDispositivos alias legado.
	ListDispositivos(ctx context.Context) ([]domain.Dispositivo, error)
	CreateDispositivo(ctx context.Context, d *domain.Dispositivo) error
	UpdateDispositivo(ctx context.Context, d *domain.Dispositivo) error

	CreateEvento(ctx context.Context, e *domain.EventoMonitoramento) error
	ListEventos(ctx context.Context, limit int) ([]domain.EventoMonitoramento, error)

	DashboardSummary(ctx context.Context) (*domain.DashboardSummary, error)
}
