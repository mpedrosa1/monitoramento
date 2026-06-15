package config

import (
	"os"
	"path/filepath"
	"strings"
)

// ResolveDataFile localiza um arquivo configurado por caminho relativo,
// procurando no diretório atual e em diretórios pai (monorepo / run-api build).
func ResolveDataFile(relOrAbs string) string {
	relOrAbs = strings.TrimSpace(relOrAbs)
	if relOrAbs == "" {
		return ""
	}
	if filepath.IsAbs(relOrAbs) {
		if fileExists(relOrAbs) {
			return relOrAbs
		}
		return ""
	}

	try := func(base string) string {
		p := filepath.Join(base, relOrAbs)
		if fileExists(p) {
			abs, err := filepath.Abs(p)
			if err != nil {
				return p
			}
			return abs
		}
		return ""
	}

	if p := try("."); p != "" {
		return p
	}

	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	dir := cwd
	for i := 0; i < 8; i++ {
		if p := try(dir); p != "" {
			return p
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}
