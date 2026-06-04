package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type API struct {
	Store store.Store
	Cache *cache.StateCache
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (a *API) Health(w http.ResponseWriter, r *http.Request) {
	if err := a.Store.Ping(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "db": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) DashboardSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := a.Store.DashboardSummary(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if a.Cache != nil {
		summary.Metricas = a.Cache.Snapshot()
	}
	writeJSON(w, http.StatusOK, summary)
}

func (a *API) MonitoringLive(w http.ResponseWriter, r *http.Request) {
	if a.Cache == nil {
		writeJSON(w, http.StatusOK, []domain.DeviceMetric{})
		return
	}
	writeJSON(w, http.StatusOK, a.Cache.Snapshot())
}

func (a *API) ListChamados(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r.URL.Query().Get("limit"), 0)
	list, err := a.Store.ListChamados(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) GetChamado(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	c, err := a.Store.GetChamado(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) CreateChamado(w http.ResponseWriter, r *http.Request) {
	var c domain.Chamado
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if c.Status == "" {
		c.Status = domain.ChamadoAberto
	}
	if err := a.Store.CreateChamado(r.Context(), &c); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (a *API) UpdateChamado(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var c domain.Chamado
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	c.ID = oid
	if err := a.Store.UpdateChamado(r.Context(), &c); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) ListUnidades(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListUnidades(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) CreateUnidade(w http.ResponseWriter, r *http.Request) {
	var u domain.Unidade
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if err := a.Store.CreateUnidade(r.Context(), &u); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

func (a *API) UpdateUnidade(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var u domain.Unidade
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	u.ID = oid
	if err := a.Store.UpdateUnidade(r.Context(), &u); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (a *API) ListColaboradores(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListColaboradores(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) CreateColaborador(w http.ResponseWriter, r *http.Request) {
	var c domain.Colaborador
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if err := a.Store.CreateColaborador(r.Context(), &c); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (a *API) UpdateColaborador(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var c domain.Colaborador
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	c.ID = oid
	if err := a.Store.UpdateColaborador(r.Context(), &c); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) ListEquipamentos(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListEquipamentos(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) CreateEquipamento(w http.ResponseWriter, r *http.Request) {
	var e domain.Equipamento
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if e.TipoMonitoramento == "" {
		e.TipoMonitoramento = domain.DispositivoModbus
	}
	if e.TipoMonitoramento != domain.DispositivoModbus && e.TipoMonitoramento != domain.DispositivoSNMP {
		writeError(w, http.StatusBadRequest, "tipoMonitoramento deve ser modbus ou snmp")
		return
	}
	if e.TipoEquipamento == "" {
		e.TipoEquipamento = domain.TipoEquipamentoSensor
	}
	if err := a.Store.CreateEquipamento(r.Context(), &e); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

func (a *API) UpdateEquipamento(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var e domain.Equipamento
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	e.ID = oid
	if err := a.Store.UpdateEquipamento(r.Context(), &e); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (a *API) ListEventos(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r.URL.Query().Get("limit"), 20)
	list, err := a.Store.ListEventos(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}
