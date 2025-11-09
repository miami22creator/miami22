import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export const DailyPredictionReport = () => {
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  const { data: todaySignals, refetch: refetchSignals } = useQuery({
    queryKey: ['today-signals'],
    queryFn: async () => {
      // Obtener señales del día actual (generación diaria)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('trading_signals')
        .select(`
          *,
          assets (
            symbol,
            name,
            type
          )
        `)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: validations, refetch: refetchValidations } = useQuery({
    queryKey: ['recent-validations'],
    queryFn: async () => {
      // Obtener validaciones de los últimos 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('price_correlations')
        .select(`
          *,
          assets (
            symbol,
            name
          )
        `)
        .gte('measured_at', sevenDaysAgo.toISOString())
        .order('measured_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Suscripciones en tiempo real
  useEffect(() => {
    const signalsChannel = supabase
      .channel('daily-signals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['today-signals'] });
        }
      )
      .subscribe();

    const validationsChannel = supabase
      .channel('daily-validations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_correlations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recent-validations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(validationsChannel);
    };
  }, [queryClient]);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { error } = await supabase.functions.invoke('validate-predictions', {
        body: {}
      });

      if (error) throw error;

      toast.success('Validación completada');
      refetchSignals();
      refetchValidations();
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Error al validar predicciones');
    } finally {
      setIsValidating(false);
    }
  };

  const correctCount = validations?.filter(v => v.prediction_correct).length || 0;
  const totalValidations = validations?.length || 0;
  const accuracy = totalValidations > 0 ? ((correctCount / totalValidations) * 100).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reporte de Predicciones de Hoy</CardTitle>
            <CardDescription>
              Señales generadas hoy • Horizonte de predicción: 5 días • Validación automática después de 5 días
            </CardDescription>
          </div>
          <Button 
            onClick={handleValidate} 
            disabled={isValidating}
            size="sm"
          >
            {isValidating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Validar Ahora
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Señales Generadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaySignals?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Predicciones Validadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalValidations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Precisión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {correctCount} de {totalValidations} correctas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Señales de Hoy */}
        {todaySignals && todaySignals.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold mb-3">Señales de Hoy (Se validarán en 5 días)</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {todaySignals.map((signal: any) => {
                const asset = Array.isArray(signal.assets) ? signal.assets[0] : signal.assets;
                const validation = validations?.find(v => 
                  v.asset_id === signal.asset_id && 
                  new Date(v.measured_at).getTime() > new Date(signal.created_at).getTime()
                );

                return (
                  <div 
                    key={signal.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        {signal.signal === 'CALL' && <TrendingUp className="h-5 w-5 text-green-500" />}
                        {signal.signal === 'PUT' && <TrendingDown className="h-5 w-5 text-red-500" />}
                        {signal.signal === 'NEUTRAL' && <Minus className="h-5 w-5 text-gray-500" />}
                      </div>
                      <div>
                        <div className="font-medium">{asset?.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          ${signal.price} • Confianza: {signal.confidence}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={
                        signal.signal === 'CALL' ? 'default' : 
                        signal.signal === 'PUT' ? 'destructive' : 
                        'secondary'
                      }>
                        {signal.signal}
                      </Badge>
                      
                      {validation && (
                        <div className="flex items-center gap-1">
                          {validation.prediction_correct ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className={`text-sm font-medium ${
                            validation.price_change_percent > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {validation.price_change_percent > 0 ? '+' : ''}
                            {validation.price_change_percent?.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se han generado señales hoy. Las señales se generan diariamente y se validan después de 5 días.
          </div>
        )}

        {/* Resultados de Validación (últimos 7 días) */}
        {validations && validations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Validaciones Recientes (Últimos 7 días)</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {validations.map((validation: any) => {
                const asset = Array.isArray(validation.assets) ? validation.assets[0] : validation.assets;
                return (
                  <div 
                    key={validation.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {validation.prediction_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{asset?.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          ${validation.price_before} → ${validation.price_after}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        validation.price_change_percent > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {validation.price_change_percent > 0 ? '+' : ''}
                        {validation.price_change_percent?.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {validation.prediction_correct ? 'Correcto' : 'Incorrecto'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
