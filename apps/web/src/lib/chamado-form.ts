import {
  agoraHora,
  buildEmailAssunto,
  buildEmailCorpo,
  hojeIso,
  normalizeNumeroChamado,
  sanitizeNumeroChamado,
  type ChamadoEmailInput,
} from "./chamado-email";
import type { Chamado, Unidade } from "./types";

export type AbrirChamadoFormState = {
  numero: string;
  unidadeId: string;
  abertoPor: string;
  dataIso: string;
  hora: string;
  horaTeste: string;
  sinais: string[];
  sinaisOutros: string;
  locaisAfetados: string;
  comunicacao: string[];
  comunicacaoOutros: string;
};

export function emptyAbrirChamadoForm(
  unidadeId = "",
  dataIso = hojeIso(),
  hora = agoraHora(),
  numero = ""
): AbrirChamadoFormState {
  return {
    numero,
    unidadeId,
    abertoPor: "",
    dataIso,
    hora,
    horaTeste: "",
    sinais: [],
    sinaisOutros: "",
    locaisAfetados: "",
    comunicacao: [],
    comunicacaoOutros: "",
  };
}

export function unidadeNomePorId(
  unidades: Unidade[],
  unidadeId: string
): string {
  return unidades.find((u) => u.id === unidadeId)?.nome ?? "";
}

export function emailInputFromForm(
  form: AbrirChamadoFormState,
  unidades: Unidade[]
): ChamadoEmailInput {
  return {
    unidadeNome: unidadeNomePorId(unidades, form.unidadeId),
    numero: form.numero,
    dataIso: form.dataIso,
    hora: form.hora,
    abertoPor: form.abertoPor,
    sinais: form.sinais,
    sinaisOutros: form.sinaisOutros,
    locaisAfetados: form.locaisAfetados,
    comunicacao: form.comunicacao,
    comunicacaoOutros: form.comunicacaoOutros,
  };
}

export function chamadoToForm(c: Chamado | null): AbrirChamadoFormState {
  if (!c) return emptyAbrirChamadoForm();
  return {
    numero: c.numero ?? "",
    unidadeId: c.unidadeId,
    abertoPor: c.abertoPor ?? "",
    dataIso: c.data ?? hojeIso(),
    hora: c.hora ?? agoraHora(),
    horaTeste: c.horaTeste ?? "",
    sinais: c.sinaisDetectados ?? [],
    sinaisOutros: c.sinaisOutros ?? "",
    locaisAfetados: c.locaisAfetados ?? "",
    comunicacao: c.comunicacao ?? [],
    comunicacaoOutros: c.comunicacaoOutros ?? "",
  };
}

export function validateAbrirChamadoForm(form: AbrirChamadoFormState): string | null {
  if (!sanitizeNumeroChamado(form.numero)) {
    return "Informe o número do chamado.";
  }
  if (!form.unidadeId) return "Selecione a unidade.";
  if (!form.abertoPor.trim()) return "Informe quem abriu o chamado.";
  if (!form.dataIso) return "Informe a data.";
  if (!form.hora) return "Informe a hora.";
  if (form.sinais.includes("Outros") && !form.sinaisOutros.trim()) {
    return "Descreva o sinal em «Outros».";
  }
  if (form.comunicacao.includes("Outros") && !form.comunicacaoOutros.trim()) {
    return "Descreva a comunicação em «Outros».";
  }
  return null;
}

export function formToChamadoBody(
  form: AbrirChamadoFormState,
  unidades: Unidade[],
  existing?: Chamado
): Omit<Chamado, "id" | "createdAt" | "updatedAt"> {
  const emailIn = emailInputFromForm(form, unidades);
  const assunto = buildEmailAssunto(emailIn);
  const corpo = buildEmailCorpo(emailIn);

  return {
    numero: normalizeNumeroChamado(form.numero),
    titulo: assunto,
    descricao: corpo,
    status: existing?.status ?? "aberto",
    unidadeId: form.unidadeId,
    abertoPor: form.abertoPor.trim(),
    data: emailIn.dataIso,
    hora: form.hora,
    horaTeste: form.horaTeste,
    sinaisDetectados: form.sinais,
    sinaisOutros: form.sinaisOutros.trim() || undefined,
    locaisAfetados: form.locaisAfetados.trim(),
    comunicacao: form.comunicacao,
    comunicacaoOutros: form.comunicacaoOutros.trim() || undefined,
    emailAssunto: assunto,
    emailCorpo: corpo,
  };
}
