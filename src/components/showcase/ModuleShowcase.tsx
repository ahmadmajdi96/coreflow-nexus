import { modules, edgeAppGroups } from "./ModuleData";
import ImpactCard from "./ImpactCard";
import AiDescription from "./AiDescription";
import { ScreenPreviewGrid } from "./ScreenPreviewCard";

const ModuleShowcase = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="section-title mb-4">Platform Modules</h2>
        <p className="section-subtitle mx-auto">
          Each module is a fully-featured application — deployable independently or as
          a unified suite. Try the AI buttons to rewrite any description.
        </p>
      </div>

      <div className="space-y-32">
        {modules.map((mod, idx) => (
          <div key={mod.id} id={mod.id} className="scroll-mt-20">
            <div
              className={`flex flex-col ${
                idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } gap-10 items-center mb-12`}
            >
              <div className="lg:w-3/5">
                <div className="module-card overflow-hidden">
                  <div className="p-1">
                    <img
                      src={mod.image}
                      alt={`${mod.title} dashboard`}
                      className="w-full rounded-lg"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
              <div className="lg:w-2/5">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{
                    background: `hsl(var(${mod.colorVar}) / 0.1)`,
                    color: `hsl(var(${mod.colorVar}))`,
                    border: `1px solid hsl(var(${mod.colorVar}) / 0.25)`,
                  }}
                >
                  {mod.subtitle}
                </div>
                <h3 className="text-3xl font-bold mb-4">{mod.title}</h3>
                <AiDescription mod={mod} />
                <div className="flex items-center gap-2 text-sm pp-muted-text mt-4">
                  <span className="font-mono font-semibold text-foreground">
                    {mod.screens.length}+
                  </span>{" "}
                  screens ·
                  <span className="font-mono font-semibold text-foreground">
                    {mod.features.length}
                  </span>{" "}
                  feature areas
                </div>
              </div>
            </div>

            <ImpactCard metrics={mod.impact} colorVar={mod.colorVar} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {mod.features.map((feat) => (
                <div key={feat.title} className="benefit-card group">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-md shrink-0"
                      style={{ background: `hsl(var(${mod.colorVar}) / 0.1)` }}
                    >
                      <feat.icon
                        className="w-5 h-5"
                        style={{ color: `hsl(var(${mod.colorVar}))` }}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{feat.title}</h4>
                      <p className="text-xs pp-muted-text leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider pp-muted-text">
                  Live screen previews
                </h4>
                <span className="text-xs pp-muted-text">
                  Click any tile to open the live module
                </span>
              </div>
              <ScreenPreviewGrid previews={mod.previewScreens} colorVar={mod.colorVar} />
            </div>

            <div className="data-card">
              <h4 className="text-sm font-semibold uppercase tracking-wider pp-muted-text mb-4">
                Available Screens
              </h4>
              <div className="flex flex-wrap gap-2">
                {mod.screens.map((screen) => (
                  <span
                    key={screen}
                    className="px-3 py-1.5 rounded-md text-xs font-medium border pp-border"
                    style={{ background: "hsl(220 22% 13% / 0.6)" }}
                  >
                    {screen}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div id="edge" className="scroll-mt-20 mt-32">
        <div className="text-center mb-16">
          <h2 className="section-title mb-4">Embedded AI Suite</h2>
          <p className="section-subtitle mx-auto">
            A persona-aware copilot, scheduled daily briefs, anomaly watch and
            audited feedback — woven directly into every CORTA ERP workflow.
          </p>
        </div>

        <div className="space-y-16">
          {edgeAppGroups.map((group) => (
            <div key={group.category}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-border" />
                <div
                  className="px-4 py-1.5 rounded-full text-sm font-semibold"
                  style={{
                    background: `hsl(var(${group.colorVar}) / 0.1)`,
                    color: `hsl(var(${group.colorVar}))`,
                    border: `1px solid hsl(var(${group.colorVar}) / 0.25)`,
                  }}
                >
                  {group.category}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <ImpactCard metrics={group.impact} colorVar={group.colorVar} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {group.apps.map((app) => (
                  <div key={app.title} className="benefit-card group">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-md shrink-0"
                        style={{ background: `hsl(var(${group.colorVar}) / 0.1)` }}
                      >
                        <app.icon
                          className="w-5 h-5"
                          style={{ color: `hsl(var(${group.colorVar}))` }}
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{app.title}</h4>
                        <p className="text-xs pp-muted-text leading-relaxed">{app.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider pp-muted-text mb-4">
                  Live edge previews
                </h4>
                <ScreenPreviewGrid previews={group.previewScreens} colorVar={group.colorVar} />
              </div>

              <div className="data-card">
                <h4 className="text-sm font-semibold uppercase tracking-wider pp-muted-text mb-4">
                  Screens ({group.screens.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {group.screens.map((screen) => (
                    <span
                      key={screen}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border pp-border"
                      style={{ background: "hsl(220 22% 13% / 0.6)" }}
                    >
                      {screen}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ModuleShowcase;
