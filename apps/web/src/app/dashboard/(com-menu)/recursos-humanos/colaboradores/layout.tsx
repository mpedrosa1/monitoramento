"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

export default function ColaboradoresRhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { canCrudColaboradores, isLoading } = usePermissions();

  useEffect(() => {
    if (!isLoading && !canCrudColaboradores) {
      router.replace("/dashboard/recursos-humanos");
    }
  }, [canCrudColaboradores, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canCrudColaboradores) {
    return null;
  }

  return children;
}
