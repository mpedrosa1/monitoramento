import Image from "next/image";
import { ArrowLeftRight, Pencil, Trash2, User } from "lucide-react";
import { formatPlaca } from "@/lib/veiculo-placa";
import { VEICULO_FOTO_PADRAO } from "@/lib/veiculo-imagem";
import type { Colaborador, Veiculo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VeiculoCard({
  veiculo,
  colaborador,
  isMeuVeiculo = false,
  onRequestSwap,
  onEdit,
  onDelete,
  deleting = false,
}: {
  veiculo: Veiculo;
  colaborador?: Colaborador | null;
  isMeuVeiculo?: boolean;
  onRequestSwap?: (veiculo: Veiculo) => void;
  onEdit?: (veiculo: Veiculo) => void;
  onDelete?: (veiculo: Veiculo) => void;
  deleting?: boolean;
}) {
  const foto = veiculo.fotoUrl?.trim() || VEICULO_FOTO_PADRAO;
  const usaImgNativo = foto.startsWith("http") || foto.startsWith("/pics/");
  const condutor = colaborador?.nome?.trim() || "—";
  const showActions = Boolean(onEdit || onDelete);
  const showSwap = Boolean(onRequestSwap && !isMeuVeiculo);
  const rotulo = `${veiculo.marca} ${veiculo.modelo}`.trim();

  return (
    <article
      className={cn(
        "group flex w-full max-w-[240px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md"
      )}
    >
      <div className="p-2">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted/40">
        {isMeuVeiculo && (
          <Badge className="absolute left-1.5 top-1.5 z-10 border-amber-300 bg-amber-400 font-semibold text-amber-950 shadow-sm ring-1 ring-amber-300/80 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950">
            Meu veículo
          </Badge>
        )}
        {showActions && (
          <div className="absolute right-1.5 top-1.5 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {onEdit && (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="h-7 w-7 shadow-sm"
                onClick={() => onEdit(veiculo)}
                aria-label={`Editar ${rotulo || formatPlaca(veiculo.placa)}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="h-7 w-7 shadow-sm hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(veiculo)}
                disabled={deleting}
                aria-label={`Excluir ${rotulo || formatPlaca(veiculo.placa)}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
        {showSwap && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1.5 text-xs shadow-sm"
              onClick={() => onRequestSwap?.(veiculo)}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Solicitar troca
            </Button>
          </div>
        )}
        {usaImgNativo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={`${veiculo.marca} ${veiculo.modelo}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={foto}
            alt={`${veiculo.marca} ${veiculo.modelo}`}
            fill
            className="object-cover"
            sizes="240px"
          />
        )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {veiculo.marca}
          </p>
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug">
              {veiculo.modelo}
            </h3>
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ring-1 ring-border">
              {formatPlaca(veiculo.placa)}
            </span>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate" title={condutor}>
            {condutor}
          </span>
        </div>
      </div>
    </article>
  );
}
