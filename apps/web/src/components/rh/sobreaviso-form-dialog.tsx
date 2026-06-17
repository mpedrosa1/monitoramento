"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Colaborador, EscalaTrabalho, Sobreaviso } from "@/lib/types";
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
  colaboradorId: string;
  escalaId: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  observacao: string;
};

const SEM_ESCALA = "__sem_escala__";

function sobreavisoToForm(
  s: Sobreaviso | null,
  dataPadrao?: string
): FormState {
  if (!s) {
    return {
      colaboradorId: "",
      escalaId: "",
      dataInicio: dataPadrao ?? "",
      horaInicio: "08:00",
      dataFim: dataPadrao ?? "",
      horaFim: "08:00",
      observacao: "",
    };
  }
  return {
    colaboradorId: s.colaboradorId ?? "",
    escalaId: s.escalaId ?? "",
    dataInicio: s.dataInicio ?? "",
    horaInicio: s.horaInicio ?? "",
    dataFim: s.dataFim ?? "",
    horaFim: s.horaFim ?? "",
    observacao: s.observacao ?? "",
  };
}

export function SobreavisoFormDialog({
  open,
  onOpenChange,
  sobreaviso,
  dataPadrao,
  colaboradores,
  escalas,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sobreaviso: Sobreaviso | null;
  dataPadrao?: string;
  colaboradores: Colaborador[];
  escalas: EscalaTrabalho[];
  onSuccess: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() =>
    sobreavisoToForm(sobreaviso, dataPadrao)
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(sobreavisoToForm(sobreaviso, dataPadrao));
      setErro(null);
    }
  }, [open, sobreaviso, dataPadrao]);

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function salvar() {
    if (!form.colaboradorId) {
      setErro("Selecione o colaborador.");
      return;
    }
    if (!form.dataInicio || !form.dataFim) {
      setErro("Informe o período (início e fim).");
      return;
    }
    const inicio = `${form.dataInicio}T${form.horaInicio || "00:00"}`;
    const fim = `${form.dataFim}T${form.horaFim || "00:00"}`;
    if (fim < inicio) {
      setErro("O fim não pode ser anterior ao início.");
      return;
    }
    setLoading(true);
    setErro(null);
    const body = {
      colaboradorId: form.colaboradorId,
      escalaId: form.escalaId || undefined,
      dataInicio: form.dataInicio,
      horaInicio: form.horaInicio || undefined,
      dataFim: form.dataFim,
      horaFim: form.horaFim || undefined,
      observacao: form.observacao.trim() || undefined,
    };
    try {
      if (sobreaviso) {
        await apiFetch(`/api/v1/sobreavisos/${sobreaviso.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/api/v1/sobreavisos`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar sobreaviso.");
    } finally {
      setLoading(false);
    }
  }

  const colaboradorItems = colaboradores.map((c) => ({
    value: c.id,
    label: c.nome,
  }));
  const escalaItems = [
    { value: SEM_ESCALA, label: "Sem escala vinculada" },
    ...escalas.map((e) => ({ value: e.id, label: e.nome })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sobreaviso ? "Editar sobreaviso" : "Novo sobreaviso"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {erro && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <div className="grid gap-2">
            <Label>Colaborador</Label>
            <Select
              items={colaboradorItems}
              value={form.colaboradorId || null}
              onValueChange={(v) => patch({ colaboradorId: (v ?? "") as string })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Início</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="sobre-inicio"
                type="date"
                value={form.dataInicio}
                onChange={(e) => patch({ dataInicio: e.target.value })}
              />
              <Input
                aria-label="Hora de início"
                type="time"
                value={form.horaInicio}
                onChange={(e) => patch({ horaInicio: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Fim</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="sobre-fim"
                type="date"
                value={form.dataFim}
                onChange={(e) => patch({ dataFim: e.target.value })}
              />
              <Input
                aria-label="Hora de término"
                type="time"
                value={form.horaFim}
                onChange={(e) => patch({ horaFim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Escala vinculada (opcional)</Label>
            <Select
              items={escalaItems}
              value={form.escalaId || SEM_ESCALA}
              onValueChange={(v) =>
                patch({ escalaId: v === SEM_ESCALA ? "" : ((v ?? "") as string) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem escala vinculada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_ESCALA}>Sem escala vinculada</SelectItem>
                {escalas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sobre-obs">Observação</Label>
            <Input
              id="sobre-obs"
              value={form.observacao}
              onChange={(e) => patch({ observacao: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={loading}>
            {loading
              ? "Salvando…"
              : sobreaviso
                ? "Salvar alterações"
                : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
