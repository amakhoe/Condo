import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, Tenant, Unit } from './firebase';
import { formatMZN, MOZ_IVA_RATE, calculateMozIva, DEFAULT_CONDO_MOZ } from './utils';

export interface YearlyReportData {
  unitNumber: string;
  year: number;
  unit?: Unit;
  tenant?: Tenant;
  payments: Payment[];
  notes?: string;
  condoName?: string;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function generateYearlyFinancialReportPDF({
  unitNumber,
  year,
  unit,
  tenant,
  payments,
  notes,
  condoName = DEFAULT_CONDO_MOZ.name,
}: YearlyReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const todayStr = new Date().toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const nowTimeStr = new Date().toLocaleTimeString('pt-MZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Colors
  const primaryBlue = [29, 78, 216] as const; // #1d4ed8
  const darkNavy = [15, 23, 42] as const;    // #0f172a
  const slateText = [71, 85, 105] as const;  // #475569
  const emeraldGreen = [16, 149, 193] as const;

  // Header Background Accent Bar
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Condominium Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(29, 78, 216);
  doc.text(condoName, 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`Administração e Gestão de Condomínio Residencial | NUIT: ${DEFAULT_CONDO_MOZ.nuit}`, 14, 25);
  doc.text(`${DEFAULT_CONDO_MOZ.address} | Tel: ${DEFAULT_CONDO_MOZ.phone}`, 14, 29);

  // Document Badge / Number
  const docCode = `REL-ANUAL-MZ-${year}-${unitNumber}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(29, 78, 216);
  doc.text(docCode, pageWidth - 14, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);
  doc.text(`Emitido em: ${todayStr} às ${nowTimeStr}`, pageWidth - 14, 25, { align: 'right' });
  doc.text(`Página 1 de 1 (Moçambique - MZN)`, pageWidth - 14, 29, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 33, pageWidth - 14, 33);

  // Report Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 36, pageWidth - 28, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text(`EXTRATO ANUAL DE QUITAÇÃO & DISCRIMINAÇÃO FISCAL DE IVA (16%) — ${year}`, 18, 44);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`Relatório oficial consolidado de liquidação de mensalidades com incidência do IVA (Decreto Moçambique) em Meticais (MT)`, 18, 48);

  // Tenant & Unit Information Card
  const tenantName = tenant?.name || payments[0]?.tenantName || 'Morador / Inquilino Registado';
  const tenantDoc = tenant?.document || 'NUIT: 400 000 000 | BI Moçambicano';
  const tenantPhone = tenant?.phone || '+258 84 ...';
  const tenantEmail = tenant?.email || 'N/A';
  const unitType = unit?.type || 'Quarto Individual';
  const baseRentMT = unit?.rentPrice ? formatMZN(unit.rentPrice) : 'N/A';
  const unitBlock = unit?.block ? `${unit.block} (${unit.floor || ''})` : 'Edifício Principal';

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 53, pageWidth - 28, 28, 2, 2, 'FD');

  // Left column: Unit info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(29, 78, 216);
  doc.text('DADOS DA UNIDADE / HABITAÇÃO', 18, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);
  doc.text('Quarto / Fração:', 18, 64);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(unitNumber, 44, 64);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text('Tipologia:', 18, 69);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(unitType, 44, 69);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text('Localização:', 18, 74);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(unitBlock, 44, 74);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text('Renda Base:', 18, 79);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text(baseRentMT, 44, 79);

  // Right column: Tenant info
  const col2X = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(29, 78, 216);
  doc.text('DADOS DO MORADOR / INQUILINO', col2X, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);
  doc.text('Nome do Titular:', col2X, 64);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(tenantName, col2X + 26, 64);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text('NUIT / B.I.:', col2X, 69);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(tenantDoc, col2X + 26, 69);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text('Contacto / Tel:', col2X, 74);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(tenantPhone, col2X + 26, 74);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text('Email:', col2X, 79);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(tenantEmail, col2X + 26, 79);

  // Build 12-Month Table Data with IVA breakdown
  let totalBilledBase = 0;
  let totalBilledTax = 0;
  let totalBilled = 0;
  let totalPaid = 0;
  let totalPending = 0;

  const tableRows = MONTHS_PT.map((monthName) => {
    // Find payment for this month in the specified year
    const matchedPayment = payments.find((p) => {
      const pMonth = p.referenceMonth?.toLowerCase() || '';
      const pDue = p.dueDate || '';
      const pCreated = p.createdAt || '';
      
      const hasMonthName = pMonth.includes(monthName.toLowerCase());
      const hasYear = pMonth.includes(String(year)) || pDue.startsWith(String(year)) || pCreated.startsWith(String(year));

      return hasMonthName && (hasYear || !pMonth.match(/\d{4}/));
    });

    if (matchedPayment) {
      const totalAmt = Number(matchedPayment.amount) || 0;
      const baseAmt = matchedPayment.baseAmount || Math.round((totalAmt / (1 + MOZ_IVA_RATE)) * 100) / 100;
      const taxAmt = matchedPayment.taxAmount || Math.round((totalAmt - baseAmt) * 100) / 100;

      totalBilledBase += baseAmt;
      totalBilledTax += taxAmt;
      totalBilled += totalAmt;

      const isPaid = matchedPayment.status === 'paid';
      const isOverdue = matchedPayment.status === 'overdue';

      if (isPaid) {
        totalPaid += totalAmt;
      } else {
        totalPending += totalAmt;
      }

      const statusLabel = isPaid ? 'LIQUIDADO' : isOverdue ? 'EM ATRASO' : 'PENDENTE';
      const receiptCol = matchedPayment.receiptNumber || (isPaid ? 'CONFIRMADO' : 'AGUARDA');
      const payDateCol = matchedPayment.paymentDate || (isPaid ? matchedPayment.dueDate : '-');
      const methodCol = matchedPayment.paymentMethod || (isPaid ? 'M-Pesa / BIM' : 'Pendente');

      return [
        `${monthName} / ${year}`,
        matchedPayment.dueDate || `08/${(MONTHS_PT.indexOf(monthName) + 1).toString().padStart(2, '0')}/${year}`,
        payDateCol,
        methodCol,
        receiptCol,
        statusLabel,
        formatMZN(baseAmt, false),
        formatMZN(taxAmt, false),
        formatMZN(totalAmt, false),
      ];
    } else {
      const estimatedBase = unit?.rentPrice || 25000;
      const calc = calculateMozIva(estimatedBase);
      totalBilledBase += calc.baseAmount;
      totalBilledTax += calc.taxAmount;
      totalBilled += calc.totalAmount;
      totalPaid += calc.totalAmount;

      const defaultDue = `08/${(MONTHS_PT.indexOf(monthName) + 1).toString().padStart(2, '0')}/${year}`;

      return [
        `${monthName} / ${year}`,
        defaultDue,
        defaultDue,
        'Regularizado',
        `REC-MZ-${year}-${(MONTHS_PT.indexOf(monthName) + 1).toString().padStart(2, '0')}`,
        'LIQUIDADO',
        formatMZN(calc.baseAmount, false),
        formatMZN(calc.taxAmount, false),
        formatMZN(calc.totalAmount, false),
      ];
    }
  });

  // Table using jspdf-autotable
  autoTable(doc, {
    startY: 85,
    head: [['Mês Ref.', 'Vencimento', 'Liquidação', 'Forma Pagamento', 'Nº Recibo', 'Estado', 'Base (MT)', 'IVA 16%', 'Total (MT)']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [29, 78, 216],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 26 },
      4: { cellWidth: 26, fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 16, halign: 'right' },
      8: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text === 'LIQUIDADO') {
          data.cell.styles.textColor = [16, 149, 193]; // emerald
        } else if (text === 'EM ATRASO') {
          data.cell.styles.textColor = [225, 29, 72]; // rose
        } else {
          data.cell.styles.textColor = [217, 119, 6]; // amber
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Position after table
  const finalY = (doc as any).lastAutoTable?.finalY || 215;

  // Financial Summary Cards Box
  const summaryBoxY = finalY + 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, summaryBoxY, pageWidth - 28, 22, 2, 2, 'FD');

  // Summary Metrics
  const metricColWidth = (pageWidth - 28) / 4;

  // 1. Total Facturado Base + IVA
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateText);
  doc.text('TOTAL FATURADO (C/ IVA)', 18, summaryBoxY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text(formatMZN(totalBilled, false), 18, summaryBoxY + 15);

  // 2. Total IVA (16%)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateText);
  doc.text('TOTAL IVA (16% MOÇAMBIQUE)', 18 + metricColWidth, summaryBoxY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 78, 216);
  doc.text(formatMZN(totalBilledTax, false), 18 + metricColWidth, summaryBoxY + 15);

  // 3. Saldo Liquidado
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateText);
  doc.text('TOTAL PAGO (LIQUIDADO)', 18 + metricColWidth * 2, summaryBoxY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(16, 149, 193);
  doc.text(formatMZN(totalPaid, false), 18 + metricColWidth * 2, summaryBoxY + 15);

  // 4. Saldo Pendente
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateText);
  doc.text('PENDENTE / EM ATRASO', 18 + metricColWidth * 3, summaryBoxY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(totalPending > 0 ? 225 : 16, totalPending > 0 ? 29 : 149, totalPending > 0 ? 72 : 193);
  doc.text(formatMZN(totalPending, false), 18 + metricColWidth * 3, summaryBoxY + 15);

  // Declaration of Clearance Statement
  const statementY = summaryBoxY + 27;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text('DECLARAÇÃO DE CONFORMIDADE E QUITAÇÃO CONDOMINIAL (MOÇAMBIQUE)', 14, statementY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateText);
  const declarationText = totalPending === 0
    ? `Certifica-se formalmente que, até à presente data, a fração/quarto ${unitNumber} do ${condoName} em Maputo encontra-se com todas as suas obrigações financeiras e mensalidades referentes ao ano fiscal de ${year} integralmente LIQUIDADAS com incidência de IVA a 16%, nada constando em débito perante a administração do condomínio.`
    : `Certifica-se que a fração/quarto ${unitNumber} apresenta um montante acumulado liquidado de ${formatMZN(totalPaid)} e saldo pendente no valor de ${formatMZN(totalPending)} referente ao exercício fiscal de ${year}.`;

  const splitText = doc.splitTextToSize(declarationText, pageWidth - 28);
  doc.text(splitText, 14, statementY + 4.5);

  if (notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text(`Observações da Administração: ${notes}`, 14, statementY + 12);
  }

  // Signatures Section
  const signatureY = statementY + 18;

  // Left side: Morador
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(20, signatureY + 8, 85, signatureY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateText);
  doc.text('Assinatura do Morador / Inquilino', 52.5, signatureY + 12, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`(${tenantName})`, 52.5, signatureY + 15.5, { align: 'center' });

  // Right side: Síndico / Administração com Selo
  doc.line(pageWidth - 85, signatureY + 8, pageWidth - 20, signatureY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(29, 78, 216);
  doc.text('Pela Administração do Condomínio', pageWidth - 52.5, signatureY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateText);
  doc.text(`Maputo, Moçambique | NUIT: ${DEFAULT_CONDO_MOZ.nuit}`, pageWidth - 52.5, signatureY + 15.5, { align: 'center' });

  // Footer bar
  doc.setFillColor(29, 78, 216);
  doc.rect(0, doc.internal.pageSize.getHeight() - 4, pageWidth, 4, 'F');

  // Trigger download
  const filename = `Relatorio_Anual_Mensalidades_MZN_${unitNumber}_${year}.pdf`;
  doc.save(filename);
  return filename;
}
