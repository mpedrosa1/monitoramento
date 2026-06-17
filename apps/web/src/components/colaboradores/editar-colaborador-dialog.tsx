"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  clearColaboradorFormErrorsForPatch,
  colaboradorToForm,
  formToColaboradorBody,
  hasColaboradorFormErrors,
  scrollToFirstColaboradorFormError,
  validateColaboradorForm,
  type ColaboradorFormErrors,
  type ColaboradorFormState,
} from "@/lib/colaborador-form";
import type { Colaborador } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import { resolveAuthUserPermissoes, resolveAuthUserTipoAcesso } from "@/lib/auth-session";
import { ColaboradorFormFields } from "@/components/colaboradores/colaborador-form-fields";
import { FormErroDialog } from "@/components/colaboradores/form-erro-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EditarColaboradorDialog({
  open,
  onOpenChange,
  colaborador,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador | null;
  onSuccess?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ColaboradorFormState>(() =>
    colaboradorToForm(colaborador)
  );
  const [errors, setErrors] = useState<ColaboradorFormErrors>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (open && colaborador) {
      setForm(colaboradorToForm(colaborador));
      setErrors({});
    }
  }, [open, colaborador]);

  function patch(p: Partial<ColaboradorFormState>) {
    setForm((f) => ({ ...f, ...p }));
    setErrors((prev) => clearColaboradorFormErrorsForPatch(prev, p));
  }

  async function salvar() {
    if (!colaborador) return;
    const validation = validateColaboradorForm(form, {
      editorTipoAcesso: resolveAuthUserTipoAcesso(user),
      editorPermissoesAdmin: resolveAuthUserPermissoes(user),
      colaboradorExistente: colaborador,
    });
    if (hasColaboradorFormErrors(validation)) {
      setErrors(validation);
      scrollToFirstColaboradorFormError(validation);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await apiFetch<Colaborador>(`/api/v1/colaboradores/${colaborador.id}`, {
        method: "PUT",
        body: JSON.stringify(formToColaboradorBody(form, colaborador)),
      });
      onOpenChange(false);
      await onSuccess?.();
    } catch (e) {
      setErroApi(
        e instanceof Error ? e.message : "Erro ao salvar colaborador."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Editar colaborador
              {colaborador ? ` — ${colaborador.nome}` : ""}
            </DialogTitle>
          </DialogHeader>

          <ColaboradorFormFields form={form} onChange={patch} errors={errors} />

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={loading || !colaborador}>
              {loading ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormErroDialog
        open={erroApi !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setErroApi(null);
        }}
        mensagem={erroApi ?? ""}
      />
    </>
  );
}
