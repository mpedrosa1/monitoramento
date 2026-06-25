package domain

import (
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var errPermissaoAdminObrigatoria = errors.New("selecione ao menos uma permissão para o administrador")

// ResolvePermissoes normaliza tipo legado e aplica regras cumulativas das flags legadas.
func ResolvePermissoes(t TipoAcessoSistema, p *PermissoesAdmin) (TipoAcessoSistema, PermissoesAdmin) {
	switch t {
	case TipoAcessoAdminComFinanceiro:
		return TipoAcessoAdministrador, PermissoesAdmin{
			Padrao: true, GestaoRecargas: true, Financeiro: true,
		}
	case TipoAcessoAdminSemFinanceiro:
		return TipoAcessoAdministrador, PermissoesAdmin{Padrao: true}
	case TipoAcessoDesenvolvedor:
		return TipoAcessoMaster, PermissoesAdmin{}
	case TipoAcessoMaster:
		return TipoAcessoMaster, PermissoesAdmin{}
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

// NivelHierarquiaAdmin mantido para compatibilidade com dados legados.
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
	if temPermissaoRH(p) || p.CrudColaboradores || p.CrudUnidades || p.CrudVeiculos {
		return 1
	}
	return 0
}

func permissoesResolvidasIguais(a, b PermissoesAdmin) bool {
	return permissoesGranularesIguais(a, b)
}

// PermissoesAtribuicaoPermitida — master só por master; admin só atribui subconjunto das próprias permissões.
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
	if targetTipo == TipoAcessoMaster {
		return IsMaster(editorTipo, editorPerm)
	}
	if IsMaster(editorTipo, editorPerm) {
		return true
	}
	if targetTipo != TipoAcessoAdministrador {
		return false
	}
	editorResolved := PermissoesEfetivas(editorTipo, editorPerm)
	targetResolved := PermissoesAdmin{}
	if targetPerm != nil {
		targetResolved = *targetPerm
	}
	if permissoesGranularesSubset(editorResolved, targetResolved) {
		return true
	}
	if existingTarget != nil && targetPerm != nil {
		if permissoesGranularesIguais(*existingTarget, *targetPerm) {
			return true
		}
	}
	return false
}

func permissoesFrom(t TipoAcessoSistema, p *PermissoesAdmin) PermissoesAdmin {
	_, resolved := ResolvePermissoes(t, p)
	return resolved
}

func CanManagePadrao(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanCrudColaboradores(t, p) || CanCrudUnidades(t, p) || CanCrudVeiculos(t, p) ||
		CanCrudEquipamentos(t, p) || CanCrudMissoes(t, p) || CanCrudChamados(t, p)
}

func CanManageData(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanManagePadrao(t, p)
}

func CanManageRecargas(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanRhRecarregarSaldos(t, p)
}

func CanViewFinanceiro(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanRhSalariosBonificacoes(t, p)
}

// CanVerFaixasConvenio libera a leitura da tabela de faixas para quem gerencia o
// convênio ou para a folha de pagamento (financeiro), que usa o desconto do plano.
func CanVerFaixasConvenio(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanRhConvenioMedico(t, p) || CanRhSalariosBonificacoes(t, p)
}

func CanAccessRecursosHumanos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	resolvedTipo, _ := ResolvePermissoes(t, p)
	if resolvedTipo != TipoAcessoAdministrador {
		return false
	}
	return temPermissaoRH(PermissoesEfetivas(resolvedTipo, p)) ||
		CanCrudColaboradores(resolvedTipo, p)
}

func CanManageMissoes(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanCrudMissoes(t, p)
}

func CanAccessEquipamentos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	return CanCrudEquipamentos(t, p)
}

// IsEncerramentoChamado indica atualização de encerramento (em_andamento → encerrado).
func IsEncerramentoChamado(existing, updated Chamado) bool {
	return existing.Status == ChamadoEmAndamento && updated.Status == ChamadoEncerrado
}

func ColaboradorAtribuidoMissao(colaboradorID primitive.ObjectID, chamado Chamado) bool {
	for _, id := range chamado.ColaboradorIDs {
		if id == colaboradorID {
			return true
		}
	}
	return false
}

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

func StatusEfetivoMissao(m Missao, _ *Chamado) MissaoStatus {
	return m.Status
}

func CanIniciarMissao(colaboradorID primitive.ObjectID, missao Missao) bool {
	if missao.Status != MissaoPlanejada {
		return false
	}
	return ColaboradorAtribuidoMissaoDireta(colaboradorID, missao)
}

func MissaoPodeSerConcluida(m Missao, chamado *Chamado) bool {
	return StatusEfetivoMissao(m, chamado) == MissaoEmAndamento
}

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
	if CanConcluirMissaoQualquer(tipoAcesso, permissoes) {
		return true
	}
	return ColaboradorAtribuidoMissaoDireta(colaboradorID, missao)
}

func ContarMissoesEmAndamento(missoes []Missao, chamadosPorID map[primitive.ObjectID]Chamado) int {
	n := 0
	for _, m := range missoes {
		if m.Status == MissaoEmAndamento {
			n++
		}
	}
	return n
}

func CanEncerrarChamado(
	tipoAcesso TipoAcessoSistema,
	permissoes *PermissoesAdmin,
	colaboradorID primitive.ObjectID,
	chamado Chamado,
) bool {
	if chamado.Status != ChamadoEmAndamento {
		return false
	}
	if CanEncerrarChamadoQualquer(tipoAcesso, permissoes) {
		return true
	}
	return ColaboradorAtribuidoMissao(colaboradorID, chamado)
}

// NormalizarAcessoColaborador valida tipo de acesso e permissões antes de persistir.
func NormalizarAcessoColaborador(c *Colaborador) error {
	if c == nil {
		return nil
	}
	switch c.TipoAcesso {
	case TipoAcessoMaster, TipoAcessoDesenvolvedor:
		c.TipoAcesso = TipoAcessoMaster
		c.PermissoesAdmin = nil
		return nil
	case TipoAcessoUsuario, "":
		c.TipoAcesso = TipoAcessoUsuario
		c.PermissoesAdmin = nil
		return nil
	case TipoAcessoAdministrador, TipoAcessoAdminComFinanceiro, TipoAcessoAdminSemFinanceiro:
		if c.TipoAcesso != TipoAcessoAdministrador {
			_, perm := ResolvePermissoes(c.TipoAcesso, c.PermissoesAdmin)
			c.TipoAcesso = TipoAcessoAdministrador
			c.PermissoesAdmin = &perm
		}
		if c.PermissoesAdmin == nil {
			return errPermissaoAdminObrigatoria
		}
		NormalizePermissoesAdmin(c.PermissoesAdmin)
		if !TemPermissaoAdminDetalhada(*c.PermissoesAdmin) {
			return errPermissaoAdminObrigatoria
		}
		limparFlagsLegadoPermissoes(c.PermissoesAdmin)
		return nil
	default:
		c.TipoAcesso = TipoAcessoUsuario
		c.PermissoesAdmin = nil
		return nil
	}
}

// TemPermissaoAdminDetalhada verifica se administrador tem ao menos uma permissão granular.
func TemPermissaoAdminDetalhada(p PermissoesAdmin) bool {
	perm := PermissoesEfetivas(TipoAcessoAdministrador, &p)
	return perm.CrudColaboradores || perm.CrudUnidades || perm.CrudVeiculos ||
		perm.CrudEquipamentos || perm.CrudMissoes || perm.CrudChamados ||
		perm.ConcluirMissaoQualquer || perm.EncerrarChamadoQualquer ||
		perm.FrotaValoresAlugueis || perm.FrotaVisualizarContratos ||
		perm.FrotaRegistrarPeriodo || perm.FrotaRegistrarMulta || perm.FrotaTrocarVeiculos ||
		perm.RhSalariosBonificacoes || perm.RhEscalaTrabalho || perm.RhCalendarioSobreaviso ||
		perm.RhRecarregarSaldos || perm.RhRegistrarDespesaOutros
}

// AcessoColaboradorAlterado indica mudança de tipo de acesso ou permissões granulares.
func AcessoColaboradorAlterado(a, b Colaborador) bool {
	na := a
	nb := b
	_ = NormalizarAcessoColaborador(&na)
	_ = NormalizarAcessoColaborador(&nb)
	if na.TipoAcesso != nb.TipoAcesso {
		return true
	}
	if na.TipoAcesso != TipoAcessoAdministrador {
		return false
	}
	pa := PermissoesAdmin{}
	pb := PermissoesAdmin{}
	if na.PermissoesAdmin != nil {
		pa = *na.PermissoesAdmin
	}
	if nb.PermissoesAdmin != nil {
		pb = *nb.PermissoesAdmin
	}
	return !permissoesGranularesIguais(pa, pb)
}

// AplicarAuthVersionAposAcesso incrementa a versão de sessão quando o acesso mudou.
func AplicarAuthVersionAposAcesso(existing, updated *Colaborador) {
	if existing == nil || updated == nil {
		return
	}
	updated.AuthVersion = existing.AuthVersion
	if AcessoColaboradorAlterado(*existing, *updated) {
		updated.AuthVersion++
	}
}
