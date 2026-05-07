import heroFactory from "@/assets/hero-factory.jpg";
import cortaLogo from "@/assets/corta-logo.png";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0">
      <img src={heroFactory} alt="Modern food manufacturing" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
      <div className="absolute inset-0 sc-hero-gradient" />
    </div>
    <div className="absolute inset-0 sc-grid-pattern opacity-30" />
    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center pt-20 sm:pt-0">
      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-6 sm:mb-8">
        <span className="sc-pulse-dot bg-accent" />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">Enterprise Manufacturing Intelligence Platform</span>
      </div>
      <div className="flex justify-center mb-4 sm:mb-6">
        <img src={cortaLogo} alt="CORTA-PL" className="h-16 sm:h-20 md:h-24 w-auto" />
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6">
        <span className="sc-gradient-text">CORTA-PL</span><br />
        <span className="text-foreground">Production Suite</span>
      </h1>
      <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-2">
        A unified ecosystem of MES, QMS, and CMS applications purpose-built for food manufacturing — from the control room to the factory floor.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
        {[
          { value: "3", label: "Core Platforms" },
          { value: "13+", label: "Edge Applications" },
          { value: "100+", label: "Feature Screens" },
          { value: "AI", label: "Powered" },
        ].map((s) => (
          <div key={s.label} className="sc-data-card text-center backdrop-blur-sm bg-card/60 p-4 sm:p-6">
            <div className="font-mono text-xl sm:text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
export default HeroSection;
