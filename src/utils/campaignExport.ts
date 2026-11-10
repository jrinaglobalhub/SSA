import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType
} from "docx";

export interface CampaignExportVolunteer {
  serialNumber: number;
  volunteerName: string;
  mobileNumber: string;
  referralCode: string;
  assignedDate?: string | null;
  assignedStartTime?: string | null;
  assignedEndTime?: string | null;
  ssmMerchants?: number;
  sscConsumers?: number;
  totalOnboarded?: number;
}

export interface CampaignExportData {
  name: string;
  description?: string | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  startTimestamp?: string;
  endTimestamp?: string;
  volunteerCount: number;
  totalMerchants?: number;
  totalConsumers?: number;
  totalOnboarded?: number;
  volunteers: CampaignExportVolunteer[];
}

/**
 * Trigger file download in Web / Electron
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Format timestamp or date + time in India Standard Time (IST)
 */
export function formatToIST(dateStr: string, timeStr: string): string {
  try {
    return `${dateStr} at ${timeStr} (IST)`;
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

/**
 * Generate and download professional PDF document
 */
export function exportCampaignToPDF(data: CampaignExportData): Blob {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header banner / Title
  doc.setFillColor(234, 88, 12); // #EA580C
  doc.rect(14, y, pageWidth - 28, 13, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("SMARTSHOPPER ADMIN – REFERRAL CAMPAIGN REPORT", 18, y + 8.5);

  y += 19;

  // Campaign Title
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text(data.name, 14, y);

  y += 5.5;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // #64748B
  doc.setFont("helvetica", "normal");
  if (data.description) {
    doc.text(data.description, 14, y);
    y += 5.5;
  }

  // Campaign Information Card
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.setFont("helvetica", "bold");
  doc.text("Start:", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(formatToIST(data.startDate, data.startTime), 29, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("End:", 18, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text(formatToIST(data.endDate, data.endTime), 29, y + 12);

  doc.setFont("helvetica", "bold");
  doc.text("Total Volunteers:", 118, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.volunteerCount), 148, y + 6);

  y += 21;

  // Overall Campaign Performance Summary Card
  const totalMerchants = data.totalMerchants !== undefined
    ? data.totalMerchants
    : data.volunteers.reduce((acc, v) => acc + (v.ssmMerchants || 0), 0);
  const totalConsumers = data.totalConsumers !== undefined
    ? data.totalConsumers
    : data.volunteers.reduce((acc, v) => acc + (v.sscConsumers || 0), 0);
  const overallTotal = data.totalOnboarded !== undefined
    ? data.totalOnboarded
    : (totalMerchants + totalConsumers);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Overall Campaign Performance", 14, y);

  y += 4;

  const cardWidth = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: "Volunteers", value: String(data.volunteerCount), color: [37, 99, 235] },
    { label: "SSM Merchants", value: String(totalMerchants), color: [16, 185, 129] },
    { label: "SSC Consumers", value: String(totalConsumers), color: [234, 88, 12] },
    { label: "Total Onboarded", value: String(overallTotal), color: [5, 150, 105] }
  ];

  metrics.forEach((m, i) => {
    const x = 14 + i * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, 14, 1.5, 1.5, "FD");

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(m.label, x + 3, y + 5);

    doc.setFontSize(11);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.setFont("helvetica", "bold");
    doc.text(m.value, x + 3, y + 11);
  });

  y += 19;

  // Volunteer-wise Performance Report
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Volunteer-wise Performance Report (${data.volunteers.length})`, 14, y);

  y += 4;

  // 7 Columns matching exact width of 182 mm
  // S.No (12), Name (40), Mobile (30), Code (32), SSM (22), SSC (22), Total (24)
  const colX = [14, 26, 66, 96, 128, 150, 172];
  const colWidths = [12, 40, 30, 32, 22, 22, 24];
  const rowHeight = 7.5;

  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, pageWidth - 28, 7, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);

    doc.text("S.No", colX[0] + 2, currentY + 4.8);
    doc.text("Volunteer Name", colX[1] + 2, currentY + 4.8);
    doc.text("Mobile Number", colX[2] + 2, currentY + 4.8);
    doc.text("Referral Code", colX[3] + 2, currentY + 4.8);
    doc.text("SSM (Merchants)", colX[4] + 2, currentY + 4.8);
    doc.text("SSC (Consumers)", colX[5] + 2, currentY + 4.8);
    doc.text("Total Onboarded", colX[6] + 2, currentY + 4.8);
  };

  renderTableHeader(y);
  y += 7;

  // Render rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  data.volunteers.forEach((vol, idx) => {
    if (y > 272) {
      doc.addPage();
      y = 14;
      renderTableHeader(y);
      y += 7;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, rowHeight, "F");
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + rowHeight, pageWidth - 14, y + rowHeight);

    doc.setTextColor(30, 41, 59);
    doc.text(String(vol.serialNumber || idx + 1), colX[0] + 2, y + 5);
    doc.text(vol.volunteerName || "—", colX[1] + 2, y + 5);
    doc.text(vol.mobileNumber || "—", colX[2] + 2, y + 5);

    // Bold Referral Code
    doc.setFont("helvetica", "bold");
    doc.setTextColor(234, 88, 12);
    doc.text(vol.referralCode || "—", colX[3] + 2, y + 5);

    // SSM
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 185, 129);
    doc.text(String(vol.ssmMerchants || 0), colX[4] + 2, y + 5);

    // SSC
    doc.setTextColor(234, 88, 12);
    doc.text(String(vol.sscConsumers || 0), colX[5] + 2, y + 5);

    // Total
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(String(vol.totalOnboarded || ((vol.ssmMerchants || 0) + (vol.sscConsumers || 0))), colX[6] + 2, y + 5);

    doc.setFont("helvetica", "normal");
    y += rowHeight;
  });

  // Table summary footer row
  if (y > 270) {
    doc.addPage();
    y = 14;
  }
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7.5, "F");
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, pageWidth - 14, y);
  doc.line(14, y + 7.5, pageWidth - 14, y + 7.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTALS", colX[1] + 2, y + 5.2);
  doc.setTextColor(16, 185, 129);
  doc.text(String(totalMerchants), colX[4] + 2, y + 5.2);
  doc.setTextColor(234, 88, 12);
  doc.text(String(totalConsumers), colX[5] + 2, y + 5.2);
  doc.setTextColor(5, 150, 105);
  doc.text(String(overallTotal), colX[6] + 2, y + 5.2);

  y += 12;
  if (y < 285) {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by SmartShopper Admin (SSA) • Verified Production Referral Attribution Report", 14, y);
  }

  const blob = doc.output("blob");
  return blob;
}

/**
 * Generate and download professional DOCX document
 */
export async function exportCampaignToDOCX(data: CampaignExportData): Promise<Blob> {
  const totalMerchants = data.totalMerchants !== undefined
    ? data.totalMerchants
    : data.volunteers.reduce((acc, v) => acc + (v.ssmMerchants || 0), 0);
  const totalConsumers = data.totalConsumers !== undefined
    ? data.totalConsumers
    : data.volunteers.reduce((acc, v) => acc + (v.sscConsumers || 0), 0);
  const overallTotal = data.totalOnboarded !== undefined
    ? data.totalOnboarded
    : (totalMerchants + totalConsumers);

  const tableRows: TableRow[] = [
    // Header Row
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 800, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "S.No", style: "TableHeader" })]
        }),
        new TableCell({
          width: { size: 2600, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Volunteer Name", style: "TableHeader" })]
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Mobile Number", style: "TableHeader" })]
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Referral Code", style: "TableHeader" })]
        }),
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "SSM Merchants", style: "TableHeader" })]
        }),
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "SSC Consumers", style: "TableHeader" })]
        }),
        new TableCell({
          width: { size: 1600, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Total Onboarded", style: "TableHeader" })]
        })
      ]
    })
  ];

  data.volunteers.forEach((vol, idx) => {
    const ssm = vol.ssmMerchants || 0;
    const ssc = vol.sscConsumers || 0;
    const tot = vol.totalOnboarded !== undefined ? vol.totalOnboarded : (ssm + ssc);

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 800, type: WidthType.DXA },
            children: [new Paragraph({ text: String(vol.serialNumber || idx + 1) })]
          }),
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            children: [new Paragraph({ text: vol.volunteerName || "—" })]
          }),
          new TableCell({
            width: { size: 2000, type: WidthType.DXA },
            children: [new Paragraph({ text: vol.mobileNumber || "—" })]
          }),
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: vol.referralCode || "—",
                    bold: true,
                    color: "EA580C"
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 1400, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(ssm), color: "10B981" })]
              })
            ]
          }),
          new TableCell({
            width: { size: 1400, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(ssc), color: "EA580C" })]
              })
            ]
          }),
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(tot),
                    bold: true,
                    color: "059669"
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  });

  // Summary Row
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 800, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "" })]
        }),
        new TableCell({
          width: { size: 2600, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "TOTALS", bold: true })] })]
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "" })]
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "" })]
        }),
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: String(totalMerchants), bold: true, color: "10B981" })] })]
        }),
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: String(totalConsumers), bold: true, color: "EA580C" })] })]
        }),
        new TableCell({
          width: { size: 1600, type: WidthType.DXA },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: String(overallTotal), bold: true, color: "059669" })] })]
        })
      ]
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "SMARTSHOPPER ADMIN",
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: " – REFERRAL CAMPAIGN PERFORMANCE REPORT",
                color: "EA580C",
                bold: true
              })
            ]
          }),
          new Paragraph({
            text: data.name,
            heading: HeadingLevel.TITLE
          }),
          new Paragraph({
            text: data.description || "Referral Campaign Details & Live Volunteer Performance",
            style: "Subtitle"
          }),
          new Paragraph({ text: "" }), // Spacing

          // Campaign Info block
          new Paragraph({
            children: [
              new TextRun({ text: "Campaign Start: ", bold: true }),
              new TextRun({ text: formatToIST(data.startDate, data.startTime) })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Campaign End: ", bold: true }),
              new TextRun({ text: formatToIST(data.endDate, data.endTime) })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Total Volunteers: ", bold: true }),
              new TextRun({ text: String(data.volunteerCount) })
            ]
          }),
          new Paragraph({ text: "" }), // Spacing

          // Overall Campaign Performance
          new Paragraph({
            text: "Overall Campaign Performance",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Total Volunteers: ", bold: true }),
              new TextRun({ text: String(data.volunteerCount) })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Total Merchants Onboarded (SSM): ", bold: true, color: "10B981" }),
              new TextRun({ text: String(totalMerchants), bold: true })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Total Consumers Onboarded (SSC): ", bold: true, color: "EA580C" }),
              new TextRun({ text: String(totalConsumers), bold: true })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Overall Total Onboarded: ", bold: true, color: "059669" }),
              new TextRun({ text: String(overallTotal), bold: true })
            ]
          }),
          new Paragraph({ text: "" }),

          new Paragraph({
            text: "Volunteer-wise Performance Report",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({ text: "" }),

          new Table({
            rows: tableRows,
            width: { size: 12000, type: WidthType.DXA }
          }),

          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Generated by SmartShopper Admin (SSA) • Verified Production Referral Attribution Report",
                italics: true,
                color: "94A3B8"
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
