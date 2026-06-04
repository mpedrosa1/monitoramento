package store

import (
	"context"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SeedData struct {
	Unidades      []domain.Unidade
	Colaboradores []domain.Colaborador
	Chamados      []domain.Chamado
	Missoes       []domain.Missao
	Equipamentos  []domain.Equipamento
}

func BuildSeedData() SeedData {
	now := time.Now().UTC()

	eqNobreak := domain.Equipamento{
		ID: primitive.NewObjectID(), Nome: "Nobreak sala servidores", Marca: "APC",
		TipoEquipamento: domain.TipoEquipamentoNobreak, TipoMonitoramento: domain.DispositivoSNMP,
		Config: domain.DispositivoConfig{
			Community: "public",
			Pontos: []domain.SnmpPonto{
				{Nome: "Tempo ativo", OID: "1.3.6.1.2.1.1.3.0", Unidade: "timeticks", TipoDado: "tempo", Descricao: "sysUpTime"},
			},
		},
		CreatedAt: now, UpdatedAt: now,
	}
	eqCLP := domain.Equipamento{
		ID: primitive.NewObjectID(), Nome: "CLP climatização", Marca: "WEG",
		TipoEquipamento: domain.TipoEquipamentoSensor, TipoMonitoramento: domain.DispositivoModbus,
		Config: domain.DispositivoConfig{SlaveID: 1, Registradores: []uint16{0, 1}},
		CreatedAt: now, UpdatedAt: now,
	}
	eqSensorTemp := domain.Equipamento{
		ID: primitive.NewObjectID(), Nome: "Sensor temperatura bloco B", Marca: "Siemens",
		TipoEquipamento: domain.TipoEquipamentoSensor, TipoMonitoramento: domain.DispositivoModbus,
		Config: domain.DispositivoConfig{SlaveID: 1, Registradores: []uint16{0}},
		CreatedAt: now, UpdatedAt: now,
	}
	eqSwitch := domain.Equipamento{
		ID: primitive.NewObjectID(), Nome: "Switch core", Marca: "Cisco",
		TipoEquipamento: domain.TipoEquipamentoSensor, TipoMonitoramento: domain.DispositivoSNMP,
		Config: domain.DispositivoConfig{
			Community: "public",
			Pontos: []domain.SnmpPonto{
				{Nome: "Tempo ativo", OID: "1.3.6.1.2.1.1.3.0", Unidade: "timeticks", TipoDado: "tempo"},
				{Nome: "Nome do host", OID: "1.3.6.1.2.1.1.5.0", TipoDado: "texto"},
			},
		},
		CreatedAt: now, UpdatedAt: now,
	}
	equipamentos := []domain.Equipamento{eqNobreak, eqCLP, eqSensorTemp, eqSwitch}

	u1 := domain.Unidade{
		ID: primitive.NewObjectID(), Nome: "Penitenciária Central", Codigo: "PC-01", Endereco: "Av. Principal, 1000",
		IP: "8.8.8.8", IntervaloS: 10,
		Equipamentos: []domain.UnidadeEquipamento{
			{EquipamentoID: eqNobreak.ID, Porta: 161},
			{EquipamentoID: eqCLP.ID, Porta: 502},
		},
		CreatedAt: now, UpdatedAt: now,
	}
	u2 := domain.Unidade{
		ID: primitive.NewObjectID(), Nome: "CDP Norte", Codigo: "CDP-02", Endereco: "Rua das Flores, 250",
		IP: "1.1.1.1", IntervaloS: 30,
		Equipamentos: []domain.UnidadeEquipamento{
			{EquipamentoID: eqSwitch.ID, Porta: 161},
		},
		CreatedAt: now, UpdatedAt: now,
	}
	u3 := domain.Unidade{
		ID: primitive.NewObjectID(), Nome: "Presídio Feminino", Codigo: "PF-03", Endereco: "Estrada Vicinal, km 12",
		IP: "127.0.0.1", IntervaloS: 15,
		Equipamentos: []domain.UnidadeEquipamento{
			{EquipamentoID: eqSensorTemp.ID, Porta: 502},
		},
		CreatedAt: now, UpdatedAt: now,
	}
	unidades := []domain.Unidade{u1, u2, u3}

	avatars := []string{
		"https://api.dicebear.com/7.x/avataaars/svg?seed=ana",
		"https://api.dicebear.com/7.x/avataaars/svg?seed=bruno",
		"https://api.dicebear.com/7.x/avataaars/svg?seed=carla",
		"https://api.dicebear.com/7.x/avataaars/svg?seed=diego",
		"https://api.dicebear.com/7.x/avataaars/svg?seed=elisa",
		"https://api.dicebear.com/7.x/avataaars/svg?seed=felipe",
		"https://api.dicebear.com/7.x/avataaars/svg?seed=gabi",
		"https://api.dicebear.com/7.x/avataaars/svg?seed=henrique",
	}
	nomes := []string{"Ana Silva", "Bruno Costa", "Carla Mendes", "Diego Oliveira", "Elisa Rocha", "Felipe Santos", "Gabriela Lima", "Henrique Alves"}
	statuses := []domain.ColaboradorStatus{
		domain.ColaboradorEmMissao, domain.ColaboradorEscritorio, domain.ColaboradorAtrasado,
		domain.ColaboradorAlmoco, domain.ColaboradorEmMissao, domain.ColaboradorFerias,
		domain.ColaboradorAtestado, domain.ColaboradorEscritorio,
	}
	var colaboradores []domain.Colaborador
	unitIDs := []primitive.ObjectID{u1.ID, u1.ID, u2.ID, u2.ID, u3.ID, u1.ID, u2.ID, u3.ID}
	for i := 0; i < len(nomes); i++ {
		colaboradores = append(colaboradores, domain.Colaborador{
			ID: primitive.NewObjectID(), Nome: nomes[i], FotoURL: avatars[i],
			Status: statuses[i], UnidadeID: unitIDs[i], CreatedAt: now, UpdatedAt: now,
		})
	}

	chamados := []domain.Chamado{
		{ID: primitive.NewObjectID(), Titulo: "Falha no sistema de câmeras", Descricao: "Setor B offline", Status: domain.ChamadoEmAndamento, UnidadeID: u1.ID, CreatedAt: now.Add(-2 * time.Hour), UpdatedAt: now},
		{ID: primitive.NewObjectID(), Titulo: "Portão principal travado", Descricao: "Aguardando manutenção", Status: domain.ChamadoAberto, UnidadeID: u2.ID, CreatedAt: now.Add(-5 * time.Hour), UpdatedAt: now},
		{ID: primitive.NewObjectID(), Titulo: "Rede intermitente", Descricao: "Switch do bloco 3", Status: domain.ChamadoEncerrado, UnidadeID: u1.ID, CreatedAt: now.Add(-24 * time.Hour), UpdatedAt: now},
		{ID: primitive.NewObjectID(), Titulo: "Sensor de temperatura", Descricao: "Leitura acima do limite", Status: domain.ChamadoEmAndamento, UnidadeID: u3.ID, CreatedAt: now.Add(-1 * time.Hour), UpdatedAt: now},
		{ID: primitive.NewObjectID(), Titulo: "Nobreak em alarme", Descricao: "Sala de servidores", Status: domain.ChamadoAberto, UnidadeID: u1.ID, CreatedAt: now.Add(-30 * time.Minute), UpdatedAt: now},
		{ID: primitive.NewObjectID(), Titulo: "Interfone setor feminino", Descricao: "Sem áudio", Status: domain.ChamadoEncerrado, UnidadeID: u3.ID, CreatedAt: now.Add(-48 * time.Hour), UpdatedAt: now},
	}

	missoes := []domain.Missao{
		{ID: primitive.NewObjectID(), Titulo: "Inspeção elétrica bloco A", Status: domain.MissaoEmAndamento, UnidadeID: u1.ID, ColaboradorIDs: []primitive.ObjectID{colaboradores[0].ID, colaboradores[2].ID}, CreatedAt: now, UpdatedAt: now},
		{ID: primitive.NewObjectID(), Titulo: "Manutenção preventiva rede", Status: domain.MissaoEmAndamento, UnidadeID: u2.ID, ColaboradorIDs: []primitive.ObjectID{colaboradores[4].ID}, CreatedAt: now, UpdatedAt: now},
		{ID: primitive.NewObjectID(), Titulo: "Auditoria de segurança", Status: domain.MissaoPlanejada, UnidadeID: u3.ID, ColaboradorIDs: []primitive.ObjectID{colaboradores[6].ID}, CreatedAt: now, UpdatedAt: now},
	}

	return SeedData{unidades, colaboradores, chamados, missoes, equipamentos}
}

func (s *MongoStore) SeedIfEmpty(ctx context.Context) error {
	count, err := s.col("unidades").CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	data := BuildSeedData()
	for i := range data.Unidades {
		if err := s.CreateUnidade(ctx, &data.Unidades[i]); err != nil {
			return err
		}
	}
	for i := range data.Colaboradores {
		if err := s.CreateColaborador(ctx, &data.Colaboradores[i]); err != nil {
			return err
		}
	}
	for i := range data.Chamados {
		if err := s.CreateChamado(ctx, &data.Chamados[i]); err != nil {
			return err
		}
	}
	for i := range data.Missoes {
		m := data.Missoes[i]
		now := time.Now().UTC()
		m.CreatedAt, m.UpdatedAt = now, now
		if _, err := s.col("missoes").InsertOne(ctx, m); err != nil {
			return err
		}
	}
	for i := range data.Equipamentos {
		if err := s.CreateEquipamento(ctx, &data.Equipamentos[i]); err != nil {
			return err
		}
	}
	return nil
}

func (m *MemoryStore) ensureSeeded(ctx context.Context) error {
	return m.SeedIfEmpty(ctx)
}
