import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Edit3, Send, FileCheck, Lock, ArrowRight } from "lucide-react";

type Status = "DRAFT" | "SUBMITTED" | "POSTED";

interface Action {
  label: string;
  icon: any;
  next: Status;
  onClick: () => void;
  /** null = allowed; string = blocked reason */
  blockedReason: string | null;
  variant?: "default" | "success";
}

interface Props {
  current: Status;
  actions: Action[];
}

const STEPS: { key: Status; label: string; icon: any }[] = [
  { key: "DRAFT", label: "Draft", icon: Edit3 },
  { key: "SUBMITTED", label: "Submitted", icon: Send },
  { key: "POSTED", label: "Posted", icon: Lock },
];

/** Renders the receipt status pipeline + role-aware action buttons with blocked-reason tooltips. */
export const ReceiptStatusActions = ({ current, actions }: Props) => {
  const currentIdx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.key} className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`gap-1 ${
                  active ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                  : done ? "bg-success/10 text-success border-success/30"
                  : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <Icon className="h-3 w-3" />{s.label}
              </Badge>
              {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
            </div>
          );
        })}
      </div>
      {actions.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-2 ml-auto">
            {actions.map((a, i) => {
              const Icon = a.icon;
              const blocked = !!a.blockedReason;
              const btn = (
                <Button
                  size="sm"
                  disabled={blocked}
                  onClick={a.onClick}
                  className={a.variant === "success" ? "bg-success hover:bg-success/90 text-success-foreground" : ""}
                >
                  <Icon className="h-4 w-4 mr-1.5" />{a.label}
                </Button>
              );
              if (!blocked) return <span key={i}>{btn}</span>;
              return (
                <Tooltip key={i}>
                  {/* Wrap disabled button so tooltip still shows */}
                  <TooltipTrigger asChild><span tabIndex={0}>{btn}</span></TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs"><p className="text-xs">{a.blockedReason}</p></TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
};

export { Edit3, Send, FileCheck, Lock };
