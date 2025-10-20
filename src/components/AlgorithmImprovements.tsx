import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Brain, Target, AlertTriangle } from "lucide-react";

export const AlgorithmImprovements = () => {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Mejoras del Algoritmo basadas en Validación
          <Badge variant="default" className="ml-2">v2.0</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {/* Mejora 1 */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30">
            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Bias Alcista Optimizado</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Las señales CALL tuvieron <span className="text-green-500 font-bold">3.6x más éxito</span> que PUTs.
                Ahora priorizamos CALLs en mercados alcistas con +10% boost de confianza.
              </p>
            </div>
          </div>

          {/* Mejora 2 */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Penalización de PUTs</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Solo <span className="text-yellow-500 font-bold">16%</span> de PUTs fueron correctos.
                Ahora reducimos confianza de PUTs en -15% durante tendencias alcistas.
              </p>
            </div>
          </div>

          {/* Mejora 3 */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30">
            <Target className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Pesos Ajustados</h4>
              <p className="text-xs text-muted-foreground mt-1">
                La confianza del 60-85% no predijo éxito. Ahora priorizamos indicadores técnicos
                y sentimiento social sobre el nivel de confianza individual.
              </p>
            </div>
          </div>

          {/* Mejora 4 */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30">
            <Brain className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Sectores de Alto Rendimiento</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Tech/Cloud: <span className="text-green-500 font-bold">100%</span> accuracy,
                Semiconductores: <span className="text-green-500 font-bold">83%</span> accuracy.
                Pesos técnicos aumentados para detectar movimientos &gt;2%.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Accuracy Anterior:</span>
            <Badge variant="secondary">51.67%</Badge>
          </div>
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-muted-foreground">Objetivo Accuracy:</span>
            <Badge variant="default">&gt;65%</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
