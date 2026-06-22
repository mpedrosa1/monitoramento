package domain

// Permissões granulares espelham apps/web/src/lib/permissoes-admin.ts

func temPermissaoGranularExplicita(p PermissoesAdmin) bool {
	return p.CrudColaboradores || p.CrudUnidades || p.CrudVeiculos ||
		p.CrudEquipamentos || p.CrudMissoes || p.CrudChamados ||
		p.ConcluirMissaoQualquer || p.EncerrarChamadoQualquer ||
		p.FrotaValoresAlugueis || p.FrotaVisualizarContratos ||
		p.FrotaRegistrarPeriodo || p.FrotaRegistrarMulta || p.FrotaTrocarVeiculos ||
		p.RhSalariosBonificacoes || p.RhEscalaTrabalho || p.RhCalendarioSobreaviso ||
		p.RhRecarregarSaldos || p.RhRegistrarDespesaOutros
}

func limparFlagsLegadoPermissoes(p *PermissoesAdmin) {
	if p == nil {
		return
	}
	p.Padrao = false
	p.GestaoRecargas = false
	p.Financeiro = false
}

func migrarPermissoesLegadoParaDetalhadas(p *PermissoesAdmin) {
	if p == nil {
		return
	}
	if temPermissaoGranularExplicita(*p) {
		return
	}
	if p.Padrao {
		p.CrudColaboradores = true
		p.CrudUnidades = true
		p.CrudVeiculos = true
		p.CrudEquipamentos = true
		p.CrudMissoes = true
		p.CrudChamados = true
		p.ConcluirMissaoQualquer = true
		p.EncerrarChamadoQualquer = true
		p.FrotaValoresAlugueis = true
		p.FrotaVisualizarContratos = true
		p.FrotaRegistrarPeriodo = true
		p.FrotaRegistrarMulta = true
		p.FrotaTrocarVeiculos = true
	}
	if p.GestaoRecargas {
		p.RhRecarregarSaldos = true
		p.RhRegistrarDespesaOutros = true
	}
	if p.Financeiro {
		p.RhSalariosBonificacoes = true
	}
	if p.Padrao || p.GestaoRecargas || p.Financeiro {
		p.RhEscalaTrabalho = true
		p.RhCalendarioSobreaviso = true
	}
}

func permissoesAdminComTudo() PermissoesAdmin {
	return PermissoesAdmin{
		Padrao: true, GestaoRecargas: true, Financeiro: true, Master: true,
		CrudColaboradores: true, CrudUnidades: true, CrudVeiculos: true,
		CrudEquipamentos: true, CrudMissoes: true, CrudChamados: true,
		ConcluirMissaoQualquer: true, EncerrarChamadoQualquer: true,
		FrotaValoresAlugueis: true, FrotaVisualizarContratos: true,
		FrotaRegistrarPeriodo: true, FrotaRegistrarMulta: true, FrotaTrocarVeiculos: true,
		RhSalariosBonificacoes: true, RhEscalaTrabalho: true, RhCalendarioSobreaviso: true,
		RhRecarregarSaldos: true, RhRegistrarDespesaOutros: true,
	}
}

// IsMaster — tipo master ou flag legada.
func IsMaster(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if t == TipoAcessoMaster {
		return true
	}
	perm := permissoesFrom(t, p)
	return perm.Master
}

// IsColaboradorAdministrador indica master ou administrador do sistema.
func IsColaboradorAdministrador(c Colaborador) bool {
	t, _ := ResolvePermissoes(c.TipoAcesso, c.PermissoesAdmin)
	return t == TipoAcessoAdministrador || t == TipoAcessoMaster
}

// PermissoesEfetivas aplica migração legado → granular.
func PermissoesEfetivas(t TipoAcessoSistema, p *PermissoesAdmin) PermissoesAdmin {
	if IsMaster(t, p) {
		return permissoesAdminComTudo()
	}
	perm := permissoesFrom(t, p)
	migrarPermissoesLegadoParaDetalhadas(&perm)
	return perm
}

func permissoesGranularesIguais(a, b PermissoesAdmin) bool {
	ea := PermissoesEfetivas(TipoAcessoAdministrador, &a)
	eb := PermissoesEfetivas(TipoAcessoAdministrador, &b)
	return ea.CrudColaboradores == eb.CrudColaboradores &&
		ea.CrudUnidades == eb.CrudUnidades &&
		ea.CrudVeiculos == eb.CrudVeiculos &&
		ea.CrudEquipamentos == eb.CrudEquipamentos &&
		ea.CrudMissoes == eb.CrudMissoes &&
		ea.CrudChamados == eb.CrudChamados &&
		ea.ConcluirMissaoQualquer == eb.ConcluirMissaoQualquer &&
		ea.EncerrarChamadoQualquer == eb.EncerrarChamadoQualquer &&
		ea.FrotaValoresAlugueis == eb.FrotaValoresAlugueis &&
		ea.FrotaVisualizarContratos == eb.FrotaVisualizarContratos &&
		ea.FrotaRegistrarPeriodo == eb.FrotaRegistrarPeriodo &&
		ea.FrotaRegistrarMulta == eb.FrotaRegistrarMulta &&
		ea.FrotaTrocarVeiculos == eb.FrotaTrocarVeiculos &&
		ea.RhSalariosBonificacoes == eb.RhSalariosBonificacoes &&
		ea.RhEscalaTrabalho == eb.RhEscalaTrabalho &&
		ea.RhCalendarioSobreaviso == eb.RhCalendarioSobreaviso &&
		ea.RhRecarregarSaldos == eb.RhRecarregarSaldos &&
		ea.RhRegistrarDespesaOutros == eb.RhRegistrarDespesaOutros
}

func permissoesGranularesSubset(editor, target PermissoesAdmin) bool {
	e := PermissoesEfetivas(TipoAcessoAdministrador, &editor)
	t := PermissoesEfetivas(TipoAcessoAdministrador, &target)
	checks := []struct{ need, have bool }{
		{t.CrudColaboradores, e.CrudColaboradores},
		{t.CrudUnidades, e.CrudUnidades},
		{t.CrudVeiculos, e.CrudVeiculos},
		{t.CrudEquipamentos, e.CrudEquipamentos},
		{t.CrudMissoes, e.CrudMissoes},
		{t.CrudChamados, e.CrudChamados},
		{t.ConcluirMissaoQualquer, e.ConcluirMissaoQualquer},
		{t.EncerrarChamadoQualquer, e.EncerrarChamadoQualquer},
		{t.FrotaValoresAlugueis, e.FrotaValoresAlugueis},
		{t.FrotaVisualizarContratos, e.FrotaVisualizarContratos},
		{t.FrotaRegistrarPeriodo, e.FrotaRegistrarPeriodo},
		{t.FrotaRegistrarMulta, e.FrotaRegistrarMulta},
		{t.FrotaTrocarVeiculos, e.FrotaTrocarVeiculos},
		{t.RhSalariosBonificacoes, e.RhSalariosBonificacoes},
		{t.RhEscalaTrabalho, e.RhEscalaTrabalho},
		{t.RhCalendarioSobreaviso, e.RhCalendarioSobreaviso},
		{t.RhRecarregarSaldos, e.RhRecarregarSaldos},
		{t.RhRegistrarDespesaOutros, e.RhRegistrarDespesaOutros},
	}
	for _, c := range checks {
		if c.need && !c.have {
			return false
		}
	}
	return true
}

func temPermissaoRH(p PermissoesAdmin) bool {
	return p.RhSalariosBonificacoes || p.RhEscalaTrabalho || p.RhCalendarioSobreaviso ||
		p.RhRecarregarSaldos || p.RhRegistrarDespesaOutros
}

func CanCrudColaboradores(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).CrudColaboradores
}

func CanCrudUnidades(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).CrudUnidades
}

func CanCrudVeiculos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).CrudVeiculos
}

func CanCrudEquipamentos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).CrudEquipamentos
}

func CanCrudMissoes(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).CrudMissoes
}

func CanCrudChamados(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).CrudChamados
}

func CanConcluirMissaoQualquer(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).ConcluirMissaoQualquer
}

func CanEncerrarChamadoQualquer(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).EncerrarChamadoQualquer
}

func CanFrotaValoresAlugueis(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).FrotaValoresAlugueis
}

func CanFrotaVisualizarContratos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).FrotaVisualizarContratos
}

func CanFrotaRegistrarPeriodo(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).FrotaRegistrarPeriodo
}

func CanFrotaRegistrarMulta(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).FrotaRegistrarMulta
}

func CanFrotaTrocarVeiculos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).FrotaTrocarVeiculos
}

func CanRhSalariosBonificacoes(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).RhSalariosBonificacoes
}

func CanRhEscalaTrabalho(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).RhEscalaTrabalho
}

func CanRhCalendarioSobreaviso(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).RhCalendarioSobreaviso
}

func CanRhRecarregarSaldos(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).RhRecarregarSaldos
}

func CanRhRegistrarDespesaOutros(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	return PermissoesEfetivas(t, p).RhRegistrarDespesaOutros
}

// CanViewTodasMultasVeiculo — usuário comum vê só multas em seu nome.
func CanViewTodasMultasVeiculo(t TipoAcessoSistema, p *PermissoesAdmin) bool {
	if IsMaster(t, p) {
		return true
	}
	if t != TipoAcessoAdministrador {
		return false
	}
	perm := PermissoesEfetivas(t, p)
	return perm.CrudVeiculos || perm.FrotaRegistrarMulta
}
