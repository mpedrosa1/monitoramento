"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  clearColaboradorFormErrorsForPatch,
  emptyColaboradorForm,
  formToColaboradorBody,
  hasColaboradorFormErrors,
  scrollToFirstColaboradorFormError,
  senhaInicialFromDataNascimento,
  validateColaboradorForm,
  type ColaboradorFormErrors,
  type ColaboradorFormState,
} from "@/lib/colaborador-form";
import type { Colaborador } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import { resolveAuthUserPermissoes, resolveAuthUserTipoAcesso } from "@/lib/auth-session";
import { ColaboradorFormFields } from "@/components/colaboradores/colaborador-form-fields";
import { FormErroDialog } from "@/components/colaboradores/form-erro-dialog";
import { SenhaInicialColaboradorDialog } from "@/components/colaboradores/senha-inicial-colaborador-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AdicionarColaboradorDialog({
  onSuccess,
}: {
  onSuccess?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ColaboradorFormState>(emptyColaboradorForm);
  const [errors, setErrors] = useState<ColaboradorFormErrors>({});
  const [senhaDialog, setSenhaDialog] = useState<{
    nome: string;
    senha: string;
  } | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const estavaAberto = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && !estavaAberto.current) {
      setForm(emptyColaboradorForm());
      setErrors({});
    }
    estavaAberto.current = open;
  }, [open]);

  function patch(p: Partial<ColaboradorFormState>) {
    setForm((f) => ({ ...f, ...p }));
    setErrors((prev) => clearColaboradorFormErrorsForPatch(prev, p));
  }

  async function salvar() {
    const validation = validateColaboradorForm(form, {
      editorTipoAcesso: resolveAuthUserTipoAcesso(user),
      editorPermissoesAdmin: resolveAuthUserPermissoes(user),
    });
    if (hasColaboradorFormErrors(validation)) {
      setErrors(validation);
      scrollToFirstColaboradorFormError(validation);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await apiFetch<Colaborador>("/api/v1/colaboradores", {
        method: "POST",
        body: JSON.stringify(formToColaboradorBody(form)),
      });
      const nome = form.nome.trim();
      const senha = senhaInicialFromDataNascimento(form.dataNascimento);
      setOpen(false);
      await onSuccess?.();
      setSenhaDialog({ nome, senha });
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button />}>Adicionar colaborador</DialogTrigger>
        <DialogContent className="flex max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo colaborador</DialogTitle>
          </DialogHeader>

          <ColaboradorFormFields form={form} onChange={patch} errors={errors} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={loading}>
              {loading ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SenhaInicialColaboradorDialog
        open={senhaDialog !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setSenhaDialog(null);
        }}
        nome={senhaDialog?.nome ?? ""}
        senha={senhaDialog?.senha ?? ""}
      />

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
