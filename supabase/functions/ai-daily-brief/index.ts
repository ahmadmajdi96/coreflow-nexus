// AI Daily Brief — generates and stores the daily AI Operations Brief.
// Triggered by pg_cron once per day; can also be invoked manually.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function gather(supa: any) {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 14);
  const since30 = new Date(); since30.setDate(since30.getDate() - 30);

  const [expiring, openPOs, lowStock, batchesAll, salesItems, returns, txAll] = await Promise.all([
    supa.from("inventory_batches").select("id,batch_number,expiry_date,quantity_available,products:product_id(sku,name)").lte("expiry_date", cutoff.toISOString().slice(0,10)).gt("quantity_available", 0).order("expiry_date").limit(15),
    supa.from("purchase_orders").select("id,po_number,status,total_amount,created_at").in("status", ["DRAFT","PENDING_APPROVAL"]).order("created_at", { ascending: false }).limit(10),
    supa.from("products").select("id,sku,name,reorder_point,reorder_quantity,lead_time_days").eq("active", true),
    supa.from("inventory_batches").select("product_id,quantity_available").gt("quantity_available", 0),
    supa.from("sales_items").select("product_id,quantity,sales_transactions!inner(occurred_at)").gte("sales_transactions.occurred_at", since30.toISOString()),
    supa.from("sales_returns").select("id,return_number,reason,total_amount,created_at").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(10),
    supa.from("sales_transactions").select("id,transaction_id,total_amount,approval_status,occurred_at").gte("occurred_at", since.toISOString()).order("occurred_at", { ascending: false }).limit(200),
  ]);

  const stock: Record<string, number> = {}; (batchesAll.data ?? []).forEach((r: any) => { stock[r.product_id] = (stock[r.product_id] ?? 0) + Number(r.quantity_available); });
  const sold: Record<string, number> = {}; (salesItems.data ?? []).forEach((r: any) => { sold[r.product_id] = (sold[r.product_id] ?? 0) + Number(r.quantity); });
  const replenish = (lowStock.data ?? []).map((pr: any) => {
    const onHand = stock[pr.id] ?? 0; const vel = (sold[pr.id] ?? 0) / 30;
    const days = vel > 0 ? Math.round(onHand / vel) : null;
    let urgency = "ok";
    if (onHand <= 0) urgency = "out_of_stock";
    else if (onHand < Number(pr.reorder_point)) urgency = "below_reorder";
    else if (days !== null && days < pr.lead_time_days) urgency = "reorder_soon";
    return { id: pr.id, sku: pr.sku, name: pr.name, on_hand: onHand, days_of_cover: days, urgency };
  }).filter((r: any) => r.urgency !== "ok").sort((a: any, b: any) => (a.days_of_cover ?? 0) - (b.days_of_cover ?? 0)).slice(0, 10);

  const totals = (txAll.data ?? []).map((t: any) => Number(t.total_amount || 0));
  const avg = totals.length ? totals.reduce((a: number, b: number) => a + b, 0) / totals.length : 0;
  const std = totals.length ? Math.sqrt(totals.reduce((a: number, b: number) => a + (b - avg) ** 2, 0) / totals.length) : 0;
  const outliers = (txAll.data ?? []).filter((t: any) => Math.abs(Number(t.total_amount) - avg) > 2 * std && std > 0).slice(0, 5);
  const pending = (txAll.data ?? []).filter((t: any) => t.approval_status === "PENDING").slice(0, 5);

  const ctx = {
    expiring: expiring.data ?? [],
    open_pos: openPOs.data ?? [],
    replenishment_urgent: replenish,
    sales_outliers: outliers,
    pending_approvals: pending,
    recent_returns: returns.data ?? [],
  };

  const links = [
    ...(expiring.data ?? []).slice(0, 5).map((r: any) => ({ type: "batch", id: r.id, label: `${r.products?.sku ?? "?"} · batch ${r.batch_number} · exp ${r.expiry_date}`, href: "/batches" })),
    ...replenish.slice(0, 5).map((r: any) => ({ type: "product", id: r.id, label: `${r.sku} · ${r.urgency} · ${r.on_hand} on hand`, href: "/replenishment" })),
    ...(openPOs.data ?? []).slice(0, 3).map((r: any) => ({ type: "po", id: r.id, label: `PO ${r.po_number} · ${r.status}`, href: "/purchase-orders" })),
    ...outliers.slice(0, 3).map((t: any) => ({ type: "sale", id: t.id, label: `Outlier ${t.transaction_id} · $${Number(t.total_amount).toFixed(2)}`, href: `/sales/${t.id}` })),
    ...pending.slice(0, 3).map((t: any) => ({ type: "sale", id: t.id, label: `Pending ${t.transaction_id} · $${Number(t.total_amount).toFixed(2)}`, href: `/sales/${t.id}` })),
  ];

  return { ctx, links };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { ctx, links } = await gather(supa);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are an operations chief of staff. Write a daily brief for managers covering: (1) batches expiring soon and waste risk, (2) replenishment urgency, (3) sales anomalies and pending approvals. Be specific (mention SKUs, PO numbers, transaction IDs). Output JSON: {"headline": string, "insights": string[], "actions": string[]}` },
          { role: "user", content: `Data:\n${JSON.stringify(ctx).slice(0, 15000)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) { const t = await resp.text(); console.error("AI", resp.status, t); throw new Error("AI gateway error"); }
    const data = await resp.json();
    let parsed: any = { headline: "", insights: [], actions: [] };
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { /* */ }

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supa.from("ai_daily_briefs").upsert({
      brief_date: today,
      audience_role: "all",
      headline: parsed.headline ?? "",
      insights: parsed.insights ?? [],
      actions: parsed.actions ?? [],
      links,
      context: ctx,
    }, { onConflict: "brief_date,audience_role" });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, brief_date: today, ...parsed, links }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
