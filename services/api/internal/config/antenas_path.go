package config

import (
	"os"
	"path/filepath"
)

// ResolveAntenasDBPath localiza base/antenas.db no monorepo ou via ANTENAS_DB_PATH.
func ResolveAntenasDBPath() string {
	if p := os.Getenv("ANTENAS_DB_PATH"); p != "" {
		return p
	}

	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	dir := cwd
	for i := 0; i < 8; i++ {
		candidate := filepath.Join(dir, "base", "antenas.db")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}
