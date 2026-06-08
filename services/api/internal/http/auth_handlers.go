package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authUserResponse struct {
	ID         string `json:"id"`
	Nome       string `json:"nome"`
	Email      string `json:"email"`
	TipoAcesso string `json:"tipoAcesso"`
}

type loginResponse struct {
	Token     string           `json:"token"`
	ExpiresAt time.Time        `json:"expiresAt"`
	User      authUserResponse `json:"user"`
}

func (a *API) Login(w http.ResponseWriter, r *http.Request) {
	var body loginRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	password := body.Password
	if email == "" || password == "" {
		writeError(w, http.StatusBadRequest, "informe e-mail e senha")
		return
	}

	colab, err := a.Store.GetColaboradorByEmail(r.Context(), email)
	if store.IsNotFound(err) || colab == nil {
		writeError(w, http.StatusUnauthorized, "e-mail ou senha incorretos")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if colab.SenhaHash == "" || !auth.CheckPassword(colab.SenhaHash, password) {
		writeError(w, http.StatusUnauthorized, "e-mail ou senha incorretos")
		return
	}

	token, expiresAt, err := auth.IssueToken(a.JWTSecret, *colab, a.JWTExpiry)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "erro ao gerar sessão")
		return
	}

	loginEmail := colab.EmailCorporativo
	if loginEmail == "" {
		loginEmail = colab.Email
	}

	writeJSON(w, http.StatusOK, loginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User: authUserResponse{
			ID:         colab.ID.Hex(),
			Nome:       colab.Nome,
			Email:      loginEmail,
			TipoAcesso: string(colab.TipoAcesso),
		},
	})
}

func (a *API) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	oid, err := primitive.ObjectIDFromHex(claims.ColaboradorID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return
	}
	colab, err := a.Store.GetColaborador(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusUnauthorized, "usuário não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	email := colab.EmailCorporativo
	if email == "" {
		email = colab.Email
	}
	writeJSON(w, http.StatusOK, authUserResponse{
		ID:         colab.ID.Hex(),
		Nome:       colab.Nome,
		Email:      email,
		TipoAcesso: string(colab.TipoAcesso),
	})
}
