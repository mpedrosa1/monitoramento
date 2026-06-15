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

func (a *API) ListNotificacoes(w http.ResponseWriter, r *http.Request) {
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
	list, err := a.Store.ListNotificacoes(r.Context(), colabID, 100)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) MarcarNotificacaoLida(w http.ResponseWriter, r *http.Request, id string) {
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
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := a.Store.MarcarNotificacaoLida(r.Context(), oid, colabID); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "notificação não encontrada")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type solicitarTrocaBody struct {
	VeiculoAlvoID     string `json:"veiculoAlvoId"`
	VeiculoOfertadoID string `json:"veiculoOfertadoId,omitempty"`
}

func (a *API) SolicitarTrocaVeiculo(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	solicitanteID, err := auth.ColaboradorObjectID(claims)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return
	}

	var body solicitarTrocaBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	alvoOID, err := primitive.ObjectIDFromHex(strings.TrimSpace(body.VeiculoAlvoID))
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo alvo inválido")
		return
	}

	alvo, err := a.Store.GetVeiculo(r.Context(), alvoOID)
	if store.IsNotFound(err) || alvo == nil {
		writeError(w, http.StatusBadRequest, "veículo não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if alvo.ColaboradorID == solicitanteID {
		writeError(w, http.StatusBadRequest, domain.ErrMesmoColaboradorTroca.Error())
		return
	}

	if _, err := a.Store.FindTrocaVeiculoPendente(r.Context(), solicitanteID, alvoOID); err == nil {
		writeError(w, http.StatusConflict, "já existe solicitação pendente para este veículo")
		return
	} else if !store.IsNotFound(err) {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	meusVeiculos, err := a.Store.GetVeiculosByColaborador(r.Context(), solicitanteID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var ofertadoOID *primitive.ObjectID
	ofertadoStr := strings.TrimSpace(body.VeiculoOfertadoID)
	if ofertadoStr != "" {
		oid, err := primitive.ObjectIDFromHex(ofertadoStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "veículo ofertado inválido")
			return
		}
		found := false
		for _, v := range meusVeiculos {
			if v.ID == oid {
				found = true
				break
			}
		}
		if !found {
			writeError(w, http.StatusBadRequest, "veículo ofertado não pertence ao solicitante")
			return
		}
		ofertadoOID = &oid
	} else if len(meusVeiculos) == 1 {
		id := meusVeiculos[0].ID
		ofertadoOID = &id
	} else if len(meusVeiculos) > 1 {
		writeError(w, http.StatusBadRequest, "informe qual veículo deseja oferecer na troca")
		return
	}

	var ofertadoPlaca string
	if ofertadoOID != nil {
		ofertado, err := a.Store.GetVeiculo(r.Context(), *ofertadoOID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		ofertadoPlaca = ofertado.Placa
	}

	troca := domain.TrocaVeiculo{
		SolicitanteColaboradorID:  solicitanteID,
		DestinatarioColaboradorID: alvo.ColaboradorID,
		VeiculoAlvoID:             alvoOID,
		VeiculoOfertadoID:         ofertadoOID,
		Status:                    domain.TrocaVeiculoStatusPendente,
		Origem:                    domain.TrocaVeiculoOrigemSolicitacao,
	}
	if err := a.Store.CreateTrocaVeiculo(r.Context(), &troca); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	msg := fmt.Sprintf("%s solicitou assumir o veículo %s.", claims.Nome, formatPlacaDisplay(alvo.Placa))
	if ofertadoPlaca != "" {
		msg = fmt.Sprintf("%s solicitou troca: deseja o veículo %s e oferece o %s.", claims.Nome, formatPlacaDisplay(alvo.Placa), formatPlacaDisplay(ofertadoPlaca))
	}

	payload := domain.NotificacaoPayload{
		TrocaID:                  troca.ID.Hex(),
		VeiculoAlvoID:            alvoOID.Hex(),
		SolicitanteColaboradorID: solicitanteID.Hex(),
		SolicitanteNome:          claims.Nome,
		VeiculoAlvoPlaca:         alvo.Placa,
	}
	if ofertadoOID != nil {
		payload.VeiculoOfertadoID = ofertadoOID.Hex()
		payload.VeiculoOfertadoPlaca = ofertadoPlaca
	}

	notif := domain.Notificacao{
		DestinatarioColaboradorID: alvo.ColaboradorID,
		Tipo:                      domain.NotificacaoTrocaSolicitacao,
		Titulo:                    "Solicitação de troca de veículo",
		Mensagem:                  msg,
		Payload:                   payload,
	}
	if err := a.Store.CreateNotificacao(r.Context(), &notif); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.pushNotificacao(notif)

	writeJSON(w, http.StatusCreated, troca)
}

type responderTrocaBody struct {
	Aceitar bool `json:"aceitar"`
}

func (a *API) ResponderTrocaVeiculo(w http.ResponseWriter, r *http.Request, id string) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	destinatarioID, err := auth.ColaboradorObjectID(claims)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return
	}

	trocaOID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	troca, err := a.Store.GetTrocaVeiculo(r.Context(), trocaOID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "solicitação não encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if troca.Status != domain.TrocaVeiculoStatusPendente {
		writeError(w, http.StatusConflict, "solicitação já foi respondida")
		return
	}
	if troca.DestinatarioColaboradorID != destinatarioID {
		writeError(w, http.StatusForbidden, "apenas o condutor do veículo pode responder")
		return
	}

	var body responderTrocaBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}

	now := time.Now().UTC()
	troca.RespondidoAt = &now

	if !body.Aceitar {
		troca.Status = domain.TrocaVeiculoStatusRecusada
		if err := a.Store.UpdateTrocaVeiculo(r.Context(), troca); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		aceita := false
		a.notificarRespostaTroca(r.Context(), troca, claims.Nome, aceita)
		writeJSON(w, http.StatusOK, troca)
		return
	}

	alvo, err := a.Store.GetVeiculo(r.Context(), troca.VeiculoAlvoID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var ofertado *domain.Veiculo
	if troca.VeiculoOfertadoID != nil && !troca.VeiculoOfertadoID.IsZero() {
		ofertado, err = a.Store.GetVeiculo(r.Context(), *troca.VeiculoOfertadoID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	domain.AplicarTrocaSolicitacao(alvo, ofertado, troca.SolicitanteColaboradorID)
	if err := a.Store.UpdateVeiculo(r.Context(), alvo); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ofertado != nil {
		if err := a.Store.UpdateVeiculo(r.Context(), ofertado); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	troca.Status = domain.TrocaVeiculoStatusAceita
	if err := a.Store.UpdateTrocaVeiculo(r.Context(), troca); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	aceita := true
	a.notificarRespostaTroca(r.Context(), troca, claims.Nome, aceita)
	writeJSON(w, http.StatusOK, troca)
}

type trocaAdminBody struct {
	VeiculoAID string `json:"veiculoAId"`
	VeiculoBID string `json:"veiculoBId"`
}

func (a *API) TrocaAdminVeiculos(w http.ResponseWriter, r *http.Request) {
	var body trocaAdminBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	aOID, err := primitive.ObjectIDFromHex(strings.TrimSpace(body.VeiculoAID))
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo A inválido")
		return
	}
	bOID, err := primitive.ObjectIDFromHex(strings.TrimSpace(body.VeiculoBID))
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo B inválido")
		return
	}
	if aOID == bOID {
		writeError(w, http.StatusBadRequest, "selecione dois veículos diferentes")
		return
	}

	veiculoA, err := a.Store.GetVeiculo(r.Context(), aOID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusBadRequest, "veículo A não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	veiculoB, err := a.Store.GetVeiculo(r.Context(), bOID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusBadRequest, "veículo B não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	placaA := veiculoA.Placa
	placaB := veiculoB.Placa
	colabOrigA := veiculoA.ColaboradorID
	colabOrigB := veiculoB.ColaboradorID

	if err := domain.AplicarTrocaAdmin(veiculoA, veiculoB); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := a.Store.UpdateVeiculo(r.Context(), veiculoA); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.Store.UpdateVeiculo(r.Context(), veiculoB); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	now := time.Now().UTC()
	troca := domain.TrocaVeiculo{
		SolicitanteColaboradorID:  colabOrigA,
		DestinatarioColaboradorID: colabOrigB,
		VeiculoAlvoID:             aOID,
		VeiculoOfertadoID:         &bOID,
		Status:                    domain.TrocaVeiculoStatusAceita,
		Origem:                    domain.TrocaVeiculoOrigemAdmin,
		RespondidoAt:              &now,
	}
	_ = a.Store.CreateTrocaVeiculo(r.Context(), &troca)

	msgA := fmt.Sprintf("Um administrador trocou seu veículo %s pelo %s.", formatPlacaDisplay(placaA), formatPlacaDisplay(placaB))
	msgB := fmt.Sprintf("Um administrador trocou seu veículo %s pelo %s.", formatPlacaDisplay(placaB), formatPlacaDisplay(placaA))

	a.criarNotificacaoAdmin(r.Context(), colabOrigA, msgA, aOID.Hex(), bOID.Hex(), placaA, placaB)
	a.criarNotificacaoAdmin(r.Context(), colabOrigB, msgB, bOID.Hex(), aOID.Hex(), placaB, placaA)

	writeJSON(w, http.StatusOK, map[string]any{
		"veiculoA": veiculoA,
		"veiculoB": veiculoB,
	})
}

func (a *API) criarNotificacaoAdmin(ctx context.Context, destinatario primitive.ObjectID, mensagem, veiculoAlvoID, veiculoOfertadoID, placaAlvo, placaOfertado string) {
	notif := domain.Notificacao{
		DestinatarioColaboradorID: destinatario,
		Tipo:                      domain.NotificacaoTrocaAdmin,
		Titulo:                    "Troca de veículo realizada",
		Mensagem:                  mensagem,
		Payload: domain.NotificacaoPayload{
			VeiculoAlvoID:        veiculoAlvoID,
			VeiculoOfertadoID:    veiculoOfertadoID,
			VeiculoAlvoPlaca:     placaAlvo,
			VeiculoOfertadoPlaca: placaOfertado,
		},
	}
	if err := a.Store.CreateNotificacao(ctx, &notif); err == nil {
		a.pushNotificacao(notif)
	}
}

func (a *API) notificarRespostaTroca(ctx context.Context, troca *domain.TrocaVeiculo, destinatarioNome string, aceita bool) {
	alvo, _ := a.Store.GetVeiculo(ctx, troca.VeiculoAlvoID)
	placaAlvo := ""
	if alvo != nil {
		placaAlvo = alvo.Placa
	}
	var titulo, msg string
	if aceita {
		titulo = "Troca de veículo aceita"
		msg = fmt.Sprintf("%s aceitou sua solicitação de troca do veículo %s.", destinatarioNome, formatPlacaDisplay(placaAlvo))
	} else {
		titulo = "Troca de veículo recusada"
		msg = fmt.Sprintf("%s recusou sua solicitação de troca do veículo %s.", destinatarioNome, formatPlacaDisplay(placaAlvo))
	}
	payload := domain.NotificacaoPayload{
		TrocaID:          troca.ID.Hex(),
		VeiculoAlvoID:    troca.VeiculoAlvoID.Hex(),
		VeiculoAlvoPlaca: placaAlvo,
		Aceita:           &aceita,
	}
	if troca.VeiculoOfertadoID != nil {
		payload.VeiculoOfertadoID = troca.VeiculoOfertadoID.Hex()
	}
	notif := domain.Notificacao{
		DestinatarioColaboradorID: troca.SolicitanteColaboradorID,
		Tipo:                      domain.NotificacaoTrocaResposta,
		Titulo:                    titulo,
		Mensagem:                  msg,
		Payload:                   payload,
	}
	if err := a.Store.CreateNotificacao(ctx, &notif); err == nil {
		a.pushNotificacao(notif)
	}
}

func formatPlacaDisplay(placa string) string {
	p := strings.ToUpper(strings.TrimSpace(placa))
	if len(p) == 7 {
		return p[:3] + "-" + p[3:]
	}
	return p
}
