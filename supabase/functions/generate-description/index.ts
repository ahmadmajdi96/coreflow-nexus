const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { moduleTitle, currentDescription, mode = "enhance", audience = "executive" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompts: Record<string, string> = {
      enhance: "You rewrite enterprise software product descriptions to be sharper, more compelling, and benefit-led. Keep it factual, ~3 sentences, no marketing fluff. Output only the rewritten description.",
      shorter: "Rewrite the description in ONE punchy sentence (<=25 words). Output only the sentence.",
      technical: "Rewrite the description for a technical audience (architects, engineers). Mention standards, integrations, and architecture. ~3 sentences. Output only the description.",
      executive: "Rewrite for a C-suite executive: lead with business outcome, ROI, risk reduction. ~3 sentences. Output only the description.",
    };

    const sys = systemPrompts[mode] || systemPrompts.enhance;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Module: ${moduleTitle}\nAudience: ${audience}\n\nCurrent description:\n${currentDescription}` },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ description: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
