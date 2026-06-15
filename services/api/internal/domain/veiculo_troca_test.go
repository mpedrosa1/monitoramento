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
