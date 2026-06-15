"use client";

import { useMemo, useState } from "react";
import { formatPlaca } from "@/lib/veiculo-placa";
import { solicitarTrocaVeiculo } from "@/lib/notificacoes";
import type { Colaborador, Veiculo } from "@/lib/types";
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

export function SolicitarTrocaVeiculoDialog({
  open,
  onOpenChange,
  veiculoAlvo,
  colaboradorAlvo,
  meusVeiculos,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoAlvo: Veiculo | null;
  colaboradorAlvo?: Colaborador | null;
  meusVeiculos: Veiculo[];
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [veiculoOfertadoId, setVeiculoOfertadoId] = useState<string>("");

  const precisaSelecionarOferta = meusVeiculos.length > 1;
  const temVeiculo = meusVeiculos.length > 0;
  const ofertaUnica = meusVeiculos.length === 1 ? meusVeiculos[0] : null;

  const rotuloAlvo = veiculoAlvo
    ? `${formatPlaca(veiculoAlvo.placa)} — ${veiculoAlvo.marca} ${veiculoAlvo.modelo}`
    : "";

  const condutorAlvo = colaboradorAlvo?.nome?.trim() || "o condutor atual";

  const descricao = useMemo(() => {
    if (!veiculoAlvo) return "";
    if (!temVeiculo) {
      return `Você está solicitando assumir o veículo ${formatPlaca(veiculoAlvo.placa)} de ${condutorAlvo}. Uma notificação será enviada para que ${condutorAlvo} confirme ou recuse. A troca só ocorre após a confirmação.`;
    }
    if (ofertaUnica) {
      return `Você está solicitando trocar seu veículo ${formatPlaca(ofertaUnica.placa)} pelo ${formatPlaca(veiculoAlvo.placa)} de ${condutorAlvo}. ${condutorAlvo} receberá uma notificação para confirmar ou recusar.`;
    }
    return `Selecione qual dos seus veículos deseja oferecer em troca do ${formatPlaca(veiculoAlvo.placa)} de ${condutorAlvo}. O condutor receberá uma notificação para confirmar ou recusar.`;
  }, [veiculoAlvo, temVeiculo, ofertaUnica, condutorAlvo]);

  async function confirmar() {
    if (!veiculoAlvo) return;
    if (precisaSelecionarOferta && !veiculoOfertadoId) {
      window.alert("Selecione qual veículo deseja oferecer na troca.");
      return;
    }

    setLoading(true);
    try {
      await solicitarTrocaVeiculo({
        veiculoAlvoId: veiculoAlvo.id,
        veiculoOfertadoId: precisaSelecionarOferta
          ? veiculoOfertadoId
          : ofertaUnica?.id,
      });
      onOpenChange(false);
      onSuccess?.();
      window.alert(
        "Solicitação enviada. O condutor será notificado para confirmar a troca."
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao solicitar troca");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar troca</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        {rotuloAlvo ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
            <span className="text-muted-foreground">Veículo desejado: </span>
            {rotuloAlvo}
          </p>
        ) : null}

        {precisaSelecionarOferta ? (
          <div className="space-y-2">
            <Label>Seu veículo na troca</Label>
            <Select
              items={meusVeiculos.map((v) => ({
                value: v.id,
                label: `${formatPlaca(v.placa)} — ${v.marca} ${v.modelo}`,
              }))}
              value={veiculoOfertadoId || null}
              onValueChange={(v) => setVeiculoOfertadoId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo a oferecer" />
              </SelectTrigger>
              <SelectContent>
                {meusVeiculos.map((v) => (
                  <SelectItem
                    key={v.id}
                    value={v.id}
                    label={`${formatPlaca(v.placa)} — ${v.marca} ${v.modelo}`}
                  >
                    {formatPlaca(v.placa)} — {v.marca} {v.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

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
            disabled={loading || !veiculoAlvo}
          >
            {loading ? "Enviando…" : "Confirmar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
