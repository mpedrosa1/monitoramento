"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Colaborador, VeiculoPeriodoMotorista } from "@/lib/types";
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function agoraLocal(): { dataInicio: string; horaInicio: string } {
  const d = new Date();
  return {
    dataInicio: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    horaInicio: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

type FormState = {
  colaboradorId: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  observacao: string;
};

function periodoToForm(p: VeiculoPeriodoMotorista | null): FormState {
  if (!p) {
    const agora = agoraLocal();
    return {
      colaboradorId: "",
      dataInicio: agora.dataInicio,
      horaInicio: agora.horaInicio,
      dataFim: "",
      horaFim: "",
      observacao: "",
    };
  }
  return {
    colaboradorId: p.colaboradorId,
    dataInicio: p.dataInicio,
    horaInicio: p.horaInicio?.trim() || "00:00",
    dataFim: p.dataFim ?? "",
    horaFim: p.horaFim ?? "",
    observacao: p.observacao ?? "",
  };
}

export function VeiculoPeriodoMotoristaFormDialog({
  open,
  onOpenChange,
  veiculoId,
  periodo,
  colaboradores,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
  periodo: VeiculoPeriodoMotorista | null;
  colaboradores: Colaborador[];
  onSuccess: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => periodoToForm(periodo));
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(periodoToForm(periodo));
      setErro(null);
    }
  }, [open, periodo]);

  async function salvar() {
    setErro(null);
    if (!form.colaboradorId) {
      setErro("Selecione o motorista.");
      return;
    }
    if (!form.dataInicio.trim()) {
      setErro("Informe a data de início.");
      return;
    }
    if (!form.horaInicio.trim()) {
      setErro("Informe a hora de início.");
      return;
    }
    if (form.dataFim && form.dataFim < form.dataInicio) {
      setErro("A data de fim não pode ser anterior ao início.");
      return;
    }
    if (
      form.dataFim &&
      form.dataFim === form.dataInicio &&
      form.horaFim &&
      form.horaFim < form.horaInicio
    ) {
      setErro("A hora de fim não pode ser anterior à hora de início.");
      return;
    }

    const body = {
      colaboradorId: form.colaboradorId,
      dataInicio: form.dataInicio,
      horaInicio: form.horaInicio,
      dataFim: form.dataFim.trim() || undefined,
      horaFim: form.dataFim.trim() ? form.horaFim.trim() || undefined : undefined,
      observacao: form.observacao.trim() || undefined,
    };

    setSaving(true);
    try {
      if (periodo) {
        await apiFetch(`/api/v1/veiculos/${veiculoId}/periodos-motorista/${periodo.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/api/v1/veiculos/${veiculoId}/periodos-motorista`, {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {periodo ? "Editar período de motorista" : "Registrar período de motorista"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="periodo-motorista">Motorista</Label>
            <Select
              value={form.colaboradorId || null}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, colaboradorId: v ?? "" }))
              }
            >
              <SelectTrigger id="periodo-motorista" className="w-full">
                <SelectValue placeholder="Selecione…">
                  {motoristaSelecionado?.nome}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colaboradoresOrdenados.map((c) => (
                  <SelectItem key={c.id} value={c.id} label={c.nome}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="periodo-inicio">Data de início</Label>
              <Input
                id="periodo-inicio"
                type="date"
                value={form.dataInicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dataInicio: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="periodo-hora-inicio">Hora de início</Label>
              <Input
                id="periodo-hora-inicio"
                type="time"
                value={form.horaInicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horaInicio: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="periodo-fim">Data de fim</Label>
              <Input
                id="periodo-fim"
                type="date"
                value={form.dataFim}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dataFim: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="periodo-hora-fim">Hora de fim</Label>
              <Input
                id="periodo-hora-fim"
                type="time"
                value={form.horaFim}
                disabled={!form.dataFim.trim()}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horaFim: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="periodo-obs">Observação</Label>
            <textarea
              id="periodo-obs"
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
