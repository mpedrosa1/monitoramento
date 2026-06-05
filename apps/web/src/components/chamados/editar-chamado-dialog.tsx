"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import {
  chamadoToForm,
  formToChamadoBody,
  validateAbrirChamadoForm,
  type AbrirChamadoFormState,
} from "@/lib/chamado-form";
import type { Chamado, Unidade } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChamadoFormFields } from "@/components/chamados/chamado-form-fields";

export function EditarChamadoDialog({
  open,
  onOpenChange,
  chamado,
  unidades,
  fixedUnidadeId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamado: Chamado | null;
  unidades: Unidade[];
  fixedUnidadeId?: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<AbrirChamadoFormState>(() =>
    chamadoToForm(chamado)
  );

  useEffect(() => {
    if (open && chamado) {
      setForm(chamadoToForm(chamado));
    }
  }, [open, chamado]);

  function patch(p: Partial<AbrirChamadoFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function salvar() {
    if (!chamado) return;
    const erro = validateAbrirChamadoForm(form);
    if (erro) {
      window.alert(erro);
      return;
    }
    setLoading(true);
    try {
      await apiFetch<Chamado>(`/api/v1/chamados/${chamado.id}`, {
        method: "PUT",
        body: JSON.stringify(formToChamadoBody(form, unidades, chamado)),
      });
      onOpenChange(false);
      await onSuccess?.();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao salvar chamado."
      );
    } finally {
      setLoading(false);
    }
  }

  const tituloNumero = chamado?.numero
    ? formatNumeroExibicao(chamado.numero)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Editar chamado{tituloNumero ? ` — ${tituloNumero}` : ""}
          </DialogTitle>
        </DialogHeader>

        <ChamadoFormFields
          form={form}
          onPatch={patch}
          unidades={unidades}
          fixedUnidadeId={fixedUnidadeId}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={loading || !chamado}>
            {loading ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
