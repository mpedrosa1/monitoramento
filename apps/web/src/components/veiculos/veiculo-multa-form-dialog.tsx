"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Colaborador, VeiculoMulta, VeiculoMultaStatus } from "@/lib/types";
import { salarioNumeroParaInput, salarioParaNumero } from "@/lib/masks";
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

const textareaClass =
  "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const SEM_MOTORISTA = "__sem_motorista__";

type FormState = {
  data: string;
  infracao: string;
  valor: string;
  colaboradorId: string;
  status: VeiculoMultaStatus;
  observacao: string;
};

function multaToForm(m: VeiculoMulta | null): FormState {
  if (!m) {
    return {
      data: "",
      infracao: "",
      valor: "",
      colaboradorId: "",
      status: "pendente",
      observacao: "",
    };
  }
  return {
    data: m.data,
    infracao: m.infracao,
    valor: m.valor && m.valor > 0 ? salarioNumeroParaInput(m.valor) : "",
    colaboradorId: m.colaboradorId ?? "",
    status: m.status,
    observacao: m.observacao ?? "",
  };
}

export function VeiculoMultaFormDialog({
  open,
  onOpenChange,
  veiculoId,
  multa,
  colaboradores,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
  multa: VeiculoMulta | null;
  colaboradores: Colaborador[];
  onSuccess: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => multaToForm(multa));
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(multaToForm(multa));
      setErro(null);
    }
  }, [open, multa]);

  async function salvar() {
    setErro(null);
    if (!form.data.trim()) {
      setErro("Informe a data da multa.");
      return;
    }
    if (!form.infracao.trim()) {
      setErro("Informe a infração.");
      return;
    }

    const valorNum = form.valor.trim()
      ? salarioParaNumero(form.valor)
      : undefined;

    const body = {
      data: form.data,
      infracao: form.infracao.trim(),
      valor: valorNum && valorNum > 0 ? valorNum : undefined,
      colaboradorId: form.colaboradorId || undefined,
      status: form.status,
      observacao: form.observacao.trim() || undefined,
    };

    setSaving(true);
    try {
      if (multa) {
        await apiFetch(`/api/v1/veiculos/${veiculoId}/multas/${multa.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/api/v1/veiculos/${veiculoId}/multas`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const colaboradoresOrdenados = [...colaboradores].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
  const motoristaSelecionado = colaboradoresOrdenados.find(
    (c) => c.id === form.colaboradorId
  );
  const statusLabel = form.status === "paga" ? "Paga" : "Pendente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{multa ? "Editar multa" : "Registrar multa"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="multa-data">Data</Label>
              <Input
                id="multa-data"
                type="date"
                value={form.data}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="multa-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as VeiculoMultaStatus }))
                }
              >
                <SelectTrigger id="multa-status" className="w-full">
                  <SelectValue>{statusLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente" label="Pendente">
                    Pendente
                  </SelectItem>
                  <SelectItem value="paga" label="Paga">
                    Paga
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="multa-infracao">Infração</Label>
            <Input
              id="multa-infracao"
              value={form.infracao}
              onChange={(e) =>
                setForm((f) => ({ ...f, infracao: e.target.value }))
              }
              placeholder="Ex.: Excesso de velocidade"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="multa-valor">Valor (R$)</Label>
              <Input
                id="multa-valor"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    valor: salarioNumeroParaInput(
                      salarioParaNumero(e.target.value)
                    ),
                  }))
                }
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="multa-motorista">Motorista (opcional)</Label>
              <Select
                value={form.colaboradorId || SEM_MOTORISTA}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    colaboradorId: v === SEM_MOTORISTA ? "" : v,
                  }))
                }
              >
                <SelectTrigger id="multa-motorista" className="w-full">
                  <SelectValue placeholder="Não informado">
                    {form.colaboradorId
                      ? motoristaSelecionado?.nome
                      : "Não informado"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_MOTORISTA} label="Não informado">
                    Não informado
                  </SelectItem>
                  {colaboradoresOrdenados.map((c) => (
                    <SelectItem key={c.id} value={c.id} label={c.nome}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="multa-obs">Observação</Label>
            <textarea
              id="multa-obs"
              rows={3}
              value={form.observacao}
              onChange={(e) =>
                setForm((f) => ({ ...f, observacao: e.target.value }))
              }
              placeholder="Opcional"
              className={textareaClass}
            />
          </div>

          {erro ? (
            <p className="text-sm text-destructive" role="alert">
              {erro}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
