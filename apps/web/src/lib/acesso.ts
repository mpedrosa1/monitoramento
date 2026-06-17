import type { PermissoesAdmin, TipoAcessoSistema } from "@/lib/types";

export type PermissaoAdminCheckbox =
  | "padrao"
  | "gestaoRecargas"
  | "financeiro"
  | "master";

export const NIVEL_PERMISSAO_ADMIN: Record<PermissaoAdminCheckbox, number> = {
  padrao: 1,
  gestaoRecargas: 2,
  financeiro: 3,
  master: 4,
};

export const PERMISSOES_ADMIN_OPCOES: {
  key: PermissaoAdminCheckbox;
  label: string;
  descricao: string;
}[] = [
  {
    key: "padrao",
    label: "Padrão",
    descricao:
      "Adicionar, editar e excluir colaboradores, unidades prisionais, equipamentos, veículos, chamados, missões e despesas.",
  },
  {
    key: "gestaoRecargas",
    label: "Gestão de recargas",
    descricao:
      "Tudo do Padrão, além de realizar recargas de despesas para colaboradores.",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    descricao:
      "Tudo do Padrão e da Gestão de recargas, além de visualizar e trabalhar com salários e bonificações.",
  },
  {
    key: "master",
    label: "Master",
    descricao: "Todas as permissões anteriores.",
  },
];

export function emptyPermissoesAdmin(): PermissoesAdmin {
  return {
    padrao: false,
    gestaoRecargas: false,
    financeiro: false,
    master: false,
  };
}

function normalizePermissoesInput(p: PermissoesAdmin): PermissoesAdmin {
  const next = { ...p };
  const legado = p as PermissoesAdmin & { desenvolvedor?: boolean };
  if (!next.master && legado.desenvolvedor) {
    next.master = true;
  }
  return next;
}

/** Normaliza tipo legado e aplica regras cumulativas das flags. */
export function resolvePermissoes(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): { tipo: TipoAcessoSistema; permissoes: PermissoesAdmin } {
  switch (tipoAcesso) {
    case "admin_com_financeiro":
      return {
        tipo: "administrador",
        permissoes: {
          padrao: true,
          gestaoRecargas: true,
          financeiro: true,
          master: false,
        },
      };
    case "admin_sem_financeiro":
      return {
        tipo: "administrador",
        permissoes: {
          padrao: true,
          gestaoRecargas: false,
          financeiro: false,
          master: false,
        },
      };
    case "desenvolvedor":
      return {
        tipo: "administrador",
        permissoes: {
          padrao: true,
          gestaoRecargas: true,
          financeiro: true,
          master: true,
        },
      };
    case "administrador": {
      const base = normalizePermissoesInput(permissoes ?? emptyPermissoesAdmin());
      const resolved = { ...base };
      if (resolved.master) {
        resolved.padrao = true;
        resolved.gestaoRecargas = true;
        resolved.financeiro = true;
      }
      if (resolved.financeiro) {
        resolved.padrao = true;
        resolved.gestaoRecargas = true;
      }
      if (resolved.gestaoRecargas) {
        resolved.padrao = true;
      }
      return { tipo: "administrador", permissoes: resolved };
    }
    default:
      return { tipo: "usuario", permissoes: emptyPermissoesAdmin() };
  }
}

export function nivelHierarquiaAdmin(permissoes: PermissoesAdmin): number {
  if (permissoes.master) return 4;
  if (permissoes.financeiro) return 3;
  if (permissoes.gestaoRecargas) return 2;
  if (permissoes.padrao) return 1;
  return 0;
}

export function nivelHierarquiaUsuario(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): number {
  const { tipo, permissoes: p } = resolvePermissoes(tipoAcesso, permissoes);
  if (tipo !== "administrador") return 0;
  return nivelHierarquiaAdmin(p);
}

function permissoesResolvidasIguais(a: PermissoesAdmin, b: PermissoesAdmin): boolean {
  const ra = resolvePermissoes("administrador", a).permissoes;
  const rb = resolvePermissoes("administrador", b).permissoes;
  return (
    ra.padrao === rb.padrao &&
    ra.gestaoRecargas === rb.gestaoRecargas &&
    ra.financeiro === rb.financeiro &&
    ra.master === rb.master
  );
}

/** Admin só atribui hierarquia ≤ à própria (ou mantém existente superior inalterada). */
export function permissoesAtribuicaoPermitida(
  editorTipo: TipoAcessoSistema | string | undefined | null,
  editorPerm: PermissoesAdmin | null | undefined,
  targetTipo: "usuario" | "administrador" | "" | TipoAcessoSistema,
  targetPerm: PermissoesAdmin | null | undefined,
  existingTarget?: PermissoesAdmin | null
): boolean {
  if (targetTipo === "usuario" || targetTipo === "" || !targetTipo) return true;
  const editorN = nivelHierarquiaUsuario(editorTipo, editorPerm);
  const targetN = nivelHierarquiaUsuario("administrador", targetPerm);
  if (targetN <= editorN) return true;
  if (existingTarget && targetPerm) {
    const existingN = nivelHierarquiaUsuario("administrador", existingTarget);
    return (
      existingN === targetN &&
      permissoesResolvidasIguais(existingTarget, targetPerm)
    );
  }
  return false;
}

export function isAdministradorTipo(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): boolean {
  return resolvePermissoes(tipoAcesso, permissoes).tipo === "administrador";
}

export function canManagePadrao(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): boolean {
  const { tipo, permissoes: p } = resolvePermissoes(tipoAcesso, permissoes);
  return tipo === "administrador" && p.padrao;
}

export function canManageRecargas(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): boolean {
  const { permissoes: p } = resolvePermissoes(tipoAcesso, permissoes);
  return p.gestaoRecargas || p.financeiro || p.master;
}

export function canViewFinanceiro(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): boolean {
  const { permissoes: p } = resolvePermissoes(tipoAcesso, permissoes);
  return p.financeiro || p.master;
}

export function canAccessRecursosHumanos(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): boolean {
  const { tipo, permissoes: p } = resolvePermissoes(tipoAcesso, permissoes);
  if (tipo !== "administrador") return false;
  return p.padrao || p.gestaoRecargas || p.financeiro || p.master;
}

export function isMaster(
  tipoAcesso: TipoAcessoSistema | string | undefined | null,
  permissoes?: PermissoesAdmin | null
): boolean {
  const { permissoes: p } = resolvePermissoes(tipoAcesso, permissoes);
  return p.master;
}

/** @deprecated Use isMaster */
export const isDesenvolvedor = isMaster;

/** Converte colaborador legado para o formulário (usuario | administrador + flags). */
export function colaboradorAcessoToForm(
  tipoAcesso?: TipoAcessoSistema | string | null,
  permissoesAdmin?: PermissoesAdmin | null
): { tipoAcesso: "usuario" | "administrador"; permissoesAdmin: PermissoesAdmin } {
  const { tipo, permissoes } = resolvePermissoes(tipoAcesso, permissoesAdmin);
  if (tipo === "administrador") {
    return { tipoAcesso: "administrador", permissoesAdmin: permissoes };
  }
  return { tipoAcesso: "usuario", permissoesAdmin: emptyPermissoesAdmin() };
}

export function togglePermissaoAdmin(
  current: PermissoesAdmin,
  key: PermissaoAdminCheckbox,
  checked: boolean,
  editorNivel: number
): PermissoesAdmin {
  if (NIVEL_PERMISSAO_ADMIN[key] > editorNivel) {
    return current;
  }
  if (key === "master" && checked) {
    return {
      padrao: true,
      gestaoRecargas: true,
      financeiro: true,
      master: true,
    };
  }
  const next = { ...current, [key]: checked };
  if (key === "gestaoRecargas" && checked) next.padrao = true;
  if (key === "financeiro" && checked) {
    next.padrao = true;
    next.gestaoRecargas = true;
  }
  if (next.master) {
    next.padrao = true;
    next.gestaoRecargas = true;
    next.financeiro = true;
  }
  if (next.financeiro) {
    next.padrao = true;
    next.gestaoRecargas = true;
  }
  if (next.gestaoRecargas) next.padrao = true;
  return next;
}

export function labelPermissoesAdmin(
  tipoAcesso?: TipoAcessoSistema | string | null,
  permissoesAdmin?: PermissoesAdmin | null
): string {
  const { tipo, permissoes } = resolvePermissoes(tipoAcesso, permissoesAdmin);
  if (tipo === "usuario") return "Usuário";
  const partes = PERMISSOES_ADMIN_OPCOES.filter((o) => permissoes[o.key]).map(
    (o) => o.label
  );
  if (partes.length === 0) return "Administrador (sem permissões)";
  return `Administrador (${partes.join(", ")})`;
}

export function podeEditarPermissoesColaborador(
  editorTipo: TipoAcessoSistema | string | undefined | null,
  editorPerm: PermissoesAdmin | null | undefined,
  alvoTipo: "usuario" | "administrador" | "" | TipoAcessoSistema,
  alvoPerm: PermissoesAdmin | null | undefined
): boolean {
  if (alvoTipo !== "administrador") return true;
  const editorN = nivelHierarquiaUsuario(editorTipo, editorPerm);
  const alvoN = nivelHierarquiaUsuario("administrador", alvoPerm);
  return alvoN <= editorN;
}
