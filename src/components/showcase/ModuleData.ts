import {
  Factory, Activity, Wrench, Package, Zap, BarChart3,
  Shield, ClipboardCheck, AlertTriangle, Users, FlaskConical,
  FileCheck, Scale, Leaf, Globe, Award,
  Tablet, CheckSquare, ThermometerSun, UserCheck, Search,
  FileText, AlertCircle, Ship, Recycle,
  Timer, Gauge, Settings, CalendarCheck, Layers, Database,
  Microscope, BookOpen, FileWarning, Truck, Thermometer,
  Building, BadgeCheck, Landmark, ScrollText, FileSpreadsheet,
  TrendingDown, DollarSign, Clock, Target,
} from "lucide-react";
import type { ElementType } from "react";

import mesDashboard from "@/assets/mes-dashboard.jpg";
import qmsDashboard from "@/assets/qms-dashboard.jpg";
import cmsDashboard from "@/assets/cms-dashboard.jpg";
import edgeApps from "@/assets/edge-apps.jpg";

import type { ScreenPreview } from "./ScreenPreviewCard";
export type { ScreenPreview } from "./ScreenPreviewCard";

export interface ModuleFeature { icon: ElementType; title: string; desc: string; }
export interface ImpactMetric { icon: ElementType; metric: string; label: string; description: string; }
export interface ModuleData {
  id: string; title: string; subtitle: string; description: string;
  image: string; colorVar: string;
  features: ModuleFeature[]; screens: string[]; impact: ImpactMetric[];
  previewScreens: ScreenPreview[];
}
export interface EdgeAppGroup {
  category: string; colorVar: string;
  apps: ModuleFeature[]; screens: string[]; impact: ImpactMetric[];
  previewScreens: ScreenPreview[];
}

export const modules: ModuleData[] = [
  {
    id: "mes", title: "MES", subtitle: "Manufacturing Execution System",
    description: "Real-time production monitoring, OEE tracking, equipment management, and scheduling across all production lines. Provides ISA-95 Level 3 operations management with full station-level visibility — from raw material intake to finished goods packaging.",
    image: mesDashboard, colorVar: "--mes-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 30%", label: "Downtime Reduction", description: "Predictive maintenance alerts and automated work orders catch failures before they happen, reducing unplanned stops by up to 30%." },
      { icon: DollarSign, metric: "↓ 18%", label: "Operating Costs", description: "Energy monitoring, optimized scheduling, and reduced changeover times cut operating costs across every production line." },
      { icon: Target, metric: "↑ 25%", label: "OEE Improvement", description: "Real-time Pareto analysis of availability, performance, and quality losses enables targeted improvement on the biggest bottlenecks." },
      { icon: Clock, metric: "↑ 40%", label: "Faster Changeovers", description: "Digital recipe dispatch and automated parameter loading slash changeover times between production runs." },
    ],
    features: [
      { icon: Activity, title: "Real-Time OEE Dashboard", desc: "Live Availability × Performance × Quality scoring with automatic Pareto analysis of the six big losses. Drill down from plant level to individual station in one click." },
      { icon: Factory, title: "Line & Station Management", desc: "Segment production lines into stations with per-station throughput, cycle time, and yield tracking. Visual line maps show bottleneck stations in real time." },
      { icon: Wrench, title: "Equipment Registry & PM", desc: "Complete asset registry with health scoring, preventive maintenance scheduling, spare parts inventory, and MTBF/MTTR analytics." },
      { icon: Package, title: "Material & Recipe Management", desc: "Full lot tracking from raw material receipt to finished goods. Recipe dispatch with parameter versioning and BOM management." },
      { icon: Zap, title: "Energy & Sustainability", desc: "Real-time kWh, water, gas, and steam consumption per line and per unit produced with anomaly alerts." },
      { icon: BarChart3, title: "SPC & Statistical Analysis", desc: "Control charts (X̄-R, X̄-S, CUSUM), capability indices (Cp, Cpk), and automated out-of-control rule detection." },
      { icon: Timer, title: "Production Scheduling", desc: "Drag-and-drop Gantt scheduling with constraint-based optimization, shift patterns, and conflict detection." },
      { icon: Gauge, title: "Downtime & Loss Tracking", desc: "Categorized downtime events with automatic duration capture, reason code trees, and shift comparison." },
      { icon: Settings, title: "CIP & Cleaning Management", desc: "Clean-in-place scheduling, cycle verification, chemical concentration tracking and validation records." },
      { icon: CalendarCheck, title: "Shift Reports & Handover", desc: "Auto-generated end-of-shift reports with OEE, downtime, quality holds, and digital handover acknowledgement." },
      { icon: Layers, title: "Work Order Management", desc: "Production work orders with status tracking, material allocation, and actual-vs-planned variance analysis." },
      { icon: Database, title: "Batch Genealogy", desc: "Complete batch tree with full forward and backward traceability in seconds." },
    ],
    screens: ["Production Dashboard","OEE Performance","Production Lines","Station Dashboard","Equipment Registry","Machine Detail","Work Orders","Recipe Management","Material Management","Production Scheduling","SPC Analysis","Energy Dashboard","CIP Management","Labor Management","Non-conformance","Reports Hub","Downtime Analysis","Shift Handover","Batch Genealogy","KPI Scorecard"],
    previewScreens: [
      { id: "mes-dashboard", title: "Production Dashboard", caption: "Live OEE, throughput, and downtime across every line — drill from plant to station in one click.", image: mesDashboard, route: "/dashboard", role: "Production Manager" },
      { id: "mes-oee", title: "OEE & Pareto Analysis", caption: "Availability × Performance × Quality with auto-Pareto of the six big losses and shift comparisons.", image: mesDashboard, route: "/dashboard", role: "Plant Manager" },
      { id: "mes-genealogy", title: "Batch Genealogy", caption: "Forward and backward lot tracing in seconds — from raw material receipt to finished goods.", image: mesDashboard, route: "/dashboard", role: "Operator" },
    ],
  },
  {
    id: "qms", title: "QMS", subtitle: "Quality Management System",
    description: "Comprehensive food safety and quality management with CAPA workflows, HACCP monitoring, supplier qualification, inspection management, and full BRCGS/SQF audit support. Drives continuous improvement through data-driven quality insights.",
    image: qmsDashboard, colorVar: "--qms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 65%", label: "Fewer Quality Failures", description: "Automated CCP monitoring and deviation alerts catch quality issues in real time." },
      { icon: DollarSign, metric: "↓ 40%", label: "Waste Reduction", description: "Early defect detection and supplier qualification programs reduce scrap and rework costs." },
      { icon: Target, metric: "↑ 90%", label: "First-Time Audit Pass", description: "Pre-assembled evidence packages with clause mapping ensure audit readiness." },
      { icon: Clock, metric: "↓ 75%", label: "Investigation Time", description: "Structured CAPA workflows cut investigation cycle times from weeks to days." },
    ],
    features: [
      { icon: Shield, title: "CAPA Management", desc: "Full 7-stage workflow from initiation through effectiveness verification with automated escalation." },
      { icon: ClipboardCheck, title: "HACCP & Food Safety Plans", desc: "Digital HACCP plans with CCP monitoring, critical limit validation, and corrective action triggers." },
      { icon: AlertTriangle, title: "Deviation & Complaint Management", desc: "Investigation workflows with severity scoring, trend analysis, and automatic CAPA generation." },
      { icon: Users, title: "Supplier Quality Management", desc: "Supplier qualification lifecycles, risk-based audit scheduling, and performance scorecards." },
      { icon: FlaskConical, title: "Environmental Monitoring (EMP)", desc: "Hygiene zone sampling programs with Listeria/Salmonella tracking and zone maps." },
      { icon: Search, title: "Traceability & Mock Recall", desc: "End-to-end lot genealogy with one-click mock recall exercises and effectiveness scoring." },
      { icon: Microscope, title: "Incoming & In-Process Inspection", desc: "Configurable inspection plans with AQL sampling and disposition workflows." },
      { icon: BookOpen, title: "Document Control & Training", desc: "Version-controlled documents with training matrix and competency tracking." },
      { icon: FileWarning, title: "Risk Register & FMEA", desc: "Risk registers with severity × likelihood × detectability scoring and FMEA worksheets." },
      { icon: Thermometer, title: "Calibration Management", desc: "Instrument registry with calibration schedules and out-of-tolerance investigations." },
      { icon: Truck, title: "Allergen Control Program", desc: "Allergen matrix, changeover validation checklists, and swab testing schedules." },
      { icon: Building, title: "Audit Management", desc: "Internal/external audit scheduling, finding tracking, and CAPA linkage." },
    ],
    screens: ["Quality Dashboard","CAPA List & Detail","Complaint Management","HACCP Plans","Incoming Inspections","Deviation Management","Supplier Qualification","Environmental Monitoring","Allergen Control","Traceability & Recall","Audit Management","Training Records","Document Control","Calibration","Risk Register","Management Review","Reports Hub","Mock Recall","Supplier Scorecards","Non-conformance Trends"],
    previewScreens: [
      { id: "qms-dashboard", title: "Quality Dashboard", caption: "Open CAPAs, deviations, complaint trends and HACCP compliance — one glance, full drill-down.", image: qmsDashboard, route: "/dashboard", role: "QA Manager" },
      { id: "qms-capa", title: "CAPA Workflow", caption: "7-stage corrective and preventive action lifecycle with automated escalation and effectiveness checks.", image: qmsDashboard, route: "/dashboard", role: "Compliance" },
      { id: "qms-trace", title: "Traceability & Mock Recall", caption: "End-to-end lot genealogy with one-click mock recall exercises and effectiveness scoring.", image: qmsDashboard, route: "/dashboard", role: "QA" },
    ],
  },
  {
    id: "cms", title: "CMS", subtitle: "Compliance Management System",
    description: "Regulatory intelligence, certification lifecycle management, ESG reporting, trade compliance, and audit evidence packaging — keeping your operations ahead of evolving global regulations.",
    image: cmsDashboard, colorVar: "--cms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 80%", label: "Compliance Risk", description: "Automated horizon scanning ensures you never miss a regulatory change that affects your products." },
      { icon: DollarSign, metric: "↓ 50%", label: "Compliance Costs", description: "Automated evidence packaging and certification tracking eliminate manual compliance overhead." },
      { icon: Target, metric: "100%", label: "Label Accuracy", description: "Automated artwork validation against EU 1169/2011, FDA, and local regulation databases." },
      { icon: Clock, metric: "↓ 60%", label: "Audit Prep Time", description: "Pre-assembled evidence packages with clause-by-clause mapping for BRCGS, SQF, and FSSC 22000." },
    ],
    features: [
      { icon: Scale, title: "Regulatory Intelligence & Horizon Scanning", desc: "Monitoring of regulatory changes across 50+ jurisdictions with rule-to-product impact assessment." },
      { icon: Award, title: "Certification Lifecycle Management", desc: "Track BRCGS, SQF, FSSC 22000, ISO 22000 with renewal timelines and gap analysis." },
      { icon: FileCheck, title: "Label & Artwork Compliance", desc: "Validation of nutrition panels, allergen declarations, and claims against global regulations." },
      { icon: Leaf, title: "ESG & Carbon Tracking", desc: "Scope 1/2/3 emissions, product carbon footprint, water footprint, and EPR inventory." },
      { icon: Globe, title: "Trade & Export Compliance", desc: "Sanctions screening, denied party checks, export documentation, and health certificates." },
      { icon: ClipboardCheck, title: "Evidence Package Builder", desc: "Automated evidence collection with clause-by-clause mapping to certification standards." },
      { icon: BadgeCheck, title: "FSMA 204 Traceability", desc: "FDA Food Traceability Rule compliance with KDE/CTE recording and 24-hour response capability." },
      { icon: Landmark, title: "Market Registration Management", desc: "Track product registrations across markets with document and renewal dashboards." },
      { icon: ScrollText, title: "Regulatory Change Management", desc: "Workflows for assessing, planning, and implementing regulatory changes." },
      { icon: FileSpreadsheet, title: "Compliance Reporting & Analytics", desc: "Executive dashboards by product, market, and standard with trend analysis." },
    ],
    screens: ["Compliance Dashboard","Regulatory Intelligence","Horizon Scanning","Portfolio Analysis","Formulation Check","Certifications","Label Compliance","Registrations","Recall Hub","FSMA 204 Traceability","ESG Dashboard","Carbon Footprint","EPR Management","Trade Compliance","Reports","Admin","Evidence Packages","Market Registrations","Change Management","Audit Readiness"],
    previewScreens: [
      { id: "cms-dashboard", title: "Compliance Command Center", caption: "Live status across BRCGS, SQF, FSSC 22000, FSMA 204 and ESG with renewal countdowns.", image: cmsDashboard, route: "/dashboard", role: "Compliance Officer" },
      { id: "cms-regintel", title: "Regulatory Intelligence", caption: "Horizon scanning across 50+ jurisdictions with rule-to-product impact assessment.", image: cmsDashboard, route: "/dashboard", role: "Regulatory" },
      { id: "cms-evidence", title: "Evidence Package Builder", caption: "Auto-assembled audit packs with clause-by-clause mapping for BRCGS, SQF, and FSSC 22000.", image: cmsDashboard, route: "/dashboard", role: "Auditor" },
    ],
  },
];

export const edgeAppGroups: EdgeAppGroup[] = [
  {
    category: "MES Edge Apps", colorVar: "--mes-color",
    impact: [
      { icon: Clock, metric: "↓ 85%", label: "Data Entry Time", description: "Operators log downtime, scrap, and run status with 2-tap interactions instead of paper forms." },
      { icon: TrendingDown, metric: "↓ 45%", label: "Response Time", description: "Real-time alerts cut response to production issues from hours to minutes." },
    ],
    apps: [
      { icon: Tablet, title: "EA1: Operator Run Status", desc: "Real-time line status with one-tap downtime logging, scrap recording, and offline sync." },
      { icon: UserCheck, title: "EA2: Supervisor Dashboard", desc: "Multi-line overview with color-coded status, alerts, and one-tap operator communication." },
      { icon: Wrench, title: "EA3: Maintenance Queue", desc: "Prioritized work order queue with spare parts check, time logging, and PM checklists." },
      { icon: Package, title: "EA4: Warehouse Receiving", desc: "Inbound material receiving with barcode scanning, lot registration, and COA attachment." },
      { icon: Zap, title: "EA5: Energy Monitoring", desc: "Real-time energy dashboards with anomaly alerts and benchmark comparisons." },
    ],
    screens: ["EA1: Operator Run Status","EA2: Supervisor Dashboard","EA3: Maintenance Queue","EA4: Warehouse Receiving","EA5: Energy Monitoring"],
    previewScreens: [
      { id: "ea-operator", title: "EA1 · Operator Run Status", caption: "One-tap downtime, scrap and run-status logging — works offline and syncs when connected.", image: edgeApps, route: "/dashboard", role: "Operator" },
      { id: "ea-supervisor", title: "EA2 · Supervisor Dashboard", caption: "Multi-line overview with color-coded alerts and one-tap operator communication.", image: edgeApps, route: "/dashboard", role: "Supervisor" },
      { id: "ea-maint", title: "EA3 · Maintenance Queue", caption: "Prioritized work orders with spare-parts check, time logging and PM checklists.", image: edgeApps, route: "/dashboard", role: "Maintenance" },
    ],
  },
  {
    category: "QMS Edge Apps", colorVar: "--qms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 70%", label: "Paper-Based Errors", description: "Digital checklists with validation rules eliminate transcription errors." },
      { icon: Clock, metric: "↓ 50%", label: "Inspection Cycle Time", description: "Pre-loaded inspection plans with one-tap pass/fail reduce inspection time by half." },
    ],
    apps: [
      { icon: CheckSquare, title: "QA1: QA Technician", desc: "13-screen suite for GMP walkthroughs, CCP monitoring, EMP sampling, and batch release." },
      { icon: UserCheck, title: "QA2: QA Manager", desc: "8-screen suite: alert inbox, allergen sign-off, NCR management, and line clearance." },
      { icon: ThermometerSun, title: "QA3: Kiosk", desc: "Self-service stations: health declaration, PPE verification, and training library." },
      { icon: Search, title: "QA4: Auditor", desc: "Evidence pack browser, timed mock recall, facility map, and finding capture." },
    ],
    screens: ["QA1: GMP Inspection","QA1: CCP Monitoring","QA1: EMP Sampling","QA1: Label Verification","QA1: Batch Release","QA2: Alert Inbox","QA2: NCR Disposition","QA2: Line Release","QA3: Health Declaration","QA3: PPE Verification","QA4: Audit Evidence","QA4: Mock Recall","QA4: Facility Map"],
    previewScreens: [
      { id: "qa-tech", title: "QA1 · QA Technician", caption: "GMP walkthroughs, CCP monitoring, EMP sampling and batch release in one rugged tablet suite.", image: edgeApps, route: "/dashboard", role: "QA Technician" },
      { id: "qa-mgr", title: "QA2 · QA Manager", caption: "Alert inbox, allergen sign-off, NCR disposition and line clearance — manager-only actions.", image: edgeApps, route: "/dashboard", role: "QA Manager" },
      { id: "qa-auditor", title: "QA4 · Auditor Kiosk", caption: "Evidence pack browser, timed mock recall, facility map and finding capture for audits.", image: edgeApps, route: "/dashboard", role: "Auditor" },
    ],
  },
  {
    category: "CMS Edge Apps", colorVar: "--cms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 90%", label: "Missed Deadlines", description: "Automated alerts for renewals and document expiries eliminate compliance blind spots." },
      { icon: DollarSign, metric: "↓ 60%", label: "Recall Costs", description: "Rapid recall execution with pre-built notification templates minimize financial exposure." },
    ],
    apps: [
      { icon: FileText, title: "CA1: Regulatory Affairs", desc: "9 screens: compliance command, product lookup, label approvals, FSMA 204, and weekly briefs." },
      { icon: AlertCircle, title: "CA2: Recall War Room", desc: "7 screens: initiation, authority notifications, customer comms, cost tracking, and closeout." },
      { icon: Ship, title: "CA3: Export Documents", desc: "4 screens: shipment doc check, expiry tracking, import requirements, and sanctions screening." },
      { icon: Recycle, title: "CA4: Sustainability", desc: "5 screens: packaging data, carbon footprint, EPR status, permit readings, and EUDR data." },
    ],
    screens: ["CA1: Compliance Command","CA1: Product Lookup","CA1: Label Approval","CA1: FSMA 204","CA1: Certification Status","CA2: Recall Dashboard","CA2: Authority Notification","CA2: Customer Comms","CA2: Recall Costs","CA3: Shipment Doc Check","CA3: Document Expiry","CA3: Import Requirements","CA3: Sanctions Check","CA4: Packaging Data","CA4: Carbon Footprint","CA4: EPR Status","CA4: EUDR Data"],
    previewScreens: [
      { id: "ca-reg", title: "CA1 · Regulatory Affairs", caption: "Compliance command, label approvals, FSMA 204 readiness and weekly regulatory briefs.", image: edgeApps, route: "/dashboard", role: "Regulatory" },
      { id: "ca-recall", title: "CA2 · Recall War Room", caption: "Initiation, authority notifications, customer comms, cost tracking and recall closeout.", image: edgeApps, route: "/dashboard", role: "Recall Lead" },
      { id: "ca-sustain", title: "CA4 · Sustainability", caption: "Packaging data, carbon footprint, EPR status, permit readings and EUDR data capture.", image: edgeApps, route: "/dashboard", role: "ESG" },
    ],
  },
];

export { edgeApps };
