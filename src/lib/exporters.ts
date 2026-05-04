import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface PdfOptions {
  title: string;
  subtitle?: string;
  filename: string;
  headers: string[];
  rows: RowInput[];
  meta?: Record<string, string>;
}

export const exportToPDF = ({ title, subtitle, filename, headers, rows, meta }: PdfOptions) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Header band
  doc.setFillColor(79, 70, 229); // primary indigo
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CoreERP", 32, 28);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 32, 46);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() - 32, 46, { align: "right" });

  let y = 80;
  doc.setTextColor(15, 23, 42);
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.text(subtitle, 32, y);
    y += 16;
  }

  if (meta) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    Object.entries(meta).forEach(([k, v]) => {
      doc.setTextColor(100, 116, 139);
      doc.text(`${k}:`, 32, y);
      doc.setTextColor(15, 23, 42);
      doc.text(String(v), 110, y);
      y += 14;
    });
    y += 4;
  }

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [243, 244, 246], textColor: [15, 23, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { left: 32, right: 32 },
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 16,
      { align: "center" },
    );
  }

  doc.save(filename);
};
