// Public showcase chat — answers ONLY questions about CORTA ERP features.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the CORTA ERP Showcase Assistant.

CORTA ERP is an AI-powered inventory & sales ERP. The actual system includes ONLY these modules and capabilities — do not invent others:

OPERATIONS
- Products, Suppliers, Inventory Batches (with expiry tracking)
- Stock by Location, Stock Movements (immutable audit)
- FEFO Health monitor (database-trigger enforced FEFO/FIFO allocation)
- Waste Report, Markdowns (near-expiry pricing)

PROCUREMENT
- Purchase Orders with approval workflow (DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED)
- Approval Rules, Supplier Performance, Replenishment suggestions (velocity + reorder point)

SALES & POS
- Sales transactions (FEFO auto-allocation, sell-by buffer)
- Sale Detail, Sales Returns, Sales Velocity, Sales Settings

FINANCE & COMPLIANCE
- CFO Dashboard, Valuation (FIFO vs FEFO comparison)
- Compliance page, Audit Log (immutable)
- Copilot Audit (thumbs up/down review by user, message, time range)

AI SUITE
- AI Daily Brief (role/team scoped subscriptions, configurable frequency)
- AI Operations Brief (persona-filtered: only batches/anomalies the role may see)
- AI Insights Panel, AI Copilot (read-only, role-scoped tools)
- Export last AI Operations Brief to PDF or CSV

SECURITY
- RBAC with separate user_roles table, Row-Level Security on all tables
- Permission guards on every drill-down page (POs, batches, transactions)
- Personas: inventory_manager, purchasing_manager, cfo, compliance_officer, system_admin

Rules:
- Answer ONLY questions about CORTA ERP's modules, features, workflows, personas, or architecture above.
- If asked about anything else (weather, general knowledge, other products, code help, jokes, etc.), politely refuse: "I can only answer questions about CORTA ERP."
- Do NOT invent features such as MES, QMS, SCADA, HACCP, manufacturing execution, IoT sensors — they do not exist here.
- Be concise: 2–5 sentences or a short bullet list. Plain text, no markdown headers.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });
    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
