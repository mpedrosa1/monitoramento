package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var mesesPtBr = []string{
	"janeiro", "fevereiro", "março", "abril", "maio", "junho",
	"julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
}

// ===== Escalas de trabalho =====

func (a *API) ListEscalas(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListEscalas(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) CreateEscala(w http.ResponseWriter, r *http.Request) {
	var e domain.EscalaTrabalho
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if strings.TrimSpace(e.Nome) == "" {
		writeError(w, http.StatusBadRequest, "informe o nome da escala")
		return
	}
	if strings.TrimSpace(e.Tipo) == "" {
		writeError(w, http.StatusBadRequest, "informe o tipo da escala")
		return
	}
	if e.ColaboradorIDs == nil {
		e.ColaboradorIDs = []primitive.ObjectID{}
	}
	if err := a.Store.CreateEscala(r.Context(), &e); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

func (a *API) UpdateEscala(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetEscala(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var e domain.EscalaTrabalho
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if strings.TrimSpace(e.Nome) == "" {
		writeError(w, http.StatusBadRequest, "informe o nome da escala")
		return
	}
	if e.ColaboradorIDs == nil {
		e.ColaboradorIDs = []primitive.ObjectID{}
	}
	e.ID = oid
	e.CreatedAt = existing.CreatedAt
	if err := a.Store.UpdateEscala(r.Context(), &e); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (a *API) DeleteEscala(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteEscala(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== Calendário de sobreaviso =====

func (a *API) ListSobreavisos(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListSobreavisos(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) CreateSobreaviso(w http.ResponseWriter, r *http.Request) {
	var sb domain.Sobreaviso
	if err := json.NewDecoder(r.Body).Decode(&sb); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if sb.ColaboradorID.IsZero() {
		writeError(w, http.StatusBadRequest, "informe o colaborador")
		return
	}
	if strings.TrimSpace(sb.DataInicio) == "" || strings.TrimSpace(sb.DataFim) == "" {
		writeError(w, http.StatusBadRequest, "informe o período (data início e fim)")
		return
	}
	if sb.DataFim < sb.DataInicio {
		writeError(w, http.StatusBadRequest, "a data final não pode ser anterior à inicial")
		return
	}
	if err := a.Store.CreateSobreaviso(r.Context(), &sb); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, sb)
}

func (a *API) UpdateSobreaviso(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetSobreaviso(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var sb domain.Sobreaviso
	if err := json.NewDecoder(r.Body).Decode(&sb); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if sb.ColaboradorID.IsZero() {
		writeError(w, http.StatusBadRequest, "informe o colaborador")
		return
	}
	if strings.TrimSpace(sb.DataInicio) == "" || strings.TrimSpace(sb.DataFim) == "" {
		writeError(w, http.StatusBadRequest, "informe o período (data início e fim)")
		return
	}
	if sb.DataFim < sb.DataInicio {
		writeError(w, http.StatusBadRequest, "a data final não pode ser anterior à inicial")
		return
	}
	sb.ID = oid
	sb.CreatedAt = existing.CreatedAt
	if err := a.Store.UpdateSobreaviso(r.Context(), &sb); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sb)
}

func (a *API) DeleteSobreaviso(w http.ResponseWriter, r *http.Request, id string) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.DeleteSobreaviso(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) ListDefinicoesSobreaviso(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListDefinicoesSobreaviso(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

type definirSobreavisoBody struct {
	Ano int `json:"ano"`
	Mes int `json:"mes"`
}

func (a *API) DefinirSobreaviso(w http.ResponseWriter, r *http.Request) {
	var body definirSobreavisoBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	if body.Mes < 1 || body.Mes > 12 || body.Ano < 2000 || body.Ano > 3000 {
		writeError(w, http.StatusBadRequest, "competência inválida")
		return
	}

	competencia := fmt.Sprintf("%04d-%02d", body.Ano, body.Mes)
	inicioMes := fmt.Sprintf("%s-01", competencia)
	fimMes := fmt.Sprintf("%04d-%02d-%02d", body.Ano, body.Mes, diasNoMes(body.Ano, body.Mes))

	sobreavisos, err := a.Store.ListSobreavisos(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Colaboradores distintos com sobreaviso no mês.
	colaboradoresMes := make(map[primitive.ObjectID]struct{})
	for _, s := range sobreavisos {
		if s.DataInicio <= fimMes && s.DataFim >= inicioMes {
			colaboradoresMes[s.ColaboradorID] = struct{}{}
		}
	}

	nomeMes := mesesPtBr[body.Mes-1]
	titulo := fmt.Sprintf("Escala de sobreaviso definida — %s/%d", nomeMes, body.Ano)
	mensagem := fmt.Sprintf(
		"A escala de sobreaviso de %s de %d foi definida. Você está escalado(a). Confira suas datas no sistema.",
		nomeMes, body.Ano,
	)

	notificados := 0
	for colabID := range colaboradoresMes {
		notif := domain.Notificacao{
			DestinatarioColaboradorID: colabID,
			Tipo:                      domain.NotificacaoSobreavisoDefinido,
			Titulo:                    titulo,
			Mensagem:                  mensagem,
			Payload:                   domain.NotificacaoPayload{Competencia: competencia},
		}
		if err := a.Store.CreateNotificacao(r.Context(), &notif); err != nil {
			continue
		}
		a.pushNotificacao(notif)
		notificados++
	}

	definidaPor := ""
	if claims, ok := auth.ClaimsFromContext(r.Context()); ok {
		definidaPor = claims.Nome
	}
	def := domain.EscalaSobreavisoDefinida{
		Competencia:      competencia,
		DefinidaPor:      definidaPor,
		TotalNotificados: notificados,
		DefinidaEm:       time.Now().UTC(),
	}
	if err := a.Store.UpsertDefinicaoSobreaviso(r.Context(), &def); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, def)
}

func diasNoMes(ano, mes int) int {
	return time.Date(ano, time.Month(mes)+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func competenciaDeAnoMes(ano, mes int) string {
	return fmt.Sprintf("%04d-%02d", ano, mes)
}

func sobreavisoNoMes(s domain.Sobreaviso, ano, mes int) bool {
	comp := competenciaDeAnoMes(ano, mes)
	inicioMes := comp + "-01"
	fimMes := fmt.Sprintf("%s-%02d", comp, diasNoMes(ano, mes))
	return s.DataInicio <= fimMes && s.DataFim >= inicioMes
}

func (a *API) usuarioEscaladoSobreaviso(ctx context.Context, colabID primitive.ObjectID) (bool, error) {
	defs, err := a.Store.ListDefinicoesSobreaviso(ctx)
	if err != nil {
		return false, err
	}
	if len(defs) == 0 {
		return false, nil
	}
	sobreavisos, err := a.Store.ListSobreavisos(ctx)
	if err != nil {
		return false, err
	}
	for _, d := range defs {
		var ano, mes int
		if _, err := fmt.Sscanf(d.Competencia, "%d-%d", &ano, &mes); err != nil {
			continue
		}
		for _, s := range sobreavisos {
			if s.ColaboradorID != colabID {
				continue
			}
			if sobreavisoNoMes(s, ano, mes) {
				return true, nil
			}
		}
	}
	return false, nil
}

func (a *API) colaboradorIDFromRequest(w http.ResponseWriter, r *http.Request) (primitive.ObjectID, bool) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return primitive.NilObjectID, false
	}
	oid, err := primitive.ObjectIDFromHex(claims.ColaboradorID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return primitive.NilObjectID, false
	}
	return oid, true
}

// GetSobreavisoMeEscalado indica se o colaborador autenticado está escalado
// em algum mês com escala de sobreaviso já definida.
func (a *API) GetSobreavisoMeEscalado(w http.ResponseWriter, r *http.Request) {
	colabID, ok := a.colaboradorIDFromRequest(w, r)
	if !ok {
		return
	}
	escalado, err := a.usuarioEscaladoSobreaviso(r.Context(), colabID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"escalado": escalado})
}

type sobreavisoCalendarioColaborador struct {
	ID   string `json:"id"`
	Nome string `json:"nome"`
}

type sobreavisoCalendarioEscala struct {
	ID  string `json:"id"`
	Cor string `json:"cor,omitempty"`
}

type sobreavisoCalendarioResponse struct {
	Definida      bool                              `json:"definida"`
	Definicao     *domain.EscalaSobreavisoDefinida  `json:"definicao,omitempty"`
	Sobreavisos   []domain.Sobreaviso               `json:"sobreavisos"`
	Escalas       []sobreavisoCalendarioEscala      `json:"escalas"`
	Colaboradores []sobreavisoCalendarioColaborador `json:"colaboradores"`
}

// GetSobreavisoCalendario retorna o calendário de sobreaviso de um mês (somente
// leitura), disponível para colaboradores escalados quando a escala está definida.
func (a *API) GetSobreavisoCalendario(w http.ResponseWriter, r *http.Request) {
	colabID, ok := a.colaboradorIDFromRequest(w, r)
	if !ok {
		return
	}
	escalado, err := a.usuarioEscaladoSobreaviso(r.Context(), colabID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !escalado {
		writeError(w, http.StatusForbidden, "acesso negado")
		return
	}

	ano, mes, err := parseAnoMesQuery(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	competencia := competenciaDeAnoMes(ano, mes)

	defs, err := a.Store.ListDefinicoesSobreaviso(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var definicao *domain.EscalaSobreavisoDefinida
	for i := range defs {
		if defs[i].Competencia == competencia {
			definicao = &defs[i]
			break
		}
	}
	if definicao == nil {
		writeJSON(w, http.StatusOK, sobreavisoCalendarioResponse{
			Definida:      false,
			Sobreavisos:   []domain.Sobreaviso{},
			Escalas:       []sobreavisoCalendarioEscala{},
			Colaboradores: []sobreavisoCalendarioColaborador{},
		})
		return
	}

	sobreavisos, err := a.Store.ListSobreavisos(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var noMes []domain.Sobreaviso
	colabIDs := make(map[primitive.ObjectID]struct{})
	escalaIDs := make(map[primitive.ObjectID]struct{})
	for _, s := range sobreavisos {
		if !sobreavisoNoMes(s, ano, mes) {
			continue
		}
		noMes = append(noMes, s)
		colabIDs[s.ColaboradorID] = struct{}{}
		if s.EscalaID != nil && !s.EscalaID.IsZero() {
			escalaIDs[*s.EscalaID] = struct{}{}
		}
	}

	todosCols, err := a.Store.ListColaboradores(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var cols []sobreavisoCalendarioColaborador
	for _, c := range todosCols {
		if _, ok := colabIDs[c.ID]; ok {
			cols = append(cols, sobreavisoCalendarioColaborador{
				ID:   c.ID.Hex(),
				Nome: c.Nome,
			})
		}
	}

	todasEscalas, err := a.Store.ListEscalas(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var escalas []sobreavisoCalendarioEscala
	for _, e := range todasEscalas {
		if _, ok := escalaIDs[e.ID]; ok {
			escalas = append(escalas, sobreavisoCalendarioEscala{
				ID:  e.ID.Hex(),
				Cor: e.Cor,
			})
		}
	}

	writeJSON(w, http.StatusOK, sobreavisoCalendarioResponse{
		Definida:      true,
		Definicao:     definicao,
		Sobreavisos:   noMes,
		Escalas:       escalas,
		Colaboradores: cols,
	})
}

func parseAnoMesQuery(r *http.Request) (ano, mes int, err error) {
	if _, scanErr := fmt.Sscanf(r.URL.Query().Get("ano"), "%d", &ano); scanErr != nil || ano < 2000 || ano > 3000 {
		return 0, 0, fmt.Errorf("informe ano válido")
	}
	if _, scanErr := fmt.Sscanf(r.URL.Query().Get("mes"), "%d", &mes); scanErr != nil || mes < 1 || mes > 12 {
		return 0, 0, fmt.Errorf("informe mês válido")
	}
	return ano, mes, nil
}
