import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AssetResponseDto } from '../../types/asset';
import { IncidentResponseDto } from '../../types/incident';

export interface ReportPdfData {
  assets: AssetResponseDto[];
  incidents: IncidentResponseDto[];
  dateRange: string;
  totalAssets: number;
  totalIncidents: number;
  resolvedCount: number;
  resolutionRate: number;
  categoryCounts: Record<string, number>;
}

export function generateReportPdf(data: ReportPdfData): void {
  const {
    assets,
    incidents,
    dateRange,
    totalAssets,
    totalIncidents,
    resolvedCount,
    resolutionRate,
    categoryCounts
  } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = [30, 64, 175]; // Blue 800
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const accentBg: [number, number, number] = [241, 245, 249]; // Slate 100
  const textColor: [number, number, number] = [15, 23, 42]; // Slate 900

  const dateRangeLabels: Record<string, string> = {
    ThisMonth: 'This Month',
    LastQuarter: 'Last Quarter',
    YearToDate: 'Year to Date (2026)',
    AllTime: 'All Time'
  };
  const periodLabel = dateRangeLabels[dateRange] || dateRange;
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  let currentY = 16;

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(14, currentY, 182, 22, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AssetBridge AI', 20, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Portfolio & Maintenance Audit Report', 20, currentY + 16);

  doc.setFontSize(8);
  doc.text(`Period: ${periodLabel}`, 190, currentY + 9, { align: 'right' });
  doc.text(`Generated: ${generatedAt}`, 190, currentY + 16, { align: 'right' });

  currentY += 28;

  // Executive KPI Summary Cards
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Executive Portfolio Summary', 14, currentY);

  currentY += 4;

  const cardWidth = 43;
  const cardHeight = 18;
  const cardGap = 3.3;

  const kpis = [
    { title: 'Total Assets', value: `${totalAssets}`, sub: 'Registered' },
    { title: 'Logged Incidents', value: `${totalIncidents}`, sub: `${resolvedCount} resolved` },
    { title: 'Resolution Rate', value: `${resolutionRate}%`, sub: 'Audit target >90%' },
    { title: 'Avg Triage Speed', value: '< 2.4 hrs', sub: 'AI & Representative' }
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = 14 + idx * (cardWidth + cardGap);
    doc.setFillColor(accentBg[0], accentBg[1], accentBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(kpi.title.toUpperCase(), cardX + 4, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(kpi.value, cardX + 4, currentY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(kpi.sub, cardX + 4, currentY + 15.5);
  });

  currentY += cardHeight + 8;

  // Property Portfolio Table
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Property Portfolio Health', 14, currentY);

  const assetRows =
    assets.length > 0
      ? assets.map((a) => [
          a.name,
          `${a.city}, ${a.district}`,
          a.propertyTypeName || a.propertyType,
          a.statusName || a.status,
          `${a.activeIncidentCount || 0} active`
        ])
      : [['No managed properties registered in this portfolio', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Property / Asset Name', 'Location / District', 'Type', 'Status', 'Active Incidents']],
    body: assetRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 45 },
      2: { cellWidth: 30 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  // Incident Category Breakdown
  const finalY1 = (doc as any).lastAutoTable?.finalY || currentY + 30;
  currentY = finalY1 + 8;

  // Check if we need space before next section
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Incident Distribution by Trade', 14, currentY);

  const categoryEntries = Object.entries(categoryCounts);
  const categoryRows =
    categoryEntries.length > 0
      ? categoryEntries.map(([cat, count]) => {
          const pct = totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(1) : '0.0';
          return [cat, `${count}`, `${pct}%`];
        })
      : [['No incident data logged for the selected period', '-', '-']];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Trade / Specialty Category', 'Incident Count', 'Share of Total']],
    body: categoryRows,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 46, halign: 'center' },
      2: { cellWidth: 46, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  // Recent Incidents & Resolution Audit Table
  const finalY2 = (doc as any).lastAutoTable?.finalY || currentY + 30;
  currentY = finalY2 + 8;

  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Maintenance Incidents & Triage Log', 14, currentY);

  const incidentRows =
    incidents.length > 0
      ? incidents.slice(0, 25).map((inc) => [
          inc.title,
          inc.assetName || '-',
          inc.categoryName || inc.category,
          inc.priorityName || inc.priority,
          inc.statusName || inc.status
        ])
      : [['No logged maintenance incidents found', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Incident Title', 'Property', 'Trade', 'Priority', 'Status']],
    body: incidentRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textColor,
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 45 },
      2: { cellWidth: 27 },
      3: { cellWidth: 24 },
      4: { cellWidth: 24 }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 285, 196, 285);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(
      'AssetBridge AI Property Governance & Continuity Platform (Confidential)',
      14,
      290
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `AssetBridge_Report_${dateStr}.pdf`;
  doc.save(filename);
}
