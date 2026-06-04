"use client";

import { BookOpen, Plus, Trash2 } from "lucide-react";
import { snmpTipoDadoLabel } from "@/lib/labels";
import {
  SNMP_MIB2_PRESETS,
  SNMP_TIPOS_DADO,
  newSnmpPonto,
} from "@/lib/snmp-presets";
import type { SnmpPonto, SnmpTipoDado } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function SnmpPontosEditor({
  community,
  onCommunityChange,
  pontos,
  onChange,
}: {
  community: string;
  onCommunityChange: (v: string) => void;
  pontos: SnmpPonto[];
  onChange: (pontos: SnmpPonto[]) => void;
}) {
  function updatePonto(localId: string, patch: Partial<SnmpPonto>) {
    onChange(
      pontos.map((p) => (p._localId === localId ? { ...p, ...patch } : p))
    );
  }

  function removePonto(localId: string) {
    onChange(pontos.filter((p) => p._localId !== localId));
  }

  function addPreset(presetIndex: number) {
    const preset = SNMP_MIB2_PRESETS[presetIndex];
    if (pontos.some((p) => p.oid === preset.oid)) return;
    onChange([...pontos, newSnmpPonto(preset)]);
  }

  function addBlank() {
    onChange([...pontos, newSnmpPonto()]);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Pontos de dados SNMP</p>
          <p className="text-xs text-muted-foreground">
            Configure cada OID como um ponto nomeado, similar ao Scada-LTS.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {pontos.filter((p) => !p.desabilitado).length} ativo(s)
        </Badge>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="snmp-community">Community (SNMP v2c)</Label>
        <Input
          id="snmp-community"
          value={community}
          onChange={(e) => onCommunityChange(e.target.value)}
          placeholder="public"
          className="max-w-xs"
        />
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value=""
          onValueChange={(v) => {
            if (v !== "") addPreset(Number(v));
          }}
        >
          <SelectTrigger className="w-[220px]" size="sm">
            <BookOpen className="mr-1.5 h-3.5 w-3.5 opacity-70" />
            <SelectValue placeholder="Adicionar preset MIB-2" />
          </SelectTrigger>
          <SelectContent>
            {SNMP_MIB2_PRESETS.map((preset, i) => (
              <SelectItem key={preset.oid} value={String(i)}>
                {preset.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="secondary" size="sm" onClick={addBlank}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Ponto personalizado
        </Button>
      </div>

      {pontos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum ponto configurado. Adicione um preset MIB-2 ou um ponto
          personalizado.
        </p>
      ) : (
        <ScrollArea className="max-h-[320px] pr-3">
          <div className="space-y-3">
            {pontos.map((ponto, index) => (
              <div
                key={ponto._localId}
                className={`rounded-lg border bg-card p-3 shadow-xs ${
                  ponto.desabilitado
                    ? "border-border/60 opacity-60"
                    : "border-border"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Ponto #{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!!ponto.desabilitado}
                        onChange={(e) =>
                          updatePonto(ponto._localId!, {
                            desabilitado: e.target.checked,
                          })
                        }
                        className="rounded border-input"
                      />
                      Desabilitado
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removePonto(ponto._localId!)}
                      aria-label="Remover ponto"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="text-xs">Nome do ponto</Label>
                    <Input
                      value={ponto.nome}
                      onChange={(e) =>
                        updatePonto(ponto._localId!, { nome: e.target.value })
                      }
                      placeholder="Ex.: Temperatura bateria"
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="text-xs">OID</Label>
                    <Input
                      value={ponto.oid}
                      onChange={(e) =>
                        updatePonto(ponto._localId!, { oid: e.target.value })
                      }
                      placeholder="1.3.6.1.2.1.1.3.0"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Tipo de dado</Label>
                    <Select
                      value={ponto.tipoDado ?? "numerico"}
                      onValueChange={(v) =>
                        updatePonto(ponto._localId!, {
                          tipoDado: v as SnmpTipoDado,
                        })
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SNMP_TIPOS_DADO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {snmpTipoDadoLabel[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Unidade de engenharia</Label>
                    <Input
                      value={ponto.unidade ?? ""}
                      onChange={(e) =>
                        updatePonto(ponto._localId!, {
                          unidade: e.target.value,
                        })
                      }
                      placeholder="°C, V, %, timeticks…"
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="text-xs">Descrição (opcional)</Label>
                    <Input
                      value={ponto.descricao ?? ""}
                      onChange={(e) =>
                        updatePonto(ponto._localId!, {
                          descricao: e.target.value,
                        })
                      }
                      placeholder="Notas sobre este ponto de leitura"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
