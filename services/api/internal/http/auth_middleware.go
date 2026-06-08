package httpapi

import (
	"net/http"
	"strings"

	"github.com/mmrtec/monitoramento/api/internal/auth"
)

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(h, prefix) {
		return ""
	}
	return strings.TrimSpace(h[len(prefix):])
}

func AuthMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				writeError(w, http.StatusUnauthorized, "autenticação necessária")
				return
			}
			claims, err := auth.ParseToken(secret, token)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "sessão inválida ou expirada")
				return
			}
			ctx := auth.WithClaims(r.Context(), claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AuthWebSocket(secret string, next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		if token == "" {
			token = bearerToken(r)
		}
		if token == "" {
			http.Error(w, "autenticação necessária", http.StatusUnauthorized)
			return
		}
		claims, err := auth.ParseToken(secret, token)
		if err != nil {
			http.Error(w, "sessão inválida ou expirada", http.StatusUnauthorized)
			return
		}
		ctx := auth.WithClaims(r.Context(), claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
