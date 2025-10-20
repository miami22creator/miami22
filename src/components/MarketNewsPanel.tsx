import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

export const MarketNewsPanel = () => {
  const { data: news, isLoading } = useQuery({
    queryKey: ["market-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_news")
        .select(`
          *,
          assets (
            symbol,
            name
          )
        `)
        .order("published_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // Refrescar cada 5 minutos
  });

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case "positive":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "negative":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label) {
      case "positive":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "negative":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Noticias del Mercado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Noticias del Mercado
          <Badge variant="outline" className="text-xs">
            En vivo
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {news && news.length > 0 ? (
              news.map((article: any) => (
                <div
                  key={article.id}
                  className="border border-border/50 rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(article.sentiment_label)}
                      <Badge
                        variant="outline"
                        className={getSentimentColor(article.sentiment_label)}
                      >
                        {article.sentiment_label}
                      </Badge>
                      {article.assets && (
                        <Badge variant="secondary">
                          {article.assets.symbol}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(article.published_at), "HH:mm")}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm mb-2 leading-tight">
                    {article.headline}
                  </h4>

                  {article.summary && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {article.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {article.source}
                    </span>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Leer más
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-8">
                No hay noticias disponibles
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};