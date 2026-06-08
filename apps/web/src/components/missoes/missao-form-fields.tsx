"use client";

import {
  MISSAO_STATUS_OPCOES,
  type MissaoFormState,
} from "@/lib/missao-form";
import type { Chamado, Colaborador, Unidade } from "@/lib/types";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MissaoFormFields({
  form,
  onChange,
  unidades,
  chamados,
  colaboradores,
}: {
  form: MissaoFormState;
  onChange: (patch: Partial<MissaoFormState>) => void;
  unidades: Unidade[];
  chamados: Chamado[];
  colaboradores: Colaborador[];
}) {
  const statusItems = MISSAO_STATUS_OPCOES.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  const unidadeItems = unidades.map((u) => ({
    value: u.id,
    label: `${u.codigo} — ${u.nome}`,
  }));
  const chamadosUnidade = chamados.filter(
    (c) => !form.unidadeId || c.unidadeId === form.unidadeId
  );
  const chamadoItems = [
    { value: "", label: "Nenhum" },
    ...chamadosUnidade.map((c) => ({
      value: c.id,
      label: c.numero
        ? formatNumeroExibicao(c.numero)
        : c.titulo,
    })),
  ];

  function toggleColaborador(id: string) {
    onChange({
      colaboradorIds: form.colaboradorIds.includes(id)
        ? form.colaboradorIds.filter((x) => x !== id)
        : [...form.colaboradorIds, id],
    });
  }

  return (
    <div className="grid gap-4 py-1">
      <div className="grid gap-2">
        <Label htmlFor="missao-titulo">Título</Label>
        <Input
          id="missao-titulo"
          value={form.titulo}
          onChange={(e) => onChange({ titulo: e.target.value })}
          placeholder="Descrição breve da missão"
        />
      </div>
      <div className="grid gap-2">
        <Label>Status</Label>
        <Select
          items={statusItems}
          value={form.status || null}
          onValueChange={(v) =>
            onChange({ status: (v ?? "") as MissaoFormState["status"] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {MISSAO_STATUS_OPCOES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Unidade</Label>
        <Select
          items={unidadeItems}
          value={form.unidadeId || null}
          onValueChange={(v) =>
            onChange({
              unidadeId: v ?? "",
              chamadoId:
                v && form.chamadoId
                  ? chamados.find((c) => c.id === form.chamadoId)
                      ?.unidadeId === v
                    ? form.chamadoId
                    : ""
                  : "",
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a unidade" />
          </SelectTrigger>
          <SelectContent>
            {unidades.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.codigo} — {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Chamado vinculado (opcional)</Label>
        <Select
          items={chamadoItems}
          value={form.chamadoId || ""}
          onValueChange={(v) => onChange({ chamadoId: v ?? "" })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {chamadosUnidade.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.numero ? formatNumeroExibicao(c.numero) : c.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Colaboradores</Label>
        {colaboradores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum colaborador cadastrado.
          </p>
        ) : (
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
            {colaboradores.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm ${
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
                <span>{c.nome}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
