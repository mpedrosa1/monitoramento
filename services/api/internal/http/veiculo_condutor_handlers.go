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

func (a *API) NotificarNovaDivergenciaCondutor(
	ctx context.Context,
	divergencia *domain.CondutorRotaExataDivergencia,
	veiculo *domain.Veiculo,
) {
	if divergencia == nil || veiculo == nil {
		return
	}
	colabs, err := a.Store.ListColaboradores(ctx)
	if err != nil {
		return
	}

	placa := formatPlacaDisplay(veiculo.Placa)
	msg := fmt.Sprintf(
		"O veículo %s está com %s na Rota Exata, diferente do condutor cadastrado no sistema.",
		placa,
		strings.TrimSpace(divergencia.RotaExataMotoristaNome),
	)
	if msg == "" || strings.TrimSpace(divergencia.RotaExataMotoristaNome) == "" {
		msg = fmt.Sprintf(
			"O veículo %s tem divergência de condutor entre a Rota Exata e o cadastro local.",
			placa,
		)
	}

	payload := domain.NotificacaoPayload{
		DivergenciaCondutorID:  divergencia.ID.Hex(),
		VeiculoID:              veiculo.ID.Hex(),
		VeiculoAlvoPlaca:       veiculo.Placa,
		RotaExataMotoristaNome: divergencia.RotaExataMotoristaNome,
	}

	for _, colab := range colabs {
		if !domain.CanFrotaTrocarVeiculos(colab.TipoAcesso, colab.PermissoesAdmin) {
			continue
		}
		a.criarENotificar(ctx, domain.Notificacao{
			DestinatarioColaboradorID: colab.ID,
			Tipo:                      domain.NotificacaoCondutorRotaExata,
			Titulo:                    "Divergência de condutor (Rota Exata)",
			Mensagem:                  msg,
			Payload:                   payload,
		})
	}
}

func (a *API) VerificarCondutoresRotaExata(w http.ResponseWriter, r *http.Request) {
	if a.Rastreamento == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"configured":            false,
			"verificado":            false,
			"divergenciasPendentes": []any{},
		})
		return
	}
	result := a.Rastreamento.VerificarCondutores(r.Context())
	writeJSON(w, http.StatusOK, result)
}

func (a *API) ListCondutorRotaExataDivergencias(w http.ResponseWriter, r *http.Request) {
	status := domain.CondutorDivergenciaPendente
	if q := strings.TrimSpace(r.URL.Query().Get("status")); q != "" {
		s := domain.CondutorRotaExataDivergenciaStatus(q)
		status = s
	}
	list, err := a.Store.ListCondutorRotaExataDivergencias(r.Context(), &status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

type resolverCondutorDivergenciaBody struct {
	ColaboradorID string `json:"colaboradorId,omitempty"`
}

func (a *API) AprovarCondutorRotaExataDivergencia(w http.ResponseWriter, r *http.Request, id string) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	adminID, err := auth.ColaboradorObjectID(claims)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return
	}

	divOID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}

	divergencia, err := a.Store.GetCondutorRotaExataDivergencia(r.Context(), divOID)
	if store.IsNotFound(err) || divergencia == nil {
		writeError(w, http.StatusNotFound, "divergência não encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if divergencia.Status != domain.CondutorDivergenciaPendente {
		writeError(w, http.StatusConflict, "divergência já foi resolvida")
		return
	}

	var body resolverCondutorDivergenciaBody
	_ = json.NewDecoder(r.Body).Decode(&body)

	var novoMotoristaID primitive.ObjectID
	if colID := strings.TrimSpace(body.ColaboradorID); colID != "" {
		oid, err := primitive.ObjectIDFromHex(colID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "colaborador inválido")
			return
		}
		novoMotoristaID = oid
	} else if divergencia.MotoristaSugeridoID != nil {
		novoMotoristaID = *divergencia.MotoristaSugeridoID
	} else {
		writeError(w, http.StatusBadRequest, "selecione o colaborador correspondente ao condutor da Rota Exata")
		return
	}

	novoColab, err := a.Store.GetColaborador(r.Context(), novoMotoristaID)
	if store.IsNotFound(err) || novoColab == nil {
		writeError(w, http.StatusBadRequest, "colaborador não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	veiculo, err := a.Store.GetVeiculo(r.Context(), divergencia.VeiculoID)
	if store.IsNotFound(err) || veiculo == nil {
		writeError(w, http.StatusBadRequest, "veículo não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	motoristaAnterior := veiculo.ColaboradorID
	veiculo.ColaboradorID = novoMotoristaID
	veiculo.UpdatedAt = time.Now().UTC()
	if err := a.Store.UpdateVeiculo(r.Context(), veiculo); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.registrarTrocaMotoristaVeiculo(r.Context(), veiculo.ID, motoristaAnterior, novoMotoristaID, "", ""); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if novoColab.RotaExataMotoristaID == nil && divergencia.RotaExataMotoristaID > 0 {
		rxID := divergencia.RotaExataMotoristaID
		novoColab.RotaExataMotoristaID = &rxID
		novoColab.UpdatedAt = time.Now().UTC()
		_ = a.Store.UpdateColaborador(r.Context(), novoColab)
	}

	now := time.Now().UTC()
	divergencia.Status = domain.CondutorDivergenciaAprovada
	divergencia.ResolvidoEm = &now
	divergencia.ResolvidoPorColaboradorID = &adminID
	if err := a.Store.UpdateCondutorRotaExataDivergencia(r.Context(), divergencia); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, divergencia)
}

func (a *API) RecusarCondutorRotaExataDivergencia(w http.ResponseWriter, r *http.Request, id string) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	adminID, err := auth.ColaboradorObjectID(claims)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sessão inválida")
		return
	}

	divOID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}

	divergencia, err := a.Store.GetCondutorRotaExataDivergencia(r.Context(), divOID)
	if store.IsNotFound(err) || divergencia == nil {
		writeError(w, http.StatusNotFound, "divergência não encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if divergencia.Status != domain.CondutorDivergenciaPendente {
		writeError(w, http.StatusConflict, "divergência já foi resolvida")
		return
	}

	now := time.Now().UTC()
	divergencia.Status = domain.CondutorDivergenciaRecusada
	divergencia.ResolvidoEm = &now
	divergencia.ResolvidoPorColaboradorID = &adminID
	if err := a.Store.UpdateCondutorRotaExataDivergencia(r.Context(), divergencia); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, divergencia)
}
