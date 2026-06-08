import { agoraHora, hojeIso, isoParaDataBR } from "./chamado-email";
import type { Missao } from "./types";

export type MissaoConclusaoFormState = {
  dataIso: string;
  hora: string;
  relatorio: string;
};

export function emptyMissaoConclusaoForm(
  dataIso = hojeIso(),
  hora = agoraHora()
): MissaoConclusaoFormState {
  return {
    dataIso,
    hora,
    relatorio: "",
  };
}

export function validateMissaoConclusaoForm(
  form: MissaoConclusaoFormState,
  usuarioNome: string | undefined
): string | null {
  if (!usuarioNome?.trim()) {
    return "Não foi possível identificar seu usuário. Faça login novamente.";
  }
  if (!form.dataIso) return "Informe a data de conclusão.";
  if (!form.hora) return "Informe a hora de conclusão.";
  if (!form.relatorio.trim()) {
    return "Informe o relatório de conclusão.";
  }
  return null;
}

export function concluirMissaoBody(form: MissaoConclusaoFormState) {
  return {
    dataConclusao: form.dataIso,
    horaConclusao: form.hora,
    relatorioConclusao: form.relatorio.trim(),
  };
}

export function formatConclusaoMissao(missao: Missao): string {
  const parts: string[] = [];
  if (missao.concluidaPor) parts.push(`Por: ${missao.concluidaPor}`);
  if (missao.dataConclusao) {
    parts.push(
      `Data: ${isoParaDataBR(missao.dataConclusao)}${missao.horaConclusao ? `, ${missao.horaConclusao}` : ""}`
    );
  }
  if (missao.relatorioConclusao) {
    parts.push(`Relatório:\n${missao.relatorioConclusao}`);
  }
  return parts.join("\n\n");
}
