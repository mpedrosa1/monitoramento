import type { PermissoesAdmin } from "@/lib/types";

/** Chaves das permissões granulares do administrador (UI e futuro servidor). */
export type PermissaoAdminDetalhadaKey =
  | "crudColaboradores"
  | "crudUnidades"
  | "crudVeiculos"
  | "crudEquipamentos"
  | "crudMissoes"
  | "crudChamados"
  | "concluirMissaoQualquer"
  | "encerrarChamadoQualquer"
  | "frotaValoresAlugueis"
  | "frotaVisualizarContratos"
  | "frotaRegistrarPeriodo"
  | "frotaRegistrarMulta"
  | "frotaTrocarVeiculos"
  | "rhSalariosBonificacoes"
  | "rhEscalaTrabalho"
  | "rhCalendarioSobreaviso"
  | "rhRecarregarSaldos"
  | "rhRegistrarDespesaOutros";

export const PERMISSOES_ADMIN_GRUPOS: {
  titulo: string;
  itens: { key: PermissaoAdminDetalhadaKey; label: string }[];
}[] = [
  {
    titulo: "Adicionar, editar e excluir",
    itens: [
      { key: "crudColaboradores", label: "Colaboradores" },
      { key: "crudUnidades", label: "Unidades Prisionais" },
      { key: "crudVeiculos", label: "Veículos" },
      { key: "crudEquipamentos", label: "Equipamentos" },
      { key: "crudMissoes", label: "Missões" },
      { key: "crudChamados", label: "Chamados" },
    ],
  },
  {
    titulo: "Missões e chamados",
    itens: [
      {
        key: "concluirMissaoQualquer",
        label: "Concluir missão (para qualquer colaborador)",
      },
      {
        key: "encerrarChamadoQualquer",
        label: "Encerrar chamado (para qualquer colaborador)",
      },
    ],
  },
  {
    titulo: "Frota",
    itens: [
      { key: "frotaValoresAlugueis", label: "Valores dos aluguéis" },
      {
        key: "frotaVisualizarContratos",
        label: "Visualizar contratos (documentos)",
      },
      { key: "frotaRegistrarPeriodo", label: "Registrar período" },
      { key: "frotaRegistrarMulta", label: "Registrar multa" },
      { key: "frotaTrocarVeiculos", label: "Trocar veículos A para B" },
    ],
  },
  {
    titulo: "Recursos Humanos",
    itens: [
      { key: "rhSalariosBonificacoes", label: "Salários e bonificações" },
      {
        key: "rhEscalaTrabalho",
        label: "Escala de trabalho (criar, editar ou deletar)",
      },
      {
        key: "rhCalendarioSobreaviso",
        label:
          "Calendário de sobreaviso (incluir colaboradores, editar, excluir, definir escala)",
      },
      {
        key: "rhRecarregarSaldos",
        label: "Recarregar saldos (Mobilidade e Livre)",
      },
      {
        key: "rhRegistrarDespesaOutros",
        label: "Registrar despesa (para outros colaboradores)",
      },
    ],
  },
];

const PERMISSOES_DETALHADAS_DEFAULTS: Record<PermissaoAdminDetalhadaKey, boolean> =
  {
    crudColaboradores: false,
    crudUnidades: false,
    crudVeiculos: false,
    crudEquipamentos: false,
    crudMissoes: false,
    crudChamados: false,
    concluirMissaoQualquer: false,
    encerrarChamadoQualquer: false,
    frotaValoresAlugueis: false,
    frotaVisualizarContratos: false,
    frotaRegistrarPeriodo: false,
    frotaRegistrarMulta: false,
    frotaTrocarVeiculos: false,
    rhSalariosBonificacoes: false,
    rhEscalaTrabalho: false,
    rhCalendarioSobreaviso: false,
    rhRecarregarSaldos: false,
    rhRegistrarDespesaOutros: false,
  };

export function emptyPermissoesAdminDetalhadas(): PermissoesAdmin {
  return {
    padrao: false,
    gestaoRecargas: false,
    financeiro: false,
    master: false,
    ...PERMISSOES_DETALHADAS_DEFAULTS,
  };
}

export function isPermissaoAdminDetalhada(
  key: keyof PermissoesAdmin
): key is PermissaoAdminDetalhadaKey {
  return key in PERMISSOES_DETALHADAS_DEFAULTS;
}

export function temPermissaoAdminDetalhada(permissoes: PermissoesAdmin): boolean {
  return PERMISSOES_ADMIN_GRUPOS.some((grupo) =>
    grupo.itens.some((item) => Boolean(permissoes[item.key]))
  );
}

/** Normaliza tipo legado para checagens de permissão granular. */
export function isTipoAdministrador(
  tipoAcesso: string | undefined | null,
  permissoes?: PermissoesAdmin | null
): boolean {
  if (tipoAcesso === "master" || tipoAcesso === "desenvolvedor") return false;
  if (permissoes?.master) return false;
  return (
    tipoAcesso === "administrador" ||
    tipoAcesso === "admin_com_financeiro" ||
    tipoAcesso === "admin_sem_financeiro"
  );
}

/** Permissões efetivas com migração legado → granular e bypass master. */
export function permissoesEfetivas(
  tipoAcesso: string | undefined | null,
  permissoes?: PermissoesAdmin | null
): PermissoesAdmin {
  if (tipoAcesso === "master" || tipoAcesso === "desenvolvedor" || permissoes?.master) {
    return emptyPermissoesAdminDetalhadas();
  }
  const base = migrarPermissoesLegadoParaDetalhadas({
    ...emptyPermissoesAdminDetalhadas(),
    ...(permissoes ?? {}),
  });
  if (!isTipoAdministrador(tipoAcesso, permissoes)) {
    return emptyPermissoesAdminDetalhadas();
  }
  return base;
}

export function temPermissao(
  tipoAcesso: string | undefined | null,
  permissoes: PermissoesAdmin | null | undefined,
  key: PermissaoAdminDetalhadaKey
): boolean {
  if (tipoAcesso === "master" || tipoAcesso === "desenvolvedor" || permissoes?.master) {
    return true;
  }
  if (!isTipoAdministrador(tipoAcesso, permissoes)) return false;
  return Boolean(permissoesEfetivas(tipoAcesso, permissoes)[key]);
}

export function permissoesGranularesSubset(
  editor: PermissoesAdmin,
  target: PermissoesAdmin
): boolean {
  const e = permissoesEfetivas("administrador", editor);
  const t = permissoesEfetivas("administrador", target);
  return PERMISSOES_ADMIN_GRUPOS.every((grupo) =>
    grupo.itens.every((item) => !t[item.key] || e[item.key])
  );
}

export function permissoesGranularesIguais(
  a: PermissoesAdmin,
  b: PermissoesAdmin
): boolean {
  return PERMISSOES_ADMIN_GRUPOS.every((grupo) =>
    grupo.itens.every((item) => Boolean(a[item.key]) === Boolean(b[item.key]))
  );
}

export function togglePermissaoAdminDetalhada(
  current: PermissoesAdmin,
  key: PermissaoAdminDetalhadaKey,
  checked: boolean
): PermissoesAdmin {
  return limparFlagsLegadoPermissoes({ ...current, [key]: checked });
}

/** Remove flags legadas para que não reimponham permissões granulares ao editar. */
export function limparFlagsLegadoPermissoes(
  permissoes: PermissoesAdmin
): PermissoesAdmin {
  return {
    ...permissoes,
    padrao: false,
    gestaoRecargas: false,
    financeiro: false,
    master: false,
  };
}

/** Indica se o registro já usa permissões granulares (não só flags legadas). */
export function temPermissaoGranularExplicita(
  permissoes: PermissoesAdmin
): boolean {
  return PERMISSOES_ADMIN_GRUPOS.some((grupo) =>
    grupo.itens.some((item) => Boolean(permissoes[item.key]))
  );
}

/** Preenche checkboxes granulares a partir das flags legadas (exibição ao editar). */
export function migrarPermissoesLegadoParaDetalhadas(
  permissoes: PermissoesAdmin
): PermissoesAdmin {
  const next = { ...emptyPermissoesAdminDetalhadas(), ...permissoes };

  if (temPermissaoGranularExplicita(permissoes)) {
    return next;
  }

  if (permissoes.padrao) {
    next.crudColaboradores = true;
    next.crudUnidades = true;
    next.crudVeiculos = true;
    next.crudEquipamentos = true;
    next.crudMissoes = true;
    next.crudChamados = true;
    next.concluirMissaoQualquer = true;
    next.encerrarChamadoQualquer = true;
    next.frotaValoresAlugueis = true;
    next.frotaVisualizarContratos = true;
    next.frotaRegistrarPeriodo = true;
    next.frotaRegistrarMulta = true;
    next.frotaTrocarVeiculos = true;
  }

  if (permissoes.gestaoRecargas) {
    next.rhRecarregarSaldos = true;
    next.rhRegistrarDespesaOutros = true;
  }

  if (permissoes.financeiro) {
    next.rhSalariosBonificacoes = true;
  }

  if (permissoes.padrao || permissoes.gestaoRecargas || permissoes.financeiro) {
    next.rhEscalaTrabalho = true;
    next.rhCalendarioSobreaviso = true;
  }

  return next;
}

export function resumoPermissoesAdmin(permissoes: PermissoesAdmin): string[] {
  const labels: string[] = [];
  for (const grupo of PERMISSOES_ADMIN_GRUPOS) {
    for (const item of grupo.itens) {
      if (permissoes[item.key]) {
        labels.push(item.label);
      }
    }
  }
  return labels;
}

export const TIPO_ACESSO_DESCRICOES = {
  usuario:
    "Não edita, adiciona ou exclui. Não vê as páginas Equipamentos e Recursos Humanos. Na aba Multas (Veículos), visualiza apenas multas em seu nome.",
  administrador:
    "Permissões configuráveis por área. Marque somente o que este colaborador poderá fazer.",
  master: "Acesso total ao sistema, sem restrições.",
} as const;
