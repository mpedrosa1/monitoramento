import type { UnidadeEndereco } from "./types";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

/** Formata CEP enquanto digita: 00000-000 */
export function formatCepInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function cepDigits(cep: string): string {
  return cep.replace(/\D/g, "");
}

export function isCepComplete(cep: string): boolean {
  return cepDigits(cep).length === 8;
}

/**
 * Consulta endereço na API pública ViaCEP (https://viacep.com.br).
 * Retorna null se o CEP não existir.
 */
export async function buscarEnderecoPorCep(
  cep: string
): Promise<Partial<UnidadeEndereco> | null> {
  const digits = cepDigits(cep);
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) {
    throw new Error("Falha ao consultar o CEP");
  }

  const data = (await res.json()) as ViaCepResponse;
  if (data.erro) return null;

  return {
    cep: formatCepInput(digits),
    logradouro: data.logradouro?.trim() ?? "",
    bairro: data.bairro?.trim() ?? "",
    cidade: data.localidade?.trim() ?? "",
    estado: (data.uf?.trim() ?? "").toUpperCase(),
    complemento: data.complemento?.trim() ?? "",
  };
}

/** Mescla dados da ViaCEP; mantém número e complemento já preenchido pelo usuário. */
export function mergeEnderecoViaCep(
  atual: UnidadeEndereco,
  fromApi: Partial<UnidadeEndereco>
): UnidadeEndereco {
  return {
    ...atual,
    cep: fromApi.cep ?? atual.cep,
    logradouro: fromApi.logradouro || atual.logradouro,
    bairro: fromApi.bairro || atual.bairro,
    cidade: fromApi.cidade || atual.cidade,
    estado: (fromApi.estado || atual.estado).toUpperCase(),
    complemento: atual.complemento.trim() || fromApi.complemento || "",
  };
}
