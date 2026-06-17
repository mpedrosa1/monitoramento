import type { Veiculo } from "@/lib/types";
import {
  salarioNumeroParaInput,
  salarioParaNumero,
} from "@/lib/masks";
import {
  locadoraFromStored,
  locadoraToStored,
  type LocadoraVeiculoValue,
} from "@/lib/veiculo-locadora";
import { isValidPlaca, normalizePlaca } from "@/lib/veiculo-placa";
import { VEICULO_FOTO_PADRAO } from "@/lib/veiculo-imagem";

export type VeiculoFormState = {
  placa: string;
  marca: string;
  modelo: string;
  anoFabricacao: string;
  anoModelo: string;
  cor: string;
  chassi: string;
  renavam: string;
  kmAtual: string;
  fotoUrl: string;
  colaboradorId: string;
  locadora: LocadoraVeiculoValue | "";
  locadoraOutra: string;
  numeroContrato: string;
  valorAluguel: string;
  dataLocacao: string;
  contratoUrl: string;
  mostrarDevolucao: boolean;
  dataDevolucao: string;
  horaDevolucao: string;
  colaboradoresAdicionaisIds: string[];
};

export function veiculoToForm(v: Veiculo | null): VeiculoFormState {
  if (!v) return emptyVeiculoForm();
  const { locadora, locadoraOutra } = locadoraFromStored(v.locadora);
  return {
    placa: v.placa ?? "",
    marca: v.marca ?? "",
    modelo: v.modelo ?? "",
    anoFabricacao: v.anoFabricacao ? String(v.anoFabricacao) : "",
    anoModelo: v.anoModelo ? String(v.anoModelo) : "",
    cor: v.cor ?? "",
    chassi: v.chassi ?? "",
    renavam: v.renavam ?? "",
    kmAtual:
      v.kmAtual !== undefined && v.kmAtual !== null ? String(v.kmAtual) : "",
    fotoUrl: v.fotoUrl?.trim() || VEICULO_FOTO_PADRAO,
    colaboradorId: v.colaboradorId ?? "",
    locadora,
    locadoraOutra,
    numeroContrato: v.numeroContrato ?? "",
    valorAluguel:
      v.valorAluguel != null && v.valorAluguel > 0
        ? salarioNumeroParaInput(v.valorAluguel)
        : "",
    dataLocacao: v.dataLocacao ?? "",
    contratoUrl: v.contratoUrl ?? "",
    mostrarDevolucao: Boolean(v.dataDevolucao?.trim()),
    dataDevolucao: v.dataDevolucao ?? "",
    horaDevolucao: v.horaDevolucao ?? "",
    colaboradoresAdicionaisIds: [...(v.colaboradoresAdicionaisIds ?? [])],
  };
}

export const emptyVeiculoForm = (): VeiculoFormState => ({
  placa: "",
  marca: "",
  modelo: "",
  anoFabricacao: "",
  anoModelo: "",
  cor: "",
  chassi: "",
  renavam: "",
  kmAtual: "",
  fotoUrl: VEICULO_FOTO_PADRAO,
  colaboradorId: "",
  locadora: "",
  locadoraOutra: "",
  numeroContrato: "",
  valorAluguel: "",
  dataLocacao: "",
  contratoUrl: "",
  mostrarDevolucao: false,
  dataDevolucao: "",
  horaDevolucao: "",
  colaboradoresAdicionaisIds: [],
});

export function formToVeiculoBody(form: VeiculoFormState) {
  const anoFab = Number.parseInt(form.anoFabricacao, 10);
  const anoMod = Number.parseInt(form.anoModelo, 10);
  const adicionais = form.colaboradoresAdicionaisIds.filter((id) => id.trim());
  return {
    placa: normalizePlaca(form.placa),
    marca: form.marca.trim(),
    modelo: form.modelo.trim(),
    anoFabricacao: Number.isFinite(anoFab) && anoFab > 0 ? anoFab : undefined,
    anoModelo: Number.isFinite(anoMod) && anoMod > 0 ? anoMod : undefined,
    cor: form.cor.trim() || undefined,
    chassi: form.chassi.trim() || undefined,
    renavam: form.renavam.trim() || undefined,
    kmAtual: parseKmAtual(form.kmAtual),
    fotoUrl: form.fotoUrl.trim() || VEICULO_FOTO_PADRAO,
    colaboradorId: form.colaboradorId,
    locadora: locadoraToStored(form.locadora, form.locadoraOutra) ?? "",
    numeroContrato: form.numeroContrato.trim(),
    valorAluguel: form.valorAluguel.trim()
      ? salarioParaNumero(form.valorAluguel)
      : 0,
    dataLocacao: form.dataLocacao.trim() || undefined,
    contratoUrl: form.contratoUrl.trim() || undefined,
    dataDevolucao:
      form.mostrarDevolucao && form.dataDevolucao.trim()
        ? form.dataDevolucao.trim()
        : undefined,
    horaDevolucao:
      form.mostrarDevolucao && form.horaDevolucao.trim()
        ? form.horaDevolucao.trim()
        : undefined,
    colaboradoresAdicionaisIds: adicionais,
  };
}

function parseKmAtual(value: string): number {
  const digits = value.replace(/\D/g, "");
  const km = Number.parseInt(digits, 10);
  return Number.isFinite(km) && km >= 0 ? km : -1;
}

export function validateVeiculoForm(form: VeiculoFormState): string | null {
  const placa = normalizePlaca(form.placa);
  if (!placa) return "Informe a placa do veículo.";
  if (!isValidPlaca(placa)) return "Placa inválida.";
  if (!form.marca.trim()) return "Informe a marca do veículo.";
  if (!form.modelo.trim()) return "Informe o modelo do veículo.";
  if (form.kmAtual.trim() === "") return "Informe o KM atual do veículo.";
  if (parseKmAtual(form.kmAtual) < 0) return "KM atual inválido.";
  if (!form.colaboradorId.trim()) return "Selecione o motorista atual.";
  if (form.locadora === "outra" && !form.locadoraOutra.trim()) {
    return "Informe o nome da locadora.";
  }
  if (form.valorAluguel.trim() && salarioParaNumero(form.valorAluguel) < 0) {
    return "Valor do aluguel inválido.";
  }
  if (form.mostrarDevolucao) {
    if (!form.dataDevolucao.trim()) {
      return "Informe a data da devolução do veículo.";
    }
    if (!form.horaDevolucao.trim()) {
      return "Informe a hora da devolução do veículo.";
    }
  }
  return null;
}

export function veiculoRotulo(v: Veiculo): string {
  return `${v.marca} ${v.modelo}`.trim();
}
