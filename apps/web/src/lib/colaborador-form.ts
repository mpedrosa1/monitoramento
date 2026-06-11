import { COLABORADOR_AVATAR_PADRAO } from "./colaborador-avatar";
import {
  cpfDigits,
  formatCpfInput,
  formatRgInput,
  formatSalarioInput,
  formatTelefoneInput,
  isCpfComplete,
  isRgComplete,
  isTelefoneComplete,
  rgDigits,
  salarioNumeroParaInput,
  salarioParaNumero,
  telefoneDigits,
} from "./masks";
import type {
  Colaborador,
  ColaboradorEndereco,
  ColaboradorStatus,
  EstadoCivil,
  LocalTrabalho,
  TipoAcessoSistema,
} from "./types";

export const ESTADO_CIVIL_OPCOES: { value: EstadoCivil; label: string }[] = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União estável" },
];

export const LOCAL_TRABALHO_OPCOES: { value: LocalTrabalho; label: string }[] =
  [
    { value: "campo", label: "Campo" },
    { value: "escritorio", label: "Escritório" },
    { value: "oficina", label: "Oficina" },
    { value: "laboratorio", label: "Laboratório" },
  ];

export const TIPO_ACESSO_OPCOES: { value: TipoAcessoSistema; label: string }[] =
  [
    { value: "usuario", label: "Usuário" },
    {
      value: "admin_com_financeiro",
      label: "Administrador (com acesso financeiro)",
    },
    {
      value: "admin_sem_financeiro",
      label: "Administrador (sem acesso financeiro)",
    },
    { value: "desenvolvedor", label: "Desenvolvedor" },
  ];

export type DependenteForm = {
  localId: string;
  nome: string;
  dataNascimento: string;
  cpf: string;
};

export type ColaboradorFormState = {
  fotoUrl: string;
  nome: string;
  dataNascimento: string;
  telefoneContato: string;
  email: string;
  cpf: string;
  rg: string;
  rgOrgaoEmissor: string;
  estadoCivil: EstadoCivil | "";
  conjuge: string;
  conjugeCpf: string;
  dependentes: DependenteForm[];
  endereco: ColaboradorEndereco;
  cargo: string;
  localTrabalho: LocalTrabalho | "";
  telefoneCorporativo: string;
  emailCorporativo: string;
  salario: string;
  tipoAcesso: TipoAcessoSistema | "";
};

function emptyEndereco(): ColaboradorEndereco {
  return {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };
}

function emptyDependente(): DependenteForm {
  return {
    localId: novoDependenteLocalId(),
    nome: "",
    dataNascimento: "",
    cpf: "",
  };
}

let dependenteSeq = 0;
export function novoDependenteLocalId(): string {
  dependenteSeq += 1;
  return `dep-${dependenteSeq}`;
}

export function emptyColaboradorForm(): ColaboradorFormState {
  return {
    fotoUrl: COLABORADOR_AVATAR_PADRAO,
    nome: "",
    dataNascimento: "",
    telefoneContato: "",
    email: "",
    cpf: "",
    rg: "",
    rgOrgaoEmissor: "",
    estadoCivil: "",
    conjuge: "",
    conjugeCpf: "",
    dependentes: [],
    endereco: emptyEndereco(),
    cargo: "",
    localTrabalho: "",
    telefoneCorporativo: "",
    emailCorporativo: "",
    salario: "",
    tipoAcesso: "",
  };
}

export function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Senha inicial de acesso: MMR + ano de nascimento (ex.: MMR1984). */
export function senhaInicialFromDataNascimento(dataNascimento: string): string {
  const ano = dataNascimento.trim().slice(0, 4);
  return `MMR${ano}`;
}

export function colaboradorToForm(c: Colaborador | null): ColaboradorFormState {
  if (!c) return emptyColaboradorForm();
  return {
    fotoUrl: c.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO,
    nome: c.nome ?? "",
    dataNascimento: c.dataNascimento ?? "",
    telefoneContato: c.telefoneContato ?? "",
    email: c.email ?? "",
    cpf: c.cpf ?? "",
    rg: c.rg ?? "",
    rgOrgaoEmissor: c.rgOrgaoEmissor ?? "",
    estadoCivil: c.estadoCivil ?? "",
    conjuge: c.conjuge ?? "",
    conjugeCpf: c.conjugeCpf ?? "",
    dependentes: (c.dependentes ?? []).map((d) => ({
      localId: novoDependenteLocalId(),
      nome: d.nome ?? "",
      dataNascimento: d.dataNascimento ?? "",
      cpf: d.cpf ?? "",
    })),
    endereco: c.endereco ? { ...c.endereco } : emptyEndereco(),
    cargo: c.cargo ?? "",
    localTrabalho: c.localTrabalho ?? "",
    telefoneCorporativo: c.telefoneCorporativo ?? "",
    emailCorporativo: c.emailCorporativo ?? "",
    salario: c.salario != null ? salarioNumeroParaInput(c.salario) : "",
    tipoAcesso: c.tipoAcesso ?? "",
  };
}

function dependenteParcial(d: DependenteForm): boolean {
  return Boolean(
    d.nome.trim() ||
      d.dataNascimento ||
      d.cpf.trim()
  );
}

export type ColaboradorFormErrors = Record<string, string>;

export function dependenteFieldKey(
  localId: string,
  field: keyof Omit<DependenteForm, "localId">
): string {
  return `dependente.${localId}.${field}`;
}

export function enderecoFieldKey(field: keyof ColaboradorEndereco): string {
  return `endereco.${field}`;
}

export function hasColaboradorFormErrors(
  errors: ColaboradorFormErrors
): boolean {
  return Object.keys(errors).length > 0;
}

export function listColaboradorFormErrors(
  errors: ColaboradorFormErrors
): string[] {
  return Object.values(errors);
}

export function clearColaboradorFormErrorsForPatch(
  errors: ColaboradorFormErrors,
  patch: Partial<ColaboradorFormState>
): ColaboradorFormErrors {
  const next = { ...errors };
  for (const key of Object.keys(patch)) {
    if (key === "endereco" && patch.endereco) {
      for (const ek of Object.keys(patch.endereco) as (keyof ColaboradorEndereco)[]) {
        delete next[enderecoFieldKey(ek)];
      }
    } else if (key === "dependentes") {
      for (const k of Object.keys(next)) {
        if (k.startsWith("dependente.")) delete next[k];
      }
    } else {
      delete next[key];
    }
  }
  return next;
}

export function scrollToFirstColaboradorFormError(
  errors: ColaboradorFormErrors
): void {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-field="${firstKey}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function validateColaboradorForm(
  form: ColaboradorFormState
): ColaboradorFormErrors {
  const errors: ColaboradorFormErrors = {};

  if (!form.nome.trim()) errors.nome = "Informe o nome.";
  if (!form.dataNascimento) errors.dataNascimento = "Informe a data de nascimento.";
  if (!isTelefoneComplete(form.telefoneContato)) {
    errors.telefoneContato = "Informe um telefone de contato válido.";
  }
  if (!isEmailValido(form.email)) errors.email = "Informe um e-mail válido.";
  if (!isCpfComplete(form.cpf)) errors.cpf = "Informe um CPF válido.";
  if (!isRgComplete(form.rg)) errors.rg = "Informe um RG válido.";
  if (!form.rgOrgaoEmissor.trim()) {
    errors.rgOrgaoEmissor = "Informe o órgão emissor do RG.";
  }
  if (!form.estadoCivil) errors.estadoCivil = "Selecione o estado civil.";
  if (form.estadoCivil === "casado" && !form.conjuge.trim()) {
    errors.conjuge = "Informe o nome do cônjuge.";
  }
  if (form.estadoCivil === "casado" && !isCpfComplete(form.conjugeCpf)) {
    errors.conjugeCpf = "Informe o CPF do cônjuge.";
  }

  for (let i = 0; i < form.dependentes.length; i++) {
    const d = form.dependentes[i];
    if (!dependenteParcial(d)) continue;
    const n = i + 1;
    if (!d.nome.trim()) {
      errors[dependenteFieldKey(d.localId, "nome")] =
        `Informe o nome do dependente ${n}.`;
    }
    if (!d.dataNascimento) {
      errors[dependenteFieldKey(d.localId, "dataNascimento")] =
        `Informe a data de nascimento do dependente ${n}.`;
    }
    if (!isCpfComplete(d.cpf)) {
      errors[dependenteFieldKey(d.localId, "cpf")] =
        `Informe o CPF do dependente ${n}.`;
    }
  }

  if (!form.endereco.cep.trim()) {
    errors[enderecoFieldKey("cep")] = "Informe o CEP.";
  }
  if (!form.endereco.logradouro.trim()) {
    errors[enderecoFieldKey("logradouro")] = "Informe a rua.";
  }
  if (!form.endereco.numero.trim()) {
    errors[enderecoFieldKey("numero")] = "Informe o número.";
  }
  if (!form.endereco.bairro.trim()) {
    errors[enderecoFieldKey("bairro")] = "Informe o bairro.";
  }
  if (!form.endereco.cidade.trim()) {
    errors[enderecoFieldKey("cidade")] = "Informe a cidade.";
  }
  if (!form.endereco.estado.trim()) {
    errors[enderecoFieldKey("estado")] = "Informe o estado.";
  }
  if (!form.cargo.trim()) errors.cargo = "Informe o cargo.";
  if (!form.localTrabalho) {
    errors.localTrabalho = "Selecione o local de trabalho.";
  }
  if (!isTelefoneComplete(form.telefoneCorporativo)) {
    errors.telefoneCorporativo = "Informe um telefone corporativo válido.";
  }
  if (!isEmailValido(form.emailCorporativo)) {
    errors.emailCorporativo = "Informe um e-mail corporativo válido.";
  }
  if (!form.tipoAcesso) {
    errors.tipoAcesso = "Selecione o tipo de acesso ao sistema.";
  }

  return errors;
}

export function formToColaboradorBody(
  form: ColaboradorFormState,
  existing?: Colaborador
): Omit<Colaborador, "id" | "createdAt" | "updatedAt"> {
  const nome = form.nome.trim();
  return {
    nome,
    dataNascimento: form.dataNascimento,
    cpf: formatCpfInput(cpfDigits(form.cpf)),
    rg: formatRgInput(rgDigits(form.rg)),
    rgOrgaoEmissor: form.rgOrgaoEmissor.trim(),
    telefoneContato: formatTelefoneInput(telefoneDigits(form.telefoneContato)),
    email: form.email.trim().toLowerCase(),
    estadoCivil: form.estadoCivil as EstadoCivil,
    conjuge: form.estadoCivil === "casado" ? form.conjuge.trim() : undefined,
    conjugeCpf:
      form.estadoCivil === "casado"
        ? formatCpfInput(cpfDigits(form.conjugeCpf))
        : undefined,
    dependentes: form.dependentes
      .filter((d) => d.nome.trim())
      .map((d) => ({
        nome: d.nome.trim(),
        dataNascimento: d.dataNascimento,
        cpf: formatCpfInput(cpfDigits(d.cpf)),
      })),
    endereco: {
      cep: form.endereco.cep.trim(),
      logradouro: form.endereco.logradouro.trim(),
      numero: form.endereco.numero.trim(),
      complemento: form.endereco.complemento.trim(),
      bairro: form.endereco.bairro.trim(),
      cidade: form.endereco.cidade.trim(),
      estado: form.endereco.estado.trim().toUpperCase(),
    },
    cargo: form.cargo.trim(),
    localTrabalho: form.localTrabalho as LocalTrabalho,
    telefoneCorporativo: formatTelefoneInput(
      telefoneDigits(form.telefoneCorporativo)
    ),
    emailCorporativo: form.emailCorporativo.trim().toLowerCase(),
    salario: form.salario.trim()
      ? salarioParaNumero(form.salario)
      : (existing?.salario ?? 0),
    tipoAcesso: form.tipoAcesso as TipoAcessoSistema,
    fotoUrl: form.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO,
    status: existing?.status ?? ("escritorio" as ColaboradorStatus),
    unidadeId: existing?.unidadeId,
  };
}

export function novoDependenteVazio(): DependenteForm {
  return emptyDependente();
}
