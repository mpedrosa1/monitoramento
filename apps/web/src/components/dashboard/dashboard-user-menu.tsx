"use client";

import type { ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, LogOut, User } from "lucide-react";
import type { AuthUser } from "@/lib/auth-session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MenuActionItem({
  icon,
  iconClassName,
  title,
  subtitle,
  titleClassName,
  subtitleClassName,
  onClick,
}: {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  subtitle: string;
  titleClassName?: string;
  subtitleClassName?: string;
  onClick?: () => void;
}) {
  return (
    <Menu.Item
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none",
        "data-[highlighted]:bg-muted/60"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          iconClassName
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", titleClassName)}>
          {title}
        </p>
        <p className={cn("text-xs text-muted-foreground", subtitleClassName)}>
          {subtitle}
        </p>
      </div>
    </Menu.Item>
  );
}

export function DashboardUserMenu({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none",
          "transition-colors hover:bg-muted/60",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "data-[popup-open]:bg-muted/60"
        )}
        aria-label={`Menu do usuário ${user.nome}`}
      >
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {user.nome}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Avatar
          size="lg"
          className="ring-2 ring-primary/30 after:border-primary/20"
        >
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {iniciais(user.nome)}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180 sm:block" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <Menu.Popup
            className={cn(
              "w-[min(100vw-2rem,20rem)] origin-[var(--transform-origin)] overflow-hidden rounded-xl",
              "border border-border bg-popover text-popover-foreground shadow-lg",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              "transition-[transform,opacity] duration-100"
            )}
          >
            <MenuActionItem
              icon={<User className="h-5 w-5 text-muted-foreground" />}
              iconClassName="bg-muted"
              title="Meus Dados"
              subtitle="Perfil e segurança"
            />

            <Separator />

            <MenuActionItem
              icon={<LogOut className="h-5 w-5 text-destructive" />}
              iconClassName="bg-destructive/10"
              title="Encerrar sessão"
              subtitle="Sair da plataforma"
              titleClassName="text-destructive"
              subtitleClassName="text-destructive/80"
              onClick={onLogout}
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
