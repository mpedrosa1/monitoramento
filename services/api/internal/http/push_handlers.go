package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/store"
)

type pushTokenRequest struct {
	Token    string `json:"token"`
	Platform string `json:"platform"`
}

func (a *API) RegisterPushToken(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	colabID, err := auth.ColaboradorObjectID(claims)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return
	}

	var body pushTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	token := strings.TrimSpace(body.Token)
	platform := strings.TrimSpace(strings.ToLower(body.Platform))
	if token == "" {
		writeError(w, http.StatusBadRequest, "token obrigatório")
		return
	}
	if platform != "android" && platform != "ios" {
		writeError(w, http.StatusBadRequest, "platform inválida")
		return
	}

	if err := a.Store.UpsertPushToken(r.Context(), colabID, token, platform); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) DeletePushToken(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	colabID, err := auth.ColaboradorObjectID(claims)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return
	}

	var body pushTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	token := strings.TrimSpace(body.Token)
	if token == "" {
		writeError(w, http.StatusBadRequest, "token obrigatório")
		return
	}

	if err := a.Store.DeletePushToken(r.Context(), colabID, token); err != nil {
		if store.IsNotFound(err) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
