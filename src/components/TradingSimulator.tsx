import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, AlertCircle, Target, DollarSign, BarChart3, Lightbulb } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SimulationResult {
  simulation: {
    initialCapital: number;
    finalCapital: number;
    totalGain: number;
    roi: number;
    accuracy: number;
    totalTrades: number;
    correctTrades: number;
    minConfidence: number;
  };
  bestAssets: Array<{
    symbol: string;
    accuracy: string;
    totalTrades: number;
    gain: string;
  }>;
  worstAssets: Array<{
    symbol: string;
    accuracy: string;
    totalTrades: number;
    loss: string;
  }>;
  aiRecommendations: string[];
  recommendation: 'SAFE_TO_INVEST' | 'MODERATE_RISK' | 'HIGH_RISK';
}

export function TradingSimulator() {
  const [capital, setCapital] = useState(1000);
  const [minConfidence, setMinConfidence] = useState(60);
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const { toast } = useToast();

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-trading', {
        body: { 
          capital,
          minConfidence,
          daysBack: 30
        }
      });

      if (error) throw error;

      setResult(data);
      
      const roiColor = data.simulation.roi > 5 ? 'text-success' : data.simulation.roi > 0 ? 'text-warning' : 'text-destructive';
      
      toast({
        title: "Simulación Completada",
        description: `ROI: ${data.simulation.roi.toFixed(2)}% - ${data.recommendation === 'SAFE_TO_INVEST' ? '✅ Recomendado' : data.recommendation === 'MODERATE_RISK' ? '⚠️ Riesgo Moderado' : '🚫 Alto Riesgo'}`,
      });

    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Error en Simulación",
        description: error instanceof Error ? error.message : "No se pudo completar la simulación",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getRecommendationColor = () => {
    if (!result) return "bg-muted";
    switch (result.recommendation) {
      case 'SAFE_TO_INVEST': return "bg-success/10 border-success";
      case 'MODERATE_RISK': return "bg-warning/10 border-warning";
      case 'HIGH_RISK': return "bg-destructive/10 border-destructive";
    }
  };

  const getRecommendationIcon = () => {
    if (!result) return <Target className="h-5 w-5" />;
    switch (result.recommendation) {
      case 'SAFE_TO_INVEST': return <TrendingUp className="h-5 w-5 text-success" />;
      case 'MODERATE_RISK': return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'HIGH_RISK': return <TrendingDown className="h-5 w-5 text-destructive" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Simulador de Trading con IA
        </CardTitle>
        <CardDescription>
          Simula inversiones con datos históricos y recibe recomendaciones inteligentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuración */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="capital">Capital Inicial</Label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Input
                id="capital"
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                min={100}
                max={100000}
                step={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Confianza Mínima: {minConfidence}%</Label>
            <Slider
              value={[minConfidence]}
              onValueChange={(value) => setMinConfidence(value[0])}
              min={0}
              max={100}
              step={5}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground">
              Solo considera señales con confianza ≥ {minConfidence}%
            </p>
          </div>

          <Button 
            onClick={handleSimulate} 
            disabled={isSimulating}
            className="w-full"
            size="lg"
          >
            {isSimulating ? "Simulando..." : "🎯 Simular Inversión"}
          </Button>
        </div>

        {/* Resultados */}
        {result && (
          <div className="space-y-4">
            {/* Resumen Principal */}
            <Alert className={getRecommendationColor()}>
              <div className="flex items-start gap-3">
                {getRecommendationIcon()}
                <div className="space-y-1 flex-1">
                  <div className="font-semibold">
                    {result.recommendation === 'SAFE_TO_INVEST' && '✅ Seguro para Invertir'}
                    {result.recommendation === 'MODERATE_RISK' && '⚠️ Riesgo Moderado'}
                    {result.recommendation === 'HIGH_RISK' && '🚫 Alto Riesgo - No Recomendado'}
                  </div>
                  <AlertDescription>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Capital Final:</span>
                        <p className="font-bold">${result.simulation.finalCapital.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">ROI:</span>
                        <p className={`font-bold ${result.simulation.roi > 0 ? 'text-success' : 'text-destructive'}`}>
                          {result.simulation.roi > 0 ? '+' : ''}{result.simulation.roi.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Ganancia/Pérdida:</span>
                        <p className={`font-bold ${result.simulation.totalGain > 0 ? 'text-success' : 'text-destructive'}`}>
                          {result.simulation.totalGain > 0 ? '+' : ''}${result.simulation.totalGain.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Accuracy:</span>
                        <p className="font-bold">{result.simulation.accuracy.toFixed(2)}%</p>
                      </div>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Mejores Activos */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Top 5 Mejores Activos
              </h4>
              <div className="space-y-1">
                {result.bestAssets.map((asset, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-success/5 rounded">
                    <span className="font-medium">{asset.symbol}</span>
                    <div className="flex gap-4 text-xs">
                      <span>{asset.accuracy}% accuracy</span>
                      <span className="text-success font-bold">+${asset.gain}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peores Activos */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Top 5 Peores Activos
              </h4>
              <div className="space-y-1">
                {result.worstAssets.map((asset, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 bg-destructive/5 rounded">
                    <span className="font-medium">{asset.symbol}</span>
                    <div className="flex gap-4 text-xs">
                      <span>{asset.accuracy}% accuracy</span>
                      <span className="text-destructive font-bold">${asset.loss}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recomendaciones de IA */}
            {result.aiRecommendations && result.aiRecommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Recomendaciones de IA
                </h4>
                <div className="space-y-2 text-sm">
                  {result.aiRecommendations.map((rec, i) => (
                    <div key={i} className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{result.simulation.totalTrades}</p>
                <p className="text-xs text-muted-foreground">Total Trades</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{result.simulation.correctTrades}</p>
                <p className="text-xs text-muted-foreground">Trades Correctos</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}