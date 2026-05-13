// Persona-based filtering for AI brief/insights drill-downs.
// Mirrors route guards in App.tsx so users only see links to pages they can open.
import type { AppRole } from "@/hooks/useAuth";

export type LinkType = "batch" | "po" | "product" | "sale" | "return" | string;

const LINK_ROLES: Record<string, AppRole[]> = {
  batch: ["inventory_manager", "compliance_officer", "system_admin"],
  po: ["purchasing_manager", "cfo", "system_admin"],
  product: ["inventory_manager", "purchasing_manager", "cfo", "system_admin"],
  sale: ["inventory_manager", "purchasing_manager", "cfo", "system_admin"],
  return: ["inventory_manager", "cfo", "system_admin"],
};

// What insight categories a persona is allowed to see in the brief.
const CATEGORY_ROLES: Record<string, AppRole[]> = {
  expiring: ["inventory_manager", "compliance_officer", "cfo", "system_admin"],
  replenishment: ["inventory_manager", "purchasing_manager", "cfo", "system_admin"],
  sales: ["cfo", "compliance_officer", "system_admin"],
  pos: ["purchasing_manager", "cfo", "system_admin"],
};

export const canSeeLink = (type: LinkType, roles: AppRole[]) => {
  if (roles.includes("system_admin")) return true;
  return (LINK_ROLES[type] ?? []).some((r) => roles.includes(r));
};

export const canSeeCategory = (cat: keyof typeof CATEGORY_ROLES, roles: AppRole[]) => {
  if (roles.includes("system_admin")) return true;
  return (CATEGORY_ROLES[cat] ?? []).some((r) => roles.includes(r));
};

// Heuristic — bucket an insight bullet into a category by keyword.
export const categorizeInsight = (text: string): keyof typeof CATEGORY_ROLES | "general" => {
  const t = text.toLowerCase();
  if (/expir|batch|fefo|shelf|waste/.test(t)) return "expiring";
  if (/reorder|replenish|stockout|out of stock|low stock|days of cover|velocity/.test(t)) return "replenishment";
  if (/sale|transaction|basket|outlier|return|refund|anomal|approval pending|customer/.test(t)) return "sales";
  if (/\bpo\b|purchase order|supplier|approve/.test(t)) return "pos";
  return "general";
};

export const filterLinks = <T extends { type: string }>(links: T[], roles: AppRole[]) =>
  links.filter((l) => canSeeLink(l.type, roles));

export const filterInsights = (insights: string[], roles: AppRole[]) =>
  insights.filter((i) => {
    const cat = categorizeInsight(i);
    if (cat === "general") return true;
    return canSeeCategory(cat, roles);
  });
