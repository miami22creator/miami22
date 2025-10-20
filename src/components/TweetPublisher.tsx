import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Twitter } from "lucide-react";

export const TweetPublisher = () => {
  const [tweetText, setTweetText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  const handlePublish = async () => {
    if (!tweetText.trim()) {
      toast({
        title: "Error",
        description: "El tweet no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    if (tweetText.length > 280) {
      toast({
        title: "Error",
        description: "El tweet no puede superar los 280 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);

    try {
      const { data, error } = await supabase.functions.invoke("publish-tweet", {
        body: { text: tweetText },
      });

      if (error) throw error;

      toast({
        title: "¡Tweet publicado!",
        description: "Tu tweet se ha publicado exitosamente en Twitter",
      });

      setTweetText("");
    } catch (error: any) {
      console.error("Error publishing tweet:", error);
      toast({
        title: "Error al publicar",
        description: error.message || "No se pudo publicar el tweet",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Twitter className="w-5 h-5" />
          Publicar en Twitter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="¿Qué está pasando en el mercado?"
          value={tweetText}
          onChange={(e) => setTweetText(e.target.value)}
          className="min-h-[120px] resize-none"
          maxLength={280}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {tweetText.length}/280
          </span>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !tweetText.trim()}
          >
            {isPublishing ? "Publicando..." : "Publicar Tweet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};