import type { Colaborador, Sobreaviso } from "@/lib/types";

/**
 * Cálculo da folha de pagamento (prévia "até a presente data").
 *
 * Regras adotadas:
 * - Periculosidade de 30% sobre o salário-base (todos os colaboradores).
 * - Salário e periculosidade proporcionais aos dias decorridos no mês.
 * - Sobreaviso: 1/3 da hora normal, com hora normal = (salário + periculosidade) / 220.
 * - Descontos: INSS e IRRF (tabelas progressivas oficiais) + convênio médico.
 *
 * As tabelas de INSS/IRRF são referência de 2025 — revise anualmente.
 */

export const PERICULOSIDADE_PCT = 0.3;
export const HORAS_MENSAIS = 220;
export const FATOR_SOBREAVISO = 1 / 3;

/** Ano de referência das tabelas de INSS/IRRF abaixo. */
export const TABELAS_ANO_REFERENCIA = 2025;

/** INSS — faixas progressivas (empregado), 2025. */
const INSS_FAIXAS: { ate: number; aliquota: number }[] = [
  { ate: 1518.0, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

const IRRF_DEDUCAO_DEPENDENTE = 189.59;

/** IRRF — faixas mensais (base após INSS e dependentes), 2025. */
const IRRF_FAIXAS: { ate: number; aliquota: number; deducao: number }[] = [
  { ate: 2259.2, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Number.POSITIVE_INFINITY, aliquota: 0.275, deducao: 896.0 },
];

function arredondar(v: number): number {
  return Math.round(v * 100) / 100;
}

/** INSS progressivo sobre a base de contribuição (limitado ao teto). */
export function calcularINSS(base: number): number {
  if (base <= 0) return 0;
  let inss = 0;
  let anterior = 0;
  for (const faixa of INSS_FAIXAS) {
    if (base <= anterior) break;
    const trecho = Math.min(base, faixa.ate) - anterior;
    inss += trecho * faixa.aliquota;
    anterior = faixa.ate;
  }
  return arredondar(inss);
}

/** IRRF sobre (proventos tributáveis − INSS − dependentes). */
export function calcularIRRF(
  proventosTributaveis: number,
  inss: number,
  numDependentes: number
): number {
  const base =
    proventosTributaveis - inss - numDependentes * IRRF_DEDUCAO_DEPENDENTE;
  if (base <= 0) return 0;
  const faixa = IRRF_FAIXAS.find((f) => base <= f.ate) ?? IRRF_FAIXAS.at(-1)!;
  return arredondar(Math.max(0, base * faixa.aliquota - faixa.deducao));
}

/**
 * Horas de sobreaviso por colaborador no mês, considerando apenas a parte do
 * período entre o início do mês e `ate` (para refletir "até a presente data").
 */
export function horasSobreavisoPorColaborador(
  sobreavisos: Sobreaviso[],
  ano: number,
  mes: number,
  ate: Date
): Map<string, number> {
  const inicioMes = new Date(ano, mes - 1, 1, 0, 0, 0).getTime();
  const fimMes = new Date(ano, mes, 1, 0, 0, 0).getTime();
  const limite = Math.min(ate.getTime(), fimMes);
  const acc = new Map<string, number>();

  for (const s of sobreavisos) {
    const inicio = new Date(
      `${s.dataInicio}T${s.horaInicio || "00:00"}:00`
    ).getTime();
    const fim = new Date(`${s.dataFim}T${s.horaFim || "23:59"}:00`).getTime();
    if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) continue;

    const overlapInicio = Math.max(inicio, inicioMes);
    const overlapFim = Math.min(fim, limite);
    if (overlapFim <= overlapInicio) continue;

    const horas = (overlapFim - overlapInicio) / 3_600_000;
    acc.set(s.colaboradorId, (acc.get(s.colaboradorId) ?? 0) + horas);
  }
  return acc;
}

/** Dependentes considerados para a dedução do IRRF. */
export function numDependentesIRRF(c: Colaborador): number {
  return (c.dependentes?.length ?? 0) + (c.conjugeDependente ? 1 : 0);
}

export interface FolhaProventos {
  salario: number;
  periculosidade: number;
  sobreaviso: number;
  total: number;
}

export interface FolhaDescontos {
  inss: number;
  irrf: number;
  convenio: number;
  total: number;
}

export interface FolhaColaborador {
  colaborador: Colaborador;
  horasSobreaviso: number;
  proventos: FolhaProventos;
  descontos: FolhaDescontos;
  liquido: number;
}

/** Monta o demonstrativo de folha de um colaborador. */
export function montarFolhaColaborador(
  c: Colaborador,
  fator: number,
  horasSobreaviso: number,
  convenioDesconto: number
): FolhaColaborador {
  const salarioBase = c.salario ?? 0;
  const periculosidadeCheia = salarioBase * PERICULOSIDADE_PCT;

  // Hora normal usa a base mensal cheia (salário + periculosidade).
  const valorHora =
    HORAS_MENSAIS > 0 ? (salarioBase + periculosidadeCheia) / HORAS_MENSAIS : 0;
  const sobreaviso = arredondar(
    horasSobreaviso * valorHora * FATOR_SOBREAVISO
  );

  const salario = arredondar(salarioBase * fator);
  const periculosidade = arredondar(periculosidadeCheia * fator);
  const totalProventos = arredondar(salario + periculosidade + sobreaviso);

  const inss = calcularINSS(totalProventos);
  const irrf = calcularIRRF(totalProventos, inss, numDependentesIRRF(c));
  const convenio = arredondar(convenioDesconto);
  const totalDescontos = arredondar(inss + irrf + convenio);

  return {
    colaborador: c,
    horasSobreaviso,
    proventos: {
      salario,
      periculosidade,
      sobreaviso,
      total: totalProventos,
    },
    descontos: { inss, irrf, convenio, total: totalDescontos },
    liquido: arredondar(totalProventos - totalDescontos),
  };
}

/** Fator de proporcionalidade do mês (1 = mês passado/cheio; parcial = mês atual). */
export function fatorProporcional(ano: number, mes: number, hoje: Date): number {
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const anoMesSelecionado = ano * 12 + (mes - 1);
  const anoMesHoje = hoje.getFullYear() * 12 + hoje.getMonth();
  if (anoMesSelecionado < anoMesHoje) return 1; // mês já encerrado
  if (anoMesSelecionado > anoMesHoje) return 0; // mês futuro
  return Math.min(hoje.getDate(), diasNoMes) / diasNoMes; // mês corrente
}

export function formatarHorasSobreaviso(horas: number): string {
  const totalMin = Math.round(horas * 60);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (min === 0) return `${h}h`;
  return `${h}h${String(min).padStart(2, "0")}`;
}
