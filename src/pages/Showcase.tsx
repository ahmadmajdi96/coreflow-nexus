import { useEffect } from "react";
import Navigation from "@/components/showcase/Navigation";
import HeroSection from "@/components/showcase/HeroSection";
import SystemArchitecture from "@/components/showcase/SystemArchitecture";
import ModuleShowcase from "@/components/showcase/ModuleShowcase";
import AiAssistant from "@/components/showcase/AiAssistant";
import BenefitsSection from "@/components/showcase/BenefitsSection";
import IndustryStandards from "@/components/showcase/IndustryStandards";
import Footer from "@/components/showcase/Footer";

const Showcase = () => {
  useEffect(() => {
    document.title = "CORTA ERP — AI-Powered Production Suite";
  }, []);
  return (
    <div className="pp-dark min-h-screen text-foreground">
      <Navigation />
      <HeroSection />
      <SystemArchitecture />
      <ModuleShowcase />
      <AiAssistant />
      <BenefitsSection />
      <IndustryStandards />
      <Footer />
    </div>
  );
};

export default Showcase;
