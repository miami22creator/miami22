import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const PredictionAccuracyPanel = () => {
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  const { data: correlations, refetch: refetchCorrelations } = useQuery({
    queryKey: ["price-correlations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_correlations")
        .select(`
          *,
          assets (
            symbol,
            name
          )
        `)
        .order("measured_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: influencers, refetch: refetchInfluencers } = useQuery({
    queryKey: ["influencers-accuracy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencers")
        .select("*")
        .gt("total_predictions", 0)
        .order("accuracy_score", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Suscripciones en tiempo real
  useEffect(() => {
    const correlationsChannel = supabase
      .channel('price-correlations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_correlations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["price-correlations"] });
        }
      )
      .subscribe();

    const influencersChannel = supabase
      .channel('influencers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'influencers'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["influencers-accuracy"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(correlationsChannel);
      supabase.removeChannel(influencersChannel);
    };
  }, [queryClient]);

  // Calcular estadísticas generales
  const stats = correlations?.reduce(
    (acc, corr) => {
      acc.total++;
      if (corr.prediction_correct) acc.correct++;
      return acc;
    },
    { total: 0, correct: 0 }
  );

  const overallAccuracy = stats && stats.total > 0 
    ? (stats.correct / stats.total) * 100 
    : 0;

  const handleValidateNow = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-predictions");
      
      if (error) throw error;
      
      toast.success(`Validación completada: ${data.correct}/${data.validated} predicciones correctas (${data.accuracy.toFixed(2)}%)`);
      
      // Refrescar los datos
      refetchCorrelations();
      refetchInfluencers();
    } catch (error) {
      console.error("Error validating predictions:", error);
      toast.error("Error al validar predicciones");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Últimas Validaciones
          </CardTitle>
          <Button 
            onClick={handleValidateNow} 
            disabled={isValidating}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Validar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Últimas predicciones validadas */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Últimas Validaciones</h4>
          {correlations && correlations.length > 0 ? (
            correlations.slice(0, 5).map((corr: any) => (
              <div
                key={corr.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  {corr.prediction_correct ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium text-sm">
                      {corr.assets?.symbol || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {corr.price_change_percent > 0 ? (
                        <span className="text-green-500 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          +{corr.price_change_percent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          {corr.price_change_percent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant={corr.prediction_correct ? "default" : "secondary"}>
                  {corr.prediction_correct ? "✓" : "✗"}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">
              No hay validaciones aún
            </p>
          )}
        </div>

        {/* Accuracy de Influencers */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Accuracy de Influencers</h4>
          {influencers && influencers.length > 0 ? (
            influencers.map((inf) => (
              <div
                key={inf.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={inf.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${inf.name}`}
                    alt={inf.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-sm">{inf.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {inf.correct_predictions}/{inf.total_predictions} correctas
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={inf.accuracy_score >= 70 ? "default" : "secondary"}>
                    {inf.accuracy_score.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">
              Sin datos de accuracy aún
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
