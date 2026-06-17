package domain

import (
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrMesmoCondutorVeiculos = errors.New("os veículos já pertencem ao mesmo condutor")
	ErrMesmoColaboradorTroca = errors.New("não é possível solicitar troca do próprio veículo")
)

// TrocaPendenteSolicitanteNaoAutorizado indica troca pendente feita por quem não é
// motorista atual nem condutor autorizado do veículo alvo.
func TrocaPendenteSolicitanteNaoAutorizado(t *TrocaVeiculo, alvo *Veiculo) bool {
	if t == nil || alvo == nil {
		return false
	}
	if t.Status != TrocaVeiculoStatusPendente {
		return false
	}
	if t.Origem == TrocaVeiculoOrigemAdmin {
		return false
	}
	return !ColaboradorAutorizadoVeiculo(alvo, t.SolicitanteColaboradorID)
}

// ColaboradorAutorizadoVeiculo indica se o colaborador é motorista atual ou condutor autorizado.
func ColaboradorAutorizadoVeiculo(v *Veiculo, colaboradorID primitive.ObjectID) bool {
	if v == nil || colaboradorID.IsZero() {
		return false
	}
	if v.ColaboradorID == colaboradorID {
		return true
	}
	for _, id := range v.ColaboradoresAdicionaisIDs {
		if id == colaboradorID {
			return true
		}
	}
	return false
}

// AplicarTrocaSolicitacao aplica a troca após aceite do destinatário.
// Se ofertado for nil, o solicitante assume apenas o veículo alvo.
func AplicarTrocaSolicitacao(alvo *Veiculo, ofertado *Veiculo, solicitanteID primitive.ObjectID) {
	if ofertado == nil {
		alvo.ColaboradorID = solicitanteID
		return
	}
	aColab := alvo.ColaboradorID
	alvo.ColaboradorID = ofertado.ColaboradorID
	ofertado.ColaboradorID = aColab
}

// AplicarTrocaAdmin troca os condutores entre dois veículos.
func AplicarTrocaAdmin(veiculoA, veiculoB *Veiculo) error {
	if veiculoA.ColaboradorID == veiculoB.ColaboradorID {
		return ErrMesmoCondutorVeiculos
	}
	aColab := veiculoA.ColaboradorID
	veiculoA.ColaboradorID = veiculoB.ColaboradorID
	veiculoB.ColaboradorID = aColab
	return nil
}
