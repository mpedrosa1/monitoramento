export const LOCADORAS_VEICULO = [
  { value: "localiza", label: "Localiza" },
  { value: "movida", label: "Movida" },
  { value: "unidas", label: "Unidas" },
  { value: "outra", label: "Outra" },
] as const;

export type LocadoraVeiculoValue = (typeof LOCADORAS_VEICULO)[number]["value"];

export function locadoraFromStored(stored?: string): {
  locadora: LocadoraVeiculoValue | "";
  locadoraOutra: string;
} {
  const texto = stored?.trim() ?? "";
  if (!texto) return { locadora: "", locadoraOutra: "" };
  const match = LOCADORAS_VEICULO.find(
    (l) =>
      l.value === texto.toLowerCase() ||
      l.label.toLowerCase() === texto.toLowerCase()
  );
  if (match && match.value !== "outra") {
    return { locadora: match.value, locadoraOutra: "" };
  }
  return { locadora: "outra", locadoraOutra: texto };
}

export function locadoraToStored(
  locadora: LocadoraVeiculoValue | "",
  locadoraOutra: string
): string | undefined {
  if (!locadora) return undefined;
  if (locadora === "outra") {
    const texto = locadoraOutra.trim();
    return texto || undefined;
  }
  return LOCADORAS_VEICULO.find((l) => l.value === locadora)?.label;
}

export function locadoraRotulo(stored?: string): string | undefined {
  const texto = stored?.trim();
  if (!texto) return undefined;
  const match = LOCADORAS_VEICULO.find(
    (l) =>
      l.value === texto.toLowerCase() ||
      l.label.toLowerCase() === texto.toLowerCase()
  );
  return match?.label ?? texto;
}
