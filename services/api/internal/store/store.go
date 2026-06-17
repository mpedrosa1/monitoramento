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

	ListEscalas(ctx context.Context) ([]domain.EscalaTrabalho, error)
	GetEscala(ctx context.Context, id primitive.ObjectID) (*domain.EscalaTrabalho, error)
	CreateEscala(ctx context.Context, e *domain.EscalaTrabalho) error
	UpdateEscala(ctx context.Context, e *domain.EscalaTrabalho) error
	DeleteEscala(ctx context.Context, id primitive.ObjectID) error

	ListSobreavisos(ctx context.Context) ([]domain.Sobreaviso, error)
	GetSobreaviso(ctx context.Context, id primitive.ObjectID) (*domain.Sobreaviso, error)
	CreateSobreaviso(ctx context.Context, s *domain.Sobreaviso) error
	UpdateSobreaviso(ctx context.Context, s *domain.Sobreaviso) error
	DeleteSobreaviso(ctx context.Context, id primitive.ObjectID) error

	ListDefinicoesSobreaviso(ctx context.Context) ([]domain.EscalaSobreavisoDefinida, error)
	UpsertDefinicaoSobreaviso(ctx context.Context, d *domain.EscalaSobreavisoDefinida) error

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

	ListVeiculos(ctx context.Context) ([]domain.Veiculo, error)
	GetVeiculo(ctx context.Context, id primitive.ObjectID) (*domain.Veiculo, error)
	GetVeiculosByColaborador(ctx context.Context, colaboradorID primitive.ObjectID) ([]domain.Veiculo, error)
	CreateVeiculo(ctx context.Context, v *domain.Veiculo) error
	UpdateVeiculo(ctx context.Context, v *domain.Veiculo) error
	DeleteVeiculo(ctx context.Context, id primitive.ObjectID) error

	ListVeiculoPeriodosMotorista(ctx context.Context, veiculoID primitive.ObjectID) ([]domain.VeiculoPeriodoMotorista, error)
	GetVeiculoPeriodoMotorista(ctx context.Context, id primitive.ObjectID) (*domain.VeiculoPeriodoMotorista, error)
	CreateVeiculoPeriodoMotorista(ctx context.Context, p *domain.VeiculoPeriodoMotorista) error
	UpdateVeiculoPeriodoMotorista(ctx context.Context, p *domain.VeiculoPeriodoMotorista) error
	DeleteVeiculoPeriodoMotorista(ctx context.Context, id primitive.ObjectID) error
	FecharPeriodoMotoristaAberto(ctx context.Context, veiculoID primitive.ObjectID, dataFim, horaFim string) error
	DeleteVeiculoHistoricoPorVeiculo(ctx context.Context, veiculoID primitive.ObjectID) error

	ListVeiculoMultas(ctx context.Context, veiculoID primitive.ObjectID) ([]domain.VeiculoMulta, error)
	GetVeiculoMulta(ctx context.Context, id primitive.ObjectID) (*domain.VeiculoMulta, error)
	CreateVeiculoMulta(ctx context.Context, m *domain.VeiculoMulta) error
	UpdateVeiculoMulta(ctx context.Context, m *domain.VeiculoMulta) error
	DeleteVeiculoMulta(ctx context.Context, id primitive.ObjectID) error

	CreateTrocaVeiculo(ctx context.Context, t *domain.TrocaVeiculo) error
	GetTrocaVeiculo(ctx context.Context, id primitive.ObjectID) (*domain.TrocaVeiculo, error)
	UpdateTrocaVeiculo(ctx context.Context, t *domain.TrocaVeiculo) error
	FindTrocaVeiculoPendente(ctx context.Context, solicitanteID, veiculoAlvoID primitive.ObjectID) (*domain.TrocaVeiculo, error)
	VeiculoIDsComTrocaNaoAutorizadaPendente(ctx context.Context) ([]primitive.ObjectID, error)

	ListNotificacoes(ctx context.Context, colaboradorID primitive.ObjectID, limit int) ([]domain.Notificacao, error)
	CreateNotificacao(ctx context.Context, n *domain.Notificacao) error
	GetNotificacao(ctx context.Context, id primitive.ObjectID) (*domain.Notificacao, error)
	MarcarNotificacaoLida(ctx context.Context, id, colaboradorID primitive.ObjectID) error

	UpsertPushToken(ctx context.Context, colaboradorID primitive.ObjectID, token, platform string) error
	DeletePushToken(ctx context.Context, colaboradorID primitive.ObjectID, token string) error
	ListPushTokens(ctx context.Context, colaboradorID primitive.ObjectID) ([]domain.PushToken, error)
	ListAllPushTokens(ctx context.Context) ([]domain.PushToken, error)

	// ListDispositivos alias legado.
	ListDispositivos(ctx context.Context) ([]domain.Dispositivo, error)
	CreateDispositivo(ctx context.Context, d *domain.Dispositivo) error
	UpdateDispositivo(ctx context.Context, d *domain.Dispositivo) error

	CreateEvento(ctx context.Context, e *domain.EventoMonitoramento) error
	ListEventos(ctx context.Context, limit int) ([]domain.EventoMonitoramento, error)

	ListDespesasByColaborador(ctx context.Context, colaboradorID primitive.ObjectID, competencia string) ([]domain.Despesa, error)
	ListAllDespesas(ctx context.Context, competencia string) ([]domain.Despesa, error)
	GetDespesa(ctx context.Context, id primitive.ObjectID) (*domain.Despesa, error)
	CreateDespesa(ctx context.Context, d *domain.Despesa) error
	UpdateDespesa(ctx context.Context, d *domain.Despesa) error
	DeleteDespesa(ctx context.Context, id primitive.ObjectID) error

	ListDepositosDespesa(ctx context.Context, colaboradorID primitive.ObjectID, competencia string) ([]domain.DepositoDespesa, error)
	ListAllDepositosDespesa(ctx context.Context, competencia string) ([]domain.DepositoDespesa, error)
	UpsertDepositoDespesa(ctx context.Context, d *domain.DepositoDespesa) error

	ListAjustesSaldoDespesa(ctx context.Context, colaboradorID primitive.ObjectID) ([]domain.AjusteSaldoDespesa, error)
	ListAllAjustesSaldoDespesa(ctx context.Context) ([]domain.AjusteSaldoDespesa, error)
	UpsertAjusteSaldoDespesa(ctx context.Context, a *domain.AjusteSaldoDespesa) error

	DashboardSummary(ctx context.Context) (*domain.DashboardSummary, error)
}
