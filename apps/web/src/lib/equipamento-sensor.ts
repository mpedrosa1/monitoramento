const TIPOS_SENSOR_LEGADOS = [
  { value: "temperatura", label: "Temperatura" },
  { value: "pressao", label: "Pressão" },
  { value: "tensao", label: "Tensão" },
  { value: "umidade", label: "Umidade" },
  { value: "corrente", label: "Corrente" },
] as const;

export function labelTipoSensor(tipo?: string): string {
  if (!tipo?.trim()) return "—";
  const found = TIPOS_SENSOR_LEGADOS.find((o) => o.value === tipo);
  return found?.label ?? tipo;
}
