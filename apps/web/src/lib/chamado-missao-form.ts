import {
  agoraHora,
  buildEmailAutorizacaoAssunto,
  buildEmailAutorizacaoCorpo,
  formatNumeroExibicao,
  hojeIso,
  type ChamadoAutorizacaoEmailInput,
} from "./chamado-email";
import {
  emptyEmpresaParceiraColaborador,
  resolveEmpresaParceiraLocalText,
  type EmpresaParceiraColaboradorForm,
  type EmpresaParceiraLocal,
} from "./empresa-parceira-missao-form";
import type { Chamado, Colaborador } from "./types";

export type {
  EmpresaParceiraColaboradorForm,
  EmpresaParceiraLocal,
} from "./empresa-parceira-missao-form";

export type MissaoFormState = {
  colaboradorIds: string[];
  dataIso: string;
  hora: string;
  temEmpresaParceira: boolean;
  empresaParceiraNome: string;
  empresaParceiraColaboradores: EmpresaParceiraColaboradorForm[];
  empresaParceiraTrabalho: string;
  empresaParceiraLocal: EmpresaParceiraLocal;
  empresaParceiraLocalOutro: string;
};

export function emptyMissaoForm(
  dataIso = hojeIso(),
  hora = agoraHora()
): MissaoFormState {
  return {
    colaboradorIds: [],
    dataIso,
    hora,
    temEmpresaParceira: false,
    empresaParceiraNome: "",
    empresaParceiraColaboradores: [],
    empresaParceiraTrabalho: "",
    empresaParceiraLocal: "",
    empresaParceiraLocalOutro: "",
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
  const input: ChamadoAutorizacaoEmailInput = {
    unidadeNome,
    colaboradores: selected.map((c) => ({
      nome: c.nome,
      rg: c.rg ?? "",
      rgOrgaoEmissor: c.rgOrgaoEmissor ?? "",
    })),
    dataIso: form.dataIso,
    hora: form.hora,
  };

  if (form.temEmpresaParceira) {
    const colaboradoresParceiros = form.empresaParceiraColaboradores
      .filter(
        (c) =>
          c.nome.trim() &&
          c.tipoDocumento &&
          c.documento.trim()
      )
      .map((c) => ({
        nome: c.nome.trim(),
        tipoDocumento: c.tipoDocumento as "rg" | "cpf",
        documento: c.documento.trim(),
      }));

    input.empresaParceira = {
      nomeEmpresa: form.empresaParceiraNome.trim(),
      trabalho: form.empresaParceiraTrabalho.trim(),
      local: resolveEmpresaParceiraLocalText(
        form.empresaParceiraLocal,
        form.empresaParceiraLocalOutro
      ),
      colaboradores: colaboradoresParceiros,
    };
  }

  return input;
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

  if (form.temEmpresaParceira) {
    if (!form.empresaParceiraNome.trim()) {
      return "Informe o nome da empresa parceira.";
    }
    if (!form.empresaParceiraTrabalho.trim()) {
      return "Informe o trabalho a ser realizado pela empresa parceira.";
    }
    if (!form.empresaParceiraLocal) {
      return "Selecione o local onde o serviço da empresa parceira será realizado.";
    }
    if (
      form.empresaParceiraLocal === "outro" &&
      !form.empresaParceiraLocalOutro.trim()
    ) {
      return "Informe o local onde o serviço da empresa parceira será realizado.";
    }
    const parceirosValidos = form.empresaParceiraColaboradores.filter(
      (c) => c.nome.trim() && c.tipoDocumento && c.documento.trim()
    );
    if (parceirosValidos.length === 0) {
      return "Informe ao menos um colaborador da empresa parceira com nome, tipo de documento (RG ou CPF) e número.";
    }
    for (let i = 0; i < form.empresaParceiraColaboradores.length; i++) {
      const p = form.empresaParceiraColaboradores[i];
      const parcial =
        p.nome.trim() || p.tipoDocumento || p.documento.trim();
      if (!parcial) continue;
      const n = i + 1;
      if (!p.nome.trim()) {
        return `Informe o nome do colaborador ${n} da empresa parceira.`;
      }
      if (!p.tipoDocumento) {
        return `Selecione RG ou CPF do colaborador ${n} da empresa parceira.`;
      }
      if (!p.documento.trim()) {
        return `Informe o ${p.tipoDocumento === "cpf" ? "CPF" : "RG"} do colaborador ${n} da empresa parceira.`;
      }
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

export function novoEmpresaParceiraColaboradorVazio(): EmpresaParceiraColaboradorForm {
  return emptyEmpresaParceiraColaborador();
}

export function missaoInicioFromForm(form: MissaoFormState): {
  dataInicio: string;
  horaInicio: string;
} {
  return { dataInicio: form.dataIso, horaInicio: form.hora };
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
