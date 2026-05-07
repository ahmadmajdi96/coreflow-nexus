import { useEffect } from "react";
import Navigation from "@/components/showcase/Navigation";
import HeroSection from "@/components/showcase/HeroSection";
import SystemArchitecture from "@/components/showcase/SystemArchitecture";
import ModuleShowcase from "@/components/showcase/ModuleShowcase";
import BenefitsSection from "@/components/showcase/BenefitsSection";
import IndustryStandards from "@/components/showcase/IndustryStandards";
import AiAssistant from "@/components/showcase/AiAssistant";
import Footer from "@/components/showcase/Footer";
import "./Showcase.css";

const Showcase = () => {
  useEffect(() => {
    document.title = "CORTA-PL — AI-Powered Production Suite";
  }, []);
  return (
    <div className="showcase-root min-h-screen bg-background text-foreground">
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
