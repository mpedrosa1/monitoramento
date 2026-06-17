"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  colaboradorStatusLabel,
  colaboradorStatusVariant,
} from "@/lib/labels";
import { rhColaboradorDetailPath } from "@/lib/dashboard-paths";
import type { Colaborador } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

function colaboradorIniciais(nome: string): string {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ColaboradorListItem({
  colaborador,
  linkable = false,
}: {
  colaborador: Colaborador;
  linkable?: boolean;
}) {
  const { isMaster, isLoading } = usePermissions();
  const showStatusBadge = !isLoading && isMaster;

  const content = (
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
          {showStatusBadge ? (
            <Badge
              variant={colaboradorStatusVariant[colaborador.status]}
              className="shrink-0 text-[10px]"
            >
              {colaboradorStatusLabel[colaborador.status]}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (linkable) {
    return (
      <Link
        href={rhColaboradorDetailPath(colaborador.id)}
        className={cn(
          "block rounded-lg transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {content}
      </Link>
    );
  }

  return content;
}
