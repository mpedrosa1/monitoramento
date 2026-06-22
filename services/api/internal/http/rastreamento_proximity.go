package httpapi

import (
	"context"
	"fmt"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/ws"
)

// NotifyVeiculoProximoUnidade implementa rastreamento.ProximityNotifier.
func (a *API) NotifyVeiculoProximoUnidade(ctx context.Context, alerta domain.VeiculoProximidadeAlerta) {
	if a.Hub != nil {
		a.Hub.Broadcast(ws.Message{
			Type:    "veiculo_proximidade_alerta",
			Payload: alerta,
		})
	}

	titulo := "Veículo próximo da unidade"
	mensagem := formatMensagemProximidade(alerta)
	payload := domain.NotificacaoPayload{
		VeiculoID:      alerta.VeiculoID,
		VeiculoAlvoID:  alerta.VeiculoID,
		VeiculoAlvoPlaca: alerta.Placa,
		UnidadeID:      alerta.UnidadeID,
		UnidadeNome:    alerta.UnidadeNome,
		DistanciaKm:    alerta.DistanciaKm,
	}

	colabs, err := a.Store.ListColaboradores(ctx)
	if err != nil {
		return
	}
	for _, colab := range colabs {
		if !domain.IsColaboradorAdministrador(colab) {
			continue
		}
		a.criarENotificar(ctx, domain.Notificacao{
			DestinatarioColaboradorID: colab.ID,
			Tipo:                      domain.NotificacaoVeiculoProximoUnidade,
			Titulo:                    titulo,
			Mensagem:                  mensagem,
			Payload:                   payload,
		})
	}
}

func formatMensagemProximidade(a domain.VeiculoProximidadeAlerta) string {
	placa := a.Placa
	if placa == "" {
		placa = "—"
	}
	return fmt.Sprintf(
		"Veículo %s entrou no raio de %.0f km da unidade %s (%.1f km de distância).",
		placa,
		a.RaioKm,
		a.UnidadeNome,
		a.DistanciaKm,
	)
}
