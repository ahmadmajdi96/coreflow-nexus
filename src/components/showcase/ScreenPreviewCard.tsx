import { useState } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface ScreenPreview {
  id: string;
  title: string;
  caption: string;
  image: string;
  route?: string;
  role?: string;
}

interface ScreenPreviewCardProps {
  preview: ScreenPreview;
  colorVar: string;
}

const ScreenPreviewCard = ({ preview, colorVar }: ScreenPreviewCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full text-left rounded-xl overflow-hidden border pp-border transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2"
        style={{
          background: "hsl(var(--pp-card))",
          boxShadow:
            "0 1px 0 hsl(0 0% 100% / 0.04) inset, 0 8px 24px hsl(0 0% 0% / 0.35)",
        }}
        aria-label={`Open preview of ${preview.title}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `radial-gradient(600px 200px at 50% -20%, hsl(var(${colorVar}) / 0.18), transparent 60%)`,
          }}
        />

        {/* Window chrome */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b pp-border"
          style={{ background: "hsl(220 22% 9%)" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <div className="font-mono text-[10px] pp-muted-text truncate max-w-[60%]">
            {preview.route ?? `/${preview.id}`}
          </div>
          <div className="flex items-center gap-1.5">
            {preview.role && (
              <span
                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-semibold"
                style={{
                  color: `hsl(var(${colorVar}))`,
                  background: `hsl(var(${colorVar}) / 0.12)`,
                  border: `1px solid hsl(var(${colorVar}) / 0.3)`,
                }}
              >
                {preview.role}
              </span>
            )}
          </div>
        </div>

        {/* Screenshot */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: "16 / 10", background: "hsl(220 22% 11%)" }}
        >
          <img
            src={preview.image}
            alt={preview.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-12"
            style={{
              background: "linear-gradient(180deg, transparent, hsl(220 25% 7% / 0.8))",
            }}
          />
        </div>

        {/* Caption */}
        <div className="p-4" style={{ background: "hsl(220 22% 9%)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm text-foreground truncate">
                {preview.title}
              </h4>
              <p className="text-xs pp-muted-text mt-1 leading-relaxed line-clamp-2">
                {preview.caption}
              </p>
            </div>
            <ArrowUpRight
              className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
              style={{ color: `hsl(var(${colorVar}))` }}
            />
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-5xl p-0 overflow-hidden border pp-border"
          style={{ background: "hsl(var(--pp-card))" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b pp-border"
            style={{ background: "hsl(220 22% 9%)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
            </div>
            <div className="font-mono text-[11px] pp-muted-text truncate">
              {preview.route ?? `/${preview.id}`}
            </div>
            <div className="w-8" />
          </div>

          <div className="bg-black/40">
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full max-h-[70vh] object-contain"
            />
          </div>

          <div
            className="p-5 flex items-start justify-between gap-4"
            style={{ background: "hsl(220 22% 9%)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {preview.role && (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-semibold"
                    style={{
                      color: `hsl(var(${colorVar}))`,
                      background: `hsl(var(${colorVar}) / 0.12)`,
                      border: `1px solid hsl(var(${colorVar}) / 0.3)`,
                    }}
                  >
                    {preview.role}
                  </span>
                )}
                <DialogTitle className="text-base font-semibold">{preview.title}</DialogTitle>
              </div>
              <DialogDescription className="text-sm pp-muted-text leading-relaxed">
                {preview.caption}
              </DialogDescription>
            </div>
            {preview.route && (
              <Link
                to={preview.route}
                onClick={() => setOpen(false)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors"
                style={{
                  color: `hsl(var(${colorVar}))`,
                  background: `hsl(var(${colorVar}) / 0.12)`,
                  border: `1px solid hsl(var(${colorVar}) / 0.3)`,
                }}
              >
                Open live module
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface ScreenPreviewGridProps {
  previews: ScreenPreview[];
  colorVar: string;
}

export const ScreenPreviewGrid = ({ previews, colorVar }: ScreenPreviewGridProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
    {previews.map((p) => (
      <ScreenPreviewCard key={p.id} preview={p} colorVar={colorVar} />
    ))}
  </div>
);

export default ScreenPreviewCard;
