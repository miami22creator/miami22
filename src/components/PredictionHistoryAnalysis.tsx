import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  PieChart,
  Activity,
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { useEffect } from 'react';

const COLORS = ['#10b981', '#ef4444', '#6366f1', '#f59e0b', '#8b5cf6'];

export const PredictionHistoryAnalysis = () => {
  const queryClient = useQueryClient();

  // Histórico completo de predicciones
  const { data: allPredictions } = useQuery({
    queryKey: ['all-predictions-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_correlations')
        .select(`
          *,
          assets (
            symbol,
            name,
            type
          )
        `)
        .order('measured_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Suscripción en tiempo real para price_correlations
  useEffect(() => {
    const channel = supabase
      .channel('history-correlations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_correlations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-predictions-history'] });
          queryClient.invalidateQueries({ queryKey: ['accuracy-by-period'] });
          queryClient.invalidateQueries({ queryKey: ['accuracy-by-asset'] });
          queryClient.invalidateQueries({ queryKey: ['accuracy-by-signal-type'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Accuracy por período
  const { data: accuracyByPeriod } = useQuery({
    queryKey: ['accuracy-by-period'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_prediction_accuracy_by_period' as any);
      
      if (error) {
        // Fallback: calcular manualmente
        const predictions = await supabase
          .from('price_correlations')
          .select('measured_at, prediction_correct')
          .order('measured_at', { ascending: true });
        
        if (predictions.error) throw predictions.error;
        
        // Agrupar por día
        const grouped = predictions.data.reduce((acc: any, pred: any) => {
          const date = new Date(pred.measured_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { total: 0, correct: 0 };
          }
          acc[date].total++;
          if (pred.prediction_correct) acc[date].correct++;
          return acc;
        }, {});
        
        return Object.entries(grouped).map(([date, stats]: any) => ({
          period: date,
          total_predictions: stats.total,
          correct_predictions: stats.correct,
          accuracy_percent: ((stats.correct / stats.total) * 100).toFixed(2)
        }));
      }
      
      return data;
    },
  });

  // Accuracy por activo
  const { data: accuracyByAsset } = useQuery({
    queryKey: ['accuracy-by-asset'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_correlations')
        .select(`
          prediction_correct,
          price_change_percent,
          assets (
            symbol,
            name,
            type
          )
        `);

      if (error) throw error;

      // Agrupar por activo
      const grouped = data.reduce((acc: any, pred: any) => {
        const symbol = pred.assets?.symbol;
        if (!symbol) return acc;
        
        if (!acc[symbol]) {
          acc[symbol] = {
            symbol,
            name: pred.assets.name,
            type: pred.assets.type,
            total: 0,
            correct: 0,
            priceChanges: []
          };
        }
        acc[symbol].total++;
        if (pred.prediction_correct) acc[symbol].correct++;
        if (pred.price_change_percent) acc[symbol].priceChanges.push(pred.price_change_percent);
        return acc;
      }, {});

      return Object.values(grouped).map((asset: any) => ({
        ...asset,
        accuracy_percent: ((asset.correct / asset.total) * 100).toFixed(2),
        avg_price_change: (asset.priceChanges.reduce((a: number, b: number) => a + b, 0) / asset.priceChanges.length).toFixed(2)
      })).sort((a: any, b: any) => b.accuracy_percent - a.accuracy_percent);
    },
  });

  // Accuracy por tipo de señal
  const { data: accuracyBySignalType } = useQuery({
    queryKey: ['accuracy-by-signal-type'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_correlations')
        .select('signal_type, prediction_correct, signal_confidence')
        .not('signal_type', 'is', null);

      if (error) throw error;

      const grouped = data.reduce((acc: any, pred: any) => {
        const type = pred.signal_type;
        if (!acc[type]) {
          acc[type] = { total: 0, correct: 0, confidences: [] };
        }
        acc[type].total++;
        if (pred.prediction_correct) acc[type].correct++;
        if (pred.signal_confidence) acc[type].confidences.push(pred.signal_confidence);
        return acc;
      }, {});

      return Object.entries(grouped).map(([type, stats]: any) => ({
        signal_type: type,
        total_predictions: stats.total,
        correct_predictions: stats.correct,
        accuracy_percent: ((stats.correct / stats.total) * 100).toFixed(2),
        avg_confidence: stats.confidences.length > 0 
          ? (stats.confidences.reduce((a: number, b: number) => a + b, 0) / stats.confidences.length).toFixed(2)
          : 0
      }));
    },
  });

  const totalPredictions = allPredictions?.length || 0;
  const correctPredictions = allPredictions?.filter(p => p.prediction_correct).length || 0;
  const overallAccuracy = totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(2) : 0;

  // Datos para gráfico de pie
  const pieData = [
    { name: 'Correctas', value: correctPredictions, color: '#10b981' },
    { name: 'Incorrectas', value: totalPredictions - correctPredictions, color: '#ef4444' }
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Análisis Histórico de Predicciones
        </CardTitle>
        <CardDescription>
          Sistema de aprendizaje continuo • Todas las predicciones validadas • Métricas de rendimiento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Target className="w-4 h-4 mr-2" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Calendar className="w-4 h-4 mr-2" />
              Línea Temporal
            </TabsTrigger>
            <TabsTrigger value="assets">
              <BarChart3 className="w-4 h-4 mr-2" />
              Por Activo
            </TabsTrigger>
            <TabsTrigger value="signals">
              <PieChart className="w-4 h-4 mr-2" />
              Por Tipo de Señal
            </TabsTrigger>
          </TabsList>

          {/* TAB: Resumen General */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Predicciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalPredictions}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Histórico completo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Predicciones Correctas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{correctPredictions}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aciertos totales
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Accuracy General
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">{overallAccuracy}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Precisión del sistema
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Predicciones Incorrectas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">
                    {totalPredictions - correctPredictions}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Errores para aprender
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribución de Resultados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Últimas 10 Predicciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {allPredictions?.slice(0, 10).map((pred: any) => (
                      <div
                        key={pred.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={pred.prediction_correct ? "default" : "destructive"}>
                            {pred.assets?.symbol}
                          </Badge>
                          <span className="text-sm">
                            {pred.signal_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            pred.price_change_percent > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {pred.price_change_percent > 0 ? '+' : ''}
                            {pred.price_change_percent?.toFixed(2)}%
                          </span>
                          {pred.prediction_correct ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Línea Temporal */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución del Accuracy en el Tiempo</CardTitle>
                <CardDescription>
                  Mejora continua del sistema de predicción día a día
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={accuracyByPeriod || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any) => [`${value}%`, 'Accuracy']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy_percent" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Accuracy (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Por Activo */}
          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Activo</CardTitle>
                <CardDescription>
                  Identifica qué activos son más predecibles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={accuracyByAsset || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="accuracy_percent" fill="#6366f1" name="Accuracy (%)" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 space-y-2">
                  <h4 className="font-semibold text-sm">Detalles por Activo</h4>
                  {accuracyByAsset?.map((asset: any, idx: number) => (
                    <div
                      key={asset.symbol}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-muted-foreground">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{asset.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {asset.total} predicciones • Cambio prom: {asset.avg_price_change}%
                          </div>
                        </div>
                      </div>
                      <Badge variant={parseFloat(asset.accuracy_percent) >= 70 ? "default" : "secondary"}>
                        {asset.accuracy_percent}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Por Tipo de Señal */}
          <TabsContent value="signals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Tipo de Señal</CardTitle>
                <CardDescription>
                  Compara CALL vs PUT vs NEUTRAL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {accuracyBySignalType?.map((signal: any) => (
                    <Card key={signal.signal_type}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <span>{signal.signal_type}</span>
                          <Badge variant={
                            signal.signal_type === 'CALL' ? 'default' :
                            signal.signal_type === 'PUT' ? 'destructive' :
                            'secondary'
                          }>
                            {signal.accuracy_percent}%
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-medium">{signal.total_predictions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Correctas:</span>
                            <span className="font-medium text-green-500">
                              {signal.correct_predictions}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Confianza prom:</span>
                            <span className="font-medium">{signal.avg_confidence}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={accuracyBySignalType || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="signal_type" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: any) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="accuracy_percent" fill="#8b5cf6" name="Accuracy (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
