"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SenhaInicialColaboradorDialog({
  open,
  onOpenChange,
  nome,
  senha,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  senha: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiarSenha() {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle>Colaborador cadastrado</DialogTitle>
          <DialogDescription>
            {nome ? (
              <>
                <span className="font-medium text-foreground">{nome}</span> foi
                adicionado com sucesso. Anote a senha inicial de acesso ao
                sistema e repasse ao colaborador no primeiro login.
              </>
            ) : (
              "Anote a senha inicial de acesso ao sistema e repasse ao colaborador no primeiro login."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Senha inicial
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <code className="flex-1 font-mono text-base tracking-wide">
              {senha}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copiarSenha()}
              className="shrink-0"
            >
              {copiado ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Formato padrão: MMR + ano de nascimento (ex.: MMR1984). A senha é
            armazenada de forma segura no sistema.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
