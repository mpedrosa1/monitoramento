package auth

import "errors"

var ErrSessionRevoked = errors.New("sessão encerrada por alteração de permissões")
