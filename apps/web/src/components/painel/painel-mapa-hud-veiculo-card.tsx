"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Car, GripVertical, X } from "lucide-react";
import { COLABORADOR_AVATAR_PADRAO } from "@/lib/colaborador-avatar";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import {
  formatOdometroKm,
  formatVelocidadeKmH,
} from "@/lib/rastreamento-format";
import {
  clampHudEquipamentoPos,
  type HudEquipamentoPos,
} from "@/lib/mapa-hud-equipamentos-pos";
import {
  loadVeiculoCardPos,
  saveVeiculoCardPos,
} from "@/lib/mapa-hud-layout-storage";
import type { Colaborador, Veiculo, VeiculoPosicao } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { mapaHudCornerScaleStyle } from "@/lib/mapa-hud-scale";
import { cn } from "@/lib/utils";

export type VeiculoHudSelecao = {
  posicao: VeiculoPosicao;
  veiculo?: Veiculo;
  motorista?: Colaborador;
};

const CARD_WIDTH = 288;
const CARD_MIN_HEIGHT = 200;

function posicaoInicialInferiorDireita(
  containerWidth: number,
  containerHeight: number,
  cardWidth: number,
  cardHeight: number,
  hudScale: number,
  paddingRight: number,
  paddingBottom: number
): HudEquipamentoPos {
  const w = cardWidth * hudScale;
  const h = cardHeight * hudScale;
  return clampHudEquipamentoPos(
    containerWidth - w - paddingRight,
    containerHeight - h - paddingBottom,
    cardWidth,
    cardHeight,
    containerWidth,
    containerHeight,
    8,
    hudScale
  );
}

function clampPosicaoNoContainer(
  pos: HudEquipamentoPos,
  container: HTMLDivElement,
  card: HTMLDivElement,
  hudScale: number
): HudEquipamentoPos {
  return clampHudEquipamentoPos(
    pos.x,
    pos.y,
    card.offsetWidth || CARD_WIDTH,
    card.offsetHeight || CARD_MIN_HEIGHT,
    container.clientWidth,
    container.clientHeight,
    8,
    hudScale
  );
}

export function PainelMapaHudVeiculoCard({
  selecao,
  hudScale = 1,
  paddingRight = 8,
  paddingBottom = 8,
  positionStorageKey,
  onClose,
}: {
  selecao: VeiculoHudSelecao;
  hudScale?: number;
  paddingRight?: number;
  paddingBottom?: number;
  /** Chave para persistir a posição no navegador (ex.: "geral" ou "unidade:abc"). */
  positionStorageKey: string;
  onClose: () => void;
}) {
  const { posicao, veiculo, motorista } = selecao;

  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<HudEquipamentoPos | null>(null);
  const positionedForKeyRef = useRef<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [position, setPosition] = useState<HudEquipamentoPos | null>(null);
  positionRef.current = position;

  const titulo = veiculo
    ? `${veiculo.marca} ${veiculo.modelo}`.trim()
    : "Veículo";
  const motoristaFoto =
    motorista?.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO;
  const moving = (posicao.velocidadeKm ?? 0) >= 2;

  const persistirPosicao = useCallback(
    (pos: HudEquipamentoPos) => {
      saveVeiculoCardPos(positionStorageKey, pos);
    },
    [positionStorageKey]
  );

  const medirEPosicionar = useCallback(() => {
    const container = overlayRef.current;
    const card = cardRef.current;
    if (!container || !card) return;
    const next = posicaoInicialInferiorDireita(
      container.clientWidth,
      container.clientHeight,
      card.offsetWidth || CARD_WIDTH,
      card.offsetHeight || CARD_MIN_HEIGHT,
      hudScale,
      paddingRight + 12,
      paddingBottom + 12
    );
    setPosition(next);
    positionRef.current = next;
  }, [hudScale, paddingRight, paddingBottom]);

  useLayoutEffect(() => {
    if (positionedForKeyRef.current === positionStorageKey) return;

    const container = overlayRef.current;
    const card = cardRef.current;
    const saved = loadVeiculoCardPos(positionStorageKey);

    if (saved && container && card) {
      const next = clampPosicaoNoContainer(saved, container, card, hudScale);
      setPosition(next);
      positionRef.current = next;
      positionedForKeyRef.current = positionStorageKey;
      return;
    }

    if (saved) {
      setPosition(saved);
      positionRef.current = saved;
      positionedForKeyRef.current = positionStorageKey;
      return;
    }

    medirEPosicionar();
    positionedForKeyRef.current = positionStorageKey;
  }, [positionStorageKey, hudScale, medirEPosicionar]);

  useLayoutEffect(() => {
    if (position != null) return;
    medirEPosicionar();
    const id = requestAnimationFrame(() => medirEPosicionar());
    return () => cancelAnimationFrame(id);
  }, [position, medirEPosicionar]);

  useEffect(() => {
    const container = overlayRef.current;
    if (!container || position == null) return;
    const ro = new ResizeObserver(() => {
      const card = cardRef.current;
      if (!card) return;
      setPosition((prev) => {
        if (!prev) return prev;
        const next = clampPosicaoNoContainer(prev, container, card, hudScale);
        if (next.x === prev.x && next.y === prev.y) return prev;
        positionRef.current = next;
        persistirPosicao(next);
        return next;
      });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [position, hudScale, persistirPosicao]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button,a")) return;
    if (!position) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: position.x,
      origY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !position) return;

    const container = overlayRef.current;
    const card = cardRef.current;
    const containerWidth = container?.clientWidth ?? window.innerWidth;
    const containerHeight = container?.clientHeight ?? window.innerHeight;
    const cardWidth = card?.offsetWidth ?? CARD_WIDTH;
    const cardHeight = card?.offsetHeight ?? CARD_MIN_HEIGHT;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const next = clampHudEquipamentoPos(
      drag.origX + dx,
      drag.origY + dy,
      cardWidth,
      cardHeight,
      containerWidth,
      containerHeight,
      8,
      hudScale
    );
    positionRef.current = next;
    setPosition(next);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const latest = positionRef.current;
    if (latest) persistirPosicao(latest);
  }

  return (
    <div
      ref={overlayRef}
      className={cn("pointer-events-none absolute inset-0 z-[1200]")}
    >
      <div
        ref={cardRef}
        className={cn(
          "pointer-events-auto absolute max-w-[min(100%,20rem)] animate-in fade-in zoom-in-95 duration-300",
          position == null && "invisible"
        )}
        style={
          position
            ? {
                left: position.x,
                top: position.y,
                width: "min(100%, 18rem)",
                ...mapaHudCornerScaleStyle(hudScale, "top left"),
              }
            : { left: 0, top: 0, width: "min(100%, 18rem)" }
        }
      >
        <PainelMapaHudGlass
          accent={moving ? "online" : "sem_ip"}
          className="w-[min(100%,18rem)] shadow-xl sm:w-[min(100%,20rem)]"
        >
          <div
            className="flex cursor-grab items-center border-b border-white/10 bg-background/30 active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div
              className="flex touch-none items-center px-1.5 py-2.5 text-muted-foreground"
              aria-hidden
            >
              <GripVertical className="h-4 w-4 shrink-0 opacity-70" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-1">
              <Car className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Veículo no mapa
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mr-1 h-7 w-7 shrink-0 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Fechar card do veículo"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-3 p-3.5 text-sm">
            {motorista ? (
              <div className="flex items-center gap-2.5">
                <img
                  src={motoristaFoto}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full border-2 border-primary object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{motorista.nome}</p>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                </div>
              </div>
            ) : null}

            <div>
              <p className="font-mono text-lg font-bold tracking-wide">
                {posicao.placa}
              </p>
              {titulo !== "Veículo" ? (
                <p className="text-muted-foreground">{titulo}</p>
              ) : null}
            </div>

            <dl className="grid gap-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Velocidade</dt>
                <dd className="font-medium tabular-nums">
                  {formatVelocidadeKmH(posicao.velocidadeKm)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Odômetro</dt>
                <dd className="font-medium tabular-nums">
                  {formatOdometroKm(posicao.odometroKm)}
                </dd>
              </div>
            </dl>

            {posicao.endereco ? (
              <p className="text-xs leading-snug text-muted-foreground">
                {posicao.endereco}
              </p>
            ) : null}

            {veiculo ? (
              <Link
                href={`/dashboard/veiculos/${veiculo.id}`}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "w-full bg-background/50"
                )}
              >
                Ver ficha do veículo
              </Link>
            ) : null}
          </div>
        </PainelMapaHudGlass>
      </div>
    </div>
  );
}
