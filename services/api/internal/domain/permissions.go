package domain

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CanManageData indica administradores e desenvolvedores (CRUD de cadastros).
func CanManageData(t TipoAcessoSistema) bool {
	switch t {
	case TipoAcessoAdminComFinanceiro, TipoAcessoAdminSemFinanceiro, TipoAcessoDesenvolvedor:
		return true
	default:
		return false
	}
}

// CanManageMissoes — somente administradores (página Missões: criar/editar/excluir).
func CanManageMissoes(t TipoAcessoSistema) bool {
	switch t {
	case TipoAcessoAdminComFinanceiro, TipoAcessoAdminSemFinanceiro:
		return true
	default:
		return false
	}
}

// CanAccessEquipamentos — mesma regra da página de equipamentos.
func CanAccessEquipamentos(t TipoAcessoSistema) bool {
	return CanManageData(t)
}

// IsEncerramentoChamado indica atualização de encerramento (em_andamento → encerrado).
func IsEncerramentoChamado(existing, updated Chamado) bool {
	return existing.Status == ChamadoEmAndamento && updated.Status == ChamadoEncerrado
}

// ColaboradorAtribuidoMissao verifica se o colaborador está na missão do chamado.
func ColaboradorAtribuidoMissao(colaboradorID primitive.ObjectID, chamado Chamado) bool {
	for _, id := range chamado.ColaboradorIDs {
		if id == colaboradorID {
			return true
		}
	}
	return false
}

// ColaboradorAtribuidoMissaoDireta verifica se o colaborador está atribuído à missão.
func ColaboradorAtribuidoMissaoDireta(colaboradorID primitive.ObjectID, missao Missao) bool {
	for _, id := range missao.ColaboradorIDs {
		if id == colaboradorID {
			return true
		}
	}
	return false
}

func DataInicioMissao(m Missao, chamado *Chamado) string {
	if m.DataInicio != "" {
		return m.DataInicio
	}
	if chamado != nil && chamado.PrevisaoChegadaData != "" {
		return chamado.PrevisaoChegadaData
	}
	return ""
}

// StatusEfetivoMissao — igual ao status gravado (início não depende da data prevista).
func StatusEfetivoMissao(m Missao, _ *Chamado) MissaoStatus {
	return m.Status
}

// CanIniciarMissao — colaborador atribuído pode iniciar missão planejada.
func CanIniciarMissao(colaboradorID primitive.ObjectID, missao Missao) bool {
	if missao.Status != MissaoPlanejada {
		return false
	}
	return ColaboradorAtribuidoMissaoDireta(colaboradorID, missao)
}

// MissaoPodeSerConcluida — somente missão já iniciada.
func MissaoPodeSerConcluida(m Missao, chamado *Chamado) bool {
	return StatusEfetivoMissao(m, chamado) == MissaoEmAndamento
}

// CanConcluirMissao — admin/dev ou colaborador atribuído à missão.
func CanConcluirMissao(
	tipoAcesso TipoAcessoSistema,
	colaboradorID primitive.ObjectID,
	missao Missao,
	chamado *Chamado,
) bool {
	if !MissaoPodeSerConcluida(missao, chamado) {
		return false
	}
	if CanManageData(tipoAcesso) {
		return true
	}
	return ColaboradorAtribuidoMissaoDireta(colaboradorID, missao)
}

// ContarMissoesEmAndamento — missões com status em andamento.
func ContarMissoesEmAndamento(missoes []Missao, chamadosPorID map[primitive.ObjectID]Chamado) int {
	n := 0
	for _, m := range missoes {
		if m.Status == MissaoEmAndamento {
			n++
		}
	}
	return n
}

// CanEncerrarChamado — admin/dev ou colaborador atribuído à missão.
func CanEncerrarChamado(
	tipoAcesso TipoAcessoSistema,
	colaboradorID primitive.ObjectID,
	chamado Chamado,
) bool {
	if chamado.Status != ChamadoEmAndamento {
		return false
	}
	if CanManageData(tipoAcesso) {
		return true
	}
	return ColaboradorAtribuidoMissao(colaboradorID, chamado)
}
