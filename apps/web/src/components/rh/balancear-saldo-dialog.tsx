"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatarMoeda, labelModalidadeDespesa } from "@/lib/despesas";
import {
  formatSalarioInput,
  salarioNumeroParaInput,
  salarioParaNumero,
} from "@/lib/masks";
import type { ModalidadeDespesa } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function saldoNumeroParaInput(n: number): string {
  if (n === 0) return "0,00";
  const neg = n < 0;
  const abs = salarioNumeroParaInput(Math.abs(n));
  if (!abs) return neg ? "-0,00" : "0,00";
  return neg ? `-${abs}` : abs;
}

function parseSaldoInput(value: string): number {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const n = salarioParaNumero(trimmed.replace(/^-/, ""));
  return negative ? -n : n;
}

function formatSaldoInput(value: string): string {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const formatted = formatSalarioInput(trimmed.replace(/^-/, ""));
  if (!formatted) return negative ? "-" : "";
  return negative ? `-${formatted}` : formatted;
}

export function BalancearSaldoDialog({
  open,
  onOpenChange,
  colaboradorId,
  colaboradorNome,
  competencia,
  modalidade,
  saldoAtual,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  colaboradorNome?: string;
  competencia: string;
  modalidade: ModalidadeDespesa;
  saldoAtual: number;
  onSuccess: () => void | Promise<void>;
}) {
  const [saldoInput, setSaldoInput] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSaldoInput(formatSaldoInput(saldoNumeroParaInput(saldoAtual)));
      setObservacao("");
      setErro(null);
    }
  }, [open, saldoAtual]);

  async function salvar() {
    setLoading(true);
    setErro(null);
    try {
      await apiFetch(
        `/api/v1/despesas/colaboradores/${colaboradorId}/ajustes-saldo`,
        {
          method: "PUT",
          body: JSON.stringify({
            competencia,
            modalidade,
            saldo: parseSaldoInput(saldoInput),
            observacao: observacao.trim() || undefined,
          }),
        }
      );
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao balancear saldo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Balancear saldo</DialogTitle>
          {colaboradorNome ? (
            <p className="text-sm text-muted-foreground">
              {colaboradorNome} · {labelModalidadeDespesa(modalidade)}
            </p>
          ) : null}
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {erro && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Defina o saldo correto neste momento. Recargas e despesas registradas
            <strong> a partir de agora</strong> passam a compor o saldo; o histórico
            anterior deixa de ser considerado no acumulado.
          </p>

          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            Saldo calculado atualmente:{" "}
            <span className="font-semibold tabular-nums">
              {formatarMoeda(saldoAtual)}
            </span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="balancear-saldo">Novo saldo (R$)</Label>
            <Input
              id="balancear-saldo"
              inputMode="numeric"
              placeholder="0,00"
              value={saldoInput}
              onChange={(e) => setSaldoInput(formatSaldoInput(e.target.value))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="balancear-obs">Observação (opcional)</Label>
            <Input
              id="balancear-obs"
              value={observacao}
              placeholder="Ex.: saldo inicial na implantação do sistema"
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
