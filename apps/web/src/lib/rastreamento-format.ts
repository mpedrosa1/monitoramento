export function formatVelocidadeKmH(kmh?: number): string {
  if (kmh == null || Number.isNaN(kmh)) return "—";
  if (kmh < 2) return "Parado";
  return `${Math.round(kmh)} km/h`;
}

export function formatOdometroKm(km?: number): string {
  if (km == null || Number.isNaN(km) || km <= 0) return "—";
  return `${Math.round(km).toLocaleString("pt-BR")} km`;
}
