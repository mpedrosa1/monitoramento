"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  formatSalarioInput,
  salarioNumeroParaInput,
  salarioParaNumero,
} from "@/lib/masks";
import { PERCENTUAL_DEPENDENTE } from "@/lib/convenio-medico";
import type { FaixaConvenioMedico } from "@/lib/types";
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

type FormState = {
  idadeMin: string;
  idadeMax: string;
  semTeto: boolean;
  valor: string;
  descontoFolha: string;
};

function faixaToForm(faixa: FaixaConvenioMedico | null): FormState {
  if (!faixa) {
    return { idadeMin: "", idadeMax: "", semTeto: false, valor: "", descontoFolha: "" };
  }
  const semTeto = faixa.idadeMax <= 0;
  return {
    idadeMin: String(faixa.idadeMin),
    idadeMax: semTeto ? "" : String(faixa.idadeMax),
    semTeto,
    valor: salarioNumeroParaInput(faixa.valor),
    descontoFolha: salarioNumeroParaInput(faixa.descontoFolha),
  };
}

function soDigitos(v: string): string {
  return v.replace(/\D/g, "").slice(0, 3);
}

export function FaixaConvenioFormDialog({
  open,
  onOpenChange,
  faixa,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faixa: FaixaConvenioMedico | null;
  onSuccess: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => faixaToForm(faixa));
  const [descontoManual, setDescontoManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const editando = faixa != null;

  useEffect(() => {
    if (open) {
      setForm(faixaToForm(faixa));
      setDescontoManual(faixa != null);
      setErro(null);
    }
  }, [open, faixa]);

  // Preenche o desconto com 25% do valor enquanto o usuário não editar à mão.
  function aoMudarValor(raw: string) {
    const valor = formatSalarioInput(raw);
    setForm((f) => {
      const next = { ...f, valor };
      if (!descontoManual) {
        const n = salarioParaNumero(valor);
        next.descontoFolha = n > 0 ? salarioNumeroParaInput(n * PERCENTUAL_DEPENDENTE) : "";
      }
      return next;
    });
  }

  async function salvar() {
    const idadeMin = Number.parseInt(form.idadeMin, 10);
    if (Number.isNaN(idadeMin) || idadeMin < 0) {
      setErro("Informe a idade mínima.");
      return;
    }
    let idadeMax = 0;
    if (!form.semTeto) {
      idadeMax = Number.parseInt(form.idadeMax, 10);
      if (Number.isNaN(idadeMax)) {
        setErro("Informe a idade máxima ou marque “sem limite (59+)”.");
        return;
      }
      if (idadeMax < idadeMin) {
        setErro("A idade máxima não pode ser menor que a mínima.");
        return;
      }
    }
    const valor = salarioParaNumero(form.valor);
    if (valor <= 0) {
      setErro("Informe a mensalidade (valor maior que zero).");
      return;
    }
    const descontoFolha = salarioParaNumero(form.descontoFolha);

    setLoading(true);
    setErro(null);
    try {
      const body = JSON.stringify({ idadeMin, idadeMax, valor, descontoFolha });
      if (editando) {
        await apiFetch(`/api/v1/convenio-medico/faixas/${faixa.id}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch("/api/v1/convenio-medico/faixas", {
          method: "POST",
          body,
        });
      }
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar faixa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar faixa de idade" : "Nova faixa de idade"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {erro && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="faixa-idade-min">Idade mínima</Label>
              <Input
                id="faixa-idade-min"
                inputMode="numeric"
                placeholder="0"
                value={form.idadeMin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, idadeMin: soDigitos(e.target.value) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faixa-idade-max">Idade máxima</Label>
              <Input
                id="faixa-idade-max"
                inputMode="numeric"
                placeholder="18"
                value={form.idadeMax}
                disabled={form.semTeto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, idadeMax: soDigitos(e.target.value) }))
                }
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.semTeto}
              onChange={(e) =>
                setForm((f) => ({ ...f, semTeto: e.target.checked }))
              }
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Sem limite superior (ex.: 59+)
          </label>

          <div className="grid gap-2">
            <Label htmlFor="faixa-valor">Valor da mensalidade (R$)</Label>
            <Input
              id="faixa-valor"
              inputMode="numeric"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => aoMudarValor(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="faixa-desconto">Desconto na folha (R$)</Label>
            <Input
              id="faixa-desconto"
              inputMode="numeric"
              placeholder="0,00"
              value={form.descontoFolha}
              onChange={(e) => {
                setDescontoManual(true);
                setForm((f) => ({
                  ...f,
                  descontoFolha: formatSalarioInput(e.target.value),
                }));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Parcela paga pelo dependente (25% da mensalidade). Calculada
              automaticamente — ajuste se o convênio informar outro valor.
            </p>
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
