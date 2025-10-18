import { TradingHeader } from "@/components/TradingHeader";
import { MarketOverview } from "@/components/MarketOverview";
import { SignalCard } from "@/components/SignalCard";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { AlertsPanel } from "@/components/AlertsPanel";
import { useTradingSignals } from "@/hooks/useTradingData";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { data: signals, isLoading, refetch } = useTradingSignals();
  const { toast } = useToast();

  // Suscribirse a actualizaciones en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('trading-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('Nueva señal detectada:', payload);
          refetch();
          toast({
            title: "Nueva señal detectada",
            description: "El dashboard se ha actualizado con la última información",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('Nueva alerta:', payload);
          toast({
            title: "⚡ Nueva alerta de trading",
            description: "Se ha detectado una nueva oportunidad",
            variant: "default",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Agrupar señales por activo (tomar la más reciente de cada uno)
  const latestSignals = signals?.reduce((acc: any[], signal: any) => {
    const existing = acc.find(s => s.assets.symbol === signal.assets.symbol);
    if (!existing) {
      acc.push(signal);
    }
    return acc;
  }, []).slice(0, 6) || [];

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
                {latestSignals.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
                    <p className="text-muted-foreground">
                      No hay señales disponibles. Ejecuta la función para generar señales.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {latestSignals.map((signal: any) => (
                      <SignalCard
                        key={signal.id}
                        asset={signal.assets.symbol}
                        signal={signal.signal}
                        confidence={parseFloat(signal.confidence)}
                        price={parseFloat(signal.price)}
                        change={parseFloat(signal.change_percent)}
                        rsi={signal.indicators?.rsi || 0}
                        macd={signal.indicators?.macd || 0}
                      />
                    ))}
                  </div>
                )}
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
