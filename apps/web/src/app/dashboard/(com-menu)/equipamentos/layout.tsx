"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

export default function EquipamentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { canAccessEquipamentos, isLoading } = usePermissions();

  useEffect(() => {
    if (!isLoading && !canAccessEquipamentos) {
      router.replace("/dashboard");
    }
  }, [canAccessEquipamentos, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessEquipamentos) {
    return null;
  }

  return children;
}
