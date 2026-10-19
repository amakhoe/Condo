import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MaintenanceReport } from './firebase';

export interface PdfExportFilters {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
  status: string;
  urgency: string;
  category: string;
  unitNumber?: string;
}

export function generateMaintenancePdf(
  reports: MaintenanceReport[],
  filters: PdfExportFilters,
  condoName: string = 'CondoGest - Baía de Maputo'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const todayFormatted = new Date().toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header Background Banner
  doc.setFillColor(30, 64, 175); // Royal Blue #1e40af
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(condoName.toUpperCase(), 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO OFICIAL DE MANUTENÇÃO E HISTÓRICO DE REPAROS', 14, 19);

  doc.setFontSize(8);
  doc.text(`Emissão: ${todayFormatted} | Administração do Condomínio`, 14, 25);

  // Filter & Period Summary Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 35, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PARÂMETROS DE EXPORTAÇÃO:', 18, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Período: ${filters.periodLabel}`, 18, 47);
  doc.text(`Filtro de Estado: ${filters.status === 'all' ? 'Todos os estados' : filters.status}`, 18, 52);

  doc.text(`Filtro de Urgência: ${filters.urgency === 'all' ? 'Todas' : filters.urgency}`, 110, 47);
  doc.text(`Unidade / Quarto: ${filters.unitNumber ? filters.unitNumber : 'Todas as unidades'}`, 110, 52);

  // Executive KPI summary boxes
  const totalCount = reports.length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const emergencyCount = reports.filter((r) => r.urgency === 'emergency').length;
  const inProgressCount = reports.filter((r) => r.status === 'scheduled' || r.status === 'reviewing').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  const kpiY = 64;
  const boxWidth = (pageWidth - 28 - 9) / 4;

  // Box 1: Total
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, kpiY, boxWidth, 15, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(totalCount), 18, kpiY + 7);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total Reparos', 18, kpiY + 12);

  // Box 2: Resolvidos
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14 + boxWidth + 3, kpiY, boxWidth, 15, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text(`${resolvedCount} (${resolutionRate}%)`, 14 + boxWidth + 7, kpiY + 7);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105);
  doc.text('Resolvidos', 14 + boxWidth + 7, kpiY + 12);

  // Box 3: Em Reparo
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(14 + (boxWidth + 3) * 2, kpiY, boxWidth, 15, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text(String(inProgressCount), 14 + (boxWidth + 3) * 2 + 4, kpiY + 7);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 83, 9);
  doc.text('Em Atendimento', 14 + (boxWidth + 3) * 2 + 4, kpiY + 12);

  // Box 4: Emergências
  doc.setFillColor(255, 241, 242);
  doc.roundedRect(14 + (boxWidth + 3) * 3, kpiY, boxWidth, 15, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57);
  doc.text(String(emergencyCount), 14 + (boxWidth + 3) * 3 + 4, kpiY + 7);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(225, 29, 72);
  doc.text('Críticos / Emergência', 14 + (boxWidth + 3) * 3 + 4, kpiY + 12);

  // Table Data
  const tableRows = reports.map((r) => {
    const createdDate = new Date(r.createdAt).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const statusLabel =
      r.status === 'resolved'
        ? 'RESOLVIDO'
        : r.status === 'scheduled'
        ? 'AGENDADO'
        : r.status === 'reviewing'
        ? 'EM ANÁLISE'
        : 'ABERTO';

    const urgencyLabel =
      r.urgency === 'emergency'
        ? 'EMERGÊNCIA'
        : r.urgency === 'high'
        ? 'ALTA'
        : r.urgency === 'medium'
        ? 'MÉDIA'
        : 'BAIXA';

    return [
      createdDate,
      r.unitNumber,
      r.tenantName || 'Inquilino',
      r.category,
      urgencyLabel,
      r.description,
      statusLabel,
      r.adminNotes || (r.resolvedAt ? `Resolvido em ${new Date(r.resolvedAt).toLocaleDateString('pt-PT')}` : '-'),
    ];
  });

  autoTable(doc, {
    startY: 84,
    head: [['Data', 'Unidade', 'Inquilino', 'Categoria', 'Urgência', 'Descrição do Defeito', 'Estado', 'Notas / Resolução']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' }, // Data
      1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }, // Unidade
      2: { cellWidth: 22 }, // Inquilino
      3: { cellWidth: 28 }, // Categoria
      4: { cellWidth: 18, halign: 'center' }, // Urgência
      5: { cellWidth: 'auto' }, // Descrição
      6: { cellWidth: 18, halign: 'center' }, // Estado
      7: { cellWidth: 32 }, // Notas
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Highlight Urgencies and Statuses
      if (data.section === 'body') {
        if (data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'EMERGÊNCIA') {
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ALTA') {
            data.cell.styles.textColor = [194, 65, 12];
          }
        }
        if (data.column.index === 6) {
          const val = String(data.cell.raw);
          if (val === 'RESOLVIDO') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ABERTO') {
            data.cell.styles.textColor = [225, 29, 72];
          } else if (val === 'AGENDADO') {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Página ${data.pageNumber} | CondoGest Gestão de Condomínio Residencial`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    },
    margin: { top: 30, right: 14, bottom: 15, left: 14 },
  });

  const filenameDate = new Date().toISOString().split('T')[0];
  const filename = `relatorio-manutencao-${filenameDate}.pdf`;
  doc.save(filename);
}
