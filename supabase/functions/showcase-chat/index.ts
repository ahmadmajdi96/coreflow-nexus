// Public showcase chat — answers ONLY questions about CORTA ERP features,
// and returns inline citations linking to the relevant in-app routes.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Citation catalog. Keep keys stable — the model is told to use these exact IDs.
const CITATIONS: Record<string, { label: string; route: string; section: string }> = {
  dashboard: { label: "Dashboard", route: "/dashboard", section: "Operations" },
  products: { label: "Products", route: "/products", section: "Operations" },
  batches: { label: "Inventory Batches", route: "/batches", section: "Operations" },
  stock_by_location: { label: "Stock by Location", route: "/stock-by-location", section: "Operations" },
  stock_movements: { label: "Stock Movements", route: "/stock-movements", section: "Operations" },
  fefo_health: { label: "FEFO Health", route: "/fefo-health", section: "Operations" },
  markdowns: { label: "Markdowns", route: "/markdowns", section: "Operations" },
  waste_report: { label: "Waste Report", route: "/waste-report", section: "Operations" },
  suppliers: { label: "Suppliers", route: "/suppliers", section: "Procurement" },
  supplier_performance: { label: "Supplier Performance", route: "/supplier-performance", section: "Procurement" },
  purchase_orders: { label: "Purchase Orders", route: "/purchase-orders", section: "Procurement" },
  approval_rules: { label: "Approval Rules", route: "/approval-rules", section: "Procurement" },
  replenishment: { label: "Replenishment", route: "/replenishment", section: "Procurement" },
  sales: { label: "Sales", route: "/sales", section: "Sales & POS" },
  sales_returns: { label: "Sales Returns", route: "/sales-returns", section: "Sales & POS" },
  sales_velocity: { label: "Sales Velocity", route: "/sales-velocity", section: "Sales & POS" },
  sales_settings: { label: "Sales Settings", route: "/sales-settings", section: "Sales & POS" },
  cfo_dashboard: { label: "CFO Dashboard", route: "/cfo", section: "Finance & Compliance" },
  valuation: { label: "Valuation (FIFO vs FEFO)", route: "/valuation", section: "Finance & Compliance" },
  compliance: { label: "Compliance", route: "/compliance", section: "Finance & Compliance" },
  audit_log: { label: "Audit Log", route: "/audit-log", section: "Finance & Compliance" },
  copilot_audit: { label: "Copilot Audit", route: "/copilot-audit", section: "Finance & Compliance" },
  daily_brief: { label: "AI Daily Brief", route: "/daily-brief", section: "AI Suite" },
  users: { label: "Users & Roles", route: "/users", section: "Admin" },
};

const SYSTEM_PROMPT = `You are the CORTA ERP Showcase Assistant.

CORTA ERP is an AI-powered inventory & sales ERP. The actual system includes ONLY these modules — do not invent others (no MES, QMS, SCADA, HACCP, IoT, manufacturing execution, etc.):

OPERATIONS — Products, Suppliers, Inventory Batches (expiry tracking), Stock by Location, Stock Movements (immutable audit), FEFO Health monitor (DB-trigger enforced FEFO/FIFO), Waste Report, Markdowns.
PROCUREMENT — Purchase Orders with approval workflow (DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED), Approval Rules, Supplier Performance, Replenishment (velocity + reorder point).
SALES & POS — Sales transactions (FEFO auto-allocation, sell-by buffer), Sale Detail, Sales Returns, Sales Velocity, Sales Settings.
FINANCE & COMPLIANCE — CFO Dashboard, Valuation (FIFO vs FEFO), Compliance, Audit Log, Copilot Audit (thumbs up/down by user/message/time range).
AI SUITE — AI Daily Brief (role/team scoped subscriptions, configurable frequency), AI Operations Brief (persona-filtered), AI Insights Panel, AI Copilot (read-only, role-scoped tools), Export last AI Operations Brief to PDF or CSV.
SECURITY — RBAC with separate user_roles table, Row-Level Security on every table, permission guards on every drill-down page. Personas: inventory_manager, purchasing_manager, cfo, compliance_officer, system_admin.

CITATIONS — At the end of every answer that names a feature, append a single line in the EXACT form:
  CITATIONS: id1, id2, id3
where each id is one of the following keys (omit the line if none apply):
${Object.keys(CITATIONS).join(", ")}

Rules:
- Answer ONLY questions about CORTA ERP's modules, features, workflows, personas, or architecture above.
- If asked about anything else (weather, general knowledge, other products, code help, jokes), politely refuse: "I can only answer questions about CORTA ERP." Do NOT emit a CITATIONS line in that case.
- Be concise: 2–5 sentences or a short bullet list. Plain text, no markdown headers.`;

function extractCitations(text: string): { reply: string; citations: { id: string; label: string; route: string; section: string }[] } {
  const m = text.match(/\n?\s*CITATIONS:\s*([^\n]+)\s*$/i);
  if (!m) return { reply: text.trim(), citations: [] };
  const ids = m[1].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  const citations = ids
    .filter((id) => CITATIONS[id] && !seen.has(id) && seen.add(id))
    .map((id) => ({ id, ...CITATIONS[id] }));
  return { reply: text.slice(0, m.index).trim(), citations };
}

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
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const { reply, citations } = extractCitations(raw);
    return new Response(JSON.stringify({ reply, citations }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
