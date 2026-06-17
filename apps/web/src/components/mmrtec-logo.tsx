import { cn } from "@/lib/utils";
import { SISTEMA_NOME } from "@/lib/brand";

type MmrtecLogoProps = {
  className?: string;
  /** Prioridade de carregamento (login e telas principais). */
  priority?: boolean;
};

export function MmrtecLogo({ className, priority }: MmrtecLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt={SISTEMA_NOME}
      width={194}
      height={125}
      className={cn(
        "box-border object-contain dark:border dark:border-[#304f75]",
        className
      )}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
