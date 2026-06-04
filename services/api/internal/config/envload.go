package config

import (
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// LoadEnvFiles carrega variáveis de .env no diretório atual e em pastas pai
// (monorepo: services/api → raiz do projeto).
func LoadEnvFiles() {
	_ = godotenv.Load(".env")

	cwd, err := os.Getwd()
	if err != nil {
		return
	}
	dir := cwd
	for i := 0; i < 6; i++ {
		envPath := filepath.Join(dir, ".env")
		_ = godotenv.Load(envPath)
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
}
