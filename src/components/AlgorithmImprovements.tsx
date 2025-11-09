import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Brain, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export const AlgorithmImprovements = () => {
  const queryClient = useQueryClient();

  const { data: improvements, isLoading } = useQuery({
    queryKey: ['algorithm-improvements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('algorithm_improvements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000 // Refetch every minute
  });

  // Suscripción en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('algorithm-improvements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'algorithm_improvements'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['algorithm-improvements'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const latestImprovement = improvements?.[0];
  const previousImprovement = improvements?.[1];

  const accuracyChange = latestImprovement && previousImprovement
    ? (latestImprovement.accuracy_before || 0) - (previousImprovement.accuracy_before || 0)
    : 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Mejoras del Algoritmo
            </CardTitle>
            <CardDescription>
              Sistema de aprendizaje continuo - Análisis semanal automático
            </CardDescription>
          </div>
          {latestImprovement && (
            <Badge variant="outline" className="text-xs">
              {latestImprovement.version}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Accuracy */}
        {latestImprovement && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Precisión Actual</p>
                  <p className="text-2xl font-bold">
                    {latestImprovement.accuracy_before?.toFixed(2)}%
                  </p>
                </div>
              </div>
              {accuracyChange !== 0 && (
                <div className={`flex items-center gap-1 ${accuracyChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {accuracyChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {Math.abs(accuracyChange).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Signal Performance */}
            {latestImprovement.metrics && typeof latestImprovement.metrics === 'object' && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Rendimiento por Tipo de Señal
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries((latestImprovement.metrics as any).signal_analysis || {}).map(([type, data]: [string, any]) => {
                    const accuracy = data.total > 0 ? ((data.correct / data.total) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={type} className="p-3 rounded-lg border border-border/50 bg-background/50">
                        <Badge 
                          variant={type === 'CALL' ? 'default' : type === 'PUT' ? 'destructive' : 'secondary'}
                          className="mb-2"
                        >
                          {type}
                        </Badge>
                        <p className="text-lg font-bold">{accuracy}%</p>
                        <p className="text-xs text-muted-foreground">{data.correct}/{data.total}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Best & Worst Assets */}
            {latestImprovement.metrics && typeof latestImprovement.metrics === 'object' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-green-500 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Mejores Activos
                  </h4>
                  <div className="space-y-2">
                    {((latestImprovement.metrics as any).best_assets || []).slice(0, 3).map((asset: any) => (
                      <div key={asset.symbol} className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                        <span className="text-sm font-medium">{asset.symbol}</span>
                        <span className="text-sm text-green-500">{asset.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-500 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Peores Activos
                  </h4>
                  <div className="space-y-2">
                    {((latestImprovement.metrics as any).worst_assets || []).slice(0, 3).map((asset: any) => (
                      <div key={asset.symbol} className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20">
                        <span className="text-sm font-medium">{asset.symbol}</span>
                        <span className="text-sm text-red-500">{asset.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {latestImprovement.ai_recommendations && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Recomendaciones de IA
                </h4>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {latestImprovement.ai_recommendations}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {!improvements?.length && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay análisis de mejoras disponibles aún.</p>
            <p className="text-xs mt-1">El sistema se ejecuta automáticamente cada domingo.</p>
          </div>
        )}

        {/* History */}
        {improvements && improvements.length > 1 && (
          <div className="space-y-2 pt-4 border-t border-border/50">
            <h4 className="text-sm font-semibold">Historial de Versiones</h4>
            <div className="space-y-2">
              {improvements.slice(1, 4).map((improvement) => (
                <div key={improvement.id} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {improvement.version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(improvement.created_at).toLocaleDateString('es-ES', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {improvement.accuracy_before?.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
