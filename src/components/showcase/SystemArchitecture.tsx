import {
  Factory, Shield, FileCheck, Tablet, ArrowRight, ArrowDown,
  Database, Cpu, Brain, Sparkles, Layers, BarChart3, ClipboardCheck,
} from "lucide-react";

const sourceSystems = [
  { name: "PLC / SCADA", desc: "Real-time line, sensor & equipment telemetry", icon: Cpu, colorVar: "--mes-color" },
  { name: "Lab & EMP", desc: "Quality results, environmental monitoring, CCPs", icon: Shield, colorVar: "--qms-color" },
  { name: "ERP & Master Data", desc: "Recipes, BOMs, suppliers, certifications", icon: Database, colorVar: "--cms-color" },
];

const corePlatforms = [
  { name: "MES", icon: Factory, colorVar: "--mes-color" },
  { name: "QMS", icon: Shield, colorVar: "--qms-color" },
  { name: "CMS", icon: FileCheck, colorVar: "--cms-color" },
];

const reportingOutputs = [
  { name: "OEE / SPC / Pareto", icon: BarChart3 },
  { name: "Audit & Evidence Packages", icon: ClipboardCheck },
  { name: "AI Insights & Persona Apps", icon: Brain },
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

const FlowArrow = () => (
  <div className="flex justify-center my-4">
    <div className="flex flex-col items-center gap-1 pp-muted-text">
      <ArrowDown className="w-5 h-5 opacity-60" />
      <span className="text-[10px] uppercase tracking-widest opacity-70">Real-time event stream</span>
    </div>
  </div>
);

const SystemArchitecture = () => (
  <section id="architecture" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="section-title mb-4">System Architecture</h2>
        <p className="section-subtitle mx-auto">
          A unified production backbone fed by PLC, lab and ERP signals — every event
          posts once into the right module, drives real-time KPIs, and surfaces in
          AI-powered persona apps for the floor and the control room.
        </p>
      </div>

      {/* Layer 1: Source systems */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Source Systems → Edge Gateway" colorVar="--mes-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {sourceSystems.map((s) => (
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

      <FlowArrow />

      {/* Layer 2: Core Platforms (MES + QMS + CMS) */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Core Platforms — MES · QMS · CMS" colorVar="--mes-color" />
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {corePlatforms.map((p) => (
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
              <h3 className="font-semibold text-foreground">Unified Production Backbone</h3>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border pp-border pp-muted-text">
                ISA-95 Level 3
              </span>
            </div>
            <p className="text-sm pp-muted-text">
              Every batch, deviation and certification event flows through a single
              data model — from raw material intake to finished goods release.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 pp-muted-text">
            <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--ai-color))" }} />
            <span className="text-xs">AI Copilot embedded</span>
          </div>
        </div>
      </div>

      <FlowArrow />

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

      {/* Edge overlay strip */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Edge Layer — Floor Apps" colorVar="--edge-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="data-card flex items-start gap-4">
          <div
            className="p-3 rounded-lg shrink-0"
            style={{
              background: "hsl(var(--edge-color) / 0.1)",
              border: "1px solid hsl(var(--edge-color) / 0.25)",
            }}
          >
            <Tablet className="w-6 h-6" style={{ color: "hsl(var(--edge-color))" }} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Rugged Tablet & Kiosk Apps</h3>
            <p className="text-sm pp-muted-text">
              Operators, technicians, QA and maintenance crews work offline-first with
              two-tap downtime, scrap, CCP and inspection logging.
            </p>
          </div>
        </div>
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
              CORTA Copilot drafts shift reports, CAPA narratives and audit packs;
              persona insights surface anomalies in real time with drill-down.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 pp-muted-text text-xs">
        <Layers className="w-3.5 h-3.5" />
        <span>Every layer reconciled · Every event auditable · Every role appropriately scoped</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  </section>
);

export default SystemArchitecture;
