import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SignalCardProps {
  asset: string;
  assetName: string;
  signal: "CALL" | "PUT" | "NEUTRAL";
  confidence: number;
  price: number;
  change: number;
  rsi: number;
  macd: number;
  createdAt: string;
  onClick?: () => void;
}

export const SignalCard = ({ asset, assetName, signal, confidence, price, change, rsi, macd, createdAt, onClick }: SignalCardProps) => {
  const isPositive = change >= 0;
  const isCall = signal === "CALL";
  const isPut = signal === "PUT";
  
  const formattedDate = format(new Date(createdAt), "dd/MM/yyyy");
  const formattedTime = format(new Date(createdAt), "HH:mm:ss", { locale: es });

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-lg cursor-pointer",
        isCall && "border-primary/50",
        isPut && "border-destructive/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg font-bold">{asset}</CardTitle>
          <Badge 
            variant={isCall ? "default" : isPut ? "destructive" : "secondary"}
            className={cn(
              "px-3 py-1 text-sm font-bold",
              isCall && "bg-primary text-primary-foreground",
              isPut && "bg-destructive text-destructive-foreground"
            )}
          >
            {signal}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formattedDate} • {formattedTime}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">${price.toFixed(2)}</p>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? "+" : ""}{change.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confianza</p>
            <p className="text-xl font-bold text-foreground">{confidence}%</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">RSI</p>
            <p className={cn(
              "text-sm font-semibold",
              rsi > 70 ? "text-destructive" : rsi < 30 ? "text-success" : "text-foreground"
            )}>
              {rsi.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">MACD</p>
            <p className={cn(
              "text-sm font-semibold",
              macd > 0 ? "text-success" : "text-destructive"
            )}>
              {macd.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
