import type { AppTransporte, CategoriaDespesa, ModalidadeDespesa } from "@/lib/types";
import { formatPlaca } from "@/lib/veiculo-placa";

export const MODALIDADE_DESPESA_OPCOES: {
  value: ModalidadeDespesa;
  label: string;
  descricao: string;
}[] = [
  {
    value: "mobilidade",
    label: "Mobilidade",
    descricao: "Combustível e transporte por aplicativo",
  },
  {
    value: "livre",
    label: "Livre",
    descricao:
      "Ferramentas, materiais elétricos, consumíveis e material de escritório",
  },
];

export const CATEGORIA_DESPESA_OPCOES: {
  value: CategoriaDespesa;
  modalidade: ModalidadeDespesa;
  label: string;
}[] = [
  { value: "combustivel", modalidade: "mobilidade", label: "Combustível" },
  {
    value: "transporte_app",
    modalidade: "mobilidade",
    label: "Transporte por aplicativo",
  },
  { value: "ferramentas", modalidade: "livre", label: "Ferramentas" },
  {
    value: "materiais",
    modalidade: "livre",
    label: "Materiais (elétricos, etc.)",
  },
  {
    value: "consumiveis",
    modalidade: "livre",
    label: "Consumíveis (Café, água, etc.)",
  },
];

export function labelModalidadeDespesa(m: ModalidadeDespesa): string {
  return MODALIDADE_DESPESA_OPCOES.find((o) => o.value === m)?.label ?? m;
}

export function labelCategoriaDespesa(c: CategoriaDespesa): string {
  return CATEGORIA_DESPESA_OPCOES.find((o) => o.value === c)?.label ?? c;
}

export function categoriasPorModalidade(
  modalidade: ModalidadeDespesa
): typeof CATEGORIA_DESPESA_OPCOES {
  return CATEGORIA_DESPESA_OPCOES.filter((o) => o.modalidade === modalidade);
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export const APP_TRANSPORTE_OPCOES: {
  value: AppTransporte;
  label: string;
}[] = [
  { value: "uber", label: "Uber" },
  { value: "99", label: "99" },
  { value: "indrive", label: "InDrive" },
  { value: "outro", label: "Outro" },
];

export function labelAppTransporte(app?: AppTransporte, outro?: string): string {
  if (!app) return "—";
  if (app === "outro") return outro?.trim() || "Outro";
  return APP_TRANSPORTE_OPCOES.find((o) => o.value === app)?.label ?? app;
}

export function formatarDataDespesaBr(value: string): string {
  const [a, m, d] = value.split("-");
  if (a && m && d) return `${d}/${m}/${a}`;
  return value;
}

export function detalhesDespesaTexto(d: {
  descricao?: string;
  categoria: CategoriaDespesa;
  hora?: string;
  placa?: string;
  hodometro?: number;
  veiculoPessoal?: boolean;
  appTransporte?: AppTransporte;
  appTransporteOutro?: string;
}): string {
  const partes: string[] = [];
  if (d.descricao?.trim()) partes.push(d.descricao.trim());
  if (d.categoria === "combustivel") {
    if (d.hora) partes.push(d.hora);
    if (d.placa) partes.push(formatPlaca(d.placa));
    if (d.hodometro) partes.push(`${d.hodometro} km`);
    if (d.veiculoPessoal) partes.push("Veículo pessoal");
  }
  if (d.categoria === "transporte_app") {
    partes.push(labelAppTransporte(d.appTransporte, d.appTransporteOutro));
  }
  return partes.length ? partes.join(" · ") : "—";
}
