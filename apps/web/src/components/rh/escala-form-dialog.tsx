"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  ESCALA_CORES,
  ESCALA_TIPOS,
  descricaoEscalaTipo,
} from "@/lib/escala-presets";
import type { Colaborador, EscalaTrabalho } from "@/lib/types";
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
  nome: string;
  tipo: string;
  horaInicio: string;
  horaFim: string;
  cor: string;
  observacao: string;
  colaboradorIds: string[];
  ativo: boolean;
};

function escalaToForm(e: EscalaTrabalho | null): FormState {
  if (!e) {
    return {
      nome: "",
      tipo: "12x36",
      horaInicio: "07:00",
      horaFim: "19:00",
      cor: ESCALA_CORES[0],
      observacao: "",
      colaboradorIds: [],
      ativo: true,
    };
  }
  return {
    nome: e.nome ?? "",
    tipo: e.tipo ?? "personalizada",
    horaInicio: e.horaInicio ?? "",
    horaFim: e.horaFim ?? "",
    cor: e.cor || ESCALA_CORES[0],
    observacao: e.observacao ?? "",
    colaboradorIds: e.colaboradorIds ?? [],
    ativo: e.ativo ?? true,
  };
}

export function EscalaFormDialog({
  open,
  onOpenChange,
  escala,
  colaboradores,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escala: EscalaTrabalho | null;
  colaboradores: Colaborador[];
  onSuccess: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => escalaToForm(escala));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(escalaToForm(escala));
      setErro(null);
    }
  }, [open, escala]);

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function onTipoChange(tipo: string) {
    const preset = ESCALA_TIPOS.find((t) => t.value === tipo);
    setForm((f) => ({
      ...f,
      tipo,
      horaInicio: preset?.horaInicio ?? f.horaInicio,
      horaFim: preset?.horaFim ?? f.horaFim,
    }));
  }

  function toggleColaborador(id: string) {
    setForm((f) => ({
      ...f,
      colaboradorIds: f.colaboradorIds.includes(id)
        ? f.colaboradorIds.filter((x) => x !== id)
        : [...f.colaboradorIds, id],
    }));
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro("Informe o nome da escala.");
      return;
    }
    setLoading(true);
    setErro(null);
    const body = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      horaInicio: form.horaInicio || undefined,
      horaFim: form.horaFim || undefined,
      cor: form.cor || undefined,
      observacao: form.observacao.trim() || undefined,
      colaboradorIds: form.colaboradorIds,
      ativo: form.ativo,
    };
    try {
      if (escala) {
        await apiFetch(`/api/v1/escalas/${escala.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/api/v1/escalas`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar escala.");
    } finally {
      setLoading(false);
    }
  }

  const tipoItems = ESCALA_TIPOS.map((t) => ({ value: t.value, label: t.label }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {escala ? "Editar escala" : "Nova escala de trabalho"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 overflow-y-auto py-1 pr-1">
          {erro && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="escala-nome">Nome</Label>
            <Input
              id="escala-nome"
              value={form.nome}
              onChange={(e) => patch({ nome: e.target.value })}
              placeholder="Ex.: Escala 12x36 — Plantão diurno"
            />
          </div>

          <div className="grid gap-2">
            <Label>Tipo de escala</Label>
            <Select
              items={tipoItems}
              value={form.tipo || null}
              onValueChange={(v) => onTipoChange((v ?? "") as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ESCALA_TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {descricaoEscalaTipo(form.tipo)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="escala-inicio">Hora de início</Label>
              <Input
                id="escala-inicio"
                type="time"
                value={form.horaInicio}
                onChange={(e) => patch({ horaInicio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="escala-fim">Hora de término</Label>
              <Input
                id="escala-fim"
                type="time"
                value={form.horaFim}
                onChange={(e) => patch({ horaFim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Cor (identificação no calendário)</Label>
            <div className="flex flex-wrap gap-2">
              {ESCALA_CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => patch({ cor })}
                  aria-label={`Cor ${cor}`}
                  className={[
                    "h-7 w-7 rounded-full border-2 transition",
                    form.cor === cor
                      ? "border-foreground"
                      : "border-transparent",
                  ].join(" ")}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="escala-obs">Observação</Label>
            <Input
              id="escala-obs"
              value={form.observacao}
              onChange={(e) => patch({ observacao: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="grid gap-2">
            <Label>Colaboradores nesta escala</Label>
            {colaboradores.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum colaborador cadastrado.
              </p>
            ) : (
              <div className="grid max-h-44 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
                {colaboradores.map((c) => (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                      form.colaboradorIds.includes(c.id)
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      checked={form.colaboradorIds.includes(c.id)}
                      onChange={() => toggleColaborador(c.id)}
                    />
                    <span className="truncate">{c.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label
            htmlFor="escala-ativo"
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <span className="text-sm font-medium">Escala ativa</span>
            <button
              id="escala-ativo"
              type="button"
              role="switch"
              aria-checked={form.ativo}
              onClick={() => patch({ ativo: !form.ativo })}
              className={[
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                form.ativo ? "bg-primary" : "bg-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                  form.ativo ? "translate-x-5" : "translate-x-0.5",
                ].join(" ")}
              />
            </button>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={loading}>
            {loading ? "Salvando…" : escala ? "Salvar alterações" : "Criar escala"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
