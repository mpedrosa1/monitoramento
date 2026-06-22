package httpapi

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type veiculoSaveResponse struct {
	domain.Veiculo
	RotaExataSyncWarning string `json:"rotaExataSyncWarning,omitempty"`
}

// aplicarMudancaMotoristaVeiculo registra histórico e envia o condutor para a Rota Exata.
func (a *API) aplicarMudancaMotoristaVeiculo(
	ctx context.Context,
	veiculo *domain.Veiculo,
	motoristaAnterior, motoristaNovo primitive.ObjectID,
	dataInicio, horaInicio string,
) string {
	if err := a.registrarTrocaMotoristaVeiculo(
		ctx,
		veiculo.ID,
		motoristaAnterior,
		motoristaNovo,
		dataInicio,
		horaInicio,
	); err != nil {
		return fmt.Sprintf("Não foi possível registrar o histórico de motorista: %v", err)
	}
	if motoristaAnterior == motoristaNovo {
		return ""
	}
	return a.sincronizarCondutorVeiculoRotaExata(ctx, veiculo)
}

func (a *API) sincronizarCondutorVeiculoRotaExata(
	ctx context.Context,
	veiculo *domain.Veiculo,
) string {
	if veiculo == nil || a.Rastreamento == nil || !a.Rastreamento.Enabled() {
		return "Integração com a Rota Exata não está configurada."
	}
	if veiculo.ColaboradorID.IsZero() {
		return ""
	}

	colab, err := a.Store.GetColaborador(ctx, veiculo.ColaboradorID)
	if err != nil {
		log.Printf("rota exata push condutor: colaborador %s: %v", veiculo.ColaboradorID.Hex(), err)
		return "Não foi possível carregar o colaborador para sincronizar com a Rota Exata."
	}

	motoristaID, err := a.Rastreamento.SincronizarCondutorVeiculo(ctx, veiculo.Placa, *colab)
	if err != nil {
		warn := rotaExataSyncWarningFromErr(veiculo.Placa, colab.Nome, err)
		log.Printf(
			"rota exata push condutor: veículo %s (%s): %v",
			veiculo.Placa,
			colab.Nome,
			err,
		)
		return warn
	}

	if motoristaID > 0 && (colab.RotaExataMotoristaID == nil || *colab.RotaExataMotoristaID != motoristaID) {
		rxID := motoristaID
		colab.RotaExataMotoristaID = &rxID
		colab.UpdatedAt = time.Now().UTC()
		_ = a.Store.UpdateColaborador(ctx, colab)
	}

	pending, err := a.Store.FindCondutorRotaExataDivergenciaPendenteByVeiculo(ctx, veiculo.ID)
	if err == nil && pending != nil {
		_ = a.Store.DeleteCondutorRotaExataDivergencia(ctx, pending.ID)
	}

	log.Printf(
		"rota exata push condutor: ok — veículo %s (%s) motorista RX %d",
		veiculo.Placa,
		colab.Nome,
		motoristaID,
	)
	return ""
}

func rotaExataSyncWarningFromErr(placa, colabNome string, err error) string {
	if err == nil {
		return ""
	}
	msg := err.Error()
	placaFmt := formatPlacaDisplay(placa)
	nome := strings.TrimSpace(colabNome)
	if nome == "" {
		nome = "O colaborador selecionado"
	}
	if strings.Contains(msg, "adesão não encontrada") {
		return fmt.Sprintf(
			"A placa %s não possui rastreador na Rota Exata. O condutor foi salvo apenas no sistema local.",
			placaFmt,
		)
	}
	if strings.Contains(msg, "motorista não encontrado") {
		return fmt.Sprintf(
			"%s não está cadastrado como motorista na Rota Exata. Cadastre-o lá (Usuários e Motoristas) ou vincule o ID Rota Exata no colaborador.",
			nome,
		)
	}
	return fmt.Sprintf("Não foi possível atualizar a Rota Exata: %s", msg)
}

func (a *API) sincronizarCondutoresVeiculosRotaExata(
	ctx context.Context,
	veiculos ...*domain.Veiculo,
) []string {
	var warnings []string
	for _, v := range veiculos {
		if v == nil {
			continue
		}
		if warn := a.sincronizarCondutorVeiculoRotaExata(ctx, v); warn != "" {
			warnings = append(warnings, warn)
		}
	}
	return warnings
}
