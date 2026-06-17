package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type despesaResumoModalidade struct {
	Deposito      float64 `json:"deposito"`
	Gasto         float64 `json:"gasto"`
	SaldoAnterior float64 `json:"saldoAnterior"`
	Saldo         float64 `json:"saldo"`
	SaldoAjustado bool    `json:"saldoAjustado"`
	AjustadoEm    string  `json:"ajustadoEm,omitempty"`
}

type despesaMeResponse struct {
	Competencia string                             `json:"competencia"`
	Mobilidade  despesaResumoModalidade            `json:"mobilidade"`
	Livre       despesaResumoModalidade            `json:"livre"`
	Depositos   []domain.DepositoDespesa           `json:"depositos"`
	Despesas    []domain.Despesa                   `json:"despesas"`
}

func competenciaFromQuery(r *http.Request) (string, int, int, error) {
	anoStr := r.URL.Query().Get("ano")
	mesStr := r.URL.Query().Get("mes")
	if anoStr == "" || mesStr == "" {
		now := time.Now()
		return fmt.Sprintf("%04d-%02d", now.Year(), int(now.Month())), now.Year(), int(now.Month()), nil
	}
	var ano, mes int
	if _, err := fmt.Sscanf(anoStr, "%d", &ano); err != nil || ano < 2000 || ano > 3000 {
		return "", 0, 0, fmt.Errorf("informe ano válido")
	}
	if _, err := fmt.Sscanf(mesStr, "%d", &mes); err != nil || mes < 1 || mes > 12 {
		return "", 0, 0, fmt.Errorf("informe mês válido")
	}
	return fmt.Sprintf("%04d-%02d", ano, mes), ano, mes, nil
}

func competenciaFromData(data string) string {
	if len(data) >= 7 {
		return data[:7]
	}
	return ""
}

func competenciaMesAnterior(competencia string) string {
	var ano, mes int
	if _, err := fmt.Sscanf(competencia, "%d-%d", &ano, &mes); err != nil {
		return ""
	}
	mes--
	if mes == 0 {
		mes = 12
		ano--
	}
	return fmt.Sprintf("%04d-%02d", ano, mes)
}

func ajustesPorModalidade(list []domain.AjusteSaldoDespesa) map[domain.ModalidadeDespesa]*domain.AjusteSaldoDespesa {
	out := map[domain.ModalidadeDespesa]*domain.AjusteSaldoDespesa{}
	for i := range list {
		a := &list[i]
		out[a.Modalidade] = a
	}
	return out
}

func depositoPosAjuste(d domain.DepositoDespesa, a *domain.AjusteSaldoDespesa) bool {
	if d.Competencia > a.Competencia {
		return true
	}
	if d.Competencia < a.Competencia {
		return false
	}
	return !d.UpdatedAt.Before(a.AjustadoEm)
}

func despesaPosAjuste(d domain.Despesa, a *domain.AjusteSaldoDespesa) bool {
	if d.Competencia > a.Competencia {
		return true
	}
	if d.Competencia < a.Competencia {
		return false
	}
	ref := d.UpdatedAt
	if ref.Before(d.CreatedAt) {
		ref = d.CreatedAt
	}
	return !ref.Before(a.AjustadoEm)
}

func calcularSaldoModalidade(
	modalidade domain.ModalidadeDespesa,
	ajuste *domain.AjusteSaldoDespesa,
	todosDepositos []domain.DepositoDespesa,
	todasDespesas []domain.Despesa,
	ateCompetencia string,
) float64 {
	if ajuste == nil || ateCompetencia < ajuste.Competencia {
		var dep, gasto float64
		for _, d := range todosDepositos {
			if d.Modalidade != modalidade || d.Competencia > ateCompetencia {
				continue
			}
			dep += d.Valor
		}
		for _, d := range todasDespesas {
			if d.Modalidade != modalidade || d.Competencia > ateCompetencia {
				continue
			}
			gasto += d.Valor
		}
		return dep - gasto
	}

	saldo := ajuste.Saldo
	for _, d := range todosDepositos {
		if d.Modalidade != modalidade || d.Competencia > ateCompetencia {
			continue
		}
		if !depositoPosAjuste(d, ajuste) {
			continue
		}
		saldo += d.Valor
	}
	for _, d := range todasDespesas {
		if d.Modalidade != modalidade || d.Competencia > ateCompetencia {
			continue
		}
		if !despesaPosAjuste(d, ajuste) {
			continue
		}
		saldo -= d.Valor
	}
	return saldo
}

func preencherSaldoResumo(
	res *despesaResumoModalidade,
	modalidade domain.ModalidadeDespesa,
	ajuste *domain.AjusteSaldoDespesa,
	todosDepositos []domain.DepositoDespesa,
	todasDespesas []domain.Despesa,
	competencia string,
) {
	compAnterior := competenciaMesAnterior(competencia)
	res.Saldo = calcularSaldoModalidade(modalidade, ajuste, todosDepositos, todasDespesas, competencia)
	if compAnterior != "" {
		res.SaldoAnterior = calcularSaldoModalidade(modalidade, ajuste, todosDepositos, todasDespesas, compAnterior)
	}
	if ajuste != nil && competencia >= ajuste.Competencia {
		res.SaldoAjustado = true
		res.AjustadoEm = ajuste.AjustadoEm.Format(time.RFC3339)
	}
}

func montarResumoDespesas(
	depositosMes []domain.DepositoDespesa,
	despesasMes []domain.Despesa,
	todosDepositos []domain.DepositoDespesa,
	todasDespesas []domain.Despesa,
	competencia string,
	ajustes map[domain.ModalidadeDespesa]*domain.AjusteSaldoDespesa,
) (mobilidade, livre despesaResumoModalidade) {
	for _, d := range depositosMes {
		switch d.Modalidade {
		case domain.DespesaMobilidade:
			mobilidade.Deposito += d.Valor
		case domain.DespesaLivre:
			livre.Deposito += d.Valor
		}
	}
	for _, d := range despesasMes {
		switch d.Modalidade {
		case domain.DespesaMobilidade:
			mobilidade.Gasto += d.Valor
		case domain.DespesaLivre:
			livre.Gasto += d.Valor
		}
	}

	preencherSaldoResumo(
		&mobilidade,
		domain.DespesaMobilidade,
		ajustes[domain.DespesaMobilidade],
		todosDepositos,
		todasDespesas,
		competencia,
	)
	preencherSaldoResumo(
		&livre,
		domain.DespesaLivre,
		ajustes[domain.DespesaLivre],
		todosDepositos,
		todasDespesas,
		competencia,
	)
	return mobilidade, livre
}

func (a *API) carregarPainelDespesas(
	ctx context.Context,
	colaboradorID primitive.ObjectID,
	competencia string,
) ([]domain.Despesa, []domain.DepositoDespesa, despesaResumoModalidade, despesaResumoModalidade, error) {
	despesasMes, err := a.Store.ListDespesasByColaborador(ctx, colaboradorID, competencia)
	if err != nil {
		return nil, nil, despesaResumoModalidade{}, despesaResumoModalidade{}, err
	}
	depositosMes, err := a.Store.ListDepositosDespesa(ctx, colaboradorID, competencia)
	if err != nil {
		return nil, nil, despesaResumoModalidade{}, despesaResumoModalidade{}, err
	}
	if depositosMes == nil {
		depositosMes = []domain.DepositoDespesa{}
	}

	todosDepositos, err := a.Store.ListDepositosDespesa(ctx, colaboradorID, "")
	if err != nil {
		return nil, nil, despesaResumoModalidade{}, despesaResumoModalidade{}, err
	}
	if todosDepositos == nil {
		todosDepositos = []domain.DepositoDespesa{}
	}
	todasDespesas, err := a.Store.ListDespesasByColaborador(ctx, colaboradorID, "")
	if err != nil {
		return nil, nil, despesaResumoModalidade{}, despesaResumoModalidade{}, err
	}
	if todasDespesas == nil {
		todasDespesas = []domain.Despesa{}
	}
	ajustesList, err := a.Store.ListAjustesSaldoDespesa(ctx, colaboradorID)
	if err != nil {
		return nil, nil, despesaResumoModalidade{}, despesaResumoModalidade{}, err
	}
	if ajustesList == nil {
		ajustesList = []domain.AjusteSaldoDespesa{}
	}
	ajustes := ajustesPorModalidade(ajustesList)

	mob, liv := montarResumoDespesas(
		depositosMes,
		despesasMes,
		todosDepositos,
		todasDespesas,
		competencia,
		ajustes,
	)
	return despesasMes, depositosMes, mob, liv, nil
}

func validarDespesa(d *domain.Despesa, exigirComprovante bool) error {
	if d.Modalidade != domain.DespesaMobilidade && d.Modalidade != domain.DespesaLivre {
		return fmt.Errorf("modalidade inválida")
	}
	if !domain.CategoriaValidaParaModalidade(d.Modalidade, d.Categoria) {
		return fmt.Errorf("categoria inválida para a modalidade")
	}
	if d.Valor <= 0 {
		return fmt.Errorf("informe um valor maior que zero")
	}
	data := strings.TrimSpace(d.Data)
	if data == "" {
		return fmt.Errorf("informe a data da despesa")
	}
	if len(data) < 10 {
		return fmt.Errorf("data inválida")
	}
	d.Data = data[:10]
	d.Competencia = competenciaFromData(d.Data)
	if d.Competencia == "" {
		return fmt.Errorf("data inválida")
	}
	d.Descricao = strings.TrimSpace(d.Descricao)
	d.ComprovanteURL = strings.TrimSpace(d.ComprovanteURL)
	if exigirComprovante && d.ComprovanteURL == "" {
		return fmt.Errorf("informe a imagem do comprovante")
	}
	if d.ComprovanteURL != "" && !strings.HasPrefix(d.ComprovanteURL, "/pics/despesas/") {
		return fmt.Errorf("comprovante inválido")
	}

	if d.Categoria == domain.CategoriaCombustivel {
		d.Hora = strings.TrimSpace(d.Hora)
		if len(d.Hora) != 5 || d.Hora[2] != ':' {
			return fmt.Errorf("informe a hora (HH:mm)")
		}
		d.Placa = normalizePlacaVeiculo(strings.TrimSpace(d.Placa))
		if !isValidPlacaVeiculo(d.Placa) {
			return fmt.Errorf("informe uma placa válida")
		}
		if d.Hodometro <= 0 {
			return fmt.Errorf("informe o hodômetro")
		}
		if d.VeiculoPessoal {
			d.VeiculoID = nil
		} else if d.VeiculoID == nil || d.VeiculoID.IsZero() {
			return fmt.Errorf("selecione o veículo")
		}
		d.AppTransporte = ""
		d.AppTransporteOutro = ""
	} else if d.Categoria == domain.CategoriaTransporteApp {
		d.Hora = ""
		d.Placa = ""
		d.Hodometro = 0
		d.VeiculoPessoal = false
		d.VeiculoID = nil
		if !domain.AppTransporteValido(d.AppTransporte) {
			return fmt.Errorf("selecione o aplicativo")
		}
		d.AppTransporteOutro = strings.TrimSpace(d.AppTransporteOutro)
		if d.AppTransporte == domain.AppTransporteOutro && d.AppTransporteOutro == "" {
			return fmt.Errorf("informe o nome do aplicativo")
		}
		if d.AppTransporte != domain.AppTransporteOutro {
			d.AppTransporteOutro = ""
		}
	} else {
		d.Hora = ""
		d.Placa = ""
		d.Hodometro = 0
		d.VeiculoPessoal = false
		d.VeiculoID = nil
		d.AppTransporte = ""
		d.AppTransporteOutro = ""
	}
	return nil
}

func (a *API) GetDespesasMe(w http.ResponseWriter, r *http.Request) {
	colabID, ok := a.colaboradorIDFromRequest(w, r)
	if !ok {
		return
	}
	competencia, _, _, err := competenciaFromQuery(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	despesas, depositos, mob, liv, err := a.carregarPainelDespesas(r.Context(), colabID, competencia)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, despesaMeResponse{
		Competencia: competencia,
		Mobilidade:  mob,
		Livre:       liv,
		Depositos:   depositos,
		Despesas:    despesas,
	})
}

func (a *API) CreateDespesaMe(w http.ResponseWriter, r *http.Request) {
	colabID, ok := a.colaboradorIDFromRequest(w, r)
	if !ok {
		return
	}
	var d domain.Despesa
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	d.ColaboradorID = colabID
	if err := validarDespesa(&d, true); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := a.Store.CreateDespesa(r.Context(), &d); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, d)
}

func (a *API) UpdateDespesaMe(w http.ResponseWriter, r *http.Request, id string) {
	colabID, ok := a.colaboradorIDFromRequest(w, r)
	if !ok {
		return
	}
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetDespesa(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.ColaboradorID != colabID {
		writeError(w, http.StatusForbidden, "acesso negado")
		return
	}
	var d domain.Despesa
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	d.ID = oid
	d.ColaboradorID = colabID
	d.CreatedAt = existing.CreatedAt
	if d.ComprovanteURL == "" {
		d.ComprovanteURL = existing.ComprovanteURL
	}
	if err := validarDespesa(&d, false); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := a.Store.UpdateDespesa(r.Context(), &d); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (a *API) DeleteDespesaMe(w http.ResponseWriter, r *http.Request, id string) {
	colabID, ok := a.colaboradorIDFromRequest(w, r)
	if !ok {
		return
	}
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetDespesa(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.ColaboradorID != colabID {
		writeError(w, http.StatusForbidden, "acesso negado")
		return
	}
	if err := a.Store.DeleteDespesa(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) requireColaboradorDespesa(w http.ResponseWriter, r *http.Request, colaboradorID string) (primitive.ObjectID, bool) {
	cid, err := primitive.ObjectIDFromHex(colaboradorID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id do colaborador inválido")
		return primitive.NilObjectID, false
	}
	if _, err := a.Store.GetColaborador(r.Context(), cid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "colaborador não encontrado")
			return primitive.NilObjectID, false
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return primitive.NilObjectID, false
	}
	return cid, true
}

func (a *API) CreateDespesaColaborador(w http.ResponseWriter, r *http.Request, colaboradorID string) {
	cid, ok := a.requireColaboradorDespesa(w, r, colaboradorID)
	if !ok {
		return
	}
	var d domain.Despesa
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	d.ColaboradorID = cid
	if err := validarDespesa(&d, true); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := a.Store.CreateDespesa(r.Context(), &d); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, d)
}

func (a *API) UpdateDespesaColaborador(w http.ResponseWriter, r *http.Request, colaboradorID, id string) {
	cid, ok := a.requireColaboradorDespesa(w, r, colaboradorID)
	if !ok {
		return
	}
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetDespesa(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.ColaboradorID != cid {
		writeError(w, http.StatusForbidden, "acesso negado")
		return
	}
	var d domain.Despesa
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	d.ID = oid
	d.ColaboradorID = cid
	d.CreatedAt = existing.CreatedAt
	if d.ComprovanteURL == "" {
		d.ComprovanteURL = existing.ComprovanteURL
	}
	if err := validarDespesa(&d, false); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := a.Store.UpdateDespesa(r.Context(), &d); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (a *API) DeleteDespesaColaborador(w http.ResponseWriter, r *http.Request, colaboradorID, id string) {
	cid, ok := a.requireColaboradorDespesa(w, r, colaboradorID)
	if !ok {
		return
	}
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	existing, err := a.Store.GetDespesa(r.Context(), oid)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "não encontrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing.ColaboradorID != cid {
		writeError(w, http.StatusForbidden, "acesso negado")
		return
	}
	if err := a.Store.DeleteDespesa(r.Context(), oid); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "não encontrado")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type upsertDepositoBody struct {
	Competencia string                   `json:"competencia"`
	Modalidade  domain.ModalidadeDespesa `json:"modalidade"`
	Valor       float64                  `json:"valor"`
}

func (a *API) UpsertDepositoDespesa(w http.ResponseWriter, r *http.Request, colaboradorID string) {
	cid, err := primitive.ObjectIDFromHex(colaboradorID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id do colaborador inválido")
		return
	}
	var body upsertDepositoBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	body.Competencia = strings.TrimSpace(body.Competencia)
	if len(body.Competencia) != 7 {
		writeError(w, http.StatusBadRequest, "competência inválida (use yyyy-mm)")
		return
	}
	if body.Modalidade != domain.DespesaMobilidade && body.Modalidade != domain.DespesaLivre {
		writeError(w, http.StatusBadRequest, "modalidade inválida")
		return
	}
	if body.Valor < 0 {
		writeError(w, http.StatusBadRequest, "valor inválido")
		return
	}
	d := domain.DepositoDespesa{
		ColaboradorID: cid,
		Competencia:   body.Competencia,
		Modalidade:    body.Modalidade,
		Valor:         body.Valor,
	}
	if err := a.Store.UpsertDepositoDespesa(r.Context(), &d); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, d)
}

type upsertAjusteSaldoBody struct {
	Competencia string                   `json:"competencia"`
	Modalidade  domain.ModalidadeDespesa `json:"modalidade"`
	Saldo       float64                  `json:"saldo"`
	Observacao  string                   `json:"observacao"`
}

func (a *API) UpsertAjusteSaldoDespesa(w http.ResponseWriter, r *http.Request, colaboradorID string) {
	cid, ok := a.requireColaboradorDespesa(w, r, colaboradorID)
	if !ok {
		return
	}
	var body upsertAjusteSaldoBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "json inválido")
		return
	}
	body.Competencia = strings.TrimSpace(body.Competencia)
	if len(body.Competencia) != 7 {
		writeError(w, http.StatusBadRequest, "competência inválida (use yyyy-mm)")
		return
	}
	if body.Modalidade != domain.DespesaMobilidade && body.Modalidade != domain.DespesaLivre {
		writeError(w, http.StatusBadRequest, "modalidade inválida")
		return
	}
	body.Observacao = strings.TrimSpace(body.Observacao)
	now := time.Now().UTC()
	ajuste := domain.AjusteSaldoDespesa{
		ColaboradorID: cid,
		Competencia:   body.Competencia,
		Modalidade:    body.Modalidade,
		Saldo:         body.Saldo,
		AjustadoEm:    now,
		Observacao:    body.Observacao,
	}
	if claims, ok := auth.ClaimsFromContext(r.Context()); ok {
		ajuste.AjustadoPor = strings.TrimSpace(claims.Nome)
		if ajuste.AjustadoPor == "" {
			ajuste.AjustadoPor = strings.TrimSpace(claims.Email)
		}
	}
	if err := a.Store.UpsertAjusteSaldoDespesa(r.Context(), &ajuste); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, ajuste)
}

func (a *API) GetDespesasColaborador(w http.ResponseWriter, r *http.Request, colaboradorID string) {
	cid, ok := a.requireColaboradorDespesa(w, r, colaboradorID)
	if !ok {
		return
	}
	competencia, _, _, err := competenciaFromQuery(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	despesas, depositos, mob, liv, err := a.carregarPainelDespesas(r.Context(), cid, competencia)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, despesaMeResponse{
		Competencia: competencia,
		Mobilidade:  mob,
		Livre:       liv,
		Depositos:   depositos,
		Despesas:    despesas,
	})
}

type despesaColaboradorResumoItem struct {
	ColaboradorID string                  `json:"colaboradorId"`
	Nome          string                  `json:"nome"`
	Mobilidade    despesaResumoModalidade `json:"mobilidade"`
	Livre         despesaResumoModalidade `json:"livre"`
	TotalGasto    float64                 `json:"totalGasto"`
}

type despesasResumoColaboradoresResponse struct {
	Competencia   string                         `json:"competencia"`
	Colaboradores []despesaColaboradorResumoItem `json:"colaboradores"`
	Totais        struct {
		Mobilidade despesaResumoModalidade `json:"mobilidade"`
		Livre      despesaResumoModalidade `json:"livre"`
		TotalGasto float64                 `json:"totalGasto"`
	} `json:"totais"`
}

func filtrarDespesasColaborador(list []domain.Despesa, colaboradorID primitive.ObjectID) []domain.Despesa {
	var out []domain.Despesa
	for _, d := range list {
		if d.ColaboradorID == colaboradorID {
			out = append(out, d)
		}
	}
	return out
}

func filtrarDepositosColaborador(list []domain.DepositoDespesa, colaboradorID primitive.ObjectID) []domain.DepositoDespesa {
	var out []domain.DepositoDespesa
	for _, d := range list {
		if d.ColaboradorID == colaboradorID {
			out = append(out, d)
		}
	}
	return out
}

func filtrarAjustesColaborador(list []domain.AjusteSaldoDespesa, colaboradorID primitive.ObjectID) []domain.AjusteSaldoDespesa {
	var out []domain.AjusteSaldoDespesa
	for _, a := range list {
		if a.ColaboradorID == colaboradorID {
			out = append(out, a)
		}
	}
	return out
}

func (a *API) GetDespesasResumoColaboradores(w http.ResponseWriter, r *http.Request) {
	competencia, _, _, err := competenciaFromQuery(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx := r.Context()

	cols, err := a.Store.ListColaboradores(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	despesasMes, err := a.Store.ListAllDespesas(ctx, competencia)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	depositosMes, err := a.Store.ListAllDepositosDespesa(ctx, competencia)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	todasDespesas, err := a.Store.ListAllDespesas(ctx, "")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	todosDepositos, err := a.Store.ListAllDepositosDespesa(ctx, "")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	todosAjustes, err := a.Store.ListAllAjustesSaldoDespesa(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var resp despesasResumoColaboradoresResponse
	resp.Competencia = competencia

	for _, col := range cols {
		depMes := filtrarDepositosColaborador(depositosMes, col.ID)
		despMes := filtrarDespesasColaborador(despesasMes, col.ID)
		depTodos := filtrarDepositosColaborador(todosDepositos, col.ID)
		despTodos := filtrarDespesasColaborador(todasDespesas, col.ID)
		ajustesCol := filtrarAjustesColaborador(todosAjustes, col.ID)
		ajustes := ajustesPorModalidade(ajustesCol)

		mob, liv := montarResumoDespesas(depMes, despMes, depTodos, despTodos, competencia, ajustes)
		totalGasto := mob.Gasto + liv.Gasto

		resp.Colaboradores = append(resp.Colaboradores, despesaColaboradorResumoItem{
			ColaboradorID: col.ID.Hex(),
			Nome:          col.Nome,
			Mobilidade:    mob,
			Livre:         liv,
			TotalGasto:    totalGasto,
		})

		resp.Totais.Mobilidade.Deposito += mob.Deposito
		resp.Totais.Mobilidade.Gasto += mob.Gasto
		resp.Totais.Mobilidade.Saldo += mob.Saldo
		resp.Totais.Livre.Deposito += liv.Deposito
		resp.Totais.Livre.Gasto += liv.Gasto
		resp.Totais.Livre.Saldo += liv.Saldo
		resp.Totais.TotalGasto += totalGasto
	}

	sort.Slice(resp.Colaboradores, func(i, j int) bool {
		return strings.ToLower(resp.Colaboradores[i].Nome) < strings.ToLower(resp.Colaboradores[j].Nome)
	})

	writeJSON(w, http.StatusOK, resp)
}
