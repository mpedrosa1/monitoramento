package auth

import "testing"

func TestSenhaInicialFromDataNascimento(t *testing.T) {
	senha, err := SenhaInicialFromDataNascimento("1984-05-15")
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if senha != "MMR1984" {
		t.Fatalf("senha = %q, want MMR1984", senha)
	}
}

func TestSenhaInicialFromDataNascimento_vazio(t *testing.T) {
	_, err := SenhaInicialFromDataNascimento("")
	if err == nil {
		t.Fatal("esperava erro para data vazia")
	}
}

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("MMR1984")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !CheckPassword(hash, "MMR1984") {
		t.Fatal("senha correta deveria ser aceita")
	}
	if CheckPassword(hash, "MMR1985") {
		t.Fatal("senha incorreta não deveria ser aceita")
	}
}
