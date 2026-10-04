'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Euro, 
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
  Download
} from 'lucide-react';
import { Payment, Tenant, Unit, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { NotificationService } from '../lib/notifications';

interface PaymentsSectionProps {
  payments: Payment[];
  tenants: Tenant[];
  units: Unit[];
}

const PAYMENT_METHODS = [
  'MB WAY',
  'Multibanco',
  'Transferência Bancária',
  'Dinheiro / Numerário',
  'Cartão de Débito/Crédito',
];

function generateDocNumber(prefix: string): string {
  const code = Date.now().toString().slice(-4);
  return `${prefix}-${new Date().getFullYear()}-${code}`;
}

export function PaymentsSection({ payments, tenants, units }: PaymentsSectionProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [tenantName, setTenantName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [amount, setAmount] = useState<number>(400);
  const [referenceMonth, setReferenceMonth] = useState('Outubro 2026');
  const [dueDate, setDueDate] = useState('2026-10-08');
  const [paymentDate, setPaymentDate] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'overdue'>('pending');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');

  // Calculations
  const totalAmountPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const overduePayments = payments.filter((p) => p.status === 'overdue');
  const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
      (p.referenceMonth && p.referenceMonth.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesMonth && matchesSearch;
  });

  const handleOpenNewPaymentModal = () => {
    const defaultTenant = tenants[0];
    if (defaultTenant) {
      setTenantName(defaultTenant.name);
      setUnitNumber(defaultTenant.unitNumber);
      const unit = units.find((u) => u.unitNumber === defaultTenant.unitNumber);
      setAmount(unit?.rentPrice || 400);
    } else {
      setTenantName('');
      setUnitNumber(units[0]?.unitNumber || 'Q-101');
      setAmount(units[0]?.rentPrice || 400);
    }
    setReferenceMonth('Outubro 2026');
    setDueDate('2026-10-08');
    setPaymentDate('');
    setStatus('pending');
    setPaymentMethod(PAYMENT_METHODS[0]);
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
        setAmount(unit.rentPrice);
      }
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

      const payload: Omit<Payment, 'id'> = {
        tenantName: tenantName.trim(),
        unitNumber: unitNumber.trim(),
        amount: Number(amount) || 0,
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
        body: `Mensalidade de ${amount} € para ${tenantName} referente a ${referenceMonth}.`,
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
        paymentMethod: payment.paymentMethod || 'MB WAY',
        receiptNumber: recNum,
      });

      NotificationService.sendPush(`Pagamento Confirmado: ${payment.unitNumber}`, {
        body: `Recebidos ${payment.amount} € de ${payment.tenantName} referente a ${payment.referenceMonth}.`,
        soundType: 'success',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${payment.id}`);
    }
  };

  const handleSendReminder = (payment: Payment) => {
    NotificationService.sendPush(`Lembrete de Pagamento: ${payment.unitNumber}`, {
      body: `Caro(a) ${payment.tenantName}, a mensalidade de ${payment.referenceMonth} no valor de ${payment.amount} € vence em ${payment.dueDate}.`,
      soundType: payment.status === 'overdue' ? 'urgent' : 'normal',
    });
    alert(`Lembrete de pagamento transmitido com sucesso para ${payment.tenantName} (${payment.unitNumber})!`);
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
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Pagamentos de Mensalidades & Rendas
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Gestão financeira dos moradores, emissão de recibos e controle de pagamentos pendentes e em atraso.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenNewPaymentModal}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-sm shadow-blue-600/30 transition-all text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Mensalidade / Pagamento</span>
        </button>
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
            <span className="text-xs font-bold uppercase tracking-wider">Total Recebido</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalAmountPaid} €</span>
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
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalPendingAmount} €</span>
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
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalOverdueAmount} €</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {overduePayments.length} mensalidades vencidas
          </p>
        </div>

        {/* Taxa de Adimplência */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pontualidade</span>
            <Euro className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{paymentRate}%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            De pagamentos liquidados
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
              placeholder="Pesquisar por inquilino, quarto ou recibo..."
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
          <h3 className="text-base font-bold text-slate-800">Nenhum pagamento encontrado</h3>
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
                      <span>{isPaid ? 'Pago' : isPending ? 'Pendente' : 'Em Atraso'}</span>
                    </span>
                  </div>

                  {/* Tenant and Value */}
                  <div className="mb-3">
                    <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                      {p.tenantName}
                    </h4>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">{p.amount} €</span>
                      {p.paymentMethod && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {p.paymentMethod}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates & Recibo */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Vencimento:</span>
                      <span className="font-bold text-slate-800">{p.dueDate}</span>
                    </div>

                    {p.paymentDate && (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span>Liquidado em:</span>
                        <span className="font-bold">{p.paymentDate}</span>
                      </div>
                    )}

                    {p.receiptNumber && (
                      <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>Recibo:</span>
                        <span className="font-mono font-bold text-slate-700">{p.receiptNumber}</span>
                      </div>
                    )}
                  </div>

                  {p.notes && (
                    <p className="mt-2 text-[11px] text-slate-500 italic">
                      Nota: {p.notes}
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
                          title="Enviar lembrete de pagamento"
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
                        <span>Ver Recibo</span>
                      </button>
                    )}
                  </div>

                  {p.id && (
                    <button
                      onClick={() => handleDeletePayment(p.id!)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar registo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Lançar Nova Mensalidade */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Lançar Mensalidade / Registo de Pagamento</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inquilino *</label>
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
                    placeholder="Ex: António Silva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nº Quarto / Habitação *</label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Valor da Mensalidade (€) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Ex: 420"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
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
                    {PAYMENT_METHODS.map((m) => (
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
                <label className="block text-slate-700 font-semibold mb-1">Observações ou Referência</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Entidade: 21234, Referência: 123 456 789"
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
                      <span>Registar Mensalidade</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Recibo de Pagamento */}
      {isReceiptModalOpen && selectedReceiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Recibo de Renda / Mensalidade</h3>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs text-slate-700">
              <div className="text-center pb-3 border-b border-slate-200">
                <h4 className="font-extrabold text-sm text-slate-900">Residencial Solar dos Pinheiros</h4>
                <p className="text-[11px] text-slate-500">Recibo Oficial de Quitação de Condomínio</p>
                <span className="inline-block mt-2 font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {selectedReceiptPayment.receiptNumber}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Inquilino:</span>
                <span className="font-bold text-slate-900">{selectedReceiptPayment.tenantName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Quarto / Habitação:</span>
                <span className="font-bold text-slate-900">{selectedReceiptPayment.unitNumber}</span>
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
                <span className="font-bold text-slate-900">{selectedReceiptPayment.paymentMethod || 'MB WAY'}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-sm text-slate-900">Total Liquidado:</span>
                <span className="text-xl font-black text-emerald-700">{selectedReceiptPayment.amount} €</span>
              </div>
            </div>

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

    </div>
  );
}
