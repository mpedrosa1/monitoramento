import { formatPlaca, isPlacaMercosul } from "@/lib/veiculo-placa";
import { cn } from "@/lib/utils";

function BandeiraBrasilMini({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-[1px] bg-[#009b3a]",
        className
      )}
      aria-hidden
    >
      <span className="absolute left-[25%] top-1/2 h-[70%] w-[50%] -translate-y-1/2 rotate-45 bg-[#ffdf00]" />
      <span className="absolute left-[50%] top-[55%] h-[45%] w-[45%] -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#003294]" />
    </span>
  );
}

export function PlacaMercosulBadge({
  placa,
  className,
  size = "sm",
}: {
  placa: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const texto = formatPlaca(placa);
  const mercosul = isPlacaMercosul(texto);
  const compacto = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex min-w-0 flex-col overflow-hidden rounded-[3px] border-2 border-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        className
      )}
      title={texto}
    >
      {mercosul ? (
        <span
          className={cn(
            "flex items-center justify-between bg-[#003DA5]",
            compacto ? "px-1 py-[1px]" : "px-1.5 py-0.5"
          )}
        >
          <span
            className={cn(
              "font-sans font-bold uppercase leading-none tracking-[0.14em] text-white",
              compacto ? "text-[5px]" : "text-[7px]"
            )}
          >
            Brasil
          </span>
          <BandeiraBrasilMini
            className={compacto ? "h-2 w-3" : "h-2.5 w-3.5"}
          />
        </span>
      ) : null}

      <span
        className={cn(
          "flex items-center justify-center font-mono font-bold leading-none tracking-[0.14em] text-neutral-900",
          mercosul ? "bg-[#F2F2F2]" : "bg-[#C8C8C8]",
          compacto ? "px-1 py-[3px] text-[9px]" : "px-2 py-1 text-[11px]"
        )}
      >
        {texto}
      </span>
    </span>
  );
}
