import {
  Boxes, ShoppingCart, ShoppingBag, BarChart3, ArrowDown, ArrowRight,
  Database, Brain, Sparkles, Layers, ShieldCheck, FileText,
} from "lucide-react";

const dataInputs = [
  { name: "Goods Receipts", desc: "Batch intake from purchase orders — qty, expiry, supplier, unit cost.", icon: Boxes, colorVar: "--mes-color" },
  { name: "Sales / POS", desc: "Transactions auto-allocated FEFO with sell-by buffer and approval gates.", icon: ShoppingBag, colorVar: "--cms-color" },
  { name: "Product & Supplier Master", desc: "SKUs, reorder points, lead times, payment terms and certifications.", icon: Database, colorVar: "--qms-color" },
];

const coreModules = [
  { name: "Operations", icon: Boxes, colorVar: "--mes-color" },
  { name: "Procurement", icon: ShoppingCart, colorVar: "--qms-color" },
  { name: "Sales & POS", icon: ShoppingBag, colorVar: "--cms-color" },
  { name: "Finance & Compliance", icon: BarChart3, colorVar: "--ai-color" },
];

const reportingOutputs = [
  { name: "CFO Dashboard & Valuation", icon: BarChart3 },
  { name: "Immutable Audit Log", icon: FileText },
  { name: "AI Insights & Daily Brief", icon: Brain },
];

const Pill = ({ label, colorVar = "--pp-border" }: { label: string; colorVar?: string }) => (
  <div
    className="px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold uppercase tracking-wider"
    style={{
      background: `hsl(var(${colorVar}) / 0.08)`,
      color: `hsl(var(${colorVar}))`,
      borderColor: `hsl(var(${colorVar}) / 0.3)`,
    }}
  >
    {label}
  </div>
);

const FlowArrow = ({ label }: { label: string }) => (
  <div className="flex justify-center my-4">
    <div className="flex flex-col items-center gap-1 pp-muted-text">
      <ArrowDown className="w-5 h-5 opacity-60" />
      <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
    </div>
  </div>
);

const SystemArchitecture = () => (
  <section id="architecture" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="section-title mb-4">System Architecture</h2>
        <p className="section-subtitle mx-auto">
          One database, four tightly-integrated modules, and an embedded AI Suite.
          Every receipt, sale and adjustment posts once into a shared inventory model,
          enforces FEFO at the trigger level, and lands in role-scoped dashboards.
        </p>
      </div>

      {/* Layer 1: Inputs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Inputs — Receipts · Sales · Master Data" colorVar="--mes-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {dataInputs.map((s) => (
          <div key={s.name} className="data-card flex items-start gap-4">
            <div
              className="p-3 rounded-lg shrink-0"
              style={{
                background: `hsl(var(${s.colorVar}) / 0.1)`,
                border: `1px solid hsl(var(${s.colorVar}) / 0.25)`,
              }}
            >
              <s.icon className="w-6 h-6" style={{ color: `hsl(var(${s.colorVar}))` }} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
              <p className="text-sm pp-muted-text">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <FlowArrow label="Posts into unified inventory model" />

      {/* Layer 2: Core modules */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Core Modules" colorVar="--mes-color" />
        <div className="h-px flex-1 bg-border" />
      </div>

      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{
          background: "hsl(var(--pp-card))",
          borderColor: "hsl(var(--mes-color) / 0.25)",
          boxShadow: "0 0 32px hsl(var(--mes-color) / 0.08)",
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {coreModules.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-center gap-2 p-4 rounded-lg border pp-border"
              style={{ background: `hsl(var(${p.colorVar}) / 0.08)` }}
            >
              <p.icon className="w-5 h-5" style={{ color: `hsl(var(${p.colorVar}))` }} />
              <span className="text-sm font-semibold">{p.name}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center mb-5">
          <ArrowDown className="w-5 h-5 pp-muted-text opacity-60" />
        </div>

        <div
          className="flex items-center gap-4 p-4 rounded-xl border"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--mes-color) / 0.12), hsl(var(--ai-color) / 0.08))",
            borderColor: "hsl(var(--mes-color) / 0.35)",
          }}
        >
          <div
            className="p-3 rounded-lg shrink-0"
            style={{
              background: "hsl(var(--mes-color) / 0.18)",
              border: "1px solid hsl(var(--mes-color) / 0.35)",
            }}
          >
            <Layers className="w-6 h-6" style={{ color: "hsl(var(--mes-color))" }} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">Unified Inventory Backbone</h3>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border pp-border pp-muted-text">
                FIFO / FEFO enforced in-DB
              </span>
            </div>
            <p className="text-sm pp-muted-text">
              Database triggers enforce first-expired-first-out at sale time. Every
              stock movement writes an audited ledger row with before/after balances —
              from goods receipt through markdown to sale or waste.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 pp-muted-text">
            <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--ai-color))" }} />
            <span className="text-xs">AI Copilot embedded</span>
          </div>
        </div>
      </div>

      <FlowArrow label="Surfaced through role-scoped outputs" />

      {/* Layer 3: Reporting & Intelligence */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Reporting & Intelligence" colorVar="--ai-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-10">
        {reportingOutputs.map((r) => (
          <div key={r.name} className="data-card flex items-center gap-3">
            <div
              className="p-2.5 rounded-lg shrink-0"
              style={{
                background: "hsl(var(--ai-color) / 0.1)",
                border: "1px solid hsl(var(--ai-color) / 0.25)",
              }}
            >
              <r.icon className="w-5 h-5" style={{ color: "hsl(var(--ai-color))" }} />
            </div>
            <span className="text-sm font-semibold">{r.name}</span>
          </div>
        ))}
      </div>

      {/* AI & Security strip */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Embedded AI & Access Control" colorVar="--edge-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="data-card flex items-start gap-4">
          <div
            className="p-3 rounded-lg shrink-0"
            style={{
              background: "hsl(var(--ai-color) / 0.1)",
              border: "1px solid hsl(var(--ai-color) / 0.25)",
            }}
          >
            <Brain className="w-6 h-6" style={{ color: "hsl(var(--ai-color))" }} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">AI Suite</h3>
            <p className="text-sm pp-muted-text">
              Copilot chat, AI Operations Brief, Anomaly Watch and the scheduled
              Daily Brief — each scoped to what the signed-in role is allowed to see,
              with thumbs-up/down feedback persisted for audit.
            </p>
          </div>
        </div>
        <div className="data-card flex items-start gap-4">
          <div
            className="p-3 rounded-lg shrink-0"
            style={{
              background: "hsl(var(--edge-color) / 0.1)",
              border: "1px solid hsl(var(--edge-color) / 0.25)",
            }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: "hsl(var(--edge-color))" }} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Role-Based Access Control</h3>
            <p className="text-sm pp-muted-text">
              Roles live in a dedicated table with security-definer policies on every
              drill-down — Inventory, Purchasing, CFO, Compliance and Admin each see
              exactly the data their persona owns.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 pp-muted-text text-xs">
        <Layers className="w-3.5 h-3.5" />
        <span>One ledger · Every event auditable · Every role appropriately scoped</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  </section>
);

export default SystemArchitecture;
