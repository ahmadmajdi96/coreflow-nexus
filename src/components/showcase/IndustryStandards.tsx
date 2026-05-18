const capabilities = [
  { name: "RBAC", desc: "Role-based access control" },
  { name: "Audit Log", desc: "Immutable change history" },
  { name: "FIFO / FEFO", desc: "Dual inventory costing" },
  { name: "Approval Rules", desc: "Multi-tier PO gates" },
  { name: "Row-Level Security", desc: "Policy-scoped drill-downs" },
  { name: "CSV / PDF Export", desc: "Evidence-ready outputs" },
];

const IndustryStandards = () => (
  <section
    id="standards"
    className="py-16 sm:py-24 px-4 sm:px-6 border-t pp-border scroll-mt-20"
  >
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="section-title mb-4">Built-in Compliance Capabilities</h2>
        <p className="section-subtitle mx-auto">
          Controls, ledgers and exports that live inside the system — not bolt-ons.
          Everything below is enforced in the database or the UI, not promised on a slide.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {capabilities.map((c) => (
          <div key={c.name} className="data-card text-center">
            <div className="font-mono font-bold pp-gradient-text text-lg mb-1">
              {c.name}
            </div>
            <div className="text-xs pp-muted-text">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default IndustryStandards;
