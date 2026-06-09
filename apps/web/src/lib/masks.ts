/** CPF: 000.000.000-00 */
export function formatCpfInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function cpfDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function isCpfComplete(value: string): boolean {
  return cpfDigits(value).length === 11;
}

/** RG: 00.000.000 ou 00.000.000-0 (último caractere opcional; pode ser X) */
function extractRgChars(value: string): string {
  const upper = value.toUpperCase();
  let result = "";
  for (const ch of upper) {
    if (result.length < 8) {
      if (/\d/.test(ch)) result += ch;
    } else if (result.length === 8 && (/\d/.test(ch) || ch === "X")) {
      result += ch;
      break;
    }
  }
  return result;
}

export function formatRgInput(value: string): string {
  const d = extractRgChars(value);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
}

export function rgDigits(value: string): string {
  return extractRgChars(value);
}

export function isRgComplete(value: string): boolean {
  const chars = extractRgChars(value);
  if (chars.length === 8) return true;
  if (chars.length !== 9) return false;
  const last = chars[8];
  return /\d/.test(last) || last === "X";
}

/** Telefone celular: (00) 00000-0000 */
export function formatTelefoneInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function telefoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function isTelefoneComplete(value: string): boolean {
  const n = telefoneDigits(value).length;
  return n === 10 || n === 11;
}

/** Salário em reais: 1.234,56 */
export function formatSalarioInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const n = Number.parseInt(digits, 10) / 100;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function salarioParaNumero(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number.parseInt(digits, 10) / 100;
}

export function salarioNumeroParaInput(n: number): string {
  if (!n || n <= 0) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
