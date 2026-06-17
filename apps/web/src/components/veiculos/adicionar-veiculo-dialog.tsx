"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type { Colaborador, Veiculo } from "@/lib/types";
import {
  emptyVeiculoForm,
  formToVeiculoBody,
  validateVeiculoForm,
  type VeiculoFormState,
} from "@/lib/veiculo-form";
import { tabFromVeiculoFormError, type VeiculoFormTab } from "@/lib/veiculo-form-tabs";
import { VeiculoFormFields } from "@/components/veiculos/veiculo-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AdicionarVeiculoDialog({
  onSuccess,
}: {
  onSuccess?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<VeiculoFormState>(emptyVeiculoForm);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [focusTab, setFocusTab] = useState<VeiculoFormTab | null>(null);
  const estavaAberto = useRef(false);

  useEffect(() => {
    if (!open) return;
    apiFetch<Colaborador[] | null>("/api/v1/colaboradores")
      .then((data) => setColaboradores(asArray(data)))
      .catch(() => setColaboradores([]));
  }, [open]);

  useEffect(() => {
    if (open && !estavaAberto.current) {
      setForm(emptyVeiculoForm());
      setErro(null);
      setFocusTab(null);
    }
    estavaAberto.current = open;
  }, [open]);

  function patch(p: Partial<VeiculoFormState>) {
    setForm((f) => ({ ...f, ...p }));
    setErro(null);
  }

  async function salvar() {
    const validation = validateVeiculoForm(form);
    if (validation) {
      setErro(validation);
      setFocusTab(tabFromVeiculoFormError(validation));
      return;
    }
    setFocusTab(null);
    setLoading(true);
    setErro(null);
    try {
      await apiFetch<Veiculo>("/api/v1/veiculos", {
        method: "POST",
        body: JSON.stringify(formToVeiculoBody(form)),
      });
      setOpen(false);
      await onSuccess?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar veículo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>
        <Plus className="mr-1.5 h-4 w-4" />
        Adicionar veículo
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar veículo</DialogTitle>
        </DialogHeader>
        <VeiculoFormFields
          form={form}
          onChange={patch}
          colaboradores={colaboradores}
          focusTab={focusTab}
        />
        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void salvar()} disabled={loading}>
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
