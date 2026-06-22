package rastreamento

import (
	"context"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/rotaexata"
)

type CondutorNotifier interface {
	NotificarNovaDivergenciaCondutor(ctx context.Context, divergencia *domain.CondutorRotaExataDivergencia, veiculo *domain.Veiculo)
}

type VerificarCondutoresResult struct {
	Configured           bool                                    `json:"configured"`
	Verificado           bool                                    `json:"verificado"`
	Erro                 string                                  `json:"erro,omitempty"`
	DivergenciasPendentes []domain.CondutorRotaExataDivergencia `json:"divergenciasPendentes"`
	Novas                int                                     `json:"novas"`
}

func (s *Service) SetCondutorNotifier(n CondutorNotifier) {
	s.condutorNotifier = n
}

func (s *Service) VerificarCondutores(ctx context.Context) VerificarCondutoresResult {
	result := VerificarCondutoresResult{Configured: s.Enabled()}
	if !s.Enabled() {
		result.Erro = "Rota Exata não configurada"
		return result
	}

	rawList, err := s.client.UltimaPosicaoTodos(ctx)
	if err != nil {
		result.Erro = err.Error()
		return result
	}

	veiculos, err := s.store.ListVeiculos(ctx)
	if err != nil {
		result.Erro = err.Error()
		return result
	}
	colaboradores, err := s.store.ListColaboradores(ctx)
	if err != nil {
		result.Erro = err.Error()
		return result
	}

	byPlaca := make(map[string]domain.Veiculo, len(veiculos))
	for _, v := range veiculos {
		byPlaca[rotaexata.NormalizePlaca(v.Placa)] = v
	}

	motoristaPorPlaca := make(map[string]domain.RotaExataMotoristaRef)
	for _, raw := range rawList {
		if raw.Motorista == nil || raw.Motorista.ID <= 0 {
			continue
		}
		placa := rotaexata.NormalizePlaca(raw.Placa)
		motoristaPorPlaca[placa] = domain.RotaExataMotoristaRef{
			ID:    raw.Motorista.ID,
			Nome:  raw.Motorista.Nome,
			Email: raw.Motorista.Email,
			CPF:   raw.Motorista.CPF,
			CNH:   raw.Motorista.CNH,
		}
	}

	now := time.Now().UTC()
	novas := 0

	for _, veiculo := range veiculos {
		placa := rotaexata.NormalizePlaca(veiculo.Placa)
		motoristaRX, ok := motoristaPorPlaca[placa]
		if !ok || motoristaRX.ID <= 0 {
			continue
		}

		matched := domain.MatchColaboradorPorMotoristaRotaExata(motoristaRX, colaboradores)
		pending, pendingErr := s.store.FindCondutorRotaExataDivergenciaPendenteByVeiculo(ctx, veiculo.ID)

		if matched != nil && matched.ID == veiculo.ColaboradorID {
			if pendingErr == nil && pending != nil {
				_ = s.store.DeleteCondutorRotaExataDivergencia(ctx, pending.ID)
			}
			continue
		}

		recusada, _ := s.store.ExistsCondutorRotaExataDivergenciaRecusada(ctx, veiculo.ID, motoristaRX.ID)
		if recusada {
			continue
		}

		var sugeridoID *domain.Colaborador
		if matched != nil {
			sugeridoID = matched
		}

		if pendingErr == nil && pending != nil {
			pending.RotaExataMotoristaID = motoristaRX.ID
			pending.RotaExataMotoristaNome = motoristaRX.Nome
			pending.RotaExataMotoristaEmail = motoristaRX.Email
			pending.RotaExataMotoristaCPF = motoristaRX.CPF
			pending.RotaExataMotoristaCNH = motoristaRX.CNH
			pending.MotoristaAtualID = veiculo.ColaboradorID
			pending.DetectadoEm = now
			if sugeridoID != nil {
				id := sugeridoID.ID
				pending.MotoristaSugeridoID = &id
			} else {
				pending.MotoristaSugeridoID = nil
			}
			_ = s.store.UpdateCondutorRotaExataDivergencia(ctx, pending)
			continue
		}

		d := domain.CondutorRotaExataDivergencia{
			VeiculoID:               veiculo.ID,
			MotoristaAtualID:        veiculo.ColaboradorID,
			RotaExataMotoristaID:    motoristaRX.ID,
			RotaExataMotoristaNome:  motoristaRX.Nome,
			RotaExataMotoristaEmail: motoristaRX.Email,
			RotaExataMotoristaCPF:   motoristaRX.CPF,
			RotaExataMotoristaCNH:   motoristaRX.CNH,
			Status:                  domain.CondutorDivergenciaPendente,
			DetectadoEm:             now,
		}
		if sugeridoID != nil {
			id := sugeridoID.ID
			d.MotoristaSugeridoID = &id
		}
		if err := s.store.CreateCondutorRotaExataDivergencia(ctx, &d); err != nil {
			continue
		}
		novas++
		if s.condutorNotifier != nil {
			v := veiculo
			s.condutorNotifier.NotificarNovaDivergenciaCondutor(ctx, &d, &v)
		}
	}

	pendentes, err := s.store.ListCondutorRotaExataDivergencias(ctx, ptrStatus(domain.CondutorDivergenciaPendente))
	if err != nil {
		result.Erro = err.Error()
		return result
	}

	result.Verificado = true
	result.DivergenciasPendentes = pendentes
	result.Novas = novas
	return result
}

func ptrStatus(s domain.CondutorRotaExataDivergenciaStatus) *domain.CondutorRotaExataDivergenciaStatus {
	return &s
}
