import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Influencer {
  id: string;
  name: string;
  username: string;
  platform: string;
  followers_count: number;
  influence_score: number;
  accuracy_score: number;
  total_predictions: number;
  correct_predictions: number;
}

interface SocialPost {
  id: string;
  post_text: string;
  sentiment_label: string;
  urgency_level: string;
  posted_at: string;
  influencers: {
    name: string;
    username: string;
  };
  assets: {
    symbol: string;
  } | null;
}

export const InfluencersPanel = () => {
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>(null);
  const [newPostText, setNewPostText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: influencers, isLoading: loadingInfluencers } = useQuery({
    queryKey: ['influencers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('influencers')
        .select('*')
        .eq('is_active', true)
        .order('influence_score', { ascending: false });
      
      if (error) throw error;
      return data as Influencer[];
    },
  });

  const { data: recentPosts, isLoading: loadingPosts, refetch: refetchPosts } = useQuery({
    queryKey: ['social-posts', selectedInfluencer],
    queryFn: async () => {
      let query = supabase
        .from('social_posts')
        .select(`
          *,
          influencers(name, username),
          assets(symbol)
        `)
        .order('posted_at', { ascending: false })
        .limit(10);

      if (selectedInfluencer) {
        query = query.eq('influencer_id', selectedInfluencer);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SocialPost[];
    },
  });

  const handleAnalyzePost = async () => {
    if (!newPostText.trim() || !selectedInfluencer) {
      toast.error('Selecciona un influencer y escribe un post');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Analizar con AI
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-social-post',
        {
          body: {
            postText: newPostText,
            influencerId: selectedInfluencer
          }
        }
      );

      if (analysisError) throw analysisError;

      // Insertar post analizado
      const { error: insertError } = await supabase
        .from('social_posts')
        .insert({
          influencer_id: selectedInfluencer,
          post_text: newPostText,
          sentiment_score: analysisData.analysis.sentiment_score,
          sentiment_label: analysisData.analysis.sentiment_label,
          urgency_level: analysisData.analysis.urgency_level,
          asset_id: analysisData.analysis.asset_id,
          posted_at: new Date().toISOString(),
          analyzed_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      toast.success(`Post analizado: ${analysisData.analysis.sentiment_label} (${analysisData.analysis.reasoning})`);
      setNewPostText("");
      refetchPosts();
    } catch (error) {
      console.error('Error analyzing post:', error);
      toast.error('Error al analizar el post');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'bullish': return <TrendingUp className="h-4 w-4" />;
      case 'bearish': return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'bullish': return 'bg-success/20 text-success border-success/30';
      case 'bearish': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive';
      case 'high': return 'bg-warning';
      case 'medium': return 'bg-primary';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de Influencers */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Top Influencers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingInfluencers ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            influencers?.map((influencer) => (
              <div
                key={influencer.id}
                onClick={() => setSelectedInfluencer(influencer.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedInfluencer === influencer.id
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{influencer.name}</p>
                    <p className="text-xs text-muted-foreground">@{influencer.username}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {influencer.influence_score.toFixed(0)}
                  </Badge>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{(influencer.followers_count / 1000000).toFixed(1)}M</span>
                  <span>
                    {influencer.total_predictions > 0
                      ? `${((influencer.correct_predictions / influencer.total_predictions) * 100).toFixed(0)}% accuracy`
                      : 'Sin datos'}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Posts recientes y análisis */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedInfluencer
              ? `Posts de ${influencers?.find(i => i.id === selectedInfluencer)?.name}`
              : 'Todos los Posts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulario para nuevo post */}
          {selectedInfluencer && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <Textarea
                placeholder="Escribe un post para analizar..."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="min-h-[80px]"
              />
              <Button
                onClick={handleAnalyzePost}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analizando...' : 'Analizar Sentiment con AI'}
              </Button>
            </div>
          )}

          {/* Posts recientes */}
          <div className="space-y-3">
            {loadingPosts ? (
              <p className="text-sm text-muted-foreground">Cargando posts...</p>
            ) : recentPosts && recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <div key={post.id} className="p-4 bg-card border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{post.influencers.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.posted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getSentimentColor(post.sentiment_label)}>
                        {getSentimentIcon(post.sentiment_label)}
                        {post.sentiment_label}
                      </Badge>
                      <Badge className={getUrgencyColor(post.urgency_level)}>
                        {post.urgency_level}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm">{post.post_text}</p>
                  {post.assets && (
                    <Badge variant="outline" className="text-xs">
                      ${post.assets.symbol}
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay posts todavía. {selectedInfluencer && 'Crea el primero arriba!'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
