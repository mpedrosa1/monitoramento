export type EscalaTipoPreset = {
  value: string;
  label: string;
  descricao: string;
  /** Sugestão de horários padrão (apenas para pré-preencher o formulário). */
  horaInicio?: string;
  horaFim?: string;
};

export const ESCALA_TIPOS: EscalaTipoPreset[] = [
  {
    value: "12x36",
    label: "12x36",
    descricao: "12 horas de trabalho seguidas de 36 horas de descanso.",
    horaInicio: "07:00",
    horaFim: "19:00",
  },
  {
    value: "24x48",
    label: "24x48",
    descricao: "24 horas de trabalho seguidas de 48 horas de descanso.",
    horaInicio: "08:00",
    horaFim: "08:00",
  },
  {
    value: "5x2",
    label: "5x2",
    descricao: "5 dias de trabalho e 2 de folga (seg. a sex.).",
    horaInicio: "08:00",
    horaFim: "17:00",
  },
  {
    value: "6x1",
    label: "6x1",
    descricao: "6 dias de trabalho e 1 de folga.",
    horaInicio: "08:00",
    horaFim: "16:00",
  },
  {
    value: "personalizada",
    label: "Personalizada",
    descricao: "Defina os horários e a descrição manualmente.",
  },
];

export function labelEscalaTipo(tipo?: string): string {
  if (!tipo?.trim()) return "—";
  return ESCALA_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

export function descricaoEscalaTipo(tipo?: string): string {
  if (!tipo?.trim()) return "";
  return ESCALA_TIPOS.find((t) => t.value === tipo)?.descricao ?? "";
}

/** Paleta de cores sugeridas para diferenciar escalas no calendário. */
export const ESCALA_CORES = [
  "#2563eb",
  "#16a34a",
  "#db2777",
  "#ea580c",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
];
