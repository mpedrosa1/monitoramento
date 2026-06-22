"use client";

import { Marker } from "react-leaflet";
import { COLABORADOR_AVATAR_PADRAO } from "@/lib/colaborador-avatar";
import type { Colaborador, Veiculo, VeiculoPosicao } from "@/lib/types";
import { veiculoMapIcon } from "@/lib/veiculo-map-icon";

export function PainelVeiculosMapMarkers({
  posicoes,
  veiculos,
  colaboradores,
  mostrarInfoVeiculos = true,
  veiculoSelecionadoId = null,
  onSelecionarVeiculo,
}: {
  posicoes: VeiculoPosicao[];
  veiculos: Veiculo[];
  colaboradores: Colaborador[];
  mostrarInfoVeiculos?: boolean;
  veiculoSelecionadoId?: string | null;
  onSelecionarVeiculo?: (veiculoId: string) => void;
}) {
  const veiculoPorId = new Map(veiculos.map((v) => [v.id, v]));
  const colaboradorPorId = new Map(colaboradores.map((c) => [c.id, c]));

  return (
    <>
      {posicoes.map((p) => {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
        const veiculo = veiculoPorId.get(p.veiculoId);
        const motorista = veiculo
          ? colaboradorPorId.get(veiculo.colaboradorId)
          : undefined;
        const moving = (p.velocidadeKm ?? 0) >= 2;
        const motoristaFoto =
          motorista?.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO;
        const selecionado = veiculoSelecionadoId === p.veiculoId;

        return (
          <Marker
            key={p.veiculoId}
            position={[p.lat, p.lng]}
            icon={veiculoMapIcon({
              moving,
              placa: p.placa,
              velocidadeKm: p.velocidadeKm,
              odometroKm: p.odometroKm,
              motoristaFotoUrl: motoristaFoto,
              motoristaNome: motorista?.nome,
              mostrarInfo: mostrarInfoVeiculos,
              selecionado,
            })}
            zIndexOffset={selecionado ? 500 : 400}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onSelecionarVeiculo?.(p.veiculoId);
              },
            }}
          />
        );
      })}
    </>
  );
}
