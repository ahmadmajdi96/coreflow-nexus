import { useState, useEffect } from "react";
import { Shield, FileCheck, Tablet, Menu, X, Factory, Sparkles } from "lucide-react";
import cortaLogo from "@/assets/corta-logo.png";

const navItems = [
  { label: "MES", href: "#mes", icon: Factory },
  { label: "QMS", href: "#qms", icon: Shield },
  { label: "CMS", href: "#cms", icon: FileCheck },
  { label: "Edge Apps", href: "#edge", icon: Tablet },
  { label: "AI", href: "#ai", icon: Sparkles },
];

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 sm:gap-3">
          <img src={cortaLogo} alt="CORTA-PL" className="h-7 sm:h-8 w-auto" />
          <span className="font-bold text-base sm:text-lg tracking-tight">CORTA-PL</span>
        </a>
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              <item.icon className="w-4 h-4" />{item.label}
            </a>
          ))}
        </div>
        <button className="md:hidden p-2 rounded-lg hover:bg-secondary/50" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50">
              <item.icon className="w-4 h-4" />{item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};
export default Navigation;
