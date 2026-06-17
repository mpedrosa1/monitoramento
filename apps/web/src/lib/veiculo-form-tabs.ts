export type VeiculoFormTab =
  | "identificacao"
  | "documentacao"
  | "locacao"
  | "condutores";

export function tabFromVeiculoFormError(message: string): VeiculoFormTab {
  const texto = message.toLowerCase();
  if (texto.includes("locadora") || texto.includes("aluguel") || texto.includes("devolução") || texto.includes("contrato") || texto.includes("locação")) return "locacao";
  if (texto.includes("motorista") || texto.includes("colaborador") || texto.includes("condutor")) {
    return "condutores";
  }
  if (
    texto.includes("renavam") ||
    texto.includes("chassi") ||
    texto.includes("ano")
  ) {
    return "documentacao";
  }
  return "identificacao";
}
