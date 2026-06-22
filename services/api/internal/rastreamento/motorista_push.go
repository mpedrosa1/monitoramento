package rastreamento

import (
	"context"
	"fmt"

	"github.com/mmrtec/monitoramento/api/internal/domain"
)

// SincronizarCondutorVeiculo vincula o colaborador ao veículo na Rota Exata.
func (s *Service) SincronizarCondutorVeiculo(
	ctx context.Context,
	placa string,
	colaborador domain.Colaborador,
) (motoristaID int, err error) {
	if s.client == nil {
		return 0, nil
	}
	if colaborador.ID.IsZero() {
		return 0, fmt.Errorf("colaborador inválido")
	}

	adesaoID, err := s.client.AdesaoIDPorPlaca(ctx, placa)
	if err != nil {
		return 0, err
	}
	motoristaID, err = s.client.MotoristaIDPorColaborador(ctx, colaborador)
	if err != nil {
		return 0, err
	}
	if err := s.client.VincularMotoristaAdesao(ctx, adesaoID, motoristaID); err != nil {
		return motoristaID, err
	}
	return motoristaID, nil
}
