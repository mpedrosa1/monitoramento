import type { Colaborador, FaixaConvenioMedico } from "@/lib/types";

/**
 * Regras do convênio médico (UNIMED):
 * - O titular não paga (a empresa custeia); o dependente paga 25% da
 *   mensalidade, que corresponde à coluna `descontoFolha` de cada faixa.
 * - As faixas etárias são cadastradas pelo administrador no próprio sistema
 *   (persistidas no banco). Idades sem faixa cadastrada são sinalizadas.
 */

/** Percentual pago pelo dependente — usado como padrão ao cadastrar faixas. */
export const PERCENTUAL_DEPENDENTE = 0.25;

/** Idade em anos completos a partir de uma data ISO (yyyy-mm-dd). */
export function idadeEmAnos(
  dataNascimento?: string,
  ref: Date = new Date()
): number | null {
  if (!dataNascimento?.trim()) return null;
  const [ano, mes, dia] = dataNascimento
    .split("-")
    .map((p) => Number.parseInt(p, 10));
  if (!ano || !mes || !dia) return null;
  let idade = ref.getFullYear() - ano;
  const mesRef = ref.getMonth() + 1;
  if (mesRef < mes || (mesRef === mes && ref.getDate() < dia)) idade -= 1;
  return idade < 0 ? null : idade;
}

/** `true` quando a faixa não tem limite superior (ex.: 59+). */
export function faixaSemTeto(f: FaixaConvenioMedico): boolean {
  return f.idadeMax <= 0;
}

/** Rótulo curto da faixa (ex.: "19–23" ou "59+"). */
export function faixaLabel(f: FaixaConvenioMedico): string {
  return faixaSemTeto(f) ? `${f.idadeMin}+` : `${f.idadeMin}–${f.idadeMax}`;
}

/** Faixa correspondente à idade, ou `null` quando não há faixa cadastrada. */
export function faixaPorIdade(
  idade: number | null,
  faixas: FaixaConvenioMedico[]
): FaixaConvenioMedico | null {
  if (idade == null || idade < 0) return null;
  return (
    faixas.find(
      (f) =>
        idade >= f.idadeMin && (faixaSemTeto(f) || idade <= f.idadeMax)
    ) ?? null
  );
}

export type ParentescoConvenio = "titular" | "conjuge" | "dependente";

export interface PessoaConvenio {
  nome: string;
  parentesco: ParentescoConvenio;
  idade: number | null;
  faixa: FaixaConvenioMedico | null;
  /** Mensalidade cheia da pessoa (0 quando a faixa é desconhecida). */
  valorPlano: number;
  /** Descontado na folha — titular sempre 0; dependente = descontoFolha. */
  descontoFolha: number;
  /** `true` quando não há data de nascimento ou a faixa não está cadastrada. */
  semFaixa: boolean;
}

export interface ConvenioColaborador {
  colaborador: Colaborador;
  /** Titular + dependentes, nessa ordem. */
  pessoas: PessoaConvenio[];
  totalDependentes: number;
  /** Mensalidade total da família (inclui o titular). */
  valorPlanoFamilia: number;
  /** Total descontado na folha do colaborador (somatório dos dependentes). */
  descontoFolhaFamilia: number;
  /** Quantas pessoas ficaram sem faixa (idade fora da tabela ou sem data). */
  pendencias: number;
}

/** Monta o quadro do convênio (titular + dependentes) de um colaborador. */
export function montarConvenioColaborador(
  c: Colaborador,
  faixas: FaixaConvenioMedico[],
  ref: Date = new Date()
): ConvenioColaborador {
  const pessoas: PessoaConvenio[] = [];

  // Titular — não paga (desconto 0), mas exibe a mensalidade cheia pela idade.
  const idadeTitular = idadeEmAnos(c.dataNascimento, ref);
  const faixaTitular = faixaPorIdade(idadeTitular, faixas);
  pessoas.push({
    nome: c.nome,
    parentesco: "titular",
    idade: idadeTitular,
    faixa: faixaTitular,
    valorPlano: faixaTitular?.valor ?? 0,
    descontoFolha: 0,
    semFaixa: faixaTitular == null,
  });

  // Cônjuge — somente quando marcado como dependente no cadastro.
  if (c.conjugeDependente && (c.conjuge?.trim() || c.conjugeDataNascimento)) {
    const idadeConjuge = idadeEmAnos(c.conjugeDataNascimento, ref);
    const faixaConjuge = faixaPorIdade(idadeConjuge, faixas);
    pessoas.push({
      nome: c.conjuge?.trim() || "Cônjuge",
      parentesco: "conjuge",
      idade: idadeConjuge,
      faixa: faixaConjuge,
      valorPlano: faixaConjuge?.valor ?? 0,
      descontoFolha: faixaConjuge?.descontoFolha ?? 0,
      semFaixa: faixaConjuge == null,
    });
  }

  // Demais dependentes.
  for (const d of c.dependentes ?? []) {
    const idadeDep = idadeEmAnos(d.dataNascimento, ref);
    const faixaDep = faixaPorIdade(idadeDep, faixas);
    pessoas.push({
      nome: d.nome?.trim() || "Dependente",
      parentesco: "dependente",
      idade: idadeDep,
      faixa: faixaDep,
      valorPlano: faixaDep?.valor ?? 0,
      descontoFolha: faixaDep?.descontoFolha ?? 0,
      semFaixa: faixaDep == null,
    });
  }

  const dependentes = pessoas.filter((p) => p.parentesco !== "titular");

  return {
    colaborador: c,
    pessoas,
    totalDependentes: dependentes.length,
    valorPlanoFamilia: pessoas.reduce((s, p) => s + p.valorPlano, 0),
    descontoFolhaFamilia: dependentes.reduce((s, p) => s + p.descontoFolha, 0),
    pendencias: pessoas.filter((p) => p.semFaixa).length,
  };
}

const PARENTESCO_LABEL: Record<ParentescoConvenio, string> = {
  titular: "Titular",
  conjuge: "Cônjuge",
  dependente: "Dependente",
};

export function parentescoLabel(p: ParentescoConvenio): string {
  return PARENTESCO_LABEL[p];
}

/** Formata um valor em reais (R$ 1.234,56). */
export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
