package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = bcrypt.DefaultCost

// SenhaInicialFromDataNascimento gera a senha padrão: MMR + ano (ex.: MMR1984).
// Aceita data no formato ISO (YYYY-MM-DD).
func SenhaInicialFromDataNascimento(dataNascimento string) (string, error) {
	dataNascimento = strings.TrimSpace(dataNascimento)
	if dataNascimento == "" {
		return "", errors.New("data de nascimento é obrigatória para gerar a senha de acesso")
	}
	t, err := time.Parse("2006-01-02", dataNascimento)
	if err != nil {
		return "", fmt.Errorf("data de nascimento inválida: %w", err)
	}
	return fmt.Sprintf("MMR%d", t.Year()), nil
}

func HashPassword(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
