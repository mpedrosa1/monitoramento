"use client";

import type { Colaborador } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ExcluirColaboradorDialog({
  open,
  onOpenChange,
  colaborador,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador | null;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir colaborador</DialogTitle>
          <DialogDescription>
            {colaborador ? (
              <>
                Deseja realmente excluir{" "}
                <span className="font-medium text-foreground">
                  {colaborador.nome}
                </span>
                ? Esta ação não pode ser desfeita.
              </>
            ) : (
              "Confirme a exclusão do colaborador."
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
            disabled={loading || !colaborador}
          >
            {loading ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
