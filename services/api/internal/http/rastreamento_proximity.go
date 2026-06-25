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
		VeiculoID:        alerta.VeiculoID,
		VeiculoAlvoID:    alerta.VeiculoID,
		VeiculoAlvoPlaca: alerta.Placa,
		UnidadeID:        alerta.UnidadeID,
		UnidadeNome:      alerta.UnidadeNome,
		DistanciaKm:      alerta.DistanciaKm,
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
		"Veículo %s entrou no raio de %s da unidade %s (%s de distância).",
		placa,
		formatDistanciaKm(a.RaioKm),
		a.UnidadeNome,
		formatDistanciaKm(a.DistanciaKm),
	)
}

// formatDistanciaKm exibe a distância em metros quando menor que 1 km.
func formatDistanciaKm(km float64) string {
	if km < 1 {
		return fmt.Sprintf("%.0f m", km*1000)
	}
	return fmt.Sprintf("%.1f km", km)
}
