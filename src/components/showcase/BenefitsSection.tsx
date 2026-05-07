import { TrendingUp, Clock, ShieldCheck, Eye, Layers, Wifi, BarChart3, Lock, Zap, Globe } from "lucide-react";

const benefits = [
  { icon: TrendingUp, title: "Increase OEE by 15–25%", description: "Real-time visibility into availability, performance, and quality losses." },
  { icon: Clock, title: "Reduce Downtime by 30%", description: "Predictive maintenance alerts and automated work orders keep lines running." },
  { icon: ShieldCheck, title: "Audit-Ready in Minutes", description: "Pre-assembled evidence packages with clause mapping for BRCGS, SQF, FSSC 22000." },
  { icon: Eye, title: "100% Traceability", description: "End-to-end lot genealogy with one-click mock recalls in under 2 hours." },
  { icon: Layers, title: "Unified Data Model", description: "MES, QMS, and CMS share a common data backbone." },
  { icon: Wifi, title: "Edge-First Architecture", description: "Tablet apps for the factory floor work offline and sync when connected." },
  { icon: BarChart3, title: "Actionable Analytics", description: "SPC, Pareto, trend analysis, and automated shift reports." },
  { icon: Lock, title: "Role-Based Access", description: "Operators, technicians, managers, and auditors see exactly what they need." },
  { icon: Zap, title: "Rapid Deployment", description: "Modular architecture — start with MES and add QMS and CMS as you grow." },
  { icon: Globe, title: "Multi-Site Ready", description: "Centralized compliance monitoring across all facilities." },
];

const BenefitsSection = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
    <div className="absolute inset-0 sc-hero-gradient opacity-50" />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Why <span className="sc-gradient-text">CORTA-PL</span>?</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Measurable impact on your production line KPIs from day one.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {benefits.map((b) => (
          <div key={b.title} className="sc-benefit-card">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 w-fit mb-4">
              <b.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-2 text-sm">{b.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
export default BenefitsSection;
