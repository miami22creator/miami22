import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ExternalLink, Building2, Landmark, User } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";

export const InfluencersPanel = () => {
  const queryClient = useQueryClient();
  
  const { data: influencers, isLoading } = useQuery({
    queryKey: ['influencers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('influencers')
        .select('*')
        .eq('is_active', true)
        .order('influence_score', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: recentPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['recent-social-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          influencers(name, username, platform),
          assets(symbol, name)
        `)
        .order('posted_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Suscripción en tiempo real para posts sociales
  useEffect(() => {
    const channel = supabase
      .channel('social-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_posts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recent-social-posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getInfluencerIcon = (name: string) => {
    if (name.includes('Federal Reserve') || name.includes('Fed')) {
      return <Landmark className="h-5 w-5 text-primary" />;
    }
    if (name.includes('Treasury') || name.includes('Tesoro')) {
      return <Building2 className="h-5 w-5 text-primary" />;
    }
    if (name.includes('Trump') || name.includes('Donald')) {
      return <User className="h-5 w-5 text-primary" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Influencers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Influencers</CardTitle>
          <CardDescription>
            Tracking {influencers?.length || 0} high-impact traders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {influencers?.map((influencer) => (
              <Card key={influencer.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getInfluencerIcon(influencer.name)}
                      <div>
                        <h4 className="font-semibold">{influencer.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          @{influencer.username}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {influencer.platform}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Influence</p>
                      <p className="font-semibold">{influencer.influence_score}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Accuracy</p>
                      <p className="font-semibold">
                        {influencer.accuracy_score?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Predictions</p>
                      <p className="font-semibold">{influencer.total_predictions || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Followers</p>
                      <p className="font-semibold">
                        {(influencer.followers_count / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Social Activity</CardTitle>
          <CardDescription>
            Latest mentions and sentiment analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts?.map((post: any) => (
                <Card key={post.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {post.influencers?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{post.influencers?.username}
                          </span>
                          {post.assets && (
                            <Badge variant="secondary" className="text-xs">
                              ${post.assets.symbol}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 mb-2">
                          {post.post_text}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(post.posted_at), 'MMM d, HH:mm')}
                          </span>
                          {post.engagement_count > 0 && (
                            <span>💬 {post.engagement_count}</span>
                          )}
                        </div>
                      </div>
                      {post.post_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="ml-2"
                        >
                          <a
                            href={post.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    {post.sentiment_label && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          {getSentimentIcon(post.sentiment_label)}
                          <span className="text-xs font-medium capitalize">
                            {post.sentiment_label}
                          </span>
                        </div>
                        {post.sentiment_score && (
                          <Badge variant="outline" className="text-xs">
                            {(post.sentiment_score * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {post.urgency_level && (
                          <Badge
                            variant={getUrgencyColor(post.urgency_level) as any}
                            className="text-xs"
                          >
                            {post.urgency_level}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent social activity yet</p>
              <p className="text-sm mt-2">Posts from tracked influencers will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
