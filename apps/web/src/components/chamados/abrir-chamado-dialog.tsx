"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  buildEmailAssunto,
  buildEmailCorpo,
  COMUNICACAO_OPCOES,
  formatNumeroExibicao,
  SINAIS_OPCOES,
} from "@/lib/chamado-email";
import {
  emailInputFromForm,
  emptyAbrirChamadoForm,
  formToChamadoBody,
  unidadeNomePorId,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function MultiCheckboxGroup({
  label,
  options,
  selected,
  onChange,
  outrosValue,
  onOutrosChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  outrosValue: string;
  onOutrosChange: (v: string) => void;
}) {
  function toggle(opt: string) {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  }

  return (
    <div className="grid gap-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
              selected.includes(opt)
                ? "border-primary bg-primary/10"
                : "border-border"
            }`}
          >
            <input
              type="checkbox"
              className="rounded border-input"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
      {selected.includes("Outros") && (
        <Input
          value={outrosValue}
          onChange={(e) => onOutrosChange(e.target.value)}
          placeholder="Descreva «Outros»"
          className="text-sm"
        />
      )}
    </div>
  );
}

export function AbrirChamadoDialog({
  unidades,
  fixedUnidadeId,
  onSuccess,
  triggerLabel = "Abrir Chamado",
}: {
  unidades: Unidade[];
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

  const unidadeTravada = Boolean(fixedUnidadeId);
  const estavaAberto = useRef(false);

  // Só reinicia o formulário ao abrir o modal — não em re-renders (ex.: ping/WebSocket).
  useEffect(() => {
    if (open && !estavaAberto.current) {
      setForm(
        emptyAbrirChamadoForm(fixedUnidadeId ?? unidades[0]?.id ?? "")
      );
    }
    estavaAberto.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unidades só na abertura
  }, [open, fixedUnidadeId]);

  function patch(p: Partial<AbrirChamadoFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  const unidadeItems = useMemo(
    () => unidades.map((u) => ({ value: u.id, label: u.nome })),
    [unidades]
  );

  const emailPreview = useMemo(() => {
    const input = emailInputFromForm(form, unidades);
    if (!input.unidadeNome && form.unidadeId) {
      input.unidadeNome = unidadeNomePorId(unidades, form.unidadeId);
    }
    return {
      assunto: buildEmailAssunto(input),
      corpo: buildEmailCorpo(input),
    };
  }, [form, unidades]);

  const unidadeLabel = unidadeNomePorId(
    unidades,
    fixedUnidadeId ?? form.unidadeId
  );

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

        <div className="grid gap-4 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ch-numero">Número do chamado</Label>
              <Input
                id="ch-numero"
                value={form.numero}
                onChange={(e) =>
                  patch({
                    numero: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                placeholder="#000000"
                inputMode="numeric"
              />
              {form.numero && (
                <p className="text-xs text-muted-foreground">
                  {formatNumeroExibicao(form.numero)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Unidade</Label>
              {unidadeTravada ? (
                <Input value={unidadeLabel} readOnly disabled className="bg-muted/40" />
              ) : (
                <Select
                  items={unidadeItems}
                  value={form.unidadeId || null}
                  onValueChange={(v) => patch({ unidadeId: v ?? "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ch-aberto-por">Chamado aberto por</Label>
            <Input
              id="ch-aberto-por"
              value={form.abertoPor}
              onChange={(e) => patch({ abertoPor: e.target.value })}
              placeholder="Nome de quem ligou"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="ch-data">Data</Label>
              <Input
                id="ch-data"
                type="date"
                value={form.dataIso}
                onChange={(e) => patch({ dataIso: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ch-hora">Hora</Label>
              <Input
                id="ch-hora"
                type="time"
                value={form.hora}
                onChange={(e) => patch({ hora: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ch-hora-teste">Hora do teste</Label>
              <Input
                id="ch-hora-teste"
                type="time"
                value={form.horaTeste}
                onChange={(e) => patch({ horaTeste: e.target.value })}
              />
            </div>
          </div>

          <MultiCheckboxGroup
            label="Sinais detectados"
            options={SINAIS_OPCOES}
            selected={form.sinais}
            onChange={(sinais) => patch({ sinais })}
            outrosValue={form.sinaisOutros}
            onOutrosChange={(sinaisOutros) => patch({ sinaisOutros })}
          />

          <div className="grid gap-2">
            <Label htmlFor="ch-locais">Locais afetados</Label>
            <Input
              id="ch-locais"
              value={form.locaisAfetados}
              onChange={(e) => patch({ locaisAfetados: e.target.value })}
              placeholder="Ex.: Ala norte, setor administrativo"
            />
          </div>

          <MultiCheckboxGroup
            label="Comunicação"
            options={COMUNICACAO_OPCOES}
            selected={form.comunicacao}
            onChange={(comunicacao) => patch({ comunicacao })}
            outrosValue={form.comunicacaoOutros}
            onOutrosChange={(comunicacaoOutros) => patch({ comunicacaoOutros })}
          />

          <Separator />

          <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
            <p className="text-sm font-medium">E-mail</p>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Assunto</Label>
              <Input
                readOnly
                value={emailPreview.assunto}
                className="bg-background font-mono text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Corpo</Label>
              <textarea
                readOnly
                rows={10}
                value={emailPreview.corpo}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none"
              />
            </div>
          </div>
        </div>

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
