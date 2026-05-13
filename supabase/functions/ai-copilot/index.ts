// AI Copilot — chat assistant with read-only tools, role-scoped per user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "inventory_manager" | "purchasing_manager" | "cfo" | "compliance_officer" | "system_admin";

// Tool → allowed roles. system_admin always allowed.
const TOOL_ROLES: Record<string, Role[]> = {
  get_dashboard_kpis: ["inventory_manager", "purchasing_manager", "cfo", "compliance_officer"],
  get_expiring_batches: ["inventory_manager", "compliance_officer", "cfo"],
  get_replenishment_suggestions: ["inventory_manager", "purchasing_manager", "cfo"],
  list_purchase_orders: ["purchasing_manager", "cfo", "compliance_officer"],
  list_sales: ["cfo", "compliance_officer", "inventory_manager"],
  get_sales_summary: ["cfo", "inventory_manager", "purchasing_manager"],
  search_products: ["inventory_manager", "purchasing_manager", "cfo", "compliance_officer"],
  get_fefo_health: ["compliance_officer", "cfo"],
};

const ALL_TOOLS = [
  { name: "get_dashboard_kpis", description: "Top-level KPIs: products, batches, open POs, markdowns, near-expiry, today's sales total.", parameters: { type: "object", properties: {} } },
  { name: "get_expiring_batches", description: "List inventory batches expiring within N days (default 30).", parameters: { type: "object", properties: { days: { type: "number" }, limit: { type: "number" } } } },
  { name: "get_replenishment_suggestions", description: "Products to reorder based on stock vs reorder point and 30-day velocity.", parameters: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "list_purchase_orders", description: "List POs by status (DRAFT, PENDING_APPROVAL, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED).", parameters: { type: "object", properties: { status: { type: "string" }, limit: { type: "number" } } } },
  { name: "list_sales", description: "Recent sales transactions, optionally filtered by approval_status.", parameters: { type: "object", properties: { approval_status: { type: "string" }, days: { type: "number" }, limit: { type: "number" } } } },
  { name: "get_sales_summary", description: "Sales totals over last N days (default 7) with top 5 products.", parameters: { type: "object", properties: { days: { type: "number" } } } },
  { name: "search_products", description: "Search products by SKU or name.", parameters: { type: "object", properties: { q: { type: "string" }, limit: { type: "number" } }, required: ["q"] } },
  { name: "get_fefo_health", description: "Check FEFO trigger health.", parameters: { type: "object", properties: {} } },
];

async function runTool(name: string, args: any, supa: any) {
  const lim = Math.min(Number(args?.limit ?? 25), 100);
  switch (name) {
    case "get_dashboard_kpis": {
      const today = new Date(); today.setHours(0,0,0,0);
      const [p, b, po, md, ne, sales] = await Promise.all([
        supa.from("products").select("id", { count: "exact", head: true }).eq("active", true),
        supa.from("inventory_batches").select("id", { count: "exact", head: true }),
        supa.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["DRAFT","PENDING_APPROVAL","APPROVED"]),
        supa.from("markdown_events").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supa.from("inventory_batches").select("id", { count: "exact", head: true }).eq("status", "NEAR_EXPIRY"),
        supa.from("sales_transactions").select("total_amount").gte("occurred_at", today.toISOString()),
      ]);
      const todayTotal = (sales.data ?? []).reduce((a: number, r: any) => a + Number(r.total_amount || 0), 0);
      return { active_products: p.count, batches: b.count, open_pos: po.count, active_markdowns: md.count, near_expiry_batches: ne.count, today_sales_count: sales.data?.length ?? 0, today_sales_total: todayTotal };
    }
    case "get_expiring_batches": {
      const days = Number(args?.days ?? 30);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + days);
      const { data } = await supa.from("inventory_batches")
        .select("batch_number, expiry_date, quantity_available, status, products:product_id(sku,name)")
        .lte("expiry_date", cutoff.toISOString().slice(0,10))
        .gt("quantity_available", 0)
        .order("expiry_date", { ascending: true })
        .limit(lim);
      return (data ?? []).map((r: any) => ({ sku: r.products?.sku, name: r.products?.name, batch: r.batch_number, expiry: r.expiry_date, qty: r.quantity_available, status: r.status }));
    }
    case "get_replenishment_suggestions": {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const [p, b, s] = await Promise.all([
        supa.from("products").select("id,sku,name,reorder_point,reorder_quantity,lead_time_days,unit_cost").eq("active", true),
        supa.from("inventory_batches").select("product_id,quantity_available").gt("quantity_available", 0),
        supa.from("sales_items").select("product_id,quantity,sales_transactions!inner(occurred_at)").gte("sales_transactions.occurred_at", since.toISOString()),
      ]);
      const stock: Record<string, number> = {}; (b.data ?? []).forEach((r: any) => { stock[r.product_id] = (stock[r.product_id] ?? 0) + Number(r.quantity_available); });
      const sold: Record<string, number> = {}; (s.data ?? []).forEach((r: any) => { sold[r.product_id] = (sold[r.product_id] ?? 0) + Number(r.quantity); });
      const rows = (p.data ?? []).map((pr: any) => {
        const onHand = stock[pr.id] ?? 0; const vel = (sold[pr.id] ?? 0) / 30;
        const days = vel > 0 ? Math.round(onHand / vel) : null;
        const reorder = Number(pr.reorder_point);
        let urgency = "ok";
        if (onHand <= 0) urgency = "out_of_stock";
        else if (onHand < reorder) urgency = "below_reorder";
        else if (days !== null && days < pr.lead_time_days) urgency = "reorder_soon";
        return { sku: pr.sku, name: pr.name, on_hand: onHand, daily_velocity: +vel.toFixed(2), days_of_cover: days, reorder_point: reorder, suggested_qty: Number(pr.reorder_quantity), lead_time_days: pr.lead_time_days, urgency };
      }).filter((r: any) => r.urgency !== "ok").sort((a: any, b: any) => (a.days_of_cover ?? 0) - (b.days_of_cover ?? 0)).slice(0, lim);
      return rows;
    }
    case "list_purchase_orders": {
      let q = supa.from("purchase_orders").select("po_number,status,total_amount,created_at,suppliers:supplier_id(name)").order("created_at", { ascending: false }).limit(lim);
      if (args?.status) q = q.eq("status", args.status);
      const { data } = await q;
      return (data ?? []).map((r: any) => ({ po: r.po_number, status: r.status, total: r.total_amount, supplier: r.suppliers?.name, created: r.created_at }));
    }
    case "list_sales": {
      const days = Number(args?.days ?? 30);
      const since = new Date(); since.setDate(since.getDate() - days);
      let q = supa.from("sales_transactions").select("transaction_id,total_amount,approval_status,occurred_at,customer_name").gte("occurred_at", since.toISOString()).order("occurred_at", { ascending: false }).limit(lim);
      if (args?.approval_status) q = q.eq("approval_status", args.approval_status);
      const { data } = await q;
      return data ?? [];
    }
    case "get_sales_summary": {
      const days = Number(args?.days ?? 7);
      const since = new Date(); since.setDate(since.getDate() - days);
      const [tx, items] = await Promise.all([
        supa.from("sales_transactions").select("total_amount").gte("occurred_at", since.toISOString()),
        supa.from("sales_items").select("quantity, products:product_id(sku,name), sales_transactions!inner(occurred_at)").gte("sales_transactions.occurred_at", since.toISOString()),
      ]);
      const revenue = (tx.data ?? []).reduce((a: number, r: any) => a + Number(r.total_amount || 0), 0);
      const top: Record<string, { sku: string; name: string; qty: number }> = {};
      (items.data ?? []).forEach((r: any) => {
        const k = r.products?.sku ?? "?";
        if (!top[k]) top[k] = { sku: k, name: r.products?.name ?? "", qty: 0 };
        top[k].qty += Number(r.quantity);
      });
      return { days, transactions: tx.data?.length ?? 0, revenue, top_products: Object.values(top).sort((a, b) => b.qty - a.qty).slice(0, 5) };
    }
    case "search_products": {
      const term = String(args?.q ?? "").trim();
      const { data: p } = await supa.from("products").select("id,sku,name,unit_cost,reorder_point").or(`sku.ilike.%${term}%,name.ilike.%${term}%`).limit(lim);
      const ids = (p ?? []).map((r: any) => r.id);
      const { data: b } = ids.length ? await supa.from("inventory_batches").select("product_id,quantity_available").in("product_id", ids) : { data: [] as any[] };
      const stock: Record<string, number> = {}; (b ?? []).forEach((r: any) => { stock[r.product_id] = (stock[r.product_id] ?? 0) + Number(r.quantity_available); });
      return (p ?? []).map((pr: any) => ({ sku: pr.sku, name: pr.name, on_hand: stock[pr.id] ?? 0, unit_cost: pr.unit_cost, reorder_point: pr.reorder_point }));
    }
    case "get_fefo_health": {
      const { data } = await supa.rpc("check_fefo_triggers");
      return data ?? [];
    }
  }
  return { error: "unknown tool" };
}

function buildSystemPrompt(roles: Role[]) {
  const persona = roles.includes("system_admin") ? "system administrator with full visibility"
    : roles.includes("cfo") ? "CFO focused on financial impact, approvals and risk"
    : roles.includes("compliance_officer") ? "compliance officer focused on FEFO, expiry, audit"
    : roles.includes("purchasing_manager") ? "purchasing manager focused on POs, suppliers, replenishment"
    : roles.includes("inventory_manager") ? "inventory manager focused on stock, batches, movements"
    : "user with limited access";
  return `You are CoreERP Copilot, an in-app assistant for an enterprise inventory & sales ERP.
The user's persona is: ${persona}. Roles: ${roles.join(", ") || "none"}.

Rules:
- Tailor answers to the user's persona; do not surface data outside their scope.
- Always call tools to fetch live data before answering numerical or list questions. Never invent SKUs, IDs, or counts.
- Be concise. Use short paragraphs and bullet lists. Format money as $X.XX and dates as YYYY-MM-DD.
- If a requested topic is outside the user's allowed tools, politely say it's outside their access.
- You do NOT have write access. If the user asks to create/modify/approve, tell them which page to use.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPABASE_URL, SRK);

    // Resolve user roles from JWT
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    let roles: Role[] = [];
    if (token) {
      const { data: u } = await supa.auth.getUser(token);
      if (u?.user) {
        const { data: r } = await supa.from("user_roles").select("role").eq("user_id", u.user.id);
        roles = (r ?? []).map((x: any) => x.role as Role);
      }
    }
    if (roles.length === 0) {
      return new Response(JSON.stringify({ reply: "I can't determine your access. Please sign in again." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isAdmin = roles.includes("system_admin");
    const allowedTools = ALL_TOOLS.filter((t) => isAdmin || (TOOL_ROLES[t.name] ?? []).some((r) => roles.includes(r)))
      .map((t) => ({ type: "function", function: t }));

    const convo: any[] = [{ role: "system", content: buildSystemPrompt(roles) }, ...messages];

    for (let hop = 0; hop < 6; hop++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: convo, tools: allowedTools, tool_choice: "auto" }),
      });
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!resp.ok) { const t = await resp.text(); console.error("AI error", resp.status, t); return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
      const data = await resp.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) return new Response(JSON.stringify({ error: "No response" }), { status: 500, headers: corsHeaders });
      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length) {
        convo.push(msg);
        for (const tc of toolCalls) {
          const allowed = isAdmin || (TOOL_ROLES[tc.function.name] ?? []).some((r) => roles.includes(r));
          let out: any;
          if (!allowed) {
            out = { error: `Tool ${tc.function.name} not permitted for your role.` };
          } else {
            let parsed: any = {};
            try { parsed = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* */ }
            out = await runTool(tc.function.name, parsed, supa);
          }
          convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out).slice(0, 12000) });
        }
        continue;
      }
      return new Response(JSON.stringify({ reply: msg.content ?? "", roles }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ reply: "I couldn't complete that request — too many tool steps." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
