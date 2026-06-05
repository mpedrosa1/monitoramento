export const SINAIS_OPCOES = ["TIM", "Claro", "Vivo", "Wi-Fi", "Outros"] as const;
export const COMUNICACAO_OPCOES = [
  "Não completou ligação",
  "Completou ligação",
  "Enviou SMS",
  "Acessou dados",
  "Outros",
] as const;

export type SinalOpcao = (typeof SINAIS_OPCOES)[number];
export type ComunicacaoOpcao = (typeof COMUNICACAO_OPCOES)[number];

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/** Lista em português: "A, B e C". */
export function formatListPT(items: string[]): string {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} e ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} e ${clean[clean.length - 1]}`;
}

export function saudacaoPorHora(hora: string): string {
  const h = Number.parseInt(hora.split(":")[0] ?? "12", 10);
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Converte YYYY-MM-DD → DD/MM/AAAA */
export function isoParaDataBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Converte YYYY-MM-DD → "05 Jun" */
export function isoParaDataEmail(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const dia = Number.parseInt(m[3], 10);
  const mes = Number.parseInt(m[2], 10) - 1;
  const dd = String(dia).padStart(2, "0");
  return `${dd} ${MESES_ABREV[mes] ?? m[2]}`;
}

export function hojeIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function agoraHora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function sanitizeNumeroChamado(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

/** Número do chamado sempre com 6 dígitos (ex.: 101 → 000101). */
export function normalizeNumeroChamado(raw: string): string {
  const n = sanitizeNumeroChamado(raw);
  return n ? n.padStart(6, "0") : "";
}

export function formatNumeroExibicao(numero: string): string {
  const n = sanitizeNumeroChamado(numero);
  return n ? `#${n.padStart(6, "0")}` : "#000000";
}

function resolverOutros(
  selecionados: string[],
  outrosTexto: string,
  labelOutros: string
): string[] {
  return selecionados.map((item) =>
    item === labelOutros && outrosTexto.trim()
      ? outrosTexto.trim()
      : item
  );
}

export type ChamadoEmailInput = {
  unidadeNome: string;
  numero: string;
  dataIso: string;
  hora: string;
  abertoPor: string;
  sinais: string[];
  sinaisOutros: string;
  locaisAfetados: string;
  comunicacao: string[];
  comunicacaoOutros: string;
};

export function buildEmailAssunto(input: ChamadoEmailInput): string {
  const dataBR = isoParaDataBR(input.dataIso);
  const num = formatNumeroExibicao(input.numero);
  const assunto = `MMRTEC - SAPSP ${input.unidadeNome.trim()} - ABERTURA DE CHAMADO - ${num} - ${dataBR} - ${input.hora}`;
  return assunto.toLocaleUpperCase("pt-BR");
}

export function buildEmailCorpo(input: ChamadoEmailInput): string {
  const saudacao = saudacaoPorHora(input.hora);
  const dataLinha = isoParaDataEmail(input.dataIso);
  const sinais = formatListPT(
    resolverOutros(input.sinais, input.sinaisOutros, "Outros")
  );
  const comunicacao = formatListPT(
    resolverOutros(input.comunicacao, input.comunicacaoOutros, "Outros")
  );

  const partesDesc: string[] = [];
  if (sinais) {
    partesDesc.push(`Informado barras de sinal ${sinais}`);
  }
  const locais = input.locaisAfetados.trim();
  if (locais) partesDesc.push(locais);
  if (comunicacao) partesDesc.push(comunicacao);

  const descricao =
    partesDesc.length > 0
      ? partesDesc.map((p) => (p.endsWith(".") ? p : `${p}.`)).join(" ")
      : "Sem detalhes adicionais.";

  return `Fábio,
${saudacao}!

Segue registro de abertura de chamado.

Contato: ${input.abertoPor.trim() || "—"}
Data/hora: ${dataLinha}, ${input.hora}
Descrição do chamado: ${descricao}`;
}
