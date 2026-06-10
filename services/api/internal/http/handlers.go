package httpapi

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/antenas"
	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/collector"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/modbus"
	"github.com/mmrtec/monitoramento/api/internal/snmp"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type API struct {
	Store     store.Store
	Cache     *cache.StateCache
	Collector *collector.Collector
	Antenas   *antenas.Store
	JWTSecret string
	JWTExpiry time.Duration
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
	if claims, ok := auth.ClaimsFromContext(r.Context()); ok {
		if domain.CanManageData(claims.TipoAcesso) {
			// administradores e desenvolvedores: qualquer atualização permitida
		} else if domain.IsEncerramentoChamado(*existing, c) {
			cid, err := primitive.ObjectIDFromHex(claims.ColaboradorID)
			if err != nil || !domain.CanEncerrarChamado(claims.TipoAcesso, cid, *existing) {
				writeError(w, http.StatusForbidden, "somente colaboradores atribuídos à missão ou administradores podem encerrar este chamado")
				return
			}
		} else {
			writeError(w, http.StatusForbidden, "sem permissão para esta operação")
			return
		}
	}
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
	if c.Status == "" {
		c.Status = domain.ColaboradorEscritorio
	}
	if c.FotoURL == "" {
		c.FotoURL = domain.ColaboradorFotoURLPadrao
	}
	senhaInicial, err := auth.SenhaInicialFromDataNascimento(c.DataNascimento)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	senhaHash, err := auth.HashPassword(senhaInicial)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "erro ao gerar senha de acesso")
		return
	}
	c.SenhaHash = senhaHash
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
	existing, err := a.Store.GetColaborador(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var c domain.Colaborador
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	c.ID = oid
	c.CreatedAt = existing.CreatedAt
	c.SenhaHash = existing.SenhaHash
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

func (a *API) DeleteColaborador(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteColaborador(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) ListMissoes(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListMissoes(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) CreateMissao(w http.ResponseWriter, r *http.Request) {
	var m domain.Missao
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if m.Titulo == "" {
		writeError(w, http.StatusBadRequest, "informe o título")
		return
	}
	if m.UnidadeID.IsZero() {
		writeError(w, http.StatusBadRequest, "informe a unidade")
		return
	}
	if m.Status == "" {
		m.Status = domain.MissaoEmAndamento
	}
	if err := a.Store.CreateMissao(r.Context(), &m); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (a *API) UpdateMissao(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetMissao(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var m domain.Missao
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if m.Titulo == "" {
		writeError(w, http.StatusBadRequest, "informe o título")
		return
	}
	if m.UnidadeID.IsZero() {
		writeError(w, http.StatusBadRequest, "informe a unidade")
		return
	}
	m.ID = oid
	m.CreatedAt = existing.CreatedAt
	if err := a.Store.UpdateMissao(r.Context(), &m); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, m)
}

type concluirMissaoInput struct {
	DataConclusao      string `json:"dataConclusao"`
	HoraConclusao      string `json:"horaConclusao"`
	RelatorioConclusao string `json:"relatorioConclusao"`
}

func (a *API) ConcluirMissao(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetMissao(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var chamadoVinculado *domain.Chamado
	if !existing.ChamadoID.IsZero() {
		if ch, err := a.Store.GetChamado(r.Context(), existing.ChamadoID); err == nil {
			chamadoVinculado = ch
		}
	}
	if !domain.MissaoPodeSerConcluida(*existing, chamadoVinculado) {
		writeError(w, http.StatusBadRequest, "somente missões em andamento podem ser concluídas")
		return
	}
	var in concluirMissaoInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if in.DataConclusao == "" {
		writeError(w, http.StatusBadRequest, "informe a data de conclusão")
		return
	}
	if in.HoraConclusao == "" {
		writeError(w, http.StatusBadRequest, "informe a hora de conclusão")
		return
	}
	if in.RelatorioConclusao == "" {
		writeError(w, http.StatusBadRequest, "informe o relatório de conclusão")
		return
	}
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	cid, err := primitive.ObjectIDFromHex(claims.ColaboradorID)
	if err != nil {
		writeError(w, http.StatusForbidden, "sem permissão para concluir esta missão")
		return
	}
	if !domain.CanConcluirMissao(claims.TipoAcesso, cid, *existing, chamadoVinculado) {
		writeError(w, http.StatusForbidden, "somente colaboradores atribuídos à missão ou administradores podem concluí-la")
		return
	}
	nomeConclusao := strings.TrimSpace(claims.Nome)
	if nomeConclusao == "" {
		writeError(w, http.StatusBadRequest, "usuário sem nome cadastrado")
		return
	}

	m := *existing
	m.Status = domain.MissaoConcluida
	m.ConcluidaPor = nomeConclusao
	m.DataConclusao = in.DataConclusao
	m.HoraConclusao = in.HoraConclusao
	m.RelatorioConclusao = in.RelatorioConclusao
	m.UpdatedAt = time.Now().UTC()

	if err := a.Store.UpdateMissao(r.Context(), &m); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	for _, colID := range existing.ColaboradorIDs {
		col, err := a.Store.GetColaborador(r.Context(), colID)
		if err != nil {
			continue
		}
		if col.Status == domain.ColaboradorEmMissao {
			col.Status = domain.ColaboradorEscritorio
			_ = a.Store.UpdateColaborador(r.Context(), col)
		}
	}

	writeJSON(w, http.StatusOK, m)
}

func (a *API) IniciarMissao(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetMissao(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.Status != domain.MissaoPlanejada {
		writeError(w, http.StatusBadRequest, "somente missões planejadas podem ser iniciadas")
		return
	}
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	cid, err := primitive.ObjectIDFromHex(claims.ColaboradorID)
	if err != nil {
		writeError(w, http.StatusForbidden, "sem permissão para iniciar esta missão")
		return
	}
	if !domain.CanIniciarMissao(cid, *existing) {
		writeError(w, http.StatusForbidden, "somente colaboradores atribuídos à missão podem iniciá-la")
		return
	}

	now := time.Now().UTC()
	m := *existing
	m.Status = domain.MissaoEmAndamento
	m.DataInicio = now.Format("2006-01-02")
	m.HoraInicio = now.Format("15:04")
	m.UpdatedAt = now

	if err := a.Store.UpdateMissao(r.Context(), &m); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	for _, colID := range existing.ColaboradorIDs {
		col, err := a.Store.GetColaborador(r.Context(), colID)
		if err != nil {
			continue
		}
		col.Status = domain.ColaboradorEmMissao
		_ = a.Store.UpdateColaborador(r.Context(), col)
	}

	writeJSON(w, http.StatusOK, m)
}

func (a *API) DeleteMissao(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteMissao(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
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

type testSnmpOidInput struct {
	Host      string `json:"host"`
	Port      int    `json:"port"`
	Community string `json:"community"`
	OID       string `json:"oid"`
}

type testSnmpOidOutput struct {
	Online bool   `json:"online"`
	Valor  any    `json:"valor,omitempty"`
	Erro   string `json:"erro,omitempty"`
}

func (a *API) TestSnmpOID(w http.ResponseWriter, r *http.Request) {
	var in testSnmpOidInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	port := uint16(in.Port)
	if port == 0 {
		port = 161
	}
	online, val, errMsg := snmp.TestOID(in.Host, port, in.Community, in.OID)
	if errMsg != "" {
		writeJSON(w, http.StatusOK, testSnmpOidOutput{Online: online, Erro: errMsg})
		return
	}
	writeJSON(w, http.StatusOK, testSnmpOidOutput{Online: online, Valor: val})
}

type testModbusOffsetInput struct {
	Host      string `json:"host"`
	Port      int    `json:"port"`
	SlaveID   int    `json:"slaveId"`
	Registro  string `json:"registro"`
	Offset    int    `json:"offset"`
	TipoDado  string `json:"tipoDado"`
}

type testModbusOffsetOutput struct {
	Online bool   `json:"online"`
	Valor  any    `json:"valor,omitempty"`
	Erro   string `json:"erro,omitempty"`
}

func (a *API) TestModbusOffset(w http.ResponseWriter, r *http.Request) {
	var in testModbusOffsetInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	port := uint16(in.Port)
	if port == 0 {
		port = 502
	}
	if in.Offset < 0 || in.Offset > 65535 {
		writeError(w, http.StatusBadRequest, "offset inválido")
		return
	}
	slaveID := byte(in.SlaveID)
	if slaveID == 0 {
		slaveID = 1
	}
	online, val, errMsg := modbus.TestOffset(
		in.Host,
		port,
		slaveID,
		in.Registro,
		uint16(in.Offset),
		in.TipoDado,
	)
	if errMsg != "" {
		writeJSON(w, http.StatusOK, testModbusOffsetOutput{Online: online, Erro: errMsg})
		return
	}
	writeJSON(w, http.StatusOK, testModbusOffsetOutput{Online: online, Valor: val})
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
