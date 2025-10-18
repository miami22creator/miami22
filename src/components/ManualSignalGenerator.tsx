import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAssets } from "@/hooks/useTradingData";

export const ManualSignalGenerator = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: assets } = useAssets();
  const { toast } = useToast();

  const generateSignal = async () => {
    if (!selectedAsset) {
      toast({
        title: "Selecciona un activo",
        description: "Debes seleccionar un activo antes de generar una señal",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('calculate-indicators', {
        body: { assetSymbol: selectedAsset }
      });

      if (error) throw error;

      toast({
        title: "✅ Señal generada",
        description: `Señal ${data.signal.type} para ${selectedAsset} con ${data.signal.confidence}% de confianza`,
      });
    } catch (error) {
      console.error('Error generating signal:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar la señal",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllSignals = async () => {
    setIsGenerating(true);

    try {
      // Llamar a la edge function que genera señales para todos los activos
      const { data, error } = await supabase.functions.invoke('generate-all-signals');

      if (error) throw error;

      toast({
        title: "✅ Señales generadas",
        description: `Se generaron ${data?.successful || 0} señales exitosamente`,
      });
    } catch (error) {
      console.error('Error generating all signals:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron generar las señales",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Generar Señales Manualmente
        </CardTitle>
        <CardDescription>
          Genera señales de trading para activos específicos o para todos a la vez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Seleccionar Activo</label>
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un activo" />
            </SelectTrigger>
            <SelectContent>
              {assets?.map((asset) => (
                <SelectItem key={asset.id} value={asset.symbol}>
                  {asset.symbol} - {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={generateSignal}
            disabled={isGenerating || !selectedAsset}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generar para {selectedAsset || "Activo"}
              </>
            )}
          </Button>

          <Button
            onClick={generateAllSignals}
            disabled={isGenerating}
            variant="secondary"
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generar Todas
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg bg-secondary/50 p-3 text-sm">
          <p className="font-medium text-foreground">💡 Nota:</p>
          <p className="text-muted-foreground">
            El sistema genera automáticamente señales cada 5 minutos. Usa estos botones solo si necesitas señales inmediatas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
