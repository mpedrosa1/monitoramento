"use client";

import { formatarMoeda } from "@/lib/despesas";
import type { DespesaColaboradorResumoItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function SaldoCell({ valor }: { valor: number }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        valor < 0 && "text-destructive",
        valor > 0 && "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {formatarMoeda(valor)}
    </span>
  );
}

function MoedaCell({ valor }: { valor: number }) {
  return (
    <span className="tabular-nums text-muted-foreground">
      {valor > 0 ? formatarMoeda(valor) : "—"}
    </span>
  );
}

export function DespesasVisaoGeralTable({
  itens,
  totais,
  colaboradorSelecionadoId,
  onSelecionarColaborador,
}: {
  itens: DespesaColaboradorResumoItem[];
  totais?: {
    mobilidade: { deposito: number; gasto: number; saldo: number };
    livre: { deposito: number; gasto: number; saldo: number };
    totalGasto: number;
  };
  colaboradorSelecionadoId?: string;
  onSelecionarColaborador?: (id: string) => void;
}) {
  if (itens.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Nenhum colaborador cadastrado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[160px] sticky left-0 z-10 bg-muted/80 backdrop-blur-sm">
              Colaborador
            </TableHead>
            <TableHead colSpan={3} className="border-l text-center text-sky-600 dark:text-sky-400">
              Mobilidade
            </TableHead>
            <TableHead colSpan={3} className="border-l text-center text-violet-600 dark:text-violet-400">
              Livre
            </TableHead>
            <TableHead className="border-l text-right">Gasto total</TableHead>
          </TableRow>
          <TableRow className="text-xs text-muted-foreground">
            <TableHead className="sticky left-0 z-10 bg-muted/80 backdrop-blur-sm" />
            <TableHead className="border-l text-right font-normal">Recarga</TableHead>
            <TableHead className="text-right font-normal">Gasto</TableHead>
            <TableHead className="text-right font-normal">Saldo</TableHead>
            <TableHead className="border-l text-right font-normal">Recarga</TableHead>
            <TableHead className="text-right font-normal">Gasto</TableHead>
            <TableHead className="text-right font-normal">Saldo</TableHead>
            <TableHead className="border-l" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((item) => {
            const selecionado = item.colaboradorId === colaboradorSelecionadoId;
            return (
              <TableRow
                key={item.colaboradorId}
                className={cn(
                  onSelecionarColaborador && "cursor-pointer",
                  selecionado && "bg-primary/5"
                )}
                onClick={() => onSelecionarColaborador?.(item.colaboradorId)}
              >
                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                  {item.nome}
                </TableCell>
                <TableCell className="border-l text-right">
                  <MoedaCell valor={item.mobilidade.deposito} />
                </TableCell>
                <TableCell className="text-right">
                  <MoedaCell valor={item.mobilidade.gasto} />
                </TableCell>
                <TableCell className="text-right">
                  <SaldoCell valor={item.mobilidade.saldo} />
                </TableCell>
                <TableCell className="border-l text-right">
                  <MoedaCell valor={item.livre.deposito} />
                </TableCell>
                <TableCell className="text-right">
                  <MoedaCell valor={item.livre.gasto} />
                </TableCell>
                <TableCell className="text-right">
                  <SaldoCell valor={item.livre.saldo} />
                </TableCell>
                <TableCell className="border-l text-right font-medium tabular-nums">
                  {item.totalGasto > 0 ? formatarMoeda(item.totalGasto) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
          {totais ? (
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell className="sticky left-0 z-10 bg-muted/60">Total</TableCell>
              <TableCell className="border-l text-right tabular-nums">
                {formatarMoeda(totais.mobilidade.deposito)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatarMoeda(totais.mobilidade.gasto)}
              </TableCell>
              <TableCell className="text-right">
                <SaldoCell valor={totais.mobilidade.saldo} />
              </TableCell>
              <TableCell className="border-l text-right tabular-nums">
                {formatarMoeda(totais.livre.deposito)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatarMoeda(totais.livre.gasto)}
              </TableCell>
              <TableCell className="text-right">
                <SaldoCell valor={totais.livre.saldo} />
              </TableCell>
              <TableCell className="border-l text-right tabular-nums">
                {formatarMoeda(totais.totalGasto)}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
