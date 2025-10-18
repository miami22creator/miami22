import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";

interface MarketStat {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

const marketStats: MarketStat[] = [
  {
    label: "Señales Activas",
    value: "12",
    change: 3,
    icon: <Activity className="h-5 w-5" />,
  },
  {
    label: "CALL Signals",
    value: "8",
    change: 2,
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    label: "PUT Signals",
    value: "4",
    change: 1,
    icon: <TrendingDown className="h-5 w-5" />,
  },
  {
    label: "Confianza Promedio",
    value: "78%",
    change: 5,
    icon: <DollarSign className="h-5 w-5" />,
  },
];

export const MarketOverview = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {marketStats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <div className="text-primary">{stat.icon}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              <span className={stat.change >= 0 ? "text-success" : "text-destructive"}>
                {stat.change >= 0 ? "+" : ""}{stat.change}
              </span>{" "}
              desde la última hora
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
