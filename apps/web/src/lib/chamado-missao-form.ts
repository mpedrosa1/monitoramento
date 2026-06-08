import {
  agoraHora,
  buildEmailAutorizacaoAssunto,
  buildEmailAutorizacaoCorpo,
  formatNumeroExibicao,
  hojeIso,
  type ChamadoAutorizacaoEmailInput,
} from "./chamado-email";
import type { Chamado, Colaborador } from "./types";

export type MissaoFormState = {
  colaboradorIds: string[];
  dataIso: string;
  hora: string;
};

export function emptyMissaoForm(
  dataIso = hojeIso(),
  hora = agoraHora()
): MissaoFormState {
  return {
    colaboradorIds: [],
    dataIso,
    hora,
  };
}

export function autorizacaoInputFromForm(
  form: MissaoFormState,
  unidadeNome: string,
  colaboradores: Colaborador[]
): ChamadoAutorizacaoEmailInput {
  const selected = colaboradores.filter((c) =>
    form.colaboradorIds.includes(c.id)
  );
  return {
    unidadeNome,
    colaboradores: selected.map((c) => ({
      nome: c.nome,
      rg: c.rg ?? "",
      rgOrgaoEmissor: c.rgOrgaoEmissor ?? "",
    })),
    dataIso: form.dataIso,
    hora: form.hora,
  };
}

export function validateMissaoForm(
  form: MissaoFormState,
  colaboradores: Colaborador[]
): string | null {
  if (form.colaboradorIds.length === 0) {
    return "Selecione ao menos um colaborador.";
  }
  if (!form.dataIso) return "Informe a data de chegada prevista.";
  if (!form.hora) return "Informe a hora de chegada prevista.";

  const selected = colaboradores.filter((c) =>
    form.colaboradorIds.includes(c.id)
  );
  for (const c of selected) {
    if (!c.rg?.trim() || !c.rgOrgaoEmissor?.trim()) {
      return `Cadastre RG e órgão emissor de ${c.nome} na página Colaboradores.`;
    }
  }
  return null;
}

export function chamadoComMissao(
  chamado: Chamado,
  form: MissaoFormState,
  unidadeNome: string,
  colaboradores: Colaborador[],
  missaoId: string
): Omit<Chamado, "id" | "createdAt" | "updatedAt"> {
  const emailIn = autorizacaoInputFromForm(form, unidadeNome, colaboradores);
  const assunto = buildEmailAutorizacaoAssunto(unidadeNome);
  const corpo = buildEmailAutorizacaoCorpo(emailIn);

  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = chamado;
  return {
    ...rest,
    status: "em_andamento",
    colaboradorIds: form.colaboradorIds,
    previsaoChegadaData: form.dataIso,
    previsaoChegadaHora: form.hora,
    missaoId,
    emailAutorizacaoAssunto: assunto,
    emailAutorizacaoCorpo: corpo,
  };
}

export function tituloMissao(chamado: Chamado, unidadeNome: string): string {
  const num = chamado.numero
    ? formatNumeroExibicao(chamado.numero)
    : "sem número";
  return `Chamado ${num} — ${unidadeNome}`;
}

/** Lista formatada de colaboradores atribuídos (nome + RG). */
export function formatColaboradoresMissao(
  ids: string[] | undefined,
  colaboradores: Colaborador[]
): string {
  if (!ids?.length) return "—";
  return ids
    .map((id) => {
      const c = colaboradores.find((x) => x.id === id);
      if (!c) return id;
      const rg =
        c.rg && c.rgOrgaoEmissor
          ? ` — RG: ${c.rg} ${c.rgOrgaoEmissor}`
          : "";
      return `${c.nome}${rg}`;
    })
    .join("\n");
}
