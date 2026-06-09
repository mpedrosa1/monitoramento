"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  EMPRESA_PARCEIRA_DOCUMENTO_OPCOES,
  EMPRESA_PARCEIRA_LOCAL_OPCOES,
  type EmpresaParceiraColaboradorForm,
  type EmpresaParceiraDocumentoTipo,
  type EmpresaParceiraLocal,
} from "@/lib/empresa-parceira-missao-form";
import {
  novoEmpresaParceiraColaboradorVazio,
  type MissaoFormState,
} from "@/lib/chamado-missao-form";
import { formatCpfInput, formatRgInput } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EmpresaParceiraMissaoFields({
  form,
  onChange,
}: {
  form: MissaoFormState;
  onChange: (patch: Partial<MissaoFormState>) => void;
}) {
  const localItems = EMPRESA_PARCEIRA_LOCAL_OPCOES.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  const documentoItems = EMPRESA_PARCEIRA_DOCUMENTO_OPCOES.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  function toggleEmpresaParceira(checked: boolean) {
    onChange({
      temEmpresaParceira: checked,
      ...(checked
        ? form.empresaParceiraColaboradores.length === 0
          ? {
              empresaParceiraColaboradores: [
                novoEmpresaParceiraColaboradorVazio(),
              ],
            }
          : {}
        : {
            empresaParceiraNome: "",
            empresaParceiraColaboradores: [],
            empresaParceiraTrabalho: "",
            empresaParceiraLocal: "",
            empresaParceiraLocalOutro: "",
          }),
    });
  }

  function updateColaborador(
    localId: string,
    patch: Partial<Omit<EmpresaParceiraColaboradorForm, "localId">>
  ) {
    onChange({
      empresaParceiraColaboradores: form.empresaParceiraColaboradores.map(
        (c) => (c.localId === localId ? { ...c, ...patch } : c)
      ),
    });
  }

  function addColaborador() {
    onChange({
      empresaParceiraColaboradores: [
        ...form.empresaParceiraColaboradores,
        novoEmpresaParceiraColaboradorVazio(),
      ],
    });
  }

  function removeColaborador(localId: string) {
    onChange({
      empresaParceiraColaboradores: form.empresaParceiraColaboradores.filter(
        (c) => c.localId !== localId
      ),
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Empresa parceira</p>
          <p className="text-xs text-muted-foreground">
            Indique se haverá trabalho conjunto com empresa externa na missão.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.temEmpresaParceira}
            onChange={(e) => toggleEmpresaParceira(e.target.checked)}
            className="h-4 w-4 rounded border border-input"
          />
          Sim
        </label>
      </div>

      {form.temEmpresaParceira && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="grid gap-2">
            <Label htmlFor="empresa-parceira-nome">Nome da empresa</Label>
            <Input
              id="empresa-parceira-nome"
              value={form.empresaParceiraNome}
              onChange={(e) =>
                onChange({ empresaParceiraNome: e.target.value })
              }
              placeholder="Razão social ou nome fantasia"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="empresa-parceira-trabalho">
              Trabalho a ser realizado
            </Label>
            <Input
              id="empresa-parceira-trabalho"
              value={form.empresaParceiraTrabalho}
              onChange={(e) =>
                onChange({ empresaParceiraTrabalho: e.target.value })
              }
              placeholder="Descreva o serviço da empresa parceira"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Local do serviço</Label>
              <Select
                items={localItems}
                value={form.empresaParceiraLocal || null}
                onValueChange={(v) =>
                  onChange({
                    empresaParceiraLocal: (v ??
                      "") as EmpresaParceiraLocal,
                    empresaParceiraLocalOutro:
                      v === "outro" ? form.empresaParceiraLocalOutro : "",
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EMPRESA_PARCEIRA_LOCAL_OPCOES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.empresaParceiraLocal === "outro" && (
              <div className="grid gap-2">
                <Label htmlFor="empresa-parceira-local-outro">
                  Especifique o local
                </Label>
                <Input
                  id="empresa-parceira-local-outro"
                  value={form.empresaParceiraLocalOutro}
                  onChange={(e) =>
                    onChange({ empresaParceiraLocalOutro: e.target.value })
                  }
                  placeholder="Informe o local"
                />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Colaboradores da empresa parceira</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColaborador}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
            {form.empresaParceiraColaboradores.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum colaborador informado.
              </p>
            ) : (
              <ul className="space-y-3">
                {form.empresaParceiraColaboradores.map((c, index) => (
                  <li
                    key={c.localId}
                    className="space-y-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Colaborador {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeColaborador(c.localId)}
                        aria-label="Remover colaborador da empresa parceira"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor={`parceiro-nome-${c.localId}`}>
                          Nome
                        </Label>
                        <Input
                          id={`parceiro-nome-${c.localId}`}
                          value={c.nome}
                          onChange={(e) =>
                            updateColaborador(c.localId, {
                              nome: e.target.value,
                            })
                          }
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Documento</Label>
                        <Select
                          items={documentoItems}
                          value={c.tipoDocumento || null}
                          onValueChange={(v) =>
                            updateColaborador(c.localId, {
                              tipoDocumento: (v ??
                                "") as EmpresaParceiraDocumentoTipo,
                              documento: "",
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="RG ou CPF" />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPRESA_PARCEIRA_DOCUMENTO_OPCOES.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`parceiro-doc-${c.localId}`}>
                          {c.tipoDocumento === "cpf"
                            ? "CPF"
                            : c.tipoDocumento === "rg"
                              ? "RG"
                              : "Número do documento"}
                        </Label>
                        <Input
                          id={`parceiro-doc-${c.localId}`}
                          value={c.documento}
                          onChange={(e) =>
                            updateColaborador(c.localId, {
                              documento:
                                c.tipoDocumento === "cpf"
                                  ? formatCpfInput(e.target.value)
                                  : c.tipoDocumento === "rg"
                                    ? formatRgInput(e.target.value)
                                    : e.target.value,
                            })
                          }
                          placeholder={
                            c.tipoDocumento === "cpf"
                              ? "000.000.000-00"
                              : c.tipoDocumento === "rg"
                                ? "00.000.000"
                                : "Selecione RG ou CPF"
                          }
                          disabled={!c.tipoDocumento}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
