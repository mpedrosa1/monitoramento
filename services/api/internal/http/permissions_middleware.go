package httpapi

import (
	"net/http"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/domain"
)

type permCheck func(domain.TipoAcessoSistema, *domain.PermissoesAdmin) bool

func requirePerm(check permCheck, message string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := auth.ClaimsFromContext(r.Context())
			if !ok || !check(claims.TipoAcesso, claims.PermissoesAdmin) {
				writeError(w, http.StatusForbidden, message)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireManageData(next http.Handler) http.Handler {
	return requirePerm(domain.CanManagePadrao, "sem permissão para esta operação")(next)
}

func RequireManageMissoes(next http.Handler) http.Handler {
	return requirePerm(domain.CanCrudMissoes, "sem permissão para gerenciar missões")(next)
}

func RequireGestaoRecargas(next http.Handler) http.Handler {
	return requirePerm(domain.CanRhRecarregarSaldos, "sem permissão para gestão de recargas")(next)
}

func RequireAccessRH(next http.Handler) http.Handler {
	return requirePerm(domain.CanAccessRecursosHumanos, "sem permissão para recursos humanos")(next)
}

func RequireFinanceiro(next http.Handler) http.Handler {
	return requirePerm(domain.CanRhSalariosBonificacoes, "sem permissão financeira")(next)
}

func RequireCrudColaboradores(next http.Handler) http.Handler {
	return requirePerm(domain.CanCrudColaboradores, "sem permissão para gerenciar colaboradores")(next)
}

func RequireCrudUnidades(next http.Handler) http.Handler {
	return requirePerm(domain.CanCrudUnidades, "sem permissão para gerenciar unidades")(next)
}

func RequireCrudVeiculos(next http.Handler) http.Handler {
	return requirePerm(domain.CanCrudVeiculos, "sem permissão para gerenciar veículos")(next)
}

func RequireCrudEquipamentos(next http.Handler) http.Handler {
	return requirePerm(domain.CanCrudEquipamentos, "sem permissão para gerenciar equipamentos")(next)
}

func RequireCrudChamados(next http.Handler) http.Handler {
	return requirePerm(domain.CanCrudChamados, "sem permissão para gerenciar chamados")(next)
}

func RequireFrotaRegistrarPeriodo(next http.Handler) http.Handler {
	return requirePerm(domain.CanFrotaRegistrarPeriodo, "sem permissão para registrar período de motorista")(next)
}

func RequireFrotaRegistrarMulta(next http.Handler) http.Handler {
	return requirePerm(domain.CanFrotaRegistrarMulta, "sem permissão para registrar multas")(next)
}

func RequireFrotaTrocarVeiculos(next http.Handler) http.Handler {
	return requirePerm(domain.CanFrotaTrocarVeiculos, "sem permissão para trocar veículos")(next)
}

func RequireRhEscalaTrabalho(next http.Handler) http.Handler {
	return requirePerm(domain.CanRhEscalaTrabalho, "sem permissão para gerenciar escalas")(next)
}

func RequireRhCalendarioSobreaviso(next http.Handler) http.Handler {
	return requirePerm(domain.CanRhCalendarioSobreaviso, "sem permissão para gerenciar sobreaviso")(next)
}

func RequireRhRegistrarDespesaOutros(next http.Handler) http.Handler {
	return requirePerm(domain.CanRhRegistrarDespesaOutros, "sem permissão para registrar despesas de outros colaboradores")(next)
}
