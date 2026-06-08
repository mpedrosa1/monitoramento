"use client";

import { useMemo } from "react";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import { formatCoord } from "@/lib/geocode";
import { isAtribuidoMissaoLista } from "@/lib/missao-form";
import { missaoStatusLabel, missaoStatusVariant } from "@/lib/labels";
import { formatUnidadeEndereco } from "@/lib/unidade-form";
import type { AuthUser } from "@/lib/auth-session";
import type { Chamado, Colaborador, Missao, Unidade } from "@/lib/types";
import { coordsFromUnidade } from "@/components/unidades/unidade-detail-panel";
import { MissaoMap } from "@/components/missoes/missao-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function DetalheCampo({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-line text-sm text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MissaoDetailDialog({
  open,
  onOpenChange,
  missao,
  unidade,
  chamados,
  colaboradores,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missao: Missao | null;
  unidade: Unidade | null;
  chamados: Chamado[];
  colaboradores: Colaborador[];
  user: AuthUser | null;
}) {
  const position = useMemo(() => {
    if (!unidade) return null;
    const c = coordsFromUnidade(unidade);
    return c ? { lat: c.lat, lng: c.lng } : null;
  }, [unidade]);

  const colaboradoresTexto = useMemo(() => {
    if (!missao?.colaboradorIds?.length) return "—";
    return missao.colaboradorIds
      .map((id) => colaboradores.find((c) => c.id === id)?.nome ?? id)
      .join("\n");
  }, [missao, colaboradores]);

  const chamadoTexto = useMemo(() => {
    if (!missao?.chamadoId) return "—";
    const c = chamados.find((ch) => ch.id === missao.chamadoId);
    if (!c) return "—";
    return c.numero ? formatNumeroExibicao(c.numero) : c.titulo;
  }, [missao, chamados]);

  if (!missao) return null;

  const mapLabel = unidade
    ? `${unidade.codigo} — ${unidade.nome}`
    : "Unidade";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{missao.titulo}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={missaoStatusVariant[missao.status]}>
              {missaoStatusLabel[missao.status] ?? missao.status}
            </Badge>
            {isAtribuidoMissaoLista(user?.id, missao) && (
              <Badge className="border-amber-300 bg-amber-400 font-semibold text-amber-950 shadow-sm ring-1 ring-amber-300/80 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950">
                Atribuído a você
              </Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetalheCampo
              label="Unidade"
              value={
                unidade
                  ? `${unidade.codigo} — ${unidade.nome}`
                  : "—"
              }
            />
            <DetalheCampo label="Chamado vinculado" value={chamadoTexto} />
            <DetalheCampo
              label="Colaboradores"
              value={colaboradoresTexto}
              className="sm:col-span-2"
            />
            <DetalheCampo
              label="Endereço"
              value={unidade ? formatUnidadeEndereco(unidade.endereco) : "—"}
              className="sm:col-span-2"
            />
            {position && (
              <DetalheCampo
                label="Coordenadas"
                value={`${formatCoord(position.lat)}, ${formatCoord(position.lng)}`}
              />
            )}
            <DetalheCampo
              label="Criada em"
              value={formatDate(missao.createdAt)}
            />
            <DetalheCampo
              label="Atualizada em"
              value={formatDate(missao.updatedAt)}
            />
          </div>

          <Separator />

          <section className="space-y-2">
            <p className="text-sm font-semibold">Localização e rota</p>
            {!position ? (
              <p className="text-xs text-muted-foreground">
                Coordenadas não cadastradas para esta unidade. O mapa exibe a
                região central de referência.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                O navegador solicitará sua localização para traçar a rota até a
                unidade. O tempo exibido é estimado, sem trânsito em tempo real.
              </p>
            )}
            <MissaoMap destination={position} label={mapLabel} />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
