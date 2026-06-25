package httpapi

import (
	"encoding/json"
	"math"
	"net/http"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// arredonda para 2 casas decimais (centavos).
func arredondarCentavos(v float64) float64 {
	return math.Round(v*100) / 100
}

// validaFaixaConvenio aplica as regras de negócio e normaliza a faixa.
// Retorna mensagem de erro (vazia quando válida).
func validaFaixaConvenio(f *domain.FaixaConvenioMedico) string {
	if f.IdadeMin < 0 {
		return "idade mínima inválida"
	}
	// IdadeMax <= 0 representa faixa sem limite superior (ex.: 59+).
	if f.IdadeMax > 0 && f.IdadeMax < f.IdadeMin {
		return "a idade máxima não pode ser menor que a mínima"
	}
	if f.Valor <= 0 {
		return "informe o valor da mensalidade"
	}
	f.Valor = arredondarCentavos(f.Valor)
	// O dependente paga 25% — preenche automaticamente quando não informado.
	if f.DescontoFolha <= 0 {
		f.DescontoFolha = arredondarCentavos(f.Valor * 0.25)
	} else {
		f.DescontoFolha = arredondarCentavos(f.DescontoFolha)
	}
	return ""
}

func (a *API) ListFaixasConvenioMedico(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListFaixasConvenioMedico(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) CreateFaixaConvenioMedico(w http.ResponseWriter, r *http.Request) {
	var f domain.FaixaConvenioMedico
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if msg := validaFaixaConvenio(&f); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	if err := a.Store.CreateFaixaConvenioMedico(r.Context(), &f); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, f)
}

func (a *API) UpdateFaixaConvenioMedico(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetFaixaConvenioMedico(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var f domain.FaixaConvenioMedico
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if msg := validaFaixaConvenio(&f); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	f.ID = oid
	f.CreatedAt = existing.CreatedAt
	if err := a.Store.UpdateFaixaConvenioMedico(r.Context(), &f); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (a *API) DeleteFaixaConvenioMedico(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteFaixaConvenioMedico(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
