/** Remove caracteres não alfanuméricos e normaliza para maiúsculas. */
export function normalizePlaca(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

/** Formata placa para exibição (sem hífen: ABC1D23 ou ABC1234). */
export function formatPlaca(value: string): string {
  return normalizePlaca(value);
}

export function isValidPlaca(value: string): boolean {
  const p = normalizePlaca(value);
  return (
    /^[A-Z]{3}[0-9]{4}$/.test(p) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p)
  );
}

/** Placa no padrão Mercosul (ABC1D23). */
export function isPlacaMercosul(value: string): boolean {
  const p = normalizePlaca(value);
  return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p);
}
