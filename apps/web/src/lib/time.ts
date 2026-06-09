/** Formata digitação para HH:mm (24h). */
export function formatHora24Input(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Normaliza hora para HH:mm (24h) ou null se inválida. */
export function normalizeHora24(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isHora24Complete(value: string): boolean {
  return normalizeHora24(value) !== null;
}

/** Exibe data/hora ISO em pt-BR, sempre com horário em 24h. */
export function formatDateTimeBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
