package httpapi

import (
	"net/http"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/domain"
)

func RequireManageData(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok || !domain.CanManagePadrao(claims.TipoAcesso, claims.PermissoesAdmin) {
			writeError(w, http.StatusForbidden, "sem permissão para esta operação")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireManageMissoes(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok || !domain.CanManageMissoes(claims.TipoAcesso, claims.PermissoesAdmin) {
			writeError(w, http.StatusForbidden, "sem permissão para gerenciar missões")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireGestaoRecargas(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok || !domain.CanManageRecargas(claims.TipoAcesso, claims.PermissoesAdmin) {
			writeError(w, http.StatusForbidden, "sem permissão para gestão de recargas")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireAccessRH(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok || !domain.CanAccessRecursosHumanos(claims.TipoAcesso, claims.PermissoesAdmin) {
			writeError(w, http.StatusForbidden, "sem permissão para recursos humanos")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireFinanceiro(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.ClaimsFromContext(r.Context())
		if !ok || !domain.CanViewFinanceiro(claims.TipoAcesso, claims.PermissoesAdmin) {
			writeError(w, http.StatusForbidden, "sem permissão financeira")
			return
		}
		next.ServeHTTP(w, r)
	})
}
