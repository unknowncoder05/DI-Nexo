import { Injectable } from "@angular/core";
import { Client, Project } from "./models";
/** Descarga informes; neutraliza fórmulas al abrir CSV en hojas de cálculo. */
@Injectable({ providedIn: "root" })
export class ExportService {
  private rows(projects: Project[], clients: Client[]): (string | number)[][] {
    return projects.map((p) => [
      p.name,
      clients.find((c) => c.id === p.clientId)?.name ?? "Sin cliente",
      p.status,
      p.budget.toFixed(2),
      p.dueDate,
      `${p.progress}%`,
    ]);
  }
  csv(projects: Project[], clients: Client[]): void {
    const rows = [
      [
        "Proyecto",
        "Cliente",
        "Estado",
        "Presupuesto EUR",
        "Fecha límite",
        "Progreso",
      ],
      ...this.rows(projects, clients),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value);
            if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(";"),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexo-proyectos.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async pdf(projects: Project[], clients: Client[]): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(22);
    doc.setTextColor(23, 45, 41);
    doc.text("NEXO / Informe de proyectos", 14, 22);
    doc.setFontSize(10);
    doc.text(
      `Datos sinteticos · ${new Date().toLocaleDateString("es-ES")} · ${projects.length} proyectos`,
      14,
      32,
    );
    autoTable(doc, {
      startY: 40,
      head: [
        [
          "Proyecto",
          "Cliente",
          "Estado",
          "Presupuesto EUR",
          "Fecha limite",
          "Progreso",
        ],
      ],
      body: this.rows(projects, clients),
      headStyles: { fillColor: [23, 45, 41] },
      styles: { fontSize: 10, cellPadding: 4 },
      didDrawPage: () => {
        doc.setFontSize(9);
        doc.text(`Nexo · Pagina ${doc.getNumberOfPages()}`, 14, 200);
      },
    });
    doc.save("nexo-proyectos.pdf");
  }
}
