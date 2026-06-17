"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  labelModalidadeDespesa,
  MODALIDADE_DESPESA_OPCOES,
} from "@/lib/despesas";
import {
  formatSalarioInput,
  salarioNumeroParaInput,
  salarioParaNumero,
} from "@/lib/masks";
import type { DepositoDespesa, ModalidadeDespesa } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  modalidade: ModalidadeDespesa | "";
  valor: string;
};

function recargaToForm(recarga: DepositoDespesa | null): FormState {
  if (!recarga) {
    return { modalidade: "", valor: "" };
  }
  return {
    modalidade: recarga.modalidade,
    valor: salarioNumeroParaInput(recarga.valor),
  };
}

export function RecargaFormDialog({
  open,
  onOpenChange,
  recarga,
  colaboradorId,
  competencia,
  modalidadesOcupadas,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recarga: DepositoDespesa | null;
  colaboradorId: string;
  competencia: string;
  modalidadesOcupadas: ModalidadeDespesa[];
  onSuccess: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => recargaToForm(recarga));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const editando = recarga != null;

  const modalidadesDisponiveis = useMemo(() => {
    if (editando) {
      return MODALIDADE_DESPESA_OPCOES.filter((o) => o.value === recarga.modalidade);
    }
    return MODALIDADE_DESPESA_OPCOES.filter(
      (o) => !modalidadesOcupadas.includes(o.value)
    );
  }, [editando, recarga, modalidadesOcupadas]);

  useEffect(() => {
    if (open) {
      setForm(recargaToForm(recarga));
      setErro(null);
    }
  }, [open, recarga]);

  async function salvar() {
    if (!form.modalidade) {
      setErro("Selecione a modalidade.");
      return;
    }
    const valor = salarioParaNumero(form.valor);
    if (valor <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      await apiFetch(`/api/v1/despesas/depositos/${colaboradorId}`, {
        method: "PUT",
        body: JSON.stringify({
          competencia,
          modalidade: form.modalidade,
          valor,
        }),
      });
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar recarga.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar recarga" : "Nova recarga"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {erro && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <div className="grid gap-2">
            <Label>Modalidade</Label>
            <Select
              value={form.modalidade || null}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  modalidade: (v ?? "") as ModalidadeDespesa,
                }))
              }
              disabled={editando}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione…">
                  {form.modalidade
                    ? labelModalidadeDespesa(form.modalidade)
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {modalidadesDisponiveis.map((o) => (
                  <SelectItem key={o.value} value={o.value} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recarga-valor">Valor (R$)</Label>
            <Input
              id="recarga-valor"
              inputMode="numeric"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  valor: formatSalarioInput(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
