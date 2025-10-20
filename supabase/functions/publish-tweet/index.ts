import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
    const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
    const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
    const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

    if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
      throw new Error("Missing Twitter credentials");
    }

    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error("Tweet text is required");
    }

    const url = "https://api.x.com/2/tweets";
    const method = "POST";

    const oauthParams = {
      oauth_consumer_key: API_KEY,
      oauth_nonce: Math.random().toString(36).substring(2),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: ACCESS_TOKEN,
      oauth_version: "1.0",
    };

    const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
      Object.entries(oauthParams)
        .sort()
        .map(([k, v]) => `${k}=${v}`)
        .join("&")
    )}`;

    const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(ACCESS_TOKEN_SECRET)}`;
    const hmacSha1 = createHmac("sha1", signingKey);
    const signature = hmacSha1.update(signatureBaseString).digest("base64");

    const signedOAuthParams = {
      ...oauthParams,
      oauth_signature: signature,
    };

    const oauthHeader = "OAuth " + Object.entries(signedOAuthParams)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ");

    console.log("Publishing tweet:", text);

    const response = await fetch(url, {
      method: method,
      headers: {
        Authorization: oauthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const responseText = await response.text();
    console.log("Twitter API Response:", responseText);

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
    }

    return new Response(JSON.stringify(JSON.parse(responseText)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error publishing tweet:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});