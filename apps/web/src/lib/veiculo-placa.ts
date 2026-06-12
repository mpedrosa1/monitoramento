/** Remove caracteres não alfanuméricos e normaliza para maiúsculas. */
export function normalizePlaca(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

/** Formata placa para exibição (ABC-1D23 ou ABC-1234). */
export function formatPlaca(value: string): string {
  const p = normalizePlaca(value);
  if (p.length <= 3) return p;
  return `${p.slice(0, 3)}-${p.slice(3)}`;
}

export function isValidPlaca(value: string): boolean {
  const p = normalizePlaca(value);
  return (
    /^[A-Z]{3}[0-9]{4}$/.test(p) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p)
  );
}
