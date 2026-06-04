"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  tipoEquipamentoLabel,
  tipoMonitoramentoLabel,
} from "@/lib/labels";
import type { Equipamento, Unidade, UnidadeEquipamento } from "@/lib/types";
import { monitorTargetId } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EntityFormDialog } from "@/components/crud/entity-form-dialog";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UnidadesPage() {
  const { status, metrics } = useMonitoring();
  const [list, setList] = useState<Unidade[]>([]);
  const [catalogo, setCatalogo] = useState<Equipamento[]>([]);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [endereco, setEndereco] = useState("");
  const [ip, setIp] = useState("");
  const [intervaloS, setIntervaloS] = useState("30");

  const [configOpen, setConfigOpen] = useState(false);
  const [editing, setEditing] = useState<Unidade | null>(null);
  const [editIP, setEditIP] = useState("");
  const [editIntervaloS, setEditIntervaloS] = useState("30");
  const [editLinks, setEditLinks] = useState<UnidadeEquipamento[]>([]);
  const [newEquipId, setNewEquipId] = useState("");
  const [newPorta, setNewPorta] = useState("502");

  const metricMap = useMemo(() => {
    const map = new Map<string, (typeof metrics)[0]>();
    for (const m of metrics) {
      map.set(m.targetId || m.dispositivoId, m);
    }
    return map;
  }, [metrics]);

  const equipNome = useMemo(() => {
    const map = new Map(catalogo.map((e) => [e.id, e.nome]));
    return (id: string) => map.get(id) ?? id;
  }, [catalogo]);

  const load = useCallback(async () => {
    const [uns, eqs] = await Promise.all([
      apiFetch<Unidade[]>("/api/v1/unidades"),
      apiFetch<Equipamento[]>("/api/v1/equipamentos"),
    ]);
    setList(uns);
    setCatalogo(eqs);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    await apiFetch<Unidade>("/api/v1/unidades", {
      method: "POST",
      body: JSON.stringify({
        nome,
        codigo,
        endereco,
        ip,
        intervaloS: parseInt(intervaloS, 10) || 30,
        equipamentos: [],
      }),
    });
    setNome("");
    setCodigo("");
    setEndereco("");
    setIp("");
    setIntervaloS("30");
    await load();
  }

  function openConfig(u: Unidade) {
    setEditing(u);
    setEditIP(u.ip ?? "");
    setEditIntervaloS(String(u.intervaloS || 30));
    setEditLinks(u.equipamentos ?? []);
    setNewEquipId(catalogo[0]?.id ?? "");
    setNewPorta("502");
    setConfigOpen(true);
  }

  function addLink() {
    if (!newEquipId) return;
    if (editLinks.some((l) => l.equipamentoId === newEquipId)) return;
    setEditLinks([
      ...editLinks,
      { equipamentoId: newEquipId, porta: parseInt(newPorta, 10) || 0 },
    ]);
  }

  function removeLink(equipamentoId: string) {
    setEditLinks(editLinks.filter((l) => l.equipamentoId !== equipamentoId));
  }

  async function saveConfig() {
    if (!editing) return;
    await apiFetch<Unidade>(`/api/v1/unidades/${editing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...editing,
        ip: editIP,
        intervaloS: parseInt(editIntervaloS, 10) || 30,
        equipamentos: editLinks,
      }),
    });
    setConfigOpen(false);
    setEditing(null);
    await load();
  }

  return (
    <>
      <DashboardHeader title="Unidades Prisionais" socketStatus={status} />
      <div className="space-y-4 p-6">
        <div className="flex justify-end">
          <EntityFormDialog
            title="Nova unidade"
            triggerLabel="Adicionar unidade"
            onSubmit={create}
          >
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ip">IP da unidade</Label>
                <Input
                  id="ip"
                  placeholder="192.168.1.10"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="intervalo">Intervalo de coleta (segundos)</Label>
                <Input
                  id="intervalo"
                  type="number"
                  min={5}
                  value={intervaloS}
                  onChange={(e) => setIntervaloS(e.target.value)}
                />
              </div>
            </div>
          </EntityFormDialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Intervalo (s)</TableHead>
              <TableHead>Equipamentos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.codigo}</TableCell>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.ip || "—"}</TableCell>
                <TableCell>{u.intervaloS || 30}</TableCell>
                <TableCell>{u.equipamentos?.length ?? 0}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openConfig(u)}
                  >
                    <Settings2 className="h-4 w-4" />
                    Configurar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Configurar — {editing?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>IP da unidade</Label>
              <Input
                value={editIP}
                onChange={(e) => setEditIP(e.target.value)}
                placeholder="192.168.1.10"
              />
            </div>
            <div className="grid gap-2">
              <Label>Intervalo de coleta (segundos)</Label>
              <Input
                type="number"
                min={5}
                value={editIntervaloS}
                onChange={(e) => setEditIntervaloS(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Equipamentos vinculados</Label>
              {editLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum equipamento vinculado.
                </p>
              ) : (
                <ul className="space-y-2">
                  {editLinks.map((link) => {
                    const eq = catalogo.find((e) => e.id === link.equipamentoId);
                    const targetId = monitorTargetId(
                      editing!.id,
                      link.equipamentoId
                    );
                    const m = metricMap.get(targetId);
                    return (
                      <li
                        key={link.equipamentoId}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {equipNome(link.equipamentoId)}
                          </p>
                          <p className="text-muted-foreground">
                            Porta {link.porta}
                            {eq
                              ? ` · ${tipoEquipamentoLabel[eq.tipoEquipamento]} · ${tipoMonitoramentoLabel[eq.tipoMonitoramento]}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {m && (
                            <Badge variant={m.online ? "default" : "destructive"}>
                              {m.online ? "Online" : "Offline"}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLink(link.equipamentoId)}
                          >
                            Remover
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
              <Label>Adicionar equipamento</Label>
              <Select
                value={newEquipId}
                onValueChange={(v) => setNewEquipId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione do catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {catalogo.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({tipoEquipamentoLabel[e.tipoEquipamento]} ·{" "}
                      {tipoMonitoramentoLabel[e.tipoMonitoramento]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid gap-2">
                <Label>Porta</Label>
                <Input
                  type="number"
                  min={0}
                  value={newPorta}
                  onChange={(e) => setNewPorta(e.target.value)}
                  placeholder="502 (Modbus) ou 161 (SNMP)"
                />
              </div>
              <Button type="button" variant="secondary" onClick={addLink}>
                Vincular
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
