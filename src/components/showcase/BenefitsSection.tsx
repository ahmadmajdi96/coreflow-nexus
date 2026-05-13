import {
  TrendingUp, Clock, ShieldCheck, Eye, Layers, Wifi,
  BarChart3, Lock, Zap, Globe,
} from "lucide-react";
import { BenefitImpactCard, type BenefitStatement } from "./ImpactCard";

const benefits: BenefitStatement[] = [
  { icon: TrendingUp, title: "OEE up 15–25%", description: "Real-time visibility into availability, performance and quality losses surfaces the biggest bottlenecks first.", colorVar: "--mes-color" },
  { icon: Clock, title: "Downtime down 30%", description: "Predictive maintenance alerts and automated work orders keep lines running and crews ahead of failures.", colorVar: "--mes-color" },
  { icon: ShieldCheck, title: "Audit-ready in minutes", description: "Pre-assembled evidence packages with clause mapping for BRCGS, SQF and FSSC 22000 — auditors approve, not interrogate.", colorVar: "--qms-color" },
  { icon: Eye, title: "100% traceability", description: "End-to-end lot genealogy with one-click mock recalls in under 2 hours — forward and backward in seconds.", colorVar: "--qms-color" },
  { icon: Layers, title: "Unified data model", description: "MES, QMS and CMS share one production backbone — no swivel-chair, no duplicate masters.", colorVar: "--mes-color" },
  { icon: Wifi, title: "Edge-first architecture", description: "Tablet apps for the floor work offline and sync when connected — built for rugged environments.", colorVar: "--edge-color" },
  { icon: BarChart3, title: "Actionable analytics", description: "SPC, Pareto, trend analysis and automated shift reports — every KPI drillable to source.", colorVar: "--ai-color" },
  { icon: Lock, title: "Role-based access", description: "Operators, technicians, managers, CFOs and auditors see exactly what they need — masked, scoped and signed.", colorVar: "--cms-color" },
  { icon: Zap, title: "AI everywhere", description: "Copilot for shift reports, CAPA narratives, label compliance and anomaly detection in one platform.", colorVar: "--ai-color" },
  { icon: Globe, title: "Multi-site ready", description: "Centralized compliance and KPI roll-ups across plants, lines and legal entities.", colorVar: "--cms-color" },
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
          Measurable impact on your line KPIs, your audit posture and your compliance
          spend — from day one.
        </p>
      </div>

      <BenefitImpactCard items={benefits} />
    </div>
  </section>
);

export default BenefitsSection;
