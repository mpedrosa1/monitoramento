"use client";

import type { Missao } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ExcluirMissaoDialog({
  open,
  onOpenChange,
  missao,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missao: Missao | null;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir missão</DialogTitle>
          <DialogDescription>
            {missao ? (
              <>
                Deseja realmente excluir{" "}
                <span className="font-medium text-foreground">
                  {missao.titulo}
                </span>
                ? Esta ação não pode ser desfeita.
              </>
            ) : (
              "Confirme a exclusão da missão."
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
            disabled={loading || !missao}
          >
            {loading ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
