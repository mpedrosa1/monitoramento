import type { Veiculo } from "@/lib/types";
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
};

export function veiculoToForm(v: Veiculo | null): VeiculoFormState {
  if (!v) return emptyVeiculoForm();
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
});

export function formToVeiculoBody(form: VeiculoFormState) {
  const anoFab = Number.parseInt(form.anoFabricacao, 10);
  const anoMod = Number.parseInt(form.anoModelo, 10);
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
  if (!form.colaboradorId.trim()) return "Selecione o colaborador responsável.";
  return null;
}

export function veiculoRotulo(v: Veiculo): string {
  return `${v.marca} ${v.modelo}`.trim();
}
