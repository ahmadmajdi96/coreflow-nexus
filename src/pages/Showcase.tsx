import { useEffect } from "react";
import Navigation from "@/components/showcase/Navigation";
import HeroSection from "@/components/showcase/HeroSection";
import SystemArchitecture from "@/components/showcase/SystemArchitecture";
import ModuleShowcase from "@/components/showcase/ModuleShowcase";
import AiAssistant from "@/components/showcase/AiAssistant";
import BenefitsSection from "@/components/showcase/BenefitsSection";
import IndustryStandards from "@/components/showcase/IndustryStandards";
import Footer from "@/components/showcase/Footer";
import { ShowcaseSettingsProvider, ShowcaseSettingsPanel } from "@/components/showcase/ShowcaseSettings";

const Showcase = () => {
  useEffect(() => {
    document.title = "CORTA ERP — AI-Powered Production Suite";
    return () => {
      document.documentElement.classList.remove("pp-high-contrast");
      delete (document.documentElement.dataset as any).ppButtons;
    };
  }, []);
  return (
    <ShowcaseSettingsProvider>
      <div className="pp-dark min-h-screen text-foreground">
        <Navigation />
        <HeroSection />
        <SystemArchitecture />
        <ModuleShowcase />
        <AiAssistant />
        <BenefitsSection />
        <IndustryStandards />
        <Footer />
        <ShowcaseSettingsPanel />
      </div>
    </ShowcaseSettingsProvider>
  );
};

export default Showcase;
