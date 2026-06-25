package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (a *API) refreshAlertas() {
	if a.Collector != nil {
		a.Collector.RefreshAlertas()
	}
}

// ListAlertasEquipamento lista os alertas de um alvo (unidadeId+equipamentoId+porta).
func (a *API) ListAlertasEquipamento(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	unidadeID, err := primitive.ObjectIDFromHex(q.Get("unidadeId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "unidadeId inválido")
		return
	}
	equipamentoID, err := primitive.ObjectIDFromHex(q.Get("equipamentoId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "equipamentoId inválido")
		return
	}
	porta, _ := strconv.Atoi(q.Get("porta"))

	list, err := a.Store.ListAlertasEquipamentoByAlvo(r.Context(), unidadeID, equipamentoID, porta)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) CreateAlertaEquipamento(w http.ResponseWriter, r *http.Request) {
	var al domain.AlertaEquipamento
	if err := json.NewDecoder(r.Body).Decode(&al); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if msg := domain.ValidarAlertaEquipamento(&al); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if err := a.Store.CreateAlertaEquipamento(r.Context(), &al); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.refreshAlertas()
	writeJSON(w, http.StatusCreated, al)
}

func (a *API) UpdateAlertaEquipamento(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetAlertaEquipamento(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var al domain.AlertaEquipamento
	if err := json.NewDecoder(r.Body).Decode(&al); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if msg := domain.ValidarAlertaEquipamento(&al); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	al.ID = oid
	al.CreatedAt = existing.CreatedAt
	if err := a.Store.UpdateAlertaEquipamento(r.Context(), &al); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.refreshAlertas()
	writeJSON(w, http.StatusOK, al)
}

func (a *API) DeleteAlertaEquipamento(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteAlertaEquipamento(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.refreshAlertas()
	w.WriteHeader(http.StatusNoContent)
}
