import { useEffect, useState } from "react";
import heroFactory from "@/assets/hero-factory.jpg";
import cortaLogo from "@/assets/corta-logo.png";
import screenDashboard from "@/assets/screen-dashboard.png";
import screenCfo from "@/assets/screen-cfo.png";
import screenSales from "@/assets/screen-sales.png";
import screenReplenishment from "@/assets/screen-replenishment.png";
import screenBatches from "@/assets/screen-batches.png";
import { useShowcaseSettings, type HeroPreset } from "./ShowcaseSettings";

const HERO_MAP: Record<HeroPreset, string> = {
  factory: heroFactory,
  dashboard: screenDashboard,
  cfo: screenCfo,
  sales: screenSales,
};

const PREVIEWS = [
  { src: screenDashboard, label: "Operations" },
  { src: screenReplenishment, label: "Replenishment" },
  { src: screenSales, label: "Sales" },
  { src: screenCfo, label: "CFO" },
  { src: screenBatches, label: "Batches" },
];

const HeroSection = () => {
  const { settings } = useShowcaseSettings();
  const heroSrc = HERO_MAP[settings.hero] ?? heroFactory;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PREVIEWS.length), 4000);
    return () => clearInterval(t);
  }, []);

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

        {/* Real cropped system screenshot strip */}
        <div className="mb-10 max-w-5xl mx-auto">
          <div
            className="relative rounded-xl overflow-hidden border pp-border shadow-2xl"
            style={{ background: "hsl(220 22% 11%)" }}
          >
            <div className="flex items-center gap-1.5 px-3 py-2 border-b pp-border bg-black/40">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              <span className="ml-3 text-[11px] pp-muted-text font-mono">corta.app / {PREVIEWS[idx].label.toLowerCase()}</span>
            </div>
            <div className="aspect-[16/9] relative">
              {PREVIEWS.map((p, i) => (
                <img
                  key={p.label}
                  src={p.src}
                  alt={`${p.label} screen`}
                  className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ${
                    i === idx ? "opacity-100" : "opacity-0"
                  }`}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {PREVIEWS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setIdx(i)}
                aria-label={`Show ${p.label}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-8 bg-white" : "w-3 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

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
