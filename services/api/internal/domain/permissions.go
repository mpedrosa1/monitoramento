package domain

import "go.mongodb.org/mongo-driver/bson/primitive"

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
