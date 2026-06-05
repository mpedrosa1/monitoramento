package httpapi

import (
	"encoding/json"
	"net/http"
	"sort"

	"github.com/mmrtec/monitoramento/api/internal/antenas"
	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/collector"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type API struct {
	Store     store.Store
	Cache     *cache.StateCache
	Collector *collector.Collector
	Antenas   *antenas.Store
}

func (a *API) refreshCollector() {
	if a.Collector != nil {
		a.Collector.RefreshTargets()
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeJSONList evita `null` no JSON quando o slice Go é nil (lista vazia).
func writeJSONList[T any](w http.ResponseWriter, status int, list []T) {
	if list == nil {
		list = []T{}
	}
	writeJSON(w, status, list)
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
	writeJSONList(w, http.StatusOK, list)
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
	if c.Titulo == "" && c.EmailAssunto != "" {
		c.Titulo = c.EmailAssunto
	}
	if c.Descricao == "" && c.EmailCorpo != "" {
		c.Descricao = c.EmailCorpo
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
	existing, err := a.Store.GetChamado(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var c domain.Chamado
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	c.ID = oid
	c.CreatedAt = existing.CreatedAt
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

func (a *API) DeleteChamado(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteChamado(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) ListUnidades(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListUnidades(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	for i := range list {
		normalizeUnidade(&list[i])
	}
	sort.Slice(list, func(i, j int) bool {
		return compareUnidadeCodigo(list[i].Codigo, list[j].Codigo) < 0
	})
	writeJSONList(w, http.StatusOK, list)
}

func normalizeUnidade(u *domain.Unidade) {
	if u.Diretores == nil {
		u.Diretores = []string{}
	}
	if u.Telefones == nil {
		u.Telefones = []string{}
	}
	if u.Emails == nil {
		u.Emails = []string{}
	}
	if u.Equipamentos == nil {
		u.Equipamentos = []domain.UnidadeEquipamento{}
	}
	if u.IntervaloS <= 0 {
		u.IntervaloS = 30
	}
	if u.AlertaOfflineS <= 0 {
		u.AlertaOfflineS = 60
	}
}

func (a *API) CreateUnidade(w http.ResponseWriter, r *http.Request) {
	u, err := decodeUnidadeBody(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	normalizeUnidade(&u)
	if err := a.Store.CreateUnidade(r.Context(), &u); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.refreshCollector()
	writeJSON(w, http.StatusCreated, u)
}

func (a *API) UpdateUnidade(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	u, err := decodeUnidadeBody(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	u.ID = oid
	normalizeUnidade(&u)
	if err := a.Store.UpdateUnidade(r.Context(), &u); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.refreshCollector()
	writeJSON(w, http.StatusOK, u)
}

func (a *API) DeleteUnidade(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteUnidade(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.refreshCollector()
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) ListColaboradores(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListColaboradores(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
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
	writeJSONList(w, http.StatusOK, list)
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

func (a *API) DeleteEquipamento(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteEquipamento(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) ListEventos(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r.URL.Query().Get("limit"), 20)
	list, err := a.Store.ListEventos(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}
