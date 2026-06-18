package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const defaultJWTExpiry = 8 * time.Hour

type Claims struct {
	ColaboradorID   string                   `json:"sub"`
	Email           string                   `json:"email"`
	Nome            string                   `json:"nome"`
	TipoAcesso      domain.TipoAcessoSistema `json:"tipoAcesso"`
	PermissoesAdmin *domain.PermissoesAdmin  `json:"permissoesAdmin,omitempty"`
	AuthVersion     int64                    `json:"authVersion,omitempty"`
	jwt.RegisteredClaims
}

func TokenExpiry(duration time.Duration) time.Duration {
	if duration <= 0 {
		return defaultJWTExpiry
	}
	return duration
}

func IssueToken(
	secret string,
	colab domain.Colaborador,
	expiry time.Duration,
) (string, time.Time, error) {
	if secret == "" {
		return "", time.Time{}, errors.New("JWT_SECRET não configurado")
	}
	expiry = TokenExpiry(expiry)
	expiresAt := time.Now().UTC().Add(expiry)
	email := colab.EmailCorporativo
	if email == "" {
		email = colab.Email
	}
	claims := Claims{
		ColaboradorID:   colab.ID.Hex(),
		Email:           email,
		Nome:            colab.Nome,
		TipoAcesso:      colab.TipoAcesso,
		PermissoesAdmin: colab.PermissoesAdmin,
		AuthVersion:     colab.AuthVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   colab.ID.Hex(),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
			Issuer:    "mmrtec-monitoramento",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

func ParseToken(secret, tokenString string) (*Claims, error) {
	if secret == "" {
		return nil, errors.New("JWT_SECRET não configurado")
	}
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("método de assinatura inesperado: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("token inválido")
	}
	return claims, nil
}

func ColaboradorObjectID(claims *Claims) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(claims.ColaboradorID)
}
