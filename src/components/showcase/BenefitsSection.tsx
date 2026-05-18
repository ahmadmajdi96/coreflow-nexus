import {
  TrendingDown, Clock, ShieldCheck, Eye, Layers,
  BarChart3, Lock, Zap, DollarSign, FileText,
} from "lucide-react";
import { BenefitImpactCard, type BenefitStatement } from "./ImpactCard";

const benefits: BenefitStatement[] = [
  { icon: TrendingDown, title: "Write-offs down 40%+", description: "FEFO enforcement and near-expiry alerts cut spoilage on perishable batches before they hit the shelf.", colorVar: "--mes-color" },
  { icon: Clock, title: "Fewer stock-outs", description: "Velocity-based reorder suggestions combine on-hand, lead time and 30-day sales to flag SKUs before they hit zero.", colorVar: "--mes-color" },
  { icon: DollarSign, title: "Live inventory valuation", description: "FIFO and FEFO valuation recalculated on every receipt, sale and adjustment — no end-of-month surprises.", colorVar: "--ai-color" },
  { icon: ShieldCheck, title: "Audit-ready by default", description: "Immutable audit log captures every CRUD event with user, role, before/after and timestamp — exportable for compliance.", colorVar: "--qms-color" },
  { icon: Eye, title: "Full batch traceability", description: "Every unit on hand is linked to a batch with received-date, expiry, supplier and unit cost — backward and forward.", colorVar: "--qms-color" },
  { icon: Layers, title: "One unified ledger", description: "Operations, Procurement, Sales and Finance share a single inventory model — no duplicate masters, no reconciliation tax.", colorVar: "--mes-color" },
  { icon: BarChart3, title: "CFO-grade insights", description: "Markdown impact, valuation trend and near-expiry exposure refreshed every 15 seconds on the CFO dashboard.", colorVar: "--ai-color" },
  { icon: Lock, title: "Role-based access", description: "Inventory, Purchasing, CFO, Compliance and Admin each see exactly the data their persona owns — masked at the policy level.", colorVar: "--cms-color" },
  { icon: Zap, title: "AI Copilot & Daily Brief", description: "In-app chat assistant plus a scheduled morning brief on expiring batches, replenishment urgency and sales anomalies.", colorVar: "--ai-color" },
  { icon: FileText, title: "Compliance exports", description: "Export the latest AI Operations Brief and valuation to PDF or CSV for evidence packs and auditor review.", colorVar: "--cms-color" },
];

const BenefitsSection = () => (
  <section id="benefits" className="py-16 sm:py-24 px-4 sm:px-6 relative scroll-mt-20">
    <div className="absolute inset-0 pp-hero-gradient opacity-50" />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="section-title mb-4">
          Why <span className="pp-gradient-text">CORTA ERP</span>?
        </h2>
        <p className="section-subtitle mx-auto">
          Measurable impact on inventory write-offs, stock-outs and audit posture —
          from day one, without a multi-quarter rollout.
        </p>
      </div>

      <BenefitImpactCard items={benefits} />
    </div>
  </section>
);

export default BenefitsSection;
