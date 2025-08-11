import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple text utils for a naive keyword-match fallback
function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function score(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  let overlap = 0;
  ta.forEach((t) => {
    if (tb.has(t)) overlap += 1;
  });
  return overlap / Math.max(1, ta.size);
}

async function getFaqFallback(prompt: string): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // If we can't access Supabase, return a generic message
    return (
      "I'm having trouble reaching our knowledge base right now. " +
      "Please share more details (order ID, issue, any error messages) and I'll escalate to a human agent."
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("predefined_questions")
    .select("question, answer, category")
    .eq("is_active", true)
    .limit(100);

  if (error || !data || data.length === 0) {
    return (
      "I couldn't find a relevant article at the moment. " +
      "Please provide a bit more detail and I'll connect you with a human agent if needed."
    );
  }

  let best = data[0];
  let bestScore = -1;
  for (const item of data) {
    const s = Math.max(score(prompt, item.question || ""), score(prompt, item.answer || ""));
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }

  if (!best) {
    return (
      "Thanks for your question! I couldn't match it to our FAQs. " +
      "Please include your order ID (if applicable) and any error messages, and I'll escalate."
    );
  }

  const cat = best.category ? `Category: ${best.category}` : "Helpful article";
  return `Here’s what I found from our help center.\n\n${cat}\nQ: ${best.question}\nA: ${best.answer}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const { prompt, sessionId, history } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'prompt' in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert customer support assistant for an electric scooter company.
- Be concise and helpful.
- Answer in plain language; use bullet points when useful.
- If the user asks about orders, warranties, battery, charging, or troubleshooting, give step-by-step guidance and safety notes.
- If you are unsure, say you'll escalate to a human agent and ask for needed details.
- Avoid making up order details—never invent personal data.
Session ID: ${sessionId ?? "unknown"}.`;

    let generatedText: string | null = null;

    // Try OpenAI first (if key available)
    if (OPENAI_API_KEY) {
      try {
        const body = {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...(Array.isArray(history) ? history : []),
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
        } as const;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          generatedText = data.choices?.[0]?.message?.content ?? null;
        } else {
          const err = await response.text();
          console.error("OpenAI error:", err);
        }
      } catch (e) {
        console.error("OpenAI request threw:", e);
      }
    }

    // Fallback to FAQs if OpenAI failed or key missing
    if (!generatedText) {
      generatedText = await getFaqFallback(prompt);
    }

    return new Response(
      JSON.stringify({ generatedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("support-chat function error:", error);
    // As a last resort, still return a friendly message with 200 to avoid breaking the client
    const safeMessage =
      "Sorry, I'm having trouble generating a response right now. " +
      "Please share more details (order ID, issue) and I'll escalate to a human agent.";
    return new Response(
      JSON.stringify({ generatedText: safeMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});