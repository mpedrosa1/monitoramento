package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (a *API) registrarTrocaMotoristaVeiculo(
	ctx context.Context,
	veiculoID, motoristaAnterior, motoristaNovo primitive.ObjectID,
	dataInicio, horaInicio string,
) error {
	if motoristaAnterior == motoristaNovo {
		return nil
	}
	agora := domain.DataHojeISO()
	hora := domain.HoraAgoraISO()
	if strings.TrimSpace(dataInicio) != "" {
		agora = strings.TrimSpace(dataInicio)
	}
	if strings.TrimSpace(horaInicio) != "" {
		hora = strings.TrimSpace(horaInicio)
	} else if strings.TrimSpace(dataInicio) != "" && agora != domain.DataHojeISO() {
		hora = "00:00"
	}
	if !motoristaAnterior.IsZero() {
		_ = a.Store.FecharPeriodoMotoristaAberto(ctx, veiculoID, agora, hora)
	}
	if motoristaNovo.IsZero() {
		return nil
	}
	return a.Store.CreateVeiculoPeriodoMotorista(ctx, &domain.VeiculoPeriodoMotorista{
		VeiculoID:     veiculoID,
		ColaboradorID: motoristaNovo,
		DataInicio:    agora,
		HoraInicio:    hora,
	})
}

func (a *API) ListVeiculoPeriodosMotorista(w http.ResponseWriter, r *http.Request, veiculoID string) {
	oid, err := primitive.ObjectIDFromHex(veiculoID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo inválido")
		return
	}
	if _, err := a.Store.GetVeiculo(r.Context(), oid); store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "veículo não encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	list, err := a.Store.ListVeiculoPeriodosMotorista(r.Context(), oid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) CreateVeiculoPeriodoMotorista(w http.ResponseWriter, r *http.Request, veiculoID string) {
	oid, err := primitive.ObjectIDFromHex(veiculoID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo inválido")
		return
	}
	if _, err := a.Store.GetVeiculo(r.Context(), oid); store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "veículo não encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var p domain.VeiculoPeriodoMotorista
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	p.VeiculoID = oid
	if err := normalizarVeiculoPeriodoMotorista(&p); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := a.Store.GetColaborador(r.Context(), p.ColaboradorID); store.IsNotFound(err) {
		writeError(w, http.StatusBadRequest, "colaborador não encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.Store.CreateVeiculoPeriodoMotorista(r.Context(), &p); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (a *API) UpdateVeiculoPeriodoMotorista(w http.ResponseWriter, r *http.Request, veiculoID, periodoID string) {
	vOID, pOID, ok := parseVeiculoPeriodoIDs(w, veiculoID, periodoID)
	if !ok {
		return
	}
	existing, err := a.Store.GetVeiculoPeriodoMotorista(r.Context(), pOID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "período não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.VeiculoID != vOID {
		writeError(w, http.StatusNotFound, "período não encontrado")
		return
	}

	var p domain.VeiculoPeriodoMotorista
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	p.ID = pOID
	p.VeiculoID = vOID
	p.CreatedAt = existing.CreatedAt
	if err := normalizarVeiculoPeriodoMotorista(&p); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := a.Store.GetColaborador(r.Context(), p.ColaboradorID); store.IsNotFound(err) {
		writeError(w, http.StatusBadRequest, "colaborador não encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := a.Store.UpdateVeiculoPeriodoMotorista(r.Context(), &p); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *API) DeleteVeiculoPeriodoMotorista(w http.ResponseWriter, r *http.Request, veiculoID, periodoID string) {
	vOID, pOID, ok := parseVeiculoPeriodoIDs(w, veiculoID, periodoID)
	if !ok {
		return
	}
	existing, err := a.Store.GetVeiculoPeriodoMotorista(r.Context(), pOID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "período não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.VeiculoID != vOID {
		writeError(w, http.StatusNotFound, "período não encontrado")
		return
	}
	if err := a.Store.DeleteVeiculoPeriodoMotorista(r.Context(), pOID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) ListVeiculoMultas(w http.ResponseWriter, r *http.Request, veiculoID string) {
	oid, err := primitive.ObjectIDFromHex(veiculoID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo inválido")
		return
	}
	if _, err := a.Store.GetVeiculo(r.Context(), oid); store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "veículo não encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	list, err := a.Store.ListVeiculoMultas(r.Context(), oid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if claims, ok := auth.ClaimsFromContext(r.Context()); ok {
		if !domain.CanViewTodasMultasVeiculo(claims.TipoAcesso, claims.PermissoesAdmin) {
			cid, err := primitive.ObjectIDFromHex(claims.ColaboradorID)
			if err != nil {
				writeError(w, http.StatusForbidden, "sem permissão para visualizar multas")
				return
			}
			filtered := make([]domain.VeiculoMulta, 0, len(list))
			for _, m := range list {
				if m.ColaboradorID == cid {
					filtered = append(filtered, m)
				}
			}
			list = filtered
		}
	}
	writeJSONList(w, http.StatusOK, list)
}

func (a *API) CreateVeiculoMulta(w http.ResponseWriter, r *http.Request, veiculoID string) {
	oid, err := primitive.ObjectIDFromHex(veiculoID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo inválido")
		return
	}
	if _, err := a.Store.GetVeiculo(r.Context(), oid); store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "veículo não encontrado")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var m domain.VeiculoMulta
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	m.VeiculoID = oid
	if err := normalizarVeiculoMulta(&m); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !m.ColaboradorID.IsZero() {
		if _, err := a.Store.GetColaborador(r.Context(), m.ColaboradorID); store.IsNotFound(err) {
			writeError(w, http.StatusBadRequest, "colaborador não encontrado")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	if err := a.Store.CreateVeiculoMulta(r.Context(), &m); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (a *API) UpdateVeiculoMulta(w http.ResponseWriter, r *http.Request, veiculoID, multaID string) {
	vOID, mOID, ok := parseVeiculoMultaIDs(w, veiculoID, multaID)
	if !ok {
		return
	}
	existing, err := a.Store.GetVeiculoMulta(r.Context(), mOID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "multa não encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.VeiculoID != vOID {
		writeError(w, http.StatusNotFound, "multa não encontrada")
		return
	}

	var m domain.VeiculoMulta
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	m.ID = mOID
	m.VeiculoID = vOID
	m.CreatedAt = existing.CreatedAt
	if err := normalizarVeiculoMulta(&m); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !m.ColaboradorID.IsZero() {
		if _, err := a.Store.GetColaborador(r.Context(), m.ColaboradorID); store.IsNotFound(err) {
			writeError(w, http.StatusBadRequest, "colaborador não encontrado")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	if err := a.Store.UpdateVeiculoMulta(r.Context(), &m); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (a *API) DeleteVeiculoMulta(w http.ResponseWriter, r *http.Request, veiculoID, multaID string) {
	vOID, mOID, ok := parseVeiculoMultaIDs(w, veiculoID, multaID)
	if !ok {
		return
	}
	existing, err := a.Store.GetVeiculoMulta(r.Context(), mOID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "multa não encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.VeiculoID != vOID {
		writeError(w, http.StatusNotFound, "multa não encontrada")
		return
	}
	if err := a.Store.DeleteVeiculoMulta(r.Context(), mOID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseVeiculoPeriodoIDs(w http.ResponseWriter, veiculoID, periodoID string) (primitive.ObjectID, primitive.ObjectID, bool) {
	vOID, err := primitive.ObjectIDFromHex(veiculoID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo inválido")
		return primitive.NilObjectID, primitive.NilObjectID, false
	}
	pOID, err := primitive.ObjectIDFromHex(periodoID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "período inválido")
		return primitive.NilObjectID, primitive.NilObjectID, false
	}
	return vOID, pOID, true
}

func parseVeiculoMultaIDs(w http.ResponseWriter, veiculoID, multaID string) (primitive.ObjectID, primitive.ObjectID, bool) {
	vOID, err := primitive.ObjectIDFromHex(veiculoID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "veículo inválido")
		return primitive.NilObjectID, primitive.NilObjectID, false
	}
	mOID, err := primitive.ObjectIDFromHex(multaID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "multa inválida")
		return primitive.NilObjectID, primitive.NilObjectID, false
	}
	return vOID, mOID, true
}

func normalizarVeiculoPeriodoMotorista(p *domain.VeiculoPeriodoMotorista) error {
	if p.ColaboradorID.IsZero() {
		return errCampoObrigatorio("colaborador")
	}
	p.DataInicio = strings.TrimSpace(p.DataInicio)
	p.HoraInicio = strings.TrimSpace(p.HoraInicio)
	p.DataFim = strings.TrimSpace(p.DataFim)
	p.HoraFim = strings.TrimSpace(p.HoraFim)
	p.Observacao = strings.TrimSpace(p.Observacao)
	if p.DataInicio == "" {
		return errCampoObrigatorio("data de início")
	}
	if p.HoraInicio == "" {
		return errCampoObrigatorio("hora de início")
	}
	if err := validarHoraHHMM(p.HoraInicio); err != nil {
		return err
	}
	if p.HoraFim != "" {
		if err := validarHoraHHMM(p.HoraFim); err != nil {
			return err
		}
	}
	if p.DataFim == "" {
		p.HoraFim = ""
	}
	if periodoFimAntesInicio(p.DataInicio, p.HoraInicio, p.DataFim, p.HoraFim) {
		return errCampoInvalido("fim do período não pode ser anterior ao início")
	}
	return nil
}

var reHoraHHMM = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)

func validarHoraHHMM(hora string) error {
	if !reHoraHHMM.MatchString(hora) {
		return errCampoInvalido("hora inválida (use HH:MM)")
	}
	return nil
}

func periodoFimAntesInicio(dataInicio, horaInicio, dataFim, horaFim string) bool {
	if dataFim == "" {
		return false
	}
	if dataFim > dataInicio {
		return false
	}
	if dataFim < dataInicio {
		return true
	}
	if horaFim == "" {
		return false
	}
	return horaFim < horaInicio
}

func normalizarVeiculoMulta(m *domain.VeiculoMulta) error {
	m.Data = strings.TrimSpace(m.Data)
	m.Infracao = strings.TrimSpace(m.Infracao)
	m.Observacao = strings.TrimSpace(m.Observacao)
	if m.Data == "" {
		return errCampoObrigatorio("data da multa")
	}
	if m.Infracao == "" {
		return errCampoObrigatorio("infração")
	}
	if m.Status == "" {
		m.Status = domain.VeiculoMultaStatusPendente
	}
	if m.Status != domain.VeiculoMultaStatusPendente && m.Status != domain.VeiculoMultaStatusPaga {
		return errCampoInvalido("status da multa")
	}
	if m.Valor < 0 {
		return errCampoInvalido("valor da multa")
	}
	return nil
}

type campoErro string

func (e campoErro) Error() string { return string(e) }

func errCampoObrigatorio(nome string) error {
	return campoErro("informe " + nome)
}

func errCampoInvalido(msg string) error {
	return campoErro(msg)
}
