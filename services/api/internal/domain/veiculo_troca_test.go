package domain

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestAplicarTrocaSolicitacaoSemOferta(t *testing.T) {
	solicitante := primitive.NewObjectID()
	dest := primitive.NewObjectID()
	alvo := Veiculo{ColaboradorID: dest, Placa: "ABC1D23"}

	AplicarTrocaSolicitacao(&alvo, nil, solicitante)

	if alvo.ColaboradorID != solicitante {
		t.Fatalf("esperava solicitante como novo condutor, got %v", alvo.ColaboradorID)
	}
}

func TestAplicarTrocaSolicitacaoBilateral(t *testing.T) {
	aColab := primitive.NewObjectID()
	bColab := primitive.NewObjectID()
	alvo := Veiculo{ColaboradorID: bColab}
	ofertado := Veiculo{ColaboradorID: aColab}

	AplicarTrocaSolicitacao(&alvo, &ofertado, aColab)

	if alvo.ColaboradorID != aColab || ofertado.ColaboradorID != bColab {
		t.Fatalf("troca bilateral falhou: alvo=%v ofertado=%v", alvo.ColaboradorID, ofertado.ColaboradorID)
	}
}

func TestAplicarTrocaAdmin(t *testing.T) {
	aColab := primitive.NewObjectID()
	bColab := primitive.NewObjectID()
	a := Veiculo{ColaboradorID: aColab}
	b := Veiculo{ColaboradorID: bColab}

	if err := AplicarTrocaAdmin(&a, &b); err != nil {
		t.Fatal(err)
	}
	if a.ColaboradorID != bColab || b.ColaboradorID != aColab {
		t.Fatal("admin swap failed")
	}
}

func TestAplicarTrocaAdminMesmoCondutor(t *testing.T) {
	c := primitive.NewObjectID()
	a := Veiculo{ColaboradorID: c}
	b := Veiculo{ColaboradorID: c}
	if err := AplicarTrocaAdmin(&a, &b); err != ErrMesmoCondutorVeiculos {
		t.Fatalf("esperava erro, got %v", err)
	}
}

func TestTrocaPendenteSolicitanteNaoAutorizado(t *testing.T) {
	motorista := primitive.NewObjectID()
	solicitante := primitive.NewObjectID()
	alvo := Veiculo{ColaboradorID: motorista}

	troca := TrocaVeiculo{
		Status:                   TrocaVeiculoStatusPendente,
		Origem:                   TrocaVeiculoOrigemSolicitacao,
		SolicitanteColaboradorID: solicitante,
	}
	if !TrocaPendenteSolicitanteNaoAutorizado(&troca, &alvo) {
		t.Fatal("esperava alerta para solicitante não autorizado")
	}

	trocaAdmin := troca
	trocaAdmin.Origem = TrocaVeiculoOrigemAdmin
	if TrocaPendenteSolicitanteNaoAutorizado(&trocaAdmin, &alvo) {
		t.Fatal("troca admin não deve gerar alerta")
	}

	trocaLegada := troca
	trocaLegada.Origem = ""
	trocaLegada.SolicitanteNaoAutorizado = false
	if !TrocaPendenteSolicitanteNaoAutorizado(&trocaLegada, &alvo) {
		t.Fatal("troca legada sem flag deve recalcular autorização")
	}
}

func TestColaboradorAutorizadoVeiculo(t *testing.T) {
	motorista := primitive.NewObjectID()
	autorizado := primitive.NewObjectID()
	outro := primitive.NewObjectID()
	v := Veiculo{
		ColaboradorID:              motorista,
		ColaboradoresAdicionaisIDs: []primitive.ObjectID{autorizado},
	}

	if !ColaboradorAutorizadoVeiculo(&v, motorista) {
		t.Fatal("motorista atual deve ser autorizado")
	}
	if !ColaboradorAutorizadoVeiculo(&v, autorizado) {
		t.Fatal("condutor autorizado deve ser reconhecido")
	}
	if ColaboradorAutorizadoVeiculo(&v, outro) {
		t.Fatal("colaborador não listado não deve ser autorizado")
	}
	if ColaboradorAutorizadoVeiculo(nil, motorista) {
		t.Fatal("veículo nil")
	}
}
