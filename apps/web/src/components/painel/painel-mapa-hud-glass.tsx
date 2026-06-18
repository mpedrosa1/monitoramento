"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PainelMapaHudGlass({
  children,
  className,
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: "online" | "offline" | "sem_ip" | "weather" | "brand";
}) {
  const accentBar =
    accent === "online"
      ? "bg-emerald-500"
      : accent === "offline"
        ? "bg-destructive"
        : accent === "weather"
          ? "bg-sky-400"
          : accent === "brand"
            ? "bg-primary"
            : accent === "sem_ip"
              ? "bg-muted-foreground"
              : null;

  return (
    <div
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-xl border border-white/15 shadow-2xl",
        "bg-background/70 backdrop-blur-xl backdrop-saturate-150",
        "animate-in fade-in duration-300",
        className
      )}
    >
      {accentBar ? (
        <div className={cn("absolute inset-x-0 top-0 z-[1] h-0.5", accentBar)} aria-hidden />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
        aria-hidden
      />
      {children}
    </div>
  );
}
