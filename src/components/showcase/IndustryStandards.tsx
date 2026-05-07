const standards = [
  { name: "ISA-95", desc: "Enterprise-Control Integration" },
  { name: "BRCGS v9", desc: "Global Food Safety Standard" },
  { name: "SQF", desc: "Safe Quality Food Certification" },
  { name: "FSSC 22000", desc: "Food Safety System Certification" },
  { name: "HACCP", desc: "Hazard Analysis & Critical Control" },
  { name: "FSMA 204", desc: "FDA Traceability Rule" },
  { name: "EU 1169/2011", desc: "Food Information Regulation" },
  { name: "GMP", desc: "Good Manufacturing Practices" },
  { name: "MESA-11", desc: "MES Functional Model" },
  { name: "ISO 22000", desc: "Food Safety Management" },
];

const IndustryStandards = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-border">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Industry Standards Compliance</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Built to meet and exceed the requirements of global food safety and manufacturing standards.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {standards.map((s) => (
          <div key={s.name} className="sc-data-card text-center">
            <div className="font-mono font-bold text-primary text-lg mb-1">{s.name}</div>
            <div className="text-xs text-muted-foreground">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
export default IndustryStandards;
