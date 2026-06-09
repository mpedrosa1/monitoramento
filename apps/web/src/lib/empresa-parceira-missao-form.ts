export type EmpresaParceiraLocal = "sala_nobreaks" | "outro" | "";

export type EmpresaParceiraDocumentoTipo = "rg" | "cpf" | "";

export type EmpresaParceiraColaboradorForm = {
  localId: string;
  nome: string;
  tipoDocumento: EmpresaParceiraDocumentoTipo;
  documento: string;
};

export const EMPRESA_PARCEIRA_DOCUMENTO_OPCOES: {
  value: Exclude<EmpresaParceiraDocumentoTipo, "">;
  label: string;
}[] = [
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
];

export const EMPRESA_PARCEIRA_LOCAL_OPCOES: {
  value: Exclude<EmpresaParceiraLocal, "">;
  label: string;
}[] = [
  { value: "sala_nobreaks", label: "Na sala de nobreaks" },
  { value: "outro", label: "Outro" },
];

let parceiroSeq = 0;

export function novoEmpresaParceiraColaboradorLocalId(): string {
  parceiroSeq += 1;
  return `parceiro-${parceiroSeq}`;
}

export function emptyEmpresaParceiraColaborador(): EmpresaParceiraColaboradorForm {
  return {
    localId: novoEmpresaParceiraColaboradorLocalId(),
    nome: "",
    tipoDocumento: "",
    documento: "",
  };
}

export function resolveEmpresaParceiraLocalText(
  local: EmpresaParceiraLocal,
  localOutro: string
): string {
  if (local === "sala_nobreaks") return "Na sala de nobreaks";
  if (local === "outro") return localOutro.trim();
  return "";
}
