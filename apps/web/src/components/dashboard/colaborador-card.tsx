import { Pencil, Shield, Trash2 } from "lucide-react";
import { COLABORADOR_AVATAR_PADRAO } from "@/lib/colaborador-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  colaboradorStatusLabel,
  colaboradorStatusVariant,
} from "@/lib/labels";
import type { Colaborador } from "@/lib/types";
import { cn } from "@/lib/utils";

function colaboradorIniciais(nome: string): string {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ColaboradorCard({
  colaborador,
  onEdit,
  onDelete,
  deleting = false,
}: {
  colaborador: Colaborador;
  onEdit?: (colaborador: Colaborador) => void;
  onDelete?: (colaborador: Colaborador) => void;
  deleting?: boolean;
}) {
  const showActions = Boolean(onEdit || onDelete);
  const foto = colaborador.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO;
  const cargo = colaborador.cargo?.trim() || "Colaborador";

  return (
    <article
      className={cn(
        "group relative mx-auto flex w-full max-w-[220px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
      )}
    >
      {/* furo do cordão */}
      <div
        className="flex justify-center bg-muted/40 pt-2.5 pb-1"
        aria-hidden
      >
        <div className="h-2 w-10 rounded-full border border-border/80 bg-background shadow-inner" />
      </div>

      {/* faixa corporativa */}
      <div className="relative bg-primary px-3 py-2.5 text-primary-foreground">
        {showActions && (
          <div className="absolute right-1.5 top-1.5 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                onClick={() => onEdit(colaborador)}
                aria-label={`Editar ${colaborador.nome}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 text-primary-foreground hover:bg-destructive/20 hover:text-red-100"
                onClick={() => onDelete(colaborador)}
                disabled={deleting}
                aria-label={`Excluir ${colaborador.nome}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.25} />
          <p className="text-xs font-semibold tracking-[0.2em]">MMRTEC</p>
        </div>
        <p className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wider opacity-80">
          Monitoramento
        </p>
      </div>

      {/* área da foto */}
      <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-muted/25 to-card px-4 pt-5 pb-4">
        <div className="rounded-xl border-2 border-background bg-background p-1 shadow-md ring-1 ring-border/60">
          <Avatar className="h-24 w-24 rounded-lg after:rounded-lg">
            <AvatarImage
              src={foto}
              alt={colaborador.nome}
              className="rounded-md object-cover"
            />
            <AvatarFallback className="rounded-md text-lg font-semibold">
              {colaboradorIniciais(colaborador.nome)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="mt-4 w-full text-center">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {colaborador.nome}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {cargo}
          </p>
        </div>

        <Badge
          variant={colaboradorStatusVariant[colaborador.status]}
          className="mt-3 px-2.5 py-0.5 text-[10px] uppercase tracking-wide"
        >
          {colaboradorStatusLabel[colaborador.status]}
        </Badge>
      </div>

      {/* rodapé do crachá */}
      <div className="border-t border-dashed border-border/80 bg-muted/20 px-3 py-2 text-center">
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground">
          RG {colaborador.rg?.trim() || "—"}
        </p>
      </div>
    </article>
  );
}
