import {
  LayoutDashboard, Package, Layers, ArrowLeftRight, MapPin,
  Users, ShoppingCart, RefreshCw, Award, Tag,
  ShoppingBag, Undo2, Activity, Settings2,
  BarChart3, Calculator, Zap, Trash2, ShieldCheck, FileText,
  Sparkles, MessageSquare, Bell, ThumbsUp,
  TrendingDown, DollarSign, Clock, Target,
} from "lucide-react";
import type { ElementType } from "react";

import screenDashboard from "@/assets/screen-dashboard.png";
import screenBatches from "@/assets/screen-batches.png";
import screenReplenishment from "@/assets/screen-replenishment.png";
import screenPO from "@/assets/screen-purchase-orders.png";
import screenSales from "@/assets/screen-sales.png";
import screenFefo from "@/assets/screen-fefo.png";
import screenCfo from "@/assets/screen-cfo.png";
import screenValuation from "@/assets/screen-valuation.png";
import screenDailyBrief from "@/assets/screen-daily-brief.png";
import screenCopilotAudit from "@/assets/screen-copilot-audit.png";

import type { ScreenPreview } from "./ScreenPreviewCard";
export type { ScreenPreview } from "./ScreenPreviewCard";

export interface ModuleFeature { icon: ElementType; title: string; desc: string; }
export interface ImpactMetric { icon: ElementType; metric: string; label: string; description: string; }
export interface ModuleData {
  id: string; title: string; subtitle: string; description: string;
  image: string; colorVar: string;
  features: ModuleFeature[]; screens: string[]; impact: ImpactMetric[];
  previewScreens: ScreenPreview[];
}
export interface EdgeAppGroup {
  category: string; colorVar: string;
  apps: ModuleFeature[]; screens: string[]; impact: ImpactMetric[];
  previewScreens: ScreenPreview[];
}

export const modules: ModuleData[] = [
  {
    id: "operations",
    title: "Operations",
    subtitle: "Inventory, Batches & Stock Control",
    description:
      "Real-time inventory across every location with full batch-level traceability and FIFO/FEFO valuation. Track every product, every batch, every movement — from goods receipt to shelf — with expiry risk and write-down exposure surfaced live.",
    image: screenDashboard,
    colorVar: "--mes-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 42%", label: "Write-offs", description: "FEFO enforcement and near-expiry alerts dramatically cut spoilage and obsolete stock write-downs." },
      { icon: Target, metric: "100%", label: "Batch Traceability", description: "Every unit on hand is linked to a batch with received-date, expiry, supplier, and unit cost." },
      { icon: Clock, metric: "Live", label: "Stock Visibility", description: "On-hand by SKU, batch, and location refreshed in real time as movements post." },
      { icon: DollarSign, metric: "$48k+", label: "Live Valuation", description: "FIFO and FEFO inventory valuation recalculated on every receipt, sale and adjustment." },
    ],
    features: [
      { icon: LayoutDashboard, title: "Operations Dashboard", desc: "Active products, inventory batches, open POs, near-expiry counts and markdown exposure on one screen." },
      { icon: Package, title: "Product Catalog", desc: "Multi-language SKUs, categories, perishability flags, reorder points and unit-of-measure controls." },
      { icon: Layers, title: "Batch Registry", desc: "Batch number, received and expiry dates, qty, unit cost and live status (Active / Near-expiry / Expired)." },
      { icon: ArrowLeftRight, title: "Stock Movements", desc: "Audited ledger of every receipt, sale, transfer, adjustment and waste event with before/after balances." },
      { icon: MapPin, title: "Stock by Location", desc: "Per-location balances and batch breakdown across stores, warehouses and staging areas." },
    ],
    screens: ["Dashboard", "Products", "Batches", "Stock Movements", "Stock by Location"],
    previewScreens: [
      { id: "ops-dashboard", title: "Operations Dashboard", caption: "Live KPIs across products, batches, POs, near-expiry and markdown exposure.", image: screenDashboard, route: "/", role: "Operations" },
      { id: "ops-batches", title: "Inventory Batches", caption: "Batch-level traceability with received/expiry dates, qty, cost and FEFO status.", image: screenBatches, route: "/batches", role: "Inventory Manager" },
    ],
  },
  {
    id: "procurement",
    title: "Procurement",
    subtitle: "Suppliers, Purchase Orders & Replenishment",
    description:
      "Reorder suggestions powered by sales velocity, lead time and reorder points. Route POs through configurable approval thresholds, score suppliers on OTIF and quality, and apply markdowns before perishable stock turns into waste.",
    image: screenReplenishment,
    colorVar: "--qms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 60%", label: "Stock-outs", description: "Velocity-based reorder suggestions catch falling cover days before SKUs hit zero." },
      { icon: Clock, metric: "Auto", label: "PO Approvals", description: "Multi-tier approval rules route POs by value, department and budget — no manual chasing." },
      { icon: Award, metric: "Live", label: "Supplier Scorecards", description: "OTIF, quality acceptance rate and lead-time variance per supplier, refreshed every receipt." },
      { icon: DollarSign, metric: "↓ 35%", label: "Markdown Loss", description: "Suggested discounts on near-expiry batches recover margin instead of writing it off." },
    ],
    features: [
      { icon: Users, title: "Supplier Master", desc: "Lead times, payment terms, certifications, MOQs and contact tree per supplier." },
      { icon: ShoppingCart, title: "Purchase Orders", desc: "Create POs with budget checks, route via configurable approval rules, post goods receipts directly to batches." },
      { icon: RefreshCw, title: "Replenishment Engine", desc: "AI-assisted reorder suggestions using on-hand, reorder point, lead time and 30-day sales velocity." },
      { icon: Award, title: "Supplier Performance", desc: "OTIF, fill rate, quality acceptance and lead-time variance scorecards." },
      { icon: Tag, title: "Markdowns", desc: "Targeted discount campaigns on near-expiry batches with live exposure tracking." },
    ],
    screens: ["Suppliers", "Purchase Orders", "Replenishment", "Supplier Performance", "Markdowns"],
    previewScreens: [
      { id: "proc-replen", title: "Replenishment Engine", caption: "Reorder suggestions from on-hand, sales velocity, lead time and reorder point — with AI brief.", image: screenReplenishment, route: "/replenishment", role: "Purchasing Manager" },
      { id: "proc-po", title: "Purchase Orders", caption: "Multi-tier approvals with budget checks and live MTD spend tracking.", image: screenPO, route: "/purchase-orders", role: "Purchasing Manager" },
    ],
  },
  {
    id: "sales",
    title: "Sales & POS",
    subtitle: "Transactions, Returns & FEFO Discipline",
    description:
      "Point-of-sale and order capture wired directly into FEFO inventory allocation. The shortest-dated saleable batch is consumed first, returns credit back to original batches, and approval thresholds gate large transactions automatically.",
    image: screenSales,
    colorVar: "--cms-color",
    impact: [
      { icon: Target, metric: "FEFO", label: "Auto-Allocation", description: "Database triggers enforce first-expired-first-out at sale time — no operator override required." },
      { icon: TrendingDown, metric: "↓ 50%", label: "Expired Sales Risk", description: "Sell-by buffer blocks short-dated batches before they reach customers." },
      { icon: Activity, metric: "Live", label: "Anomaly Watch", description: "AI flags unusual basket sizes, refund spikes and pricing outliers as transactions post." },
      { icon: DollarSign, metric: "Auto", label: "Velocity Insights", description: "Sales velocity per SKU feeds the replenishment engine and markdown suggestions." },
    ],
    features: [
      { icon: ShoppingBag, title: "Sales / POS", desc: "Transaction capture with FEFO allocation, payment status, line discounts and approval gating ≥ threshold." },
      { icon: Undo2, title: "Sales Returns", desc: "Returns credit back to original batches with reason codes and approver trail." },
      { icon: Settings2, title: "Sales Settings", desc: "Approval thresholds, sell-by buffer days, payment methods and discount rules." },
      { icon: Activity, title: "FEFO Validation Health", desc: "Diagnostic page that verifies the FEFO triggers are installed, enabled and firing correctly." },
      { icon: Zap, title: "Sales Velocity", desc: "Per-SKU velocity, days-of-cover and trend windows feeding the replenishment engine." },
    ],
    screens: ["Sales / POS", "Sales Returns", "Sales Settings", "FEFO Health", "Sales Velocity"],
    previewScreens: [
      { id: "sales-pos", title: "Sales / POS", caption: "Transactions with FEFO allocation, AI Anomaly Watch and approval gating.", image: screenSales, route: "/sales", role: "Sales / Cashier" },
      { id: "sales-fefo", title: "FEFO Validation Health", caption: "Confirms enforce_sale_fefo and apply_sale_return triggers are installed and firing.", image: screenFefo, route: "/fefo-health", role: "Inventory / Admin" },
    ],
  },
  {
    id: "finance",
    title: "Finance & Compliance",
    subtitle: "CFO View, Valuation, Waste & Audit",
    description:
      "Executive financial visibility on inventory exposure, markdown impact and waste — with FIFO/FEFO valuation, an immutable audit log and role-based compliance reporting that auditors actually trust.",
    image: screenCfo,
    colorVar: "--ai-color",
    impact: [
      { icon: DollarSign, metric: "Live", label: "Markdown Impact", description: "Markdowns today, MTD exposure and average discount refreshed every 15 seconds." },
      { icon: Calculator, metric: "FIFO/FEFO", label: "Valuation", description: "Dual valuation methods on every batch — pick the costing strategy that matches your books." },
      { icon: ShieldCheck, metric: "RBAC", label: "Role Security", description: "Roles in a separate table, security-definer functions, and policies on every drill-down." },
      { icon: FileText, metric: "Immutable", label: "Audit Trail", description: "Every CRUD event logged with user, role, before/after, IP and timestamp." },
    ],
    features: [
      { icon: BarChart3, title: "CFO Dashboard", desc: "Markdown financial impact, 6-week valuation trend, near-expiry exposure and category breakdown." },
      { icon: Calculator, title: "Inventory Valuation", desc: "Batch-level FIFO and FEFO costing with consume-sequence preview and CSV/PDF export." },
      { icon: Trash2, title: "Waste & Shrinkage", desc: "Waste events by reason, category and location with $ impact and trend analysis." },
      { icon: ShieldCheck, title: "Compliance Center", desc: "Role-aware compliance evidence, retention checks and approval rule documentation." },
      { icon: FileText, title: "Audit Log", desc: "Filterable, exportable trail of every change across the system with full diff payloads." },
    ],
    screens: ["CFO Dashboard", "Inventory Valuation", "Waste Report", "Compliance", "Audit Log", "Approval Rules", "Users & Roles"],
    previewScreens: [
      { id: "fin-cfo", title: "CFO Dashboard", caption: "Markdown impact, 6-week valuation trend and near-expiry exposure refreshed every 15s.", image: screenCfo, route: "/cfo", role: "CFO" },
      { id: "fin-valuation", title: "Inventory Valuation", caption: "FIFO and FEFO costing per batch with consume-sequence and exportable evidence.", image: screenValuation, route: "/valuation", role: "Finance / Compliance" },
    ],
  },
];

export const edgeAppGroups: EdgeAppGroup[] = [
  {
    category: "Embedded AI Suite",
    colorVar: "--ai-color",
    impact: [
      { icon: Clock, metric: "07:00", label: "Daily Brief", description: "Cron-scheduled AI Operations Brief delivered every morning to subscribed managers." },
      { icon: Sparkles, metric: "Tool-using", label: "Copilot Agent", description: "AI Copilot with role-scoped tools — only sees data the signed-in persona is allowed to see." },
      { icon: ThumbsUp, metric: "Audited", label: "Feedback Loop", description: "Thumbs-up / thumbs-down on every AI answer, persisted for CFO and admin review." },
      { icon: ShieldCheck, metric: "RBAC", label: "Persona-aware", description: "Insights, drill-downs and briefs are filtered by role — Inventory, Purchasing, CFO, Compliance, Admin." },
    ],
    apps: [
      { icon: MessageSquare, title: "AI Copilot", desc: "In-app chat assistant with tools (FEFO health, sales lookup, PO list) gated by user role. Persists conversations and feedback." },
      { icon: Bell, title: "AI Daily Brief", desc: "Scheduled morning summary of expiring batches, replenishment urgency and sales anomalies — filtered to your role and team." },
      { icon: Sparkles, title: "AI Operations Brief & Anomaly Watch", desc: "On-demand insights on the Dashboard, Replenishment and Sales pages with clickable drill-downs to the underlying records." },
      { icon: ThumbsUp, title: "Copilot Feedback Audit", desc: "Admin/CFO dashboard summarising thumbs-up/down by user, message and time range, with CSV export." },
      { icon: FileText, title: "Compliance Exports", desc: "Export the latest AI Operations Brief to PDF or CSV for evidence packs and auditor review." },
    ],
    screens: ["AI Copilot Widget", "AI Daily Brief", "AI Operations Brief", "AI Anomaly Watch", "Copilot Feedback Audit"],
    previewScreens: [
      { id: "ai-brief", title: "AI Daily Brief", caption: "Subscriptions, frequency, delivery hour and team — daily AI brief delivered automatically.", image: screenDailyBrief, route: "/daily-brief", role: "Manager" },
      { id: "ai-audit", title: "Copilot Feedback Audit", caption: "Thumbs up/down summary by user, message and time range — CFO/admin only.", image: screenCopilotAudit, route: "/copilot-audit", role: "CFO / Admin" },
    ],
  },
];
