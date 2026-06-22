import type { Veiculo } from "@/lib/types";

export type VeiculoComSyncRotaExata = Veiculo & {
  rotaExataSyncWarning?: string;
};

export type TrocaAdminComSyncRotaExata = {
  veiculoA: Veiculo;
  veiculoB: Veiculo;
  rotaExataSyncWarnings?: string[];
};

export function alertaAvisoSyncRotaExata(
  avisos: string | string[] | undefined,
  mensagemOk?: string
) {
  const lista = (Array.isArray(avisos) ? avisos : avisos ? [avisos] : [])
    .map((item) => item.trim())
    .filter(Boolean);

  if (lista.length > 0) {
    window.alert(
      `Alteração salva no sistema, porém:\n\n${lista.join("\n\n")}`
    );
    return;
  }

  if (mensagemOk) {
    window.alert(mensagemOk);
  }
}
