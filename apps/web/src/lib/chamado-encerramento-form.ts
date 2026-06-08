import {
  agoraHora,
  buildEmailEncerramentoAssunto,
  buildEmailEncerramentoCorpo,
  formatListPT,
  hojeIso,
  type ChamadoEncerramentoEmailInput,
} from "./chamado-email";
import type { Chamado } from "./types";

export type EncerramentoFormState = {
  encerradoPor: string;
  dataIso: string;
  hora: string;
  horaTestePos: string;
  diagnostico: string;
  acoesRealizadas: string;
  sinaisPosTeste: string[];
  sinaisPosTesteOutros: string;
  observacoes: string;
};

export function emptyEncerramentoForm(
  dataIso = hojeIso(),
  hora = agoraHora()
): EncerramentoFormState {
  return {
    encerradoPor: "",
    dataIso,
    hora,
    horaTestePos: "",
    diagnostico: "",
    acoesRealizadas: "",
    sinaisPosTeste: [],
    sinaisPosTesteOutros: "",
    observacoes: "",
  };
}

export function encerramentoInputFromForm(
  form: EncerramentoFormState,
  chamado: Chamado,
  unidadeNome: string
): ChamadoEncerramentoEmailInput {
  return {
    unidadeNome,
    numero: chamado.numero ?? "",
    dataIso: form.dataIso,
    hora: form.hora,
    encerradoPor: form.encerradoPor,
    horaTestePos: form.horaTestePos,
    diagnostico: form.diagnostico,
    acoesRealizadas: form.acoesRealizadas,
    sinaisPosTeste: form.sinaisPosTeste,
    sinaisPosTesteOutros: form.sinaisPosTesteOutros,
    observacoes: form.observacoes,
    abertoPor: chamado.abertoPor ?? "",
    dataAbertura: chamado.data ?? "",
    horaAbertura: chamado.hora ?? "",
  };
}

export function validateEncerramentoForm(
  form: EncerramentoFormState
): string | null {
  if (!form.encerradoPor.trim()) {
    return "Informe quem encerrou o chamado.";
  }
  if (!form.dataIso) return "Informe a data de encerramento.";
  if (!form.hora) return "Informe a hora de encerramento.";
  if (!form.diagnostico.trim()) return "Informe o diagnóstico.";
  if (!form.acoesRealizadas.trim()) return "Informe as ações realizadas.";
  if (form.sinaisPosTeste.includes("Outros") && !form.sinaisPosTesteOutros.trim()) {
    return "Descreva o sinal em «Outros».";
  }
  return null;
}

export function chamadoComEncerramento(
  chamado: Chamado,
  form: EncerramentoFormState,
  unidadeNome: string
): Omit<Chamado, "id" | "createdAt" | "updatedAt"> {
  const emailIn = encerramentoInputFromForm(form, chamado, unidadeNome);
  const assuntoEnc = buildEmailEncerramentoAssunto(emailIn);
  const corpoEnc = buildEmailEncerramentoCorpo(emailIn);

  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = chamado;
  return {
    ...rest,
    status: "encerrado",
    encerradoPor: form.encerradoPor.trim(),
    dataEncerramento: form.dataIso,
    horaEncerramento: form.hora,
    horaTestePos: form.horaTestePos,
    diagnostico: form.diagnostico.trim(),
    acoesRealizadas: form.acoesRealizadas.trim(),
    sinaisPosTeste: form.sinaisPosTeste,
    sinaisPosTesteOutros: form.sinaisPosTesteOutros.trim() || undefined,
    observacoesEncerramento: form.observacoes.trim() || undefined,
    emailEncerramentoAssunto: assuntoEnc,
    emailEncerramentoCorpo: corpoEnc,
  };
}

/** Texto legível dos sinais pós-teste para exibição. */
export function formatSinaisPosTeste(chamado: Chamado): string {
  const sinais = chamado.sinaisPosTeste ?? [];
  if (sinais.length === 0) return "—";
  return formatListPT(
    sinais.map((s) =>
      s === "Outros" && chamado.sinaisPosTesteOutros
        ? chamado.sinaisPosTesteOutros
        : s
    )
  );
}
