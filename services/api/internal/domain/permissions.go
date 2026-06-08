package domain

import (
	"time"

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

func inicioMissaoAnteriorAHoje(m Missao, chamado *Chamado) bool {
	data := DataInicioMissao(m, chamado)
	if data == "" {
		return false
	}
	hoje := time.Now().Format("2006-01-02")
	return data < hoje
}

// StatusEfetivoMissao — planejada com início no passado equivale a em andamento.
func StatusEfetivoMissao(m Missao, chamado *Chamado) MissaoStatus {
	if m.Status == MissaoPlanejada && inicioMissaoAnteriorAHoje(m, chamado) {
		return MissaoEmAndamento
	}
	return m.Status
}

// MissaoPodeSerConcluida — somente missão já iniciada (em andamento real ou efetivo).
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

// ContarMissoesEmAndamento — status gravado ou efetivo (planejada com início no passado).
func ContarMissoesEmAndamento(missoes []Missao, chamadosPorID map[primitive.ObjectID]Chamado) int {
	n := 0
	for _, m := range missoes {
		var ch *Chamado
		if !m.ChamadoID.IsZero() {
			if c, ok := chamadosPorID[m.ChamadoID]; ok {
				ch = &c
			}
		}
		if StatusEfetivoMissao(m, ch) == MissaoEmAndamento {
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
