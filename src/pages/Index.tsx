import { TradingHeader } from "@/components/TradingHeader";
import { MarketOverview } from "@/components/MarketOverview";
import { SignalCard } from "@/components/SignalCard";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { AlertsPanel } from "@/components/AlertsPanel";

const mockSignals = [
  {
    asset: "TSLA",
    signal: "CALL" as const,
    confidence: 85,
    price: 242.50,
    change: 3.2,
    rsi: 45.2,
    macd: 0.85,
  },
  {
    asset: "NVDA",
    signal: "CALL" as const,
    confidence: 78,
    price: 878.30,
    change: 2.1,
    rsi: 52.8,
    macd: 1.22,
  },
  {
    asset: "SPY",
    signal: "PUT" as const,
    confidence: 72,
    price: 515.80,
    change: -0.8,
    rsi: 68.5,
    macd: -0.35,
  },
  {
    asset: "GLD",
    signal: "CALL" as const,
    confidence: 81,
    price: 195.60,
    change: 1.5,
    rsi: 48.3,
    macd: 0.42,
  },
  {
    asset: "AMD",
    signal: "CALL" as const,
    confidence: 76,
    price: 142.80,
    change: 4.3,
    rsi: 43.7,
    macd: 0.95,
  },
  {
    asset: "PLTR",
    signal: "CALL" as const,
    confidence: 88,
    price: 28.45,
    change: 5.7,
    rsi: 38.2,
    macd: 1.15,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TradingHeader />
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          <MarketOverview />
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="mb-4 text-2xl font-bold text-foreground">
                  Señales Activas
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {mockSignals.map((signal) => (
                    <SignalCard key={signal.asset} {...signal} />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <IndicatorPanel />
              <AlertsPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
