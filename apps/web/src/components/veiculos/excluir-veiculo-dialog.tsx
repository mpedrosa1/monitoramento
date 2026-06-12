"use client";

import { formatPlaca } from "@/lib/veiculo-placa";
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

export function ExcluirVeiculoDialog({
  open,
  onOpenChange,
  veiculo,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: Veiculo | null;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}) {
  const rotulo = veiculo
    ? `${formatPlaca(veiculo.placa)} — ${veiculo.marca} ${veiculo.modelo}`.trim()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir veículo</DialogTitle>
          <DialogDescription>
            {rotulo ? (
              <>
                Deseja realmente excluir{" "}
                <span className="font-medium text-foreground">{rotulo}</span>?
                Esta ação não pode ser desfeita.
              </>
            ) : (
              "Confirme a exclusão do veículo."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={loading || !veiculo}
          >
            {loading ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
