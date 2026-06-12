"use client";

import { useEffect, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import type { Colaborador, Veiculo } from "@/lib/types";
import {
  formToVeiculoBody,
  validateVeiculoForm,
  veiculoToForm,
  type VeiculoFormState,
} from "@/lib/veiculo-form";
import { VeiculoFormFields } from "@/components/veiculos/veiculo-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EditarVeiculoDialog({
  open,
  onOpenChange,
  veiculo,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: Veiculo | null;
  onSuccess?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<VeiculoFormState>(() => veiculoToForm(veiculo));
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    apiFetch<Colaborador[] | null>("/api/v1/colaboradores")
      .then((data) => setColaboradores(asArray(data)))
      .catch(() => setColaboradores([]));
  }, [open]);

  useEffect(() => {
    if (open && veiculo) {
      setForm(veiculoToForm(veiculo));
      setErro(null);
    }
  }, [open, veiculo]);

  function patch(p: Partial<VeiculoFormState>) {
    setForm((f) => ({ ...f, ...p }));
    setErro(null);
  }

  async function salvar() {
    if (!veiculo) return;
    const validation = validateVeiculoForm(form);
    if (validation) {
      setErro(validation);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      await apiFetch<Veiculo>(`/api/v1/veiculos/${veiculo.id}`, {
        method: "PUT",
        body: JSON.stringify(formToVeiculoBody(form)),
      });
      onOpenChange(false);
      await onSuccess?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar veículo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar veículo</DialogTitle>
        </DialogHeader>
        <VeiculoFormFields
          form={form}
          onChange={patch}
          colaboradores={colaboradores}
        />
        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void salvar()}
            disabled={loading || !veiculo}
          >
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
