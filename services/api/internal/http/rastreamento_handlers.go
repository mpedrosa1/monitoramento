package httpapi

import (
	"net/http"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/rastreamento"
)

func (a *API) ListRastreamentoPosicoes(w http.ResponseWriter, r *http.Request) {
	if a.Rastreamento == nil || !a.Rastreamento.Enabled() {
		writeJSONList(w, http.StatusOK, []domain.VeiculoPosicao{})
		return
	}
	writeJSONList(w, http.StatusOK, a.Rastreamento.Snapshot())
}

func (a *API) RastreamentoStatus(w http.ResponseWriter, r *http.Request) {
	if a.Rastreamento == nil {
		writeJSON(w, http.StatusOK, rastreamento.Status{Configured: false})
		return
	}
	writeJSON(w, http.StatusOK, a.Rastreamento.Status(r.Context()))
}
