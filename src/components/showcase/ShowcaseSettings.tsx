import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Settings, X, Check } from "lucide-react";

export type HeroPreset = "factory" | "dashboard" | "cfo" | "sales";
export type ButtonPreset = "vivid" | "mono" | "pastel";

type Settings = {
  highContrast: boolean;
  hero: HeroPreset;
  buttons: ButtonPreset;
};

const DEFAULTS: Settings = { highContrast: false, hero: "factory", buttons: "vivid" };
const KEY = "corta-showcase-settings-v1";

const Ctx = createContext<{
  settings: Settings;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
}>({ settings: DEFAULTS, set: () => {} });

export const useShowcaseSettings = () => useContext(Ctx);

export const ShowcaseSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
    const root = document.documentElement;
    root.classList.toggle("pp-high-contrast", settings.highContrast);
    root.dataset.ppButtons = settings.buttons;
  }, [settings]);

  return (
    <Ctx.Provider
      value={{ settings, set: (k, v) => setSettings((s) => ({ ...s, [k]: v })) }}
    >
      {children}
    </Ctx.Provider>
  );
};

const HERO_OPTIONS: { id: HeroPreset; label: string }[] = [
  { id: "factory", label: "Factory" },
  { id: "dashboard", label: "Dashboard" },
  { id: "cfo", label: "CFO" },
  { id: "sales", label: "Sales" },
];

const BTN_OPTIONS: { id: ButtonPreset; label: string; swatch: string[] }[] = [
  { id: "vivid", label: "Vivid", swatch: ["#a78bfa", "#fbbf24", "#22d3ee", "#34d399"] },
  { id: "mono", label: "Mono", swatch: ["#e5e7eb", "#cbd5e1", "#94a3b8", "#64748b"] },
  { id: "pastel", label: "Pastel", swatch: ["#ddd6fe", "#fde68a", "#a5f3fc", "#bbf7d0"] },
];

export const ShowcaseSettingsPanel = () => {
  const { settings, set } = useShowcaseSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open showcase settings"
        className="fixed z-40 bottom-5 right-5 h-11 w-11 rounded-full flex items-center justify-center border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80 hover:border-white/40 shadow-lg"
      >
        <Settings className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-96 rounded-2xl border border-white/15 bg-[hsl(220_22%_11%)] text-white p-5 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Visual presets</h3>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <section className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/60">Accessibility</label>
              <button
                onClick={() => set("highContrast", !settings.highContrast)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${
                  settings.highContrast
                    ? "bg-yellow-300 text-black border-yellow-300"
                    : "bg-white/5 text-white border-white/15 hover:bg-white/10"
                }`}
              >
                <span>High contrast mode</span>
                {settings.highContrast && <Check className="w-4 h-4" />}
              </button>
              <p className="text-xs text-white/60">Boosts text/border contrast across the showcase for WCAG AA.</p>
            </section>

            <section className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/60">Button color preset</label>
              <div className="grid grid-cols-3 gap-2">
                {BTN_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => set("buttons", o.id)}
                    className={`p-2 rounded-lg border text-xs flex flex-col items-center gap-1.5 ${
                      settings.buttons === o.id
                        ? "border-white/60 bg-white/10"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex gap-1">
                      {o.swatch.map((c) => (
                        <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-white">{o.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/60">Hero background</label>
              <div className="grid grid-cols-2 gap-2">
                {HERO_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => set("hero", o.id)}
                    className={`px-3 py-2 rounded-lg border text-xs ${
                      settings.hero === o.id
                        ? "border-white/60 bg-white/10 text-white"
                        : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </section>

            <button
              onClick={() => { set("highContrast", false); set("hero", "factory"); set("buttons", "vivid"); }}
              className="w-full text-xs text-white/70 hover:text-white underline underline-offset-2"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </>
  );
};
