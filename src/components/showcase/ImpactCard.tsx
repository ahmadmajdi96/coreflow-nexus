import type { ElementType } from "react";
import type { ImpactMetric } from "./ModuleData";

interface ImpactCardProps {
  metrics: ImpactMetric[];
  colorVar: string;
  variant?: "kpi" | "benefit";
  columns?: 2 | 3 | 4 | 5;
}

const colsClass: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-5",
};

const ImpactCard = ({ metrics, colorVar, variant = "kpi", columns }: ImpactCardProps) => {
  const cols = columns ?? (metrics.length === 2 ? 2 : 4);
  return (
    <div className={`grid ${colsClass[cols]} gap-4 mb-8`}>
      {metrics.map((m) => (
        <div
          key={m.label}
          className={`data-card group ${variant === "kpi" ? "text-center" : "text-left"}`}
        >
          <div
            className={`inline-flex p-2 rounded-lg mb-3 ${variant === "kpi" ? "mx-auto" : ""}`}
            style={{ background: `hsl(var(${colorVar}) / 0.12)` }}
          >
            <m.icon className="w-5 h-5" style={{ color: `hsl(var(${colorVar}))` }} />
          </div>
          {variant === "kpi" ? (
            <>
              <div
                className="text-2xl font-bold font-mono mb-1"
                style={{ color: `hsl(var(${colorVar}))` }}
              >
                {m.metric}
              </div>
              <div className="text-sm font-semibold text-foreground mb-2">{m.label}</div>
              <p className="text-xs pp-muted-text leading-relaxed">{m.description}</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-lg font-bold font-mono"
                  style={{ color: `hsl(var(${colorVar}))` }}
                >
                  {m.metric}
                </span>
                <span className="text-sm font-semibold text-foreground">{m.label}</span>
              </div>
              <p className="text-xs pp-muted-text leading-relaxed">{m.description}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export interface BenefitStatement {
  icon: ElementType;
  title: string;
  description: string;
  colorVar?: string;
}

interface BenefitImpactCardProps {
  items: BenefitStatement[];
  defaultColorVar?: string;
}

export const BenefitImpactCard = ({ items, defaultColorVar = "--mes-color" }: BenefitImpactCardProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    {items.map((b) => {
      const cv = b.colorVar ?? defaultColorVar;
      return (
        <div key={b.title} className="benefit-card group">
          <div
            className="p-2.5 rounded-lg w-fit mb-4"
            style={{
              background: `hsl(var(${cv}) / 0.1)`,
              border: `1px solid hsl(var(${cv}) / 0.25)`,
            }}
          >
            <b.icon className="w-5 h-5" style={{ color: `hsl(var(${cv}))` }} />
          </div>
          <h3 className="font-semibold mb-2 text-sm">{b.title}</h3>
          <p className="text-xs pp-muted-text leading-relaxed">{b.description}</p>
        </div>
      );
    })}
  </div>
);

export default ImpactCard;
