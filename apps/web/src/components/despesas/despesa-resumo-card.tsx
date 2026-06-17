"use client";

import { Scale } from "lucide-react";
import { formatarMoeda } from "@/lib/despesas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DespesaResumoCard({
  titulo,
  icon: Icon,
  deposito,
  gasto,
  saldoAnterior = 0,
  saldo,
  saldoAjustado = false,
  accent,
  depositoLabel = "Depósito",
  onBalancear,
}: {
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  deposito: number;
  gasto: number;
  saldoAnterior?: number;
  saldo: number;
  saldoAjustado?: boolean;
  accent: string;
  depositoLabel?: string;
  onBalancear?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            accent
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Saldo anterior
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {saldoAnterior !== 0 ? formatarMoeda(saldoAnterior) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {depositoLabel}
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {deposito > 0 ? formatarMoeda(deposito) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Gasto
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            {formatarMoeda(gasto)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center justify-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Saldo
            {onBalancear ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 shrink-0"
                title="Balancear saldo"
                aria-label="Balancear saldo"
                onClick={onBalancear}
              >
                <Scale className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </dt>
          <dd
            className={cn(
              "mt-1 text-sm font-semibold tabular-nums",
              saldo < 0
                ? "text-destructive"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatarMoeda(saldo)}
          </dd>
          {saldoAjustado ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Saldo balanceado
            </p>
          ) : null}
        </div>
      </dl>
    </div>
  );
}
