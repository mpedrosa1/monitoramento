"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  emptyAbrirChamadoForm,
  formToChamadoBody,
  validateAbrirChamadoForm,
  type AbrirChamadoFormState,
} from "@/lib/chamado-form";
import { proximoNumeroChamado } from "@/lib/chamados";
import type { Chamado, Unidade } from "@/lib/types";
import { ChamadoFormFields } from "@/components/chamados/chamado-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AbrirChamadoDialog({
  unidades,
  chamados = [],
  fixedUnidadeId,
  onSuccess,
  triggerLabel = "Abrir Chamado",
}: {
  unidades: Unidade[];
  /** Lista de chamados para calcular o próximo número de protocolo. */
  chamados?: Chamado[];
  /** Quando definido, a unidade fica fixa (ex.: aba da unidade). */
  fixedUnidadeId?: string;
  onSuccess?: () => void | Promise<void>;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<AbrirChamadoFormState>(() =>
    emptyAbrirChamadoForm(fixedUnidadeId ?? "")
  );

  const estavaAberto = useRef(false);

  // Só reinicia o formulário ao abrir o modal — não em re-renders (ex.: ping/WebSocket).
  useEffect(() => {
    if (open && !estavaAberto.current) {
      setForm({
        ...emptyAbrirChamadoForm(fixedUnidadeId ?? unidades[0]?.id ?? ""),
        numero: proximoNumeroChamado(chamados),
      });
    }
    estavaAberto.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unidades/chamados só na abertura
  }, [open, fixedUnidadeId]);

  function patch(p: Partial<AbrirChamadoFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function salvar() {
    const erro = validateAbrirChamadoForm(form);
    if (erro) {
      window.alert(erro);
      throw new Error(erro);
    }
    setLoading(true);
    try {
      await apiFetch<Chamado>("/api/v1/chamados", {
        method: "POST",
        body: JSON.stringify(formToChamadoBody(form, unidades)),
      });
      setOpen(false);
      await onSuccess?.();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao salvar chamado."
      );
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Abrir chamado</DialogTitle>
        </DialogHeader>

        <ChamadoFormFields
          form={form}
          onPatch={patch}
          unidades={unidades}
          fixedUnidadeId={fixedUnidadeId}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={loading}>
            {loading ? "Salvando…" : "Salvar chamado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
