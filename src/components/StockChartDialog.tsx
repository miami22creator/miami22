import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo } from "react";
import { format, subDays, subHours, subWeeks } from "date-fns";
import { es } from "date-fns/locale";

interface StockChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  assetSymbol: string;
  currentPrice: number;
  changePercent: number;
}

type TimeInterval = "minute" | "day" | "week";

export const StockChartDialog = ({
  open,
  onOpenChange,
  assetName,
  assetSymbol,
  currentPrice,
  changePercent,
}: StockChartDialogProps) => {
  const [timeInterval, setTimeInterval] = useState<TimeInterval>("day");

  // Generar datos históricos simulados basados en el precio actual
  const generateHistoricalData = (interval: TimeInterval) => {
    const data = [];
    const now = new Date();
    let periods = 0;
    let dateFormatter: (date: Date) => string;
    let subtractFunction: (date: Date, amount: number) => Date;

    switch (interval) {
      case "minute":
        periods = 60; // últimos 60 minutos
        dateFormatter = (date) => format(date, "HH:mm", { locale: es });
        subtractFunction = (date, amount) => subHours(date, amount / 60);
        break;
      case "day":
        periods = 30; // últimos 30 días
        dateFormatter = (date) => format(date, "dd MMM", { locale: es });
        subtractFunction = subDays;
        break;
      case "week":
        periods = 12; // últimas 12 semanas
        dateFormatter = (date) => format(date, "dd MMM", { locale: es });
        subtractFunction = subWeeks;
        break;
    }

    // Calcular el precio inicial basado en el cambio porcentual
    const initialPrice = currentPrice / (1 + changePercent / 100);
    
    for (let i = periods - 1; i >= 0; i--) {
      const date = subtractFunction(now, i);
      // Generar variación aleatoria pero suavizada
      const randomFactor = 1 + (Math.random() - 0.5) * 0.05;
      const progress = (periods - i) / periods;
      const price = initialPrice + (currentPrice - initialPrice) * progress * randomFactor;
      
      data.push({
        time: dateFormatter(date),
        price: parseFloat(price.toFixed(2)),
      });
    }

    return data;
  };

  const chartData = useMemo(() => generateHistoricalData(timeInterval), [timeInterval, currentPrice]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {assetName} ({assetSymbol})
          </DialogTitle>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-3xl font-bold text-foreground">
              ${currentPrice.toFixed(2)}
            </span>
            <span
              className={`text-lg font-semibold ${
                changePercent >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%
            </span>
          </div>
        </DialogHeader>

        <Tabs value={timeInterval} onValueChange={(value) => setTimeInterval(value as TimeInterval)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="minute">Minuto</TabsTrigger>
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
          </TabsList>

          <TabsContent value="minute" className="mt-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--card-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="day" className="mt-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--card-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="week" className="mt-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--card-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
