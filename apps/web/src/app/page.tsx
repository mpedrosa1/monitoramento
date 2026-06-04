"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-background via-[#022f5c] to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <Card className="relative z-10 w-full max-w-md border-border/50 bg-card/90 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">MMRTEC Monitoramento</CardTitle>
          <CardDescription>
            Sistema de monitoramento de unidades prisionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push("/dashboard")}
          >
            Entrar
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Autenticação será habilitada em versão futura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
