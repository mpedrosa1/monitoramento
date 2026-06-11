import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  colaboradorStatusLabel,
  colaboradorStatusVariant,
} from "@/lib/labels";
import type { Colaborador } from "@/lib/types";

function colaboradorIniciais(nome: string): string {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ColaboradorListItem({ colaborador }: { colaborador: Colaborador }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={colaborador.fotoUrl} alt={colaborador.nome} />
        <AvatarFallback className="text-xs">
          {colaboradorIniciais(colaborador.nome)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {colaborador.nome}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {colaborador.cargo?.trim() || "Sem cargo"}
          </p>
          <Badge
            variant={colaboradorStatusVariant[colaborador.status]}
            className="shrink-0 text-[10px]"
          >
            {colaboradorStatusLabel[colaborador.status]}
          </Badge>
        </div>
      </div>
    </div>
  );
}
