import { TradingHeader } from "@/components/TradingHeader";
import { MarketOverview } from "@/components/MarketOverview";
import { SignalCard } from "@/components/SignalCard";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { AlertsPanel } from "@/components/AlertsPanel";
import { ManualSignalGenerator } from "@/components/ManualSignalGenerator";
import { useTradingSignals } from "@/hooks/useTradingData";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { data: signals, isLoading, refetch } = useTradingSignals();

  // Verificar autenticación
  useEffect(() => {
    // Configurar listener de auth PRIMERO
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    // LUEGO verificar sesión existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
          
          // Mostrar notificación con información de la señal
          const newSignal = payload.new as any;
          toast({
            title: `🎯 Nueva señal: ${newSignal.signal}`,
            description: `Confianza: ${newSignal.confidence}% | Precio: $${newSignal.price}`,
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
          const alert = payload.new as any;
          toast({
            title: `⚡ Alerta de ${alert.signal_type}`,
            description: `${alert.message} (${alert.confidence}% confianza)`,
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, toast]);

  if (authLoading || isLoading || !user) {
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
      <TradingHeader user={user} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          <MarketOverview />
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ManualSignalGenerator />
              
              <div>
                <h2 className="mb-4 text-2xl font-bold text-foreground">
                  Señales Activas
                </h2>
                {latestSignals.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
                    <div className="text-center">
                      <p className="mb-2 text-muted-foreground">
                        No hay señales disponibles aún.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Usa el panel superior para generar señales manualmente o espera a que el cron job las genere automáticamente.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {latestSignals.map((signal: any) => (
                      <SignalCard
                        key={signal.id}
                        asset={signal.assets.symbol}
                        assetName={signal.assets.name}
                        signal={signal.signal}
                        confidence={parseFloat(signal.confidence)}
                        price={parseFloat(signal.price)}
                        change={parseFloat(signal.change_percent)}
                        rsi={signal.indicators?.rsi || 0}
                        macd={signal.indicators?.macd || 0}
                        createdAt={signal.created_at}
                        onClick={() => {
                          toast({
                            title: signal.assets.name,
                            description: `Símbolo: ${signal.assets.symbol}`,
                            variant: "info",
                          });
                        }}
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
