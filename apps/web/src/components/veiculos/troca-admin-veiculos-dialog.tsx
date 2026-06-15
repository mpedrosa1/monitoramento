"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPlaca } from "@/lib/veiculo-placa";
import { trocaAdminVeiculos } from "@/lib/notificacoes";
import type { Veiculo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TrocaAdminVeiculosDialog({
  open,
  onOpenChange,
  veiculoInicial,
  veiculos,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoInicial: Veiculo | null;
  veiculos: Veiculo[];
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [veiculoAId, setVeiculoAId] = useState("");
  const [veiculoBId, setVeiculoBId] = useState("");

  useEffect(() => {
    if (open && veiculoInicial) {
      setVeiculoAId(veiculoInicial.id);
      setVeiculoBId("");
    }
  }, [open, veiculoInicial]);

  const rotulo = (v: Veiculo) =>
    `${formatPlaca(v.placa)} — ${v.marca} ${v.modelo}`;

  const opcoesB = useMemo(
    () => veiculos.filter((v) => v.id !== veiculoAId),
    [veiculos, veiculoAId]
  );

  const itensA = useMemo(
    () => veiculos.map((v) => ({ value: v.id, label: rotulo(v) })),
    [veiculos]
  );

  const itensB = useMemo(
    () => opcoesB.map((v) => ({ value: v.id, label: rotulo(v) })),
    [opcoesB]
  );

  async function confirmar() {
    if (!veiculoAId || !veiculoBId) {
      window.alert("Selecione os dois veículos para a troca.");
      return;
    }
    if (veiculoAId === veiculoBId) {
      window.alert("Selecione dois veículos diferentes.");
      return;
    }

    setLoading(true);
    try {
      await trocaAdminVeiculos({ veiculoAId, veiculoBId });
      onOpenChange(false);
      onSuccess?.();
      window.alert(
        "Troca realizada. Os condutores envolvidos foram notificados."
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao realizar troca");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar condutores</DialogTitle>
          <DialogDescription>
            Selecione os dois veículos. A troca de condutores será feita
            imediatamente e ambos os colaboradores receberão uma notificação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Veículo A</Label>
            <Select
              items={itensA}
              value={veiculoAId || null}
              onValueChange={(v) => {
                setVeiculoAId(v ?? "");
                if (v === veiculoBId) setVeiculoBId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo A" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id} label={rotulo(v)}>
                    {rotulo(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Veículo B</Label>
            <Select
              items={itensB}
              value={veiculoBId || null}
              onValueChange={(v) => setVeiculoBId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo B" />
              </SelectTrigger>
              <SelectContent>
                {opcoesB.map((v) => (
                  <SelectItem key={v.id} value={v.id} label={rotulo(v)}>
                    {rotulo(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void confirmar()}
            disabled={loading || !veiculoAId || !veiculoBId}
          >
            {loading ? "Trocando…" : "Confirmar troca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
