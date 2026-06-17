package domain

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ResolvePermissoes normaliza tipo legado e aplica regras cumulativas das flags.
func ResolvePermissoes(t TipoAcessoSistema, p *PermissoesAdmin) (TipoAcessoSistema, PermissoesAdmin) {
	switch t {
	case TipoAcessoAdminComFinanceiro:
		return TipoAcessoAdministrador, PermissoesAdmin{
			Padrao: true, GestaoRecargas: true, Financeiro: true,
		}
	case TipoAcessoAdminSemFinanceiro:
		return TipoAcessoAdministrador, PermissoesAdmin{Padrao: true}
	case TipoAcessoDesenvolvedor:
		return TipoAcessoAdministrador, PermissoesAdmin{
			Padrao: true, GestaoRecargas: true, Financeiro: true, Master: true,
		}
	case TipoAcessoAdministrador:
		resolved := PermissoesAdmin{}
		if p != nil {
			resolved = *p
			NormalizePermissoesAdmin(&resolved)
		}
		if resolved.Master {
			resolved.Padrao = true
			resolved.GestaoRecargas = true
			resolved.Financeiro = true
		}
		if resolved.Financeiro {
			resolved.Padrao = true
			resolved.GestaoRecargas = true
		}
		if resolved.GestaoRecargas {
			resolved.Padrao = true
		}
		return TipoAcessoAdministrador, resolved
	default:
		return TipoAcessoUsuario, PermissoesAdmin{}
	}
}

// NormalizePermissoesAdmin converte flag legada desenvolvedor → master.
func NormalizePermissoesAdmin(p *PermissoesAdmin) {
	if p == nil {
		return
	}
	if !p.Master && p.Desenvolvedor {
		p.Master = true
	}
	p.Desenvolvedor = false
}

// NivelHierarquiaAdmin retorna 0 (sem admin), 1 Padrão, 2 Recargas, 3 Financeiro, 4 Master.
func NivelHierarquiaAdmin(p PermissoesAdmin) int {
	if p.Master {
		return 4
	}
	if p.Financeiro {
		return 3
	}
	if p.GestaoRecargas {
		return 2
	}
	if p.Padrao {
		return 1
	}
	return 0
}

func permissoesResolvidasIguais(a, b PermissoesAdmin) bool {
	_, ra := ResolvePermissoes(TipoAcessoAdministrador, &a)
	_, rb := ResolvePermissoes(TipoAcessoAdministrador, &b)
	return ra.Padrao == rb.Padrao &&
		ra.GestaoRecargas == rb.GestaoRecargas &&
		ra.Financeiro == rb.Financeiro &&
		ra.Master == rb.Master
}

// PermissoesAtribuicaoPermitida — admin só atribui hierarquia ≤ à própria (ou mantém existente superior).
func PermissoesAtribuicaoPermitida(
	editorTipo TipoAcessoSistema,
	editorPerm *PermissoesAdmin,
	targetTipo TipoAcessoSistema,
	targetPerm *PermissoesAdmin,
	existingTarget *PermissoesAdmin,
) bool {
	if targetTipo == TipoAcessoUsuario || targetTipo == "" {
		return true
	}
	_, editorResolved := ResolvePermissoes(editorTipo, editorPerm)
	editorNivel := NivelHierarquiaAdmin(editorResolved)
	_, targetResolved := ResolvePermissoes(targetTipo, targetPerm)
	targetNivel := NivelHierarquiaAdmin(targetResolved)
	if targetNivel <= editorNivel {
		return true
	}
	if existingTarget != nil && targetPerm != nil {
		_, existingResolved := ResolvePermissoes(TipoAcessoAdministrador, existingTarget)
		existingNivel := NivelHierarquiaAdmin(existingResolved)
		if existingNivel == targetNivel && permissoesResolvidasIguais(*existingTarget, *targetPerm) {
			return true
		}
	}
	return false
}

func permissoesFrom(t TipoAcessoSistema, p *PermissoesAdmin) PermissoesAdmin {
	_, resolved := ResolvePermissoes(t, p)
	return resolved
}

// CanManagePadrao — CRUD de cadastros (colaboradores, unidades, equipamentos, etc.).
func CanManagePadrao(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	tipo, perm := ResolvePermissoes(t, p)
	return tipo == TipoAcessoAdministrador && perm.Padrao
}

// CanManageData mantém compatibilidade com middleware/handlers existentes.
func CanManageData(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanManagePadrao(t, p)
}

// CanManageRecargas — depósitos e ajustes de saldo de despesas.
func CanManageRecargas(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	perm := permissoesFrom(t, p)
	return perm.GestaoRecargas || perm.Financeiro || perm.Master
}

// CanViewFinanceiro — salários e bonificações.
func CanViewFinanceiro(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	perm := permissoesFrom(t, p)
	return perm.Financeiro || perm.Master
}

// CanAccessRecursosHumanos — área RH no painel.
func CanAccessRecursosHumanos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	tipo, perm := ResolvePermissoes(t, p)
	if tipo != TipoAcessoAdministrador {
		return false
	}
	return perm.Padrao || perm.GestaoRecargas || perm.Financeiro || perm.Master
}

// CanManageMissoes — CRUD na página Missões.
func CanManageMissoes(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanManagePadrao(t, p)
}

// CanAccessEquipamentos — mesma regra do CRUD padrão.
func CanAccessEquipamentos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanManagePadrao(t, p)
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
	permissoes *PermissoesAdmin,
	colaboradorID primitive.ObjectID,
	missao Missao,
	chamado *Chamado,
) bool {
	if !MissaoPodeSerConcluida(missao, chamado) {
		return false
	}
	if CanManagePadrao(tipoAcesso, permissoes) {
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
	permissoes *PermissoesAdmin,
	colaboradorID primitive.ObjectID,
	chamado Chamado,
) bool {
	if chamado.Status != ChamadoEmAndamento {
		return false
	}
	if CanManagePadrao(tipoAcesso, permissoes) {
		return true
	}
	return ColaboradorAtribuidoMissao(colaboradorID, chamado)
}
