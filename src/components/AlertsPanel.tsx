import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, TrendingDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Alert {
  id: string;
  asset: string;
  type: "CALL" | "PUT";
  message: string;
  timestamp: string;
  confidence: number;
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    asset: "TSLA",
    type: "CALL",
    message: "RSI cruzó por debajo de 30. Señal de compra detectada.",
    timestamp: "Hace 2 min",
    confidence: 85,
  },
  {
    id: "2",
    asset: "NVDA",
    type: "CALL",
    message: "MACD cruzó al alza. Momentum alcista confirmado.",
    timestamp: "Hace 5 min",
    confidence: 78,
  },
  {
    id: "3",
    asset: "SPY",
    type: "PUT",
    message: "RSI sobre 70. Posible corrección a la baja.",
    timestamp: "Hace 8 min",
    confidence: 72,
  },
  {
    id: "4",
    asset: "AMD",
    type: "CALL",
    message: "Volumen institucional aumentando. Señal alcista.",
    timestamp: "Hace 12 min",
    confidence: 81,
  },
];

export const AlertsPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas Recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  alert.type === "CALL" ? "bg-primary/10" : "bg-destructive/10"
                }`}>
                  {alert.type === "CALL" ? (
                    <TrendingUp className={`h-5 w-5 text-primary`} />
                  ) : (
                    <TrendingDown className={`h-5 w-5 text-destructive`} />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{alert.asset}</span>
                    <Badge variant={alert.type === "CALL" ? "default" : "destructive"} className="text-xs">
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{alert.timestamp}</span>
                    <span className="font-medium text-foreground">{alert.confidence}% confianza</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
