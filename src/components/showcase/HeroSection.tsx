import heroFactory from "@/assets/hero-factory.jpg";
import cortaLogo from "@/assets/corta-logo.png";
import screenDashboard from "@/assets/screen-dashboard.png";
import screenCfo from "@/assets/screen-cfo.png";
import screenSales from "@/assets/screen-sales.png";
import { useShowcaseSettings, type HeroPreset } from "./ShowcaseSettings";

const HERO_MAP: Record<HeroPreset, string> = {
  factory: heroFactory,
  dashboard: screenDashboard,
  cfo: screenCfo,
  sales: screenSales,
};

const HeroSection = () => {
  const { settings } = useShowcaseSettings();
  const heroSrc = HERO_MAP[settings.hero] ?? heroFactory;


  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroSrc}
          alt="CORTA ERP intelligent inventory operations"
          className="w-full h-full object-cover"
          width={1920}
          height={1024}
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(220 25% 7% / 0.92), hsl(220 25% 7% / 0.78), hsl(220 25% 7%))",
          }}
        />
        <div className="absolute inset-0 pp-hero-gradient" />
      </div>

      <div className="absolute inset-0 pp-grid-pattern opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center pt-24 sm:pt-20">
        <div
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border pp-border backdrop-blur-sm mb-6 sm:mb-8"
          style={{ background: "hsl(220 22% 11% / 0.5)" }}
        >
          <span className="pp-pulse-dot" />
          <span className="text-xs sm:text-sm font-medium pp-muted-text">
            AI-Powered Inventory & Operations Intelligence
          </span>
        </div>

        <div className="flex justify-center mb-4 sm:mb-6">
          <img src={cortaLogo} alt="CORTA ERP Logo" className="h-16 sm:h-20 md:h-24 w-auto animate-fade-in" />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6">
          <span className="pp-gradient-text">CORTA ERP</span>
          <br />
          <span>Stock smarter. Sell faster.</span>
        </h1>

        <p className="text-base sm:text-xl md:text-2xl pp-muted-text max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
          A unified ERP — Operations, Procurement, Sales and Finance — with an embedded AI Suite
          that watches your batches, replenishment and sales in real time.
        </p>


        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
          {[
            { value: "4", label: "Core Modules" },
            { value: "AI", label: "Copilot + Daily Brief" },
            { value: "25+", label: "Workflow Screens" },
            { value: "RBAC", label: "Role-Secured" },
          ].map((stat) => (
            <div key={stat.label} className="data-card text-center backdrop-blur-sm p-4 sm:p-6">
              <div className="pp-metric pp-gradient-text text-xl sm:text-3xl">{stat.value}</div>
              <div className="text-[10px] sm:text-xs uppercase tracking-widest pp-muted-text mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
