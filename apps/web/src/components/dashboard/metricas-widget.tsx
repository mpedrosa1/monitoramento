import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeviceMetric } from "@/lib/types";

export function MetricasWidget({ metrics }: { metrics: DeviceMetric[] }) {
  if (metrics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aguardando métricas do monitoramento em tempo real…
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => (
        <Card key={m.targetId || m.dispositivoId} className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="truncate">
                {m.host}
                {m.porta ? `:${m.porta}` : ""}
              </span>
              <Badge variant={m.online ? "default" : "destructive"}>
                {m.online ? "Online" : "Offline"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <p>Tipo: {m.tipo.toUpperCase()}</p>
            {m.latenciaMs != null && m.latenciaMs > 0 && (
              <p>Latência: {m.latenciaMs.toFixed(1)} ms</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
