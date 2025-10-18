import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, TrendingDown, Loader2, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlerts } from "@/hooks/useTradingData";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

export const AlertsPanel = () => {
  const { data: alerts, isLoading } = useAlerts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas Recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : alerts && alerts.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    alert.signal_type === "CALL" ? "bg-primary/10" : "bg-destructive/10"
                  }`}>
                    {alert.signal_type === "CALL" ? (
                      <TrendingUp className={`h-5 w-5 text-primary`} />
                    ) : (
                      <TrendingDown className={`h-5 w-5 text-destructive`} />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{alert.assets.symbol}</span>
                      <Badge variant={alert.signal_type === "CALL" ? "default" : "destructive"} className="text-xs">
                        {alert.signal_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(alert.created_at), "dd/MM/yyyy • HH:mm:ss")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: es })}
                      </span>
                      <span className="font-medium text-foreground">{alert.confidence}% confianza</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-[400px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No hay alertas disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
