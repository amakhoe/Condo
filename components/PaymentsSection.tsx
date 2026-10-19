'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Receipt, 
  FileText, 
  Home, 
  User, 
  Calendar, 
  Edit3, 
  Trash2, 
  XCircle, 
  Check, 
  Send, 
  Printer, 
  Sparkles, 
  Download,
  FileDown,
  Percent,
  Smartphone,
  Building
} from 'lucide-react';
import { Payment, Tenant, Unit, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { NotificationService } from '../lib/notifications';
import { generateYearlyFinancialReportPDF } from '../lib/reportPdf';
import { 
  formatMZN, 
  MOZ_IVA_RATE, 
  calculateMozIva, 
  MOZ_PAYMENT_METHODS, 
  DEFAULT_CONDO_MOZ 
} from '../lib/utils';

interface PaymentsSectionProps {
  payments: Payment[];
  tenants: Tenant[];
  units: Unit[];
}

function generateDocNumber(prefix: string): string {
  const code = Date.now().toString().slice(-4);
  return `${prefix}-MZ-${new Date().getFullYear()}-${code}`;
}

const MONTHS_LIST = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function PaymentsSection({ payments, tenants, units }: PaymentsSectionProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Yearly Financial Report Modal State
  const [isYearlyReportModalOpen, setIsYearlyReportModalOpen] = useState(false);
  const [selectedReportUnit, setSelectedReportUnit] = useState<string>('');
  const [selectedReportYear, setSelectedReportYear] = useState<number>(2026);
  const [reportCustomNotes, setReportCustomNotes] = useState<string>(
    'Extrato anual emitido para efeitos fiscais e comprovação de quitação contratual em Moçambique.'
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Form State with Mozambican IVA (16%)
  const [tenantName, setTenantName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [baseAmount, setBaseAmount] = useState<number>(25000);
  const [applyIva, setApplyIva] = useState<boolean>(true);
  const [referenceMonth, setReferenceMonth] = useState('Outubro 2026');
  const [dueDate, setDueDate] = useState('2026-10-08');
  const [paymentDate, setPaymentDate] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'overdue'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<string>(MOZ_PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');

  // Live IVA calculations for the modal
  const liveIva = applyIva ? calculateMozIva(baseAmount, MOZ_IVA_RATE) : {
    baseAmount,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: baseAmount,
  };

  // KPI Calculations in Meticais (MT)
  const totalAmountPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const overduePayments = payments.filter((p) => p.status === 'overdue');
  const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Total IVA Arrecadado (Calculado ou Registado)
  const totalIvaPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => {
      if (p.taxAmount !== undefined) return sum + p.taxAmount;
      const calc = calculateMozIva(p.amount / (1 + MOZ_IVA_RATE));
      return sum + calc.taxAmount;
    }, 0);

  const totalCalculated = totalAmountPaid + totalPendingAmount + totalOverdueAmount;
  const paymentRate = totalCalculated > 0 ? Math.round((totalAmountPaid / totalCalculated) * 100) : 0;

  // Unique reference months for filtering
  const months = Array.from(new Set(payments.map((p) => p.referenceMonth).filter(Boolean)));

  // Filtered List
  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesMonth = monthFilter === 'all' || p.referenceMonth === monthFilter;
    const matchesSearch =
      p.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.receiptNumber && p.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.referenceMonth && p.referenceMonth.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.paymentMethod && p.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesMonth && matchesSearch;
  });

  // Yearly Report Calculations for Selected Unit & Year
  const activeReportUnit = selectedReportUnit || units[0]?.unitNumber || 'Q-101';
  const reportUnitObj = units.find((u) => u.unitNumber === activeReportUnit);
  const reportTenantObj =
    tenants.find((t) => t.unitNumber === activeReportUnit) ||
    tenants.find((t) => t.id === reportUnitObj?.currentTenantId);

  const unitPaymentsForYear = payments.filter((p) => {
    if (p.unitNumber !== activeReportUnit) return false;
    const hasYear =
      p.referenceMonth?.includes(String(selectedReportYear)) ||
      p.dueDate?.startsWith(String(selectedReportYear)) ||
      p.createdAt?.startsWith(String(selectedReportYear));
    return hasYear || !p.referenceMonth?.match(/\d{4}/);
  });

  const calcReportSummary = (() => {
    const rentPrice = reportUnitObj?.rentPrice || 25000;
    const defaultTotal = rentPrice * (1 + MOZ_IVA_RATE);
    let billed = 0;
    let paid = 0;
    let pending = 0;

    MONTHS_LIST.forEach((m) => {
      const match = unitPaymentsForYear.find((p) =>
        p.referenceMonth?.toLowerCase().includes(m.toLowerCase())
      );
      if (match) {
        const amt = match.amount || defaultTotal;
        billed += amt;
        if (match.status === 'paid') paid += amt;
        else pending += amt;
      } else {
        billed += defaultTotal;
        paid += defaultTotal;
      }
    });

    const rate = billed > 0 ? Math.round((paid / billed) * 100) : 100;
    return { totalBilled: billed, totalPaid: paid, totalPending: pending, rate };
  })();

  const handleOpenNewPaymentModal = () => {
    const defaultTenant = tenants[0];
    if (defaultTenant) {
      setTenantName(defaultTenant.name);
      setUnitNumber(defaultTenant.unitNumber);
      const unit = units.find((u) => u.unitNumber === defaultTenant.unitNumber);
      setBaseAmount(unit?.rentPrice || 25000);
    } else {
      setTenantName('');
      setUnitNumber(units[0]?.unitNumber || 'Q-101');
      setBaseAmount(units[0]?.rentPrice || 25000);
    }
    setApplyIva(true);
    setReferenceMonth('Outubro 2026');
    setDueDate('2026-10-08');
    setPaymentDate('');
    setStatus('pending');
    setPaymentMethod(MOZ_PAYMENT_METHODS[0]); // M-Pesa
    setNotes('');
    setIsModalOpen(true);
  };

  const handleTenantSelectChange = (selectedName: string) => {
    setTenantName(selectedName);
    const tenant = tenants.find((t) => t.name === selectedName);
    if (tenant) {
      setUnitNumber(tenant.unitNumber);
      const unit = units.find((u) => u.unitNumber === tenant.unitNumber);
      if (unit && unit.rentPrice) {
        setBaseAmount(unit.rentPrice);
      }
    }
  };

  const handleOpenYearlyReportModal = (unitNum?: string) => {
    setSelectedReportUnit(unitNum || units[0]?.unitNumber || 'Q-101');
    setSelectedReportYear(2026);
    setIsYearlyReportModalOpen(true);
  };

  const handleDownloadYearlyReport = (unitNum?: string, yearNum?: number) => {
    const targetUnit = unitNum || selectedReportUnit || units[0]?.unitNumber || 'Q-101';
    const targetYear = yearNum || selectedReportYear || 2026;

    setIsDownloadingPdf(true);
    try {
      const unitObj = units.find((u) => u.unitNumber === targetUnit);
      const tenantObj =
        tenants.find((t) => t.unitNumber === targetUnit) ||
        tenants.find((t) => t.id === unitObj?.currentTenantId);

      const filename = generateYearlyFinancialReportPDF({
        unitNumber: targetUnit,
        year: targetYear,
        unit: unitObj,
        tenant: tenantObj,
        payments: payments.filter((p) => p.unitNumber === targetUnit),
        notes: reportCustomNotes,
      });

      NotificationService.sendPush(`Relatório Anual PDF (MZN) Descarregado!`, {
        body: `O ficheiro ${filename} foi gerado com sucesso com IVA a 16% para o quarto ${targetUnit}.`,
        soundType: 'success',
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !unitNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const receiptNum = status === 'paid' 
        ? generateDocNumber('REC')
        : generateDocNumber('FAT');

      const calc = applyIva ? calculateMozIva(baseAmount, MOZ_IVA_RATE) : {
        baseAmount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: baseAmount,
      };

      const payload: Omit<Payment, 'id'> = {
        tenantName: tenantName.trim(),
        unitNumber: unitNumber.trim(),
        baseAmount: calc.baseAmount,
        taxRate: calc.taxRate,
        taxAmount: calc.taxAmount,
        amount: calc.totalAmount,
        currency: 'MT',
        referenceMonth: referenceMonth.trim(),
        dueDate,
        paymentDate: status === 'paid' ? (paymentDate || new Date().toISOString().split('T')[0]) : '',
        status,
        paymentMethod: status === 'paid' ? paymentMethod : '',
        receiptNumber: receiptNum,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'payments'), payload);

      NotificationService.sendPush(`Mensalidade Lançada: ${unitNumber}`, {
        body: `Mensalidade de ${formatMZN(calc.totalAmount)} (IVA 16% inc.) para ${tenantName} referente a ${referenceMonth}.`,
        soundType: status === 'paid' ? 'success' : 'normal',
      });

      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'payments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    if (!payment.id) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const recNum = payment.receiptNumber?.startsWith('REC-') 
        ? payment.receiptNumber 
        : generateDocNumber('REC');

      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'paid',
        paymentDate: todayStr,
        paymentMethod: payment.paymentMethod || 'M-Pesa (Vodacom)',
        receiptNumber: recNum,
      });

      NotificationService.sendPush(`Pagamento Confirmado: ${payment.unitNumber}`, {
        body: `Recebidos ${formatMZN(payment.amount)} de ${payment.tenantName} referente a ${payment.referenceMonth}.`,
        soundType: 'success',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${payment.id}`);
    }
  };

  const handleSendReminder = (payment: Payment) => {
    NotificationService.sendPush(`Lembrete de Pagamento: ${payment.unitNumber}`, {
      body: `Estimado(a) ${payment.tenantName}, a mensalidade de ${payment.referenceMonth} no valor de ${formatMZN(payment.amount)} (IVA inc.) vence em ${payment.dueDate}. Pagável via M-Pesa ou BIM.`,
      soundType: payment.status === 'overdue' ? 'urgent' : 'normal',
    });
    alert(`Lembrete de pagamento transmitido com sucesso para ${payment.tenantName} (${payment.unitNumber}) no valor de ${formatMZN(payment.amount)}!`);
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Deseja eliminar este registo de mensalidade?')) return;
    try {
      await deleteDoc(doc(db, 'payments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `payments/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Pagamentos de Mensalidades & Rendas
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Metical (MT) • IVA 16%
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Gestão financeira dos moradores em Meticais (MT), aplicação do IVA (16% Moçambique), pagamentos via M-Pesa, e-Mola e bancos moçambicanos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenYearlyReportModal()}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-2xl shadow-xs transition-all text-xs sm:text-sm hover:border-blue-400 group"
          >
            <FileDown className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span>Relatório Anual PDF</span>
          </button>

          <button
            onClick={handleOpenNewPaymentModal}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-sm shadow-blue-600/30 transition-all text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Mensalidade / Quota</span>
          </button>
        </div>
      </div>

      {/* Mozambique Fiscal Summary Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-white/10 text-amber-300 border border-white/10">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">Regime Fiscal Moçambicano</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">Taxa Normal: 16%</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Todas as quotas e rendas aplicam o Imposto sobre o Valor Acrescentado (IVA 16%) com emissão de recibos e faturas em Meticais (MT).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 shrink-0 text-xs">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Suporte a <strong>M-Pesa</strong>, <strong>e-Mola</strong>, <strong>mKesh</strong> & <strong>BIM/BCI</strong></span>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Recebido */}
        <div 
          onClick={() => setStatusFilter('paid')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'paid'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Recebido (MT)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{formatMZN(totalAmountPaid)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {payments.filter((p) => p.status === 'paid').length} mensalidades quitadas
          </p>
        </div>

        {/* Pendentes */}
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'pending'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">A Receber / Pendente</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{formatMZN(totalPendingAmount)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {pendingPayments.length} recibos a vencer
          </p>
        </div>

        {/* Em Atraso */}
        <div 
          onClick={() => setStatusFilter('overdue')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'overdue'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Em Atraso</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{formatMZN(totalOverdueAmount)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {overduePayments.length} mensalidades vencidas
          </p>
        </div>

        {/* IVA Recolhido */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">IVA 16% Arrecadado</span>
            <Receipt className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{formatMZN(totalIvaPaid)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Adimplência: <strong className="text-blue-700">{paymentRate}%</strong>
          </p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
              statusFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({payments.length})
          </button>
          
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1 ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pagos ({payments.filter((p) => p.status === 'paid').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1 ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pendentes ({pendingPayments.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1 ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Em Atraso ({overduePayments.length})</span>
          </button>
        </div>

        {/* Reference Month & Search */}
        <div className="flex items-center space-x-2 text-xs">
          {months.length > 0 && (
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="all">Todos os Meses</option>
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por inquilino, quarto, M-Pesa ou recibo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

      </div>

      {/* Payments List / Table */}
      {filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum pagamento em Meticais encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não há registos de mensalidades correspondentes aos filtros selecionados.
          </p>
          <button
            onClick={handleOpenNewPaymentModal}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lançar Mensalidade</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPayments.map((p) => {
            const isPaid = p.status === 'paid';
            const isPending = p.status === 'pending';
            const isOverdue = p.status === 'overdue';

            const baseVal = p.baseAmount || Math.round((p.amount / (1 + MOZ_IVA_RATE)) * 100) / 100;
            const ivaVal = p.taxAmount || Math.round((p.amount - baseVal) * 100) / 100;

            return (
              <div
                key={p.id || `${p.tenantName}-${p.referenceMonth}`}
                className="bg-white rounded-3xl border border-slate-200 hover:border-blue-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Quarto & Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-extrabold text-blue-900 px-2.5 py-1 bg-blue-50 rounded-xl border border-blue-200 flex items-center space-x-1.5">
                        <Home className="w-3.5 h-3.5 text-blue-600" />
                        <span>{p.unitNumber}</span>
                      </span>
                      <span className="text-xs text-slate-500 font-bold">
                        {p.referenceMonth}
                      </span>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1 ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isPending
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {isPaid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {isPending && <Clock className="w-3 h-3 text-blue-600" />}
                      {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                      <span>{isPaid ? 'Liquidado' : isPending ? 'Pendente' : 'Em Atraso'}</span>
                    </span>
                  </div>

                  {/* Tenant and Value */}
                  <div className="mb-3">
                    <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                      {p.tenantName}
                    </h4>

                    {/* Breakdown of Base + IVA */}
                    <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex justify-between items-baseline text-xs text-slate-500">
                        <span>Valor Base:</span>
                        <span className="font-medium text-slate-700">{formatMZN(baseVal)}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <span>IVA (16% Moçambique):</span>
                        </span>
                        <span className="font-semibold text-blue-700">+{formatMZN(ivaVal)}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-900 uppercase">Total Liquidado:</span>
                        <span className="text-xl font-black text-slate-900">{formatMZN(p.amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method & Receipt */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Método de Pagamento:</span>
                      <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                        {p.paymentMethod || 'M-Pesa / BIM'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Vencimento:</span>
                      <span className="font-bold text-slate-800">{p.dueDate}</span>
                    </div>

                    {p.paymentDate && (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span>Pago em:</span>
                        <span className="font-bold">{p.paymentDate}</span>
                      </div>
                    )}

                    {p.receiptNumber && (
                      <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>Nº Documento:</span>
                        <span className="font-mono font-bold text-blue-700">{p.receiptNumber}</span>
                      </div>
                    )}
                  </div>

                  {p.notes && (
                    <p className="mt-2 text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                      {p.notes}
                    </p>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {!isPaid ? (
                      <>
                        <button
                          onClick={() => handleMarkAsPaid(p)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Marcar Pago</span>
                        </button>

                        <button
                          onClick={() => handleSendReminder(p)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                          title="Enviar lembrete de pagamento por SMS/M-Pesa"
                        >
                          <Send className="w-3 h-3" />
                          <span>Lembrar</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedReceiptPayment(p);
                          setIsReceiptModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Recibo c/ IVA</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenYearlyReportModal(p.unitNumber)}
                      className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                      title={`Gerar Relatório Financeiro Anual (PDF) para o quarto ${p.unitNumber}`}
                    >
                      <FileDown className="w-3 h-3 text-blue-600" />
                      <span>Extrato Anual</span>
                    </button>
                  </div>

                  {p.id && (
                    <button
                      onClick={() => handleDeletePayment(p.id!)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar este registo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Lançar Nova Mensalidade com Discriminação de IVA (16%) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Lançar Mensalidade em Meticais (MT)
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inquilino / Morador *</label>
                {tenants.length > 0 ? (
                  <select
                    value={tenantName}
                    onChange={(e) => handleTenantSelectChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  >
                    {tenants.map((t) => (
                      <option key={t.id || t.name} value={t.name}>
                        {t.name} — Quarto {t.unitNumber}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Ex: Arsénio Mabunda"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nº Quarto / Fração *</label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Valor Base (MT) *</label>
                  <input
                    type="number"
                    required
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(Number(e.target.value))}
                    placeholder="Ex: 25000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Toggle de IVA (16% Moçambique) com Cálculo em Tempo Real */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyIva}
                      onChange={(e) => setApplyIva(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                    />
                    <span className="font-bold text-slate-900 text-xs">
                      Aplicar IVA (16% Moçambique)
                    </span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                    {applyIva ? 'Taxa: 16%' : 'Isento'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200/60 text-center">
                  <div className="bg-white p-2 rounded-xl border border-blue-100">
                    <span className="block text-[10px] text-slate-500 uppercase">Base (MT)</span>
                    <strong className="text-slate-800 text-xs">{formatMZN(liveIva.baseAmount, false)}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-blue-100">
                    <span className="block text-[10px] text-blue-600 uppercase font-bold">IVA (16%)</span>
                    <strong className="text-blue-700 text-xs">{formatMZN(liveIva.taxAmount, false)}</strong>
                  </div>
                  <div className="bg-blue-600 p-2 rounded-xl text-white shadow-xs">
                    <span className="block text-[10px] text-blue-100 uppercase font-bold">Total a Pagar</span>
                    <strong className="text-white text-xs">{formatMZN(liveIva.totalAmount, false)}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mês de Referência *</label>
                  <input
                    type="text"
                    required
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    placeholder="Ex: Outubro 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estado Inicial *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold"
                  >
                    <option value="pending">⏳ Pendente (Aguardando Pagamento)</option>
                    <option value="paid">✅ Já Liquidado / Pago</option>
                    <option value="overdue">⚠️ Em Atraso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Método de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  >
                    {MOZ_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {status === 'paid' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Data de Pagamento</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ID da Transação ou Referência</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Transação M-Pesa: MP261003.841029 ou Comprovativo BIM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <span>A registar...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Registar Mensalidade ({formatMZN(liveIva.totalAmount, false)})</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Recibo de Pagamento com Discriminação Oficial de IVA */}
      {isReceiptModalOpen && selectedReceiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Fatura-Recibo Oficial de Quitação</h3>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const baseVal = selectedReceiptPayment.baseAmount || Math.round((selectedReceiptPayment.amount / (1 + MOZ_IVA_RATE)) * 100) / 100;
              const ivaVal = selectedReceiptPayment.taxAmount || Math.round((selectedReceiptPayment.amount - baseVal) * 100) / 100;

              return (
                <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs text-slate-700">
                  <div className="text-center pb-3 border-b border-slate-200">
                    <h4 className="font-black text-sm text-slate-900">{DEFAULT_CONDO_MOZ.name}</h4>
                    <p className="text-[11px] text-slate-500">Maputo - Moçambique | NUIT: {DEFAULT_CONDO_MOZ.nuit}</p>
                    <p className="text-[10px] text-slate-400">{DEFAULT_CONDO_MOZ.address}</p>
                    <span className="inline-block mt-2 font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 text-xs">
                      {selectedReceiptPayment.receiptNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200/60">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Inquilino:</span>
                      <strong className="text-slate-900 text-xs">{selectedReceiptPayment.tenantName}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Quarto / Fração:</span>
                      <strong className="text-blue-700 text-xs">{selectedReceiptPayment.unitNumber}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Mês de Referência:</span>
                    <span className="font-bold text-slate-900">{selectedReceiptPayment.referenceMonth}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Data de Liquidação:</span>
                    <span className="font-bold text-emerald-700">{selectedReceiptPayment.paymentDate || 'Confirmado'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Forma de Pagamento:</span>
                    <span className="font-bold text-slate-900">{selectedReceiptPayment.paymentMethod || 'M-Pesa (Vodacom)'}</span>
                  </div>

                  {/* Tabela de Discriminação do IVA (16%) */}
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 bg-white p-3 rounded-xl border">
                    <div className="flex justify-between text-slate-600">
                      <span>Incidência / Valor Base:</span>
                      <span className="font-bold">{formatMZN(baseVal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxa de IVA:</span>
                      <span className="font-semibold text-blue-700">16% (Decreto Moçambique)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Montante de IVA (16%):</span>
                      <span className="font-bold text-blue-700">+{formatMZN(ivaVal)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="font-bold text-sm text-slate-900">Total Liquidado (MT):</span>
                      <span className="text-xl font-black text-emerald-700">{formatMZN(selectedReceiptPayment.amount)}</span>
                    </div>
                  </div>

                  {selectedReceiptPayment.notes && (
                    <div className="p-2 rounded-lg bg-blue-50/50 text-[11px] text-slate-600 border border-blue-100">
                      <strong>Referência da Transação:</strong> {selectedReceiptPayment.notes}
                    </div>
                  )}

                  <div className="pt-2 text-center text-[10px] text-slate-400">
                    Recibo emitido electronicamente nos termos da legislação fiscal da República de Moçambique.
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Relatório Financeiro Anual por Unidade (PDF) em Meticais */}
      {isYearlyReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Relatório Financeiro Anual de Mensalidades (PDF)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Extrato e declaração oficial de quitação anual em Meticais (MT) com incidência de IVA a 16%.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsYearlyReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs">
                    Selecionar Quarto / Unidade *
                  </label>
                  <select
                    value={activeReportUnit}
                    onChange={(e) => setSelectedReportUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold text-xs sm:text-sm"
                  >
                    {units.map((u) => {
                      const occName = tenants.find((t) => t.unitNumber === u.unitNumber)?.name || u.currentTenantName || 'Sem inquilino associado';
                      return (
                        <option key={u.id || u.unitNumber} value={u.unitNumber}>
                          {u.unitNumber} — {occName} ({u.type})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs">
                    Ano de Exercício Fiscal *
                  </label>
                  <select
                    value={selectedReportYear}
                    onChange={(e) => setSelectedReportYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold text-xs sm:text-sm"
                  >
                    <option value={2026}>2026 (Ano Corrente)</option>
                    <option value={2025}>2025 (Ano Anterior)</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Observações da Administração no Relatório (Opcional)
                </label>
                <input
                  type="text"
                  value={reportCustomNotes}
                  onChange={(e) => setReportCustomNotes(e.target.value)}
                  placeholder="Ex: Declaração anual emitida para efeitos de comprovação fiscal perante a Autoridade Tributária de Moçambique."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white text-xs"
                />
              </div>

              {/* Preview Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-lg border border-blue-200 text-xs">
                      {activeReportUnit}
                    </span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                      {reportTenantObj?.name || 'Inquilino Registado'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Renda Base: <strong className="text-slate-800">{formatMZN(reportUnitObj?.rentPrice || 25000)}/mês</strong>
                  </span>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Total Faturado</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {formatMZN(calcReportSummary.totalBilled, false)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-emerald-700">
                    <span className="block text-[10px] text-emerald-600 uppercase font-semibold">Total Pago</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-700">
                      {formatMZN(calcReportSummary.totalPaid, false)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Pendente</span>
                    <span className={`text-xs sm:text-sm font-extrabold ${calcReportSummary.totalPending > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatMZN(calcReportSummary.totalPending, false)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-blue-700">
                    <span className="block text-[10px] text-blue-600 uppercase font-semibold">Taxa Quitação</span>
                    <span className="text-xs sm:text-sm font-extrabold text-blue-700">
                      {calcReportSummary.rate}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Documento oficial com discriminação fiscal do IVA (16%).</span>
                  <span className="font-mono text-blue-700 font-bold">REL-ANUAL-MZ-{selectedReportYear}-{activeReportUnit}</span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsYearlyReportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() => handleDownloadYearlyReport(activeReportUnit, selectedReportYear)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-sm shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                <FileDown className="w-4 h-4" />
                <span>{isDownloadingPdf ? 'A Gerar PDF...' : 'Descarregar Relatório PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
