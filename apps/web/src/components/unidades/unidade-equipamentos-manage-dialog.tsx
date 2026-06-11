"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type { DeviceMetric, Equipamento, Unidade, UnidadeEquipamento } from "@/lib/types";
import { monitorTargetId } from "@/lib/types";
import {
  agruparEquipamentosUnidade,
  detalheVinculoEquipamento,
  formToUnidadeBody,
  nomeEquipamentoVinculo,
  nomeMaquinaVinculo,
  nomeSensorMaquina,
  parseSlaveIdInput,
  portaEquipamentoEmUso,
  unidadeToForm,
  vinculoEquipamentoKey,
} from "@/lib/unidade-form";
import { Badge } from "@/components/ui/badge";
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
import { UnidadeNovoEquipamentoDialog } from "@/components/unidades/unidade-novo-equipamento-dialog";

export function UnidadeEquipamentosManageDialog({
  open,
  onOpenChange,
  unidade,
  catalogo,
  metricMap,
  onUnidadeUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  onUnidadeUpdated: (unidade: Unidade) => void;
}) {
  const [equipamentos, setEquipamentos] = useState<UnidadeEquipamento[]>(() =>
    asArray(unidade.equipamentos)
  );
  const [novoEquipOpen, setNovoEquipOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const equipamentosRef = useRef(equipamentos);
  equipamentosRef.current = equipamentos;

  useEffect(() => {
    if (open) {
      setEquipamentos(asArray(unidade.equipamentos));
    }
  }, [open, unidade.id, unidade.equipamentos]);

  const paginaWebItems = useMemo(
    () => [
      { value: "nao", label: "Não" },
      { value: "sim", label: "Sim" },
    ],
    []
  );

  const equipamentosAgrupados = useMemo(
    () => agruparEquipamentosUnidade(equipamentos),
    [equipamentos]
  );

  async function persist(next: UnidadeEquipamento[]) {
    setSaving(true);
    try {
      const form = unidadeToForm(unidade);
      const updated = await apiFetch<Unidade>(`/api/v1/unidades/${unidade.id}`, {
        method: "PUT",
        body: JSON.stringify(
          formToUnidadeBody({ ...form, equipamentos: next }, unidade)
        ),
      });
      const saved = asArray(updated.equipamentos);
      setEquipamentos(saved);
      onUnidadeUpdated(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar equipamentos";
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  }

  function updateVinculo(localId: string, patch: Partial<UnidadeEquipamento>) {
    const next = equipamentos.map((l, i) =>
      vinculoEquipamentoKey(l, i) === localId ? { ...l, ...patch } : l
    );
    setEquipamentos(next);
    void persist(next);
  }

  function removeEquipamento(localId: string) {
    const next = equipamentos.filter(
      (l, i) => vinculoEquipamentoKey(l, i) !== localId
    );
    setEquipamentos(next);
    void persist(next);
  }

  function removeMaquina(maquinaId: string) {
    const next = equipamentos.filter((l) => l.maquinaId?.trim() !== maquinaId);
    setEquipamentos(next);
    void persist(next);
  }

  function updateMaquinaGrupo(
    maquinaId: string,
    patch: Partial<UnidadeEquipamento>
  ) {
    const next = equipamentos.map((l) =>
      l.maquinaId?.trim() === maquinaId ? { ...l, ...patch } : l
    );
    setEquipamentos(next);
    void persist(next);
  }

  function nomeEquipCatalogo(id: string) {
    return catalogo.find((e) => e.id === id)?.nome ?? id;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Equipamentos
              {saving ? (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Salvando…
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {catalogo.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum equipamento no catálogo. Cadastre em Equipamentos primeiro.
              </p>
            ) : equipamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum equipamento vinculado.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {equipamentosAgrupados.map((grupo) => {
                  if (grupo.tipo === "maquina") {
                    const linkRef = grupo.links[0];
                    const maquinaNome = nomeMaquinaVinculo(linkRef);
                    return (
                      <li
                        key={grupo.maquinaId}
                        className="space-y-2 px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{maquinaNome}</p>
                            <p className="text-xs text-muted-foreground">
                              Máquina · porta {linkRef.porta} ·{" "}
                              {grupo.links.length} sensor
                              {grupo.links.length === 1 ? "" : "es"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeMaquina(grupo.maquinaId)}
                            disabled={saving}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <ul className="space-y-2 rounded-md border border-border bg-muted/20 px-2 py-2">
                          {grupo.links.map((link, sensorIndex) => {
                            const eq = catalogo.find(
                              (e) => e.id === link.equipamentoId
                            );
                            const listIndex = grupo.indices[sensorIndex];
                            const localId = vinculoEquipamentoKey(link, listIndex);
                            const targetId = monitorTargetId(
                              unidade.id,
                              link.equipamentoId,
                              link.porta
                            );
                            const m = metricMap.get(targetId);
                            return (
                              <li key={localId} className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 truncate font-medium text-foreground">
                                    {nomeSensorMaquina(link, eq)}
                                  </span>
                                  {m ? (
                                    <Badge
                                      variant={m.online ? "default" : "destructive"}
                                      className="shrink-0 text-[10px]"
                                    >
                                      {m.online ? "Online" : "Offline"}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-[11px]">Slave ID</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={255}
                                    value={link.slaveId ?? ""}
                                    disabled={saving}
                                    onChange={(e) => {
                                      const parsed = parseSlaveIdInput(
                                        e.target.value
                                      );
                                      if (
                                        e.target.value !== "" &&
                                        parsed == null
                                      ) {
                                        return;
                                      }
                                      updateVinculo(localId, {
                                        slaveId: parsed ?? undefined,
                                      });
                                    }}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Porta</Label>
                          <Input
                            type="number"
                            min={0}
                            value={linkRef.porta}
                            disabled={saving}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const parsed = Number.parseInt(raw, 10);
                              if (raw !== "" && !Number.isFinite(parsed)) return;
                              if (
                                Number.isFinite(parsed) &&
                                parsed >= 0 &&
                                portaEquipamentoEmUso(equipamentos, parsed, {
                                  maquinaId: grupo.maquinaId,
                                })
                              ) {
                                return;
                              }
                              updateMaquinaGrupo(grupo.maquinaId, {
                                porta: Number.isFinite(parsed)
                                  ? parsed
                                  : linkRef.porta,
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Possui página web?</Label>
                            <Select
                              items={paginaWebItems}
                              value={linkRef.paginaWeb ? "sim" : "nao"}
                              disabled={saving}
                              onValueChange={(v) => {
                                const sim = v === "sim";
                                updateMaquinaGrupo(grupo.maquinaId, {
                                  paginaWeb: sim,
                                  portaWeb: sim
                                    ? linkRef.portaWeb ?? 80
                                    : undefined,
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nao">Não</SelectItem>
                                <SelectItem value="sim">Sim</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {linkRef.paginaWeb ? (
                            <div className="grid gap-1.5">
                              <Label className="text-xs">Porta web</Label>
                              <Input
                                type="number"
                                min={1}
                                max={65535}
                                value={linkRef.portaWeb ?? ""}
                                disabled={saving}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  updateMaquinaGrupo(grupo.maquinaId, {
                                    portaWeb:
                                      raw === ""
                                        ? undefined
                                        : Number.parseInt(raw, 10) || undefined,
                                  });
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                          ) : (
                            <div className="hidden sm:block" aria-hidden />
                          )}
                        </div>
                      </li>
                    );
                  }

                  const link = grupo.link;
                  const index = grupo.index;
                  const eq = catalogo.find((e) => e.id === link.equipamentoId);
                  const localId = vinculoEquipamentoKey(link, index);
                  const targetId = monitorTargetId(
                    unidade.id,
                    link.equipamentoId,
                    link.porta
                  );
                  const m = metricMap.get(targetId);
                  const catalogoNome = nomeEquipCatalogo(link.equipamentoId);
                  return (
                    <li key={localId} className="space-y-2 px-3 py-2.5 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {nomeEquipamentoVinculo(link, eq)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Catálogo: {detalheVinculoEquipamento(link, eq)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {m ? (
                            <Badge variant={m.online ? "default" : "destructive"}>
                              {m.online ? "Online" : "Offline"}
                            </Badge>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeEquipamento(localId)}
                            disabled={saving}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          Nome nesta unidade (opcional)
                        </Label>
                        <Input
                          value={link.nomeLocal ?? ""}
                          disabled={saving}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEquipamentos((prev) =>
                              prev.map((l, i) =>
                                vinculoEquipamentoKey(l, i) === localId
                                  ? { ...l, nomeLocal: value }
                                  : l
                              )
                            );
                          }}
                          onBlur={() => void persist(equipamentosRef.current)}
                          placeholder={catalogoNome}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Possui página web?</Label>
                          <Select
                            items={paginaWebItems}
                            value={link.paginaWeb ? "sim" : "nao"}
                            disabled={saving}
                            onValueChange={(v) => {
                              const sim = v === "sim";
                              updateVinculo(localId, {
                                paginaWeb: sim,
                                portaWeb: sim ? link.portaWeb ?? 80 : undefined,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nao">Não</SelectItem>
                              <SelectItem value="sim">Sim</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {link.paginaWeb ? (
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Porta web</Label>
                            <Input
                              type="number"
                              min={1}
                              max={65535}
                              value={link.portaWeb ?? ""}
                              disabled={saving}
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateVinculo(localId, {
                                  portaWeb:
                                    raw === ""
                                      ? undefined
                                      : Number.parseInt(raw, 10) || undefined,
                                });
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="hidden sm:block" aria-hidden />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {catalogo.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setNovoEquipOpen(true)}
                disabled={saving}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo equipamento
              </Button>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnidadeNovoEquipamentoDialog
        open={novoEquipOpen}
        onOpenChange={setNovoEquipOpen}
        catalogo={catalogo}
        equipamentos={equipamentos}
        onAdd={(vinculos) => {
          const next = [...equipamentos, ...vinculos];
          setEquipamentos(next);
          void persist(next);
        }}
      />
    </>
  );
}
