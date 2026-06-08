package httpapi

import (
	"net/http"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/domain"
)

func RequireManageData(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok || !domain.CanManageData(claims.TipoAcesso) {
			writeError(w, http.StatusForbidden, "sem permissão para esta operação")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireManageMissoes(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok || !domain.CanManageMissoes(claims.TipoAcesso) {
			writeError(w, http.StatusForbidden, "sem permissão para gerenciar missões")
			return
		}
		next.ServeHTTP(w, r)
	})
}
