import type { Missao, MissaoStatus } from "@/lib/types";

export const MISSAO_STATUS_OPCOES: { value: MissaoStatus; label: string }[] = [
  { value: "planejada", label: "Planejada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
];

export type MissaoFormState = {
  titulo: string;
  status: MissaoStatus | "";
  unidadeId: string;
  chamadoId: string;
  colaboradorIds: string[];
};

export function emptyMissaoForm(): MissaoFormState {
  return {
    titulo: "",
    status: "em_andamento",
    unidadeId: "",
    chamadoId: "",
    colaboradorIds: [],
  };
}

export function missaoToForm(m: Missao | null): MissaoFormState {
  if (!m) return emptyMissaoForm();
  return {
    titulo: m.titulo ?? "",
    status: (m.status as MissaoStatus) || "em_andamento",
    unidadeId: m.unidadeId ?? "",
    chamadoId: m.chamadoId ?? "",
    colaboradorIds: m.colaboradorIds ?? [],
  };
}

export function validateMissaoCadastroForm(
  form: MissaoFormState
): string | null {
  if (!form.titulo.trim()) return "Informe o título da missão.";
  if (!form.status) return "Selecione o status.";
  if (!form.unidadeId) return "Selecione a unidade.";
  if (form.colaboradorIds.length === 0) {
    return "Selecione ao menos um colaborador.";
  }
  return null;
}

export function formToMissaoBody(
  form: MissaoFormState
): Omit<Missao, "id" | "createdAt" | "updatedAt"> {
  return {
    titulo: form.titulo.trim(),
    status: form.status as MissaoStatus,
    unidadeId: form.unidadeId,
    chamadoId: form.chamadoId.trim() || undefined,
    colaboradorIds: form.colaboradorIds,
  };
}

export function isAtribuidoMissaoLista(
  colaboradorId: string | undefined,
  missao: Missao
): boolean {
  if (!colaboradorId || !missao.colaboradorIds?.length) return false;
  return missao.colaboradorIds.includes(colaboradorId);
}
