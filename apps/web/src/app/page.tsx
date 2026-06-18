"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MmrtecLogo } from "@/components/mmrtec-logo";
import { SISTEMA_DESCRICAO, SISTEMA_NOME } from "@/lib/brand";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim() || !password) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Não foi possível entrar no sistema."
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      <Card className="w-full max-w-md border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <MmrtecLogo className="mx-auto h-14 w-auto" priority />
          <h1 className="sr-only">{SISTEMA_NOME}</h1>
          <CardDescription className="text-base">{SISTEMA_DESCRICAO}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Corporativo"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            {erro ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            ) : null}
            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
