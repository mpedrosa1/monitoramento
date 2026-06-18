package httpapi

import (
	"context"
	"errors"

	"github.com/mmrtec/monitoramento/api/internal/auth"
)

// syncClaimsFromColaborador valida a versão da sessão e atualiza claims com dados do banco.
func (a *API) syncClaimsFromColaborador(ctx context.Context, claims *auth.Claims) error {
	if claims == nil || a.Store == nil {
		return nil
	}
	oid, err := auth.ColaboradorObjectID(claims)
	if err != nil {
		return err
	}
	colab, err := a.Store.GetColaborador(ctx, oid)
	if err != nil || colab == nil {
		return err
	}
	if claims.AuthVersion != colab.AuthVersion {
		return auth.ErrSessionRevoked
	}
	claims.TipoAcesso = colab.TipoAcesso
	claims.PermissoesAdmin = colab.PermissoesAdmin
	return nil
}

func isSessionRevoked(err error) bool {
	return errors.Is(err, auth.ErrSessionRevoked)
}
