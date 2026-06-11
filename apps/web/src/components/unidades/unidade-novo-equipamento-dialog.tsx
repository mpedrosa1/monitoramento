"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Equipamento, UnidadeEquipamento } from "@/lib/types";
import {
  defaultPortaForEquipamento,
  labelEquipamentoCatalogo,
  newEquipamentoVinculo,
  newMaquinaGrupoId,
  parseSlaveIdInput,
  portaEquipamentoEmUso,
} from "@/lib/unidade-form";
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
import { cn } from "@/lib/utils";

type ModoNovoEquipamento = "nobreak" | "maquina";

interface SensorMaquinaDraft {
  _localId: string;
  equipamentoId: string;
  slaveId: string;
}

const modoItems = [
  { value: "nobreak" as const, label: "Nobreak" },
  { value: "maquina" as const, label: "Montar uma máquina" },
];

function catalogoSensores(catalogo: Equipamento[]): Equipamento[] {
  return catalogo.filter((e) => e.tipoEquipamento === "sensor");
}

function catalogoNobreaks(catalogo: Equipamento[]): Equipamento[] {
  return catalogo.filter((e) => e.tipoEquipamento === "nobreak");
}

function newSensorDraft(catalogo: Equipamento[]): SensorMaquinaDraft {
  const first = catalogoSensores(catalogo)[0];
  return {
    _localId: crypto.randomUUID(),
    equipamentoId: first?.id ?? "",
    slaveId: "1",
  };
}

function parsePorta(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function UnidadeNovoEquipamentoDialog({
  open,
  onOpenChange,
  catalogo,
  equipamentos,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogo: Equipamento[];
  equipamentos: UnidadeEquipamento[];
  onAdd: (vinculos: UnidadeEquipamento[]) => void;
}) {
  const [modo, setModo] = useState<ModoNovoEquipamento | null>(null);
  const [equipId, setEquipId] = useState("");
  const [porta, setPorta] = useState("502");
  const [nomeLocal, setNomeLocal] = useState("");
  const [paginaWeb, setPaginaWeb] = useState(false);
  const [portaWeb, setPortaWeb] = useState("80");
  const [maquinaNome, setMaquinaNome] = useState("");
  const [maquinaPorta, setMaquinaPorta] = useState("502");
  const [maquinaPaginaWeb, setMaquinaPaginaWeb] = useState(false);
  const [maquinaPortaWeb, setMaquinaPortaWeb] = useState("80");
  const [sensores, setSensores] = useState<SensorMaquinaDraft[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const catalogoNobreak = useMemo(() => catalogoNobreaks(catalogo), [catalogo]);
  const catalogoSensor = useMemo(() => catalogoSensores(catalogo), [catalogo]);

  const selectedEquip = catalogoNobreak.find((e) => e.id === equipId);

  const paginaWebItems = useMemo(
    () => [
      { value: "nao", label: "Não" },
      { value: "sim", label: "Sim" },
    ],
    []
  );

  const equipamentoNobreakItems = useMemo(
    () =>
      catalogoNobreak.map((e) => ({
        value: e.id,
        label: labelEquipamentoCatalogo(e),
      })),
    [catalogoNobreak]
  );

  const equipamentoSensorItems = useMemo(
    () =>
      catalogoSensor.map((e) => ({
        value: e.id,
        label: labelEquipamentoCatalogo(e),
      })),
    [catalogoSensor]
  );

  const portaNum = Number.parseInt(porta, 10);
  const portaWebNum = Number.parseInt(portaWeb, 10);
  const maquinaPortaNum = Number.parseInt(maquinaPorta, 10);
  const maquinaPortaWebNum = Number.parseInt(maquinaPortaWeb, 10);

  function resetNobreakForm() {
    const first = catalogoNobreak[0];
    setEquipId(first?.id ?? "");
    setPorta(defaultPortaForEquipamento(first));
    setNomeLocal("");
    setPaginaWeb(false);
    setPortaWeb("80");
  }

  function resetMaquinaForm() {
    const first = catalogoSensor[0];
    setMaquinaNome("");
    setMaquinaPorta(defaultPortaForEquipamento(first));
    setMaquinaPaginaWeb(false);
    setMaquinaPortaWeb("80");
    setSensores(
      catalogoSensor.length > 0 ? [newSensorDraft(catalogo)] : []
    );
  }

  useEffect(() => {
    if (open) {
      setModo(null);
      resetNobreakForm();
      resetMaquinaForm();
      setErro(null);
    }
  }, [open, catalogo]);

  function handleModoChange(value: ModoNovoEquipamento) {
    setModo(value);
    setErro(null);
    if (value === "nobreak") resetNobreakForm();
    else resetMaquinaForm();
  }

  function voltarParaModo() {
    setModo(null);
    setErro(null);
  }

  function handleSubmitNobreak() {
    if (!equipId) return;
    if (!Number.isFinite(portaNum) || portaNum < 0) {
      setErro("Informe uma porta válida.");
      return;
    }
    if (portaEquipamentoEmUso(equipamentos, portaNum)) {
      setErro(`A porta ${portaNum} já está em uso nesta unidade.`);
      return;
    }
    let portaWebVal: number | undefined;
    if (paginaWeb) {
      portaWebVal = Number.parseInt(portaWeb, 10);
      if (
        !Number.isFinite(portaWebVal) ||
        portaWebVal < 1 ||
        portaWebVal > 65535
      ) {
        setErro("Informe a porta de acesso à página web.");
        return;
      }
    }
    const nome = nomeLocal.trim();
    onAdd([
      newEquipamentoVinculo({
        equipamentoId: equipId,
        porta: portaNum,
        ...(nome ? { nomeLocal: nome } : {}),
        ...(paginaWeb && portaWebVal != null
          ? { paginaWeb: true, portaWeb: portaWebVal }
          : {}),
      }),
    ]);
    onOpenChange(false);
  }

  function handleSubmitMaquina() {
    const nome = maquinaNome.trim();
    if (!nome) {
      setErro("Informe o nome da máquina.");
      return;
    }
    if (sensores.length === 0) {
      setErro("Adicione ao menos um sensor à máquina.");
      return;
    }
    const porta = parsePorta(maquinaPorta);
    if (porta == null) {
      setErro("Informe uma porta válida para a máquina.");
      return;
    }
    if (portaEquipamentoEmUso(equipamentos, porta)) {
      setErro(`A porta ${porta} já está em uso nesta unidade.`);
      return;
    }

    for (const s of sensores) {
      if (!s.equipamentoId) {
        setErro("Selecione todos os sensores.");
        return;
      }
      if (parseSlaveIdInput(s.slaveId) == null) {
        setErro("Informe um Slave ID válido (0–255) para cada sensor.");
        return;
      }
    }

    let portaWebVal: number | undefined;
    if (maquinaPaginaWeb) {
      portaWebVal = maquinaPortaWebNum;
      if (
        !Number.isFinite(portaWebVal) ||
        portaWebVal < 1 ||
        portaWebVal > 65535
      ) {
        setErro("Informe a porta de acesso à página web.");
        return;
      }
    }

    const maquinaId = newMaquinaGrupoId();
    onAdd(
      sensores.map((s) =>
        newEquipamentoVinculo({
          equipamentoId: s.equipamentoId,
          porta,
          maquinaId,
          maquinaNome: nome,
          slaveId: parseSlaveIdInput(s.slaveId) ?? 1,
          ...(maquinaPaginaWeb && portaWebVal != null
            ? { paginaWeb: true, portaWeb: portaWebVal }
            : {}),
        })
      )
    );
    onOpenChange(false);
  }

  function patchSensor(localId: string, patch: Partial<SensorMaquinaDraft>) {
    setSensores((list) =>
      list.map((s) => (s._localId === localId ? { ...s, ...patch } : s))
    );
  }

  function addSensor() {
    setSensores((list) => [...list, newSensorDraft(catalogo)]);
  }

  function removeSensor(localId: string) {
    setSensores((list) =>
      list.length <= 1 ? list : list.filter((s) => s._localId !== localId)
    );
  }

  const portaNobreakInvalida =
    porta.trim() !== "" && (!Number.isFinite(portaNum) || portaNum < 0);
  const portaNobreakDuplicada =
    Number.isFinite(portaNum) &&
    portaNum >= 0 &&
    portaEquipamentoEmUso(equipamentos, portaNum);
  const portaWebNobreakInvalida =
    paginaWeb &&
    (!Number.isFinite(portaWebNum) ||
      portaWebNum < 1 ||
      portaWebNum > 65535);
  const maquinaPortaInvalida =
    maquinaPorta.trim() !== "" &&
    (!Number.isFinite(maquinaPortaNum) || maquinaPortaNum < 0);
  const maquinaPortaDuplicada =
    Number.isFinite(maquinaPortaNum) &&
    maquinaPortaNum >= 0 &&
    portaEquipamentoEmUso(equipamentos, maquinaPortaNum);
  const maquinaPortaWebInvalida =
    maquinaPaginaWeb &&
    (!Number.isFinite(maquinaPortaWebNum) ||
      maquinaPortaWebNum < 1 ||
      maquinaPortaWebNum > 65535);
  const sensoresSlaveInvalidos = sensores.some(
    (s) => parseSlaveIdInput(s.slaveId) == null
  );

  const catalogoVazioMsg =
    modo === "nobreak"
      ? "Nenhum nobreak cadastrado no catálogo. Cadastre em Equipamentos primeiro."
      : "Nenhum sensor cadastrado no catálogo. Cadastre em Equipamentos primeiro.";

  const catalogoAtual =
    modo === "nobreak" ? catalogoNobreak : modo === "maquina" ? catalogoSensor : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[60] max-h-[92vh] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Novo equipamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          {!modo ? (
            <>
              <p className="text-xs text-muted-foreground">
                Escolha se deseja adicionar um nobreak ou montar uma máquina de
                monitoramento nesta unidade.
              </p>
              <div className="grid gap-2">
                <Label className="text-xs">Tipo de adição</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {modoItems.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleModoChange(item.value)}
                      className={cn(
                        "rounded-lg border border-border bg-card px-3 py-3 text-left text-sm transition-colors hover:bg-accent/50",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : catalogoAtual.length === 0 ? (
            <p className="text-sm text-muted-foreground">{catalogoVazioMsg}</p>
          ) : modo === "nobreak" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Selecione o nobreak do catálogo e informe a porta de
                monitoramento nesta unidade.
              </p>
              <div className="grid gap-2">
                <Label className="text-xs">Nobreak do catálogo</Label>
                <Select
                  items={equipamentoNobreakItems}
                  value={equipId || null}
                  onValueChange={(v) => {
                    const id = v ?? "";
                    setEquipId(id);
                    const eq = catalogoNobreak.find((e) => e.id === id);
                    setPorta(defaultPortaForEquipamento(eq));
                    setErro(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um nobreak" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {catalogoNobreak.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {labelEquipamentoCatalogo(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Nome nesta unidade (opcional)</Label>
                <Input
                  value={nomeLocal}
                  onChange={(e) => setNomeLocal(e.target.value)}
                  placeholder={
                    selectedEquip
                      ? `Ex.: ${selectedEquip.nome} — bloco A`
                      : "Apelido local sem alterar o catálogo"
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Porta</Label>
                <Input
                  type="number"
                  min={0}
                  value={porta}
                  onChange={(e) => {
                    setPorta(e.target.value);
                    setErro(null);
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Possui página web?</Label>
                <Select
                  items={paginaWebItems}
                  value={paginaWeb ? "sim" : "nao"}
                  onValueChange={(v) => {
                    const sim = v === "sim";
                    setPaginaWeb(sim);
                    if (!sim) setPortaWeb("80");
                    setErro(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paginaWeb ? (
                <div className="grid gap-2">
                  <Label className="text-xs">Porta de acesso web</Label>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={portaWeb}
                    onChange={(e) => {
                      setPortaWeb(e.target.value);
                      setErro(null);
                    }}
                    placeholder="80"
                  />
                </div>
              ) : null}
              {portaNobreakInvalida && (
                <p className="text-xs text-destructive">Porta inválida.</p>
              )}
              {portaNobreakDuplicada && !portaNobreakInvalida && (
                <p className="text-xs text-destructive">
                  Esta porta já está em uso nesta unidade.
                </p>
              )}
              {portaWebNobreakInvalida && (
                <p className="text-xs text-destructive">
                  Informe uma porta web válida (1–65535).
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Defina o nome e a porta da máquina e adicione os sensores do
                catálogo que farão parte dela.
              </p>
              <div className="grid gap-2">
                <Label className="text-xs">Nome da máquina</Label>
                <Input
                  value={maquinaNome}
                  onChange={(e) => {
                    setMaquinaNome(e.target.value);
                    setErro(null);
                  }}
                  placeholder="Ex.: Máquina sala servidores"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Porta</Label>
                <Input
                  type="number"
                  min={0}
                  value={maquinaPorta}
                  onChange={(e) => {
                    setMaquinaPorta(e.target.value);
                    setErro(null);
                  }}
                />
              </div>
              {maquinaPortaInvalida && (
                <p className="text-xs text-destructive">Porta inválida.</p>
              )}
              {maquinaPortaDuplicada && !maquinaPortaInvalida && (
                <p className="text-xs text-destructive">
                  Esta porta já está em uso nesta unidade.
                </p>
              )}
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Sensores</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addSensor}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar sensor
                  </Button>
                </div>
                <ul className="space-y-2">
                  {sensores.map((sensor, index) => (
                    <li
                      key={sensor._localId}
                      className="grid gap-2 rounded-md border border-border bg-card p-2"
                    >
                      <div className="grid gap-2 sm:grid-cols-[1fr_5.5rem_auto] sm:items-end">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">
                            Sensor {index + 1}
                          </Label>
                          <Select
                            items={equipamentoSensorItems}
                            value={sensor.equipamentoId || null}
                            onValueChange={(v) => {
                              patchSensor(sensor._localId, {
                                equipamentoId: v ?? "",
                              });
                              setErro(null);
                            }}
                          >
                            <SelectTrigger className="h-8 w-full text-xs">
                              <SelectValue placeholder="Selecione o sensor" />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                              {catalogoSensor.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {labelEquipamentoCatalogo(e)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Slave ID</Label>
                          <Input
                            type="number"
                            min={0}
                            max={255}
                            value={sensor.slaveId}
                            onChange={(e) => {
                              patchSensor(sensor._localId, {
                                slaveId: e.target.value,
                              });
                              setErro(null);
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSensor(sensor._localId)}
                          disabled={sensores.length <= 1}
                          aria-label={`Remover sensor ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Possui página web?</Label>
                <Select
                  items={paginaWebItems}
                  value={maquinaPaginaWeb ? "sim" : "nao"}
                  onValueChange={(v) => {
                    const sim = v === "sim";
                    setMaquinaPaginaWeb(sim);
                    if (!sim) setMaquinaPortaWeb("80");
                    setErro(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {maquinaPaginaWeb ? (
                <div className="grid gap-2">
                  <Label className="text-xs">Porta de acesso web</Label>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={maquinaPortaWeb}
                    onChange={(e) => {
                      setMaquinaPortaWeb(e.target.value);
                      setErro(null);
                    }}
                    placeholder="80"
                  />
                </div>
              ) : null}
              {maquinaPortaWebInvalida && (
                <p className="text-xs text-destructive">
                  Informe uma porta web válida (1–65535).
                </p>
              )}
            </>
          )}
          {erro && <p className="text-xs text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          {!modo ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <div className="flex flex-1 justify-end gap-2">
                <Button variant="secondary" onClick={voltarParaModo}>
                  Voltar
                </Button>
                {catalogoAtual.length > 0 && (
                  <Button
                    onClick={
                      modo === "nobreak"
                        ? handleSubmitNobreak
                        : handleSubmitMaquina
                    }
                    disabled={
                      modo === "nobreak"
                        ? !equipId ||
                          portaNobreakInvalida ||
                          portaNobreakDuplicada ||
                          portaWebNobreakInvalida
                        : !maquinaNome.trim() ||
                          sensores.length === 0 ||
                          sensoresSlaveInvalidos ||
                          maquinaPortaInvalida ||
                          maquinaPortaDuplicada ||
                          maquinaPortaWebInvalida
                    }
                  >
                    {modo === "maquina" ? "Montar máquina" : "Adicionar"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
