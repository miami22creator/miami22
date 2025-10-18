import { Activity } from "lucide-react";

export const TradingHeader = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Trading Signal Predictor</h1>
              <p className="text-sm text-muted-foreground">Predicción en tiempo real de señales CALL/PUT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-2 animate-pulse rounded-full bg-primary"></div>
            <span className="text-sm font-medium text-muted-foreground">En vivo</span>
          </div>
        </div>
      </div>
    </header>
  );
};
