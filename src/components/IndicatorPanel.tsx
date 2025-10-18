import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Indicator {
  name: string;
  value: number;
  status: "bullish" | "bearish" | "neutral";
}

const indicators: Indicator[] = [
  { name: "RSI (14)", value: 65, status: "bullish" },
  { name: "MACD", value: 0.35, status: "bullish" },
  { name: "Bollinger Bands", value: 0, status: "neutral" },
  { name: "EMA 50/200", value: 1, status: "bullish" },
  { name: "Volume", value: 85, status: "bullish" },
  { name: "ATR", value: 2.5, status: "neutral" },
];

export const IndicatorPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Indicadores Técnicos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {indicators.map((indicator) => (
          <div key={indicator.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {indicator.status === "bullish" ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : indicator.status === "bearish" ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                  <Activity className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">{indicator.name}</span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                {indicator.value}
              </span>
            </div>
            <Progress 
              value={Math.abs(indicator.value) * 10} 
              className="h-1.5"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
