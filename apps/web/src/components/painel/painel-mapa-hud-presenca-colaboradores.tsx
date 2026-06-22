"use client";

import { Car, HelpCircle } from "lucide-react";
import { ColaboradorCard } from "@/components/dashboard/colaborador-card";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import { useColaboradorRastreamento } from "@/components/dashboard/colaborador-rastreamento-context";
import type { PresencaColaboradorHud } from "@/lib/veiculo-presenca-unidade";
import { cn } from "@/lib/utils";

export function PainelMapaHudPresencaColaboradores({
  presencas,
  className,
}: {
  presencas: PresencaColaboradorHud[];
  className?: string;
}) {
  const { withStatusEfetivo } = useColaboradorRastreamento();

  if (presencas.length === 0) return null;

  return (
    <PainelMapaHudGlass
      accent="online"
      className={cn(
        "slide-in-from-left-3 w-[min(100%,14.5rem)] shrink-0 animate-in delay-75 sm:w-[min(100%,15.5rem)]",
        className
      )}
    >
      <div className="border-b border-white/10 bg-background/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Car className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Colaborador na unidade
          </p>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          
        </p>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {presencas.map((presenca) => (
          <div
            key={`${presenca.colaborador.id}-${presenca.veiculo.id}`}
            className="flex flex-col gap-2"
          >
            {presenca.ambiguo ? (
              <div
                className="flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-50"
                role="note"
              >
                <HelpCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                  aria-hidden
                />
                <span>
                  <span className="font-semibold text-amber-100">?</span> Pode
                  estar em outra unidade
                  {presenca.outrasUnidadesNomes.length > 0
                    ? `: ${presenca.outrasUnidadesNomes.join(", ")}`
                    : ""}
                  .
                </span>
              </div>
            ) : null}

            <div className="pointer-events-auto flex justify-center">
              <ColaboradorCard
                colaborador={withStatusEfetivo(presenca.colaborador)}
                linkable
                centered={false}
              />
            </div>

            <p className="text-center font-mono text-[10px] tracking-wide text-muted-foreground">
              Veículo {presenca.placa}
            </p>
          </div>
        ))}
      </div>
    </PainelMapaHudGlass>
  );
}
