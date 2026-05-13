// AI Insights — generates structured JSON insights with drill-down links, role-scoped.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "dashboard" | "replenishment" | "sales_anomalies";
type Role = "inventory_manager" | "purchasing_manager" | "cfo" | "compliance_officer" | "system_admin";

const KIND_ROLES: Record<Kind, Role[]> = {
  dashboard: ["inventory_manager", "purchasing_manager", "cfo", "compliance_officer", "system_admin"],
  replenishment: ["inventory_manager", "purchasing_manager", "cfo", "system_admin"],
  sales_anomalies: ["cfo", "compliance_officer", "system_admin"],
};

async function gatherContext(kind: Kind, supa: any) {
  if (kind === "dashboard") {
    const since = new Date(); since.setDate(since.getDate() - 7);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 30);
    const [p, b, po, ne, expiringList, sales7, salesItems, openPOs] = await Promise.all([
      supa.from("products").select("id", { count: "exact", head: true }).eq("active", true),
      supa.from("inventory_batches").select("id", { count: "exact", head: true }),
      supa.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["DRAFT","PENDING_APPROVAL","APPROVED"]),
      supa.from("inventory_batches").select("id", { count: "exact", head: true }).eq("status", "NEAR_EXPIRY"),
      supa.from("inventory_batches").select("id,batch_number,expiry_date,quantity_available,products:product_id(sku,name)").lte("expiry_date", cutoff.toISOString().slice(0,10)).gt("quantity_available", 0).order("expiry_date").limit(8),
      supa.from("sales_transactions").select("total_amount,occurred_at").gte("occurred_at", since.toISOString()),
      supa.from("sales_items").select("quantity, products:product_id(sku,name), sales_transactions!inner(occurred_at)").gte("sales_transactions.occurred_at", since.toISOString()),
      supa.from("purchase_orders").select("id,po_number,status,total_amount").in("status", ["DRAFT","PENDING_APPROVAL"]).order("created_at", { ascending: false }).limit(5),
    ]);
    const revenue7 = (sales7.data ?? []).reduce((a: number, r: any) => a + Number(r.total_amount || 0), 0);
    const top: Record<string, { sku: string; name: string; qty: number }> = {};
    (salesItems.data ?? []).forEach((r: any) => {
      const k = r.products?.sku ?? "?";
      if (!top[k]) top[k] = { sku: k, name: r.products?.name ?? "", qty: 0 };
      top[k].qty += Number(r.quantity);
    });
    const links = [
      ...(expiringList.data ?? []).map((r: any) => ({ type: "batch", id: r.id, label: `${r.products?.sku ?? "?"} · batch ${r.batch_number} · exp ${r.expiry_date}`, href: "/batches" })),
      ...(openPOs.data ?? []).map((r: any) => ({ type: "po", id: r.id, label: `PO ${r.po_number} · ${r.status} · $${Number(r.total_amount).toFixed(2)}`, href: "/purchase-orders" })),
    ];
    return { ctx: { active_products: p.count, batches: b.count, open_pos: po.count, near_expiry: ne.count, revenue_7d: revenue7, transactions_7d: sales7.data?.length ?? 0, expiring_soon: expiringList.data ?? [], top_selling_7d: Object.values(top).sort((a, b) => b.qty - a.qty).slice(0, 5), open_pos_sample: openPOs.data ?? [] }, links };
  }
  if (kind === "replenishment") {
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
      let urgency = "ok";
      if (onHand <= 0) urgency = "out_of_stock";
      else if (onHand < Number(pr.reorder_point)) urgency = "below_reorder";
      else if (days !== null && days < pr.lead_time_days) urgency = "reorder_soon";
      return { id: pr.id, sku: pr.sku, name: pr.name, on_hand: onHand, daily_velocity: +vel.toFixed(2), days_of_cover: days, reorder_point: Number(pr.reorder_point), suggested_qty: Number(pr.reorder_quantity), lead_time_days: pr.lead_time_days, urgency };
    }).filter((r: any) => r.urgency !== "ok").sort((a: any, b: any) => (a.days_of_cover ?? 0) - (b.days_of_cover ?? 0)).slice(0, 20);
    const links = rows.slice(0, 8).map((r: any) => ({ type: "product", id: r.id, label: `${r.sku} · ${r.name} · on-hand ${r.on_hand} (${r.urgency})`, href: "/replenishment" }));
    return { ctx: { count: rows.length, items: rows }, links };
  }
  if (kind === "sales_anomalies") {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const [tx, returns] = await Promise.all([
      supa.from("sales_transactions").select("id,transaction_id,total_amount,approval_status,occurred_at,customer_name").gte("occurred_at", since.toISOString()).order("occurred_at", { ascending: false }).limit(200),
      supa.from("sales_returns").select("id,return_number,reason,created_at,total_amount").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(50),
    ]);
    const totals = (tx.data ?? []).map((t: any) => Number(t.total_amount || 0));
    const avg = totals.length ? totals.reduce((a: number, b: number) => a + b, 0) / totals.length : 0;
    const std = totals.length ? Math.sqrt(totals.reduce((a: number, b: number) => a + (b - avg) ** 2, 0) / totals.length) : 0;
    const outliers = (tx.data ?? []).filter((t: any) => Math.abs(Number(t.total_amount) - avg) > 2 * std && std > 0).slice(0, 10);
    const pending = (tx.data ?? []).filter((t: any) => t.approval_status === "PENDING");
    const links = [
      ...outliers.map((t: any) => ({ type: "sale", id: t.id, label: `Outlier ${t.transaction_id} · $${Number(t.total_amount).toFixed(2)}`, href: `/sales/${t.id}` })),
      ...pending.slice(0, 5).map((t: any) => ({ type: "sale", id: t.id, label: `Pending ${t.transaction_id} · $${Number(t.total_amount).toFixed(2)}`, href: `/sales/${t.id}` })),
      ...(returns.data ?? []).slice(0, 5).map((r: any) => ({ type: "return", id: r.id, label: `Return ${r.return_number} · ${r.reason ?? ""}`, href: "/sales-returns" })),
    ];
    return { ctx: { sample_size: tx.data?.length ?? 0, avg_basket: +avg.toFixed(2), stddev: +std.toFixed(2), pending_approvals: pending.length, returns_30d: returns.data?.length ?? 0, outliers, recent_returns: returns.data ?? [] }, links };
  }
  return { ctx: {}, links: [] };
}

const PROMPTS: Record<Kind, string> = {
  dashboard: `You are a sharp operations analyst. Given the JSON data, produce 3-5 concise insight bullets a CFO/inventory manager would care about: stock risks, sales momentum, expiring batches, PO load. End with 1-2 recommended actions. Output valid JSON: {"headline": string, "insights": string[], "actions": string[]}`,
  replenishment: `You are a procurement analyst. From the data, produce a brief: which SKUs are most urgent and why, suggested action grouping (e.g. consolidate by supplier), and any anomalies. Output JSON: {"headline": string, "insights": string[], "actions": string[]}`,
  sales_anomalies: `You are a fraud/risk analyst. From the sales data, identify anomalies: unusual basket sizes, return spikes, pending approvals. Be specific about transaction IDs when present. Output JSON: {"headline": string, "insights": string[], "actions": string[]}`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { kind } = await req.json();
    if (!["dashboard", "replenishment", "sales_anomalies"].includes(kind)) {
      return new Response(JSON.stringify({ error: "invalid kind" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Role check
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
    const allowed = roles.includes("system_admin") || (KIND_ROLES[kind as Kind] ?? []).some((r) => roles.includes(r));
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Your role does not have access to this insight." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { ctx, links } = await gatherContext(kind as Kind, supa);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PROMPTS[kind as Kind] },
          { role: "user", content: `Data:\n${JSON.stringify(ctx).slice(0, 15000)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) { const t = await resp.text(); console.error("AI", resp.status, t); throw new Error("AI gateway error"); }
    const data = await resp.json();
    let parsed: any = { headline: "", insights: [], actions: [] };
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = { headline: "Unable to parse insights", insights: [], actions: [] }; }
    return new Response(JSON.stringify({ ...parsed, links, context: ctx }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
