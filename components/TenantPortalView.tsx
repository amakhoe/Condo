'use client';

import React, { useState } from 'react';
import { 
  Home, 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Wrench, 
  Zap, 
  Droplet, 
  Lock, 
  Wind, 
  Plus, 
  XCircle, 
  Check, 
  Building2,
  CreditCard,
  Euro,
  Clock,
  FileText
} from 'lucide-react';
import { MaintenanceReport, Announcement, Unit, Payment, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { NotificationService } from '../lib/notifications';

interface TenantPortalViewProps {
  reports: MaintenanceReport[];
  announcements: Announcement[];
  units: Unit[];
  payments?: Payment[];
}

const CATEGORIES = [
  { id: 'Instalação Elétrica Defeituosa', label: 'Instalação Elétrica Defeituosa', icon: Zap },
  { id: 'Tubos de Água / Canalização / Fugas', label: 'Tubos de Água com Defeito / Fugas', icon: Droplet },
  { id: 'Portas / Fechaduras & Segurança', label: 'Fechaduras & Portas', icon: Lock },
  { id: 'Ar Condicionado / Ventilação', label: 'Ar Condicionado / Climatização', icon: Wind },
  { id: 'Infiltração / Humidade / Paredes', label: 'Infiltração & Humidade', icon: Home },
  { id: 'Outro Defeito Estrutural', label: 'Outro Defeito Geral', icon: Wrench },
];

export function TenantPortalView({ reports, announcements, units, payments = [] }: TenantPortalViewProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>('Q-101');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [tenantName, setTenantName] = useState('António Silva');
  const [tenantContact, setTenantContact] = useState('+351 912 345 678');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'emergency'>('high');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Push Permission
  const [permission, setPermission] = useState<NotificationPermission>(() => NotificationService.getPermissionState());

  const handleRequestPush = async () => {
    const res = await NotificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      NotificationService.sendPush('Notificações Push Ativas!', {
        body: 'Você receberá avisos importantes do condomínio em tempo real.',
        soundType: 'success',
      });
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !selectedUnit.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<MaintenanceReport, 'id'> = {
        tenantName: tenantName.trim() || 'Inquilino',
        tenantContact: tenantContact.trim(),
        unitNumber: selectedUnit.trim(),
        category,
        urgency,
        description: description.trim(),
        photoUrl: photoUrl.trim() || '',
        status: 'open',
        adminNotes: '',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'maintenance_reports'), payload);

      NotificationService.sendPush(`Chamado Enviado: ${selectedUnit}`, {
        body: `Defeito reportado à administração: ${description.substring(0, 60)}...`,
        soundType: 'success',
      });

      setIsModalOpen(false);
      setDescription('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'maintenance_reports');
    } finally {
      setIsSubmitting(false);
    }
  };

  const myReports = reports.filter((r) => r.unitNumber.toLowerCase() === selectedUnit.toLowerCase());
  const myPayments = payments.filter((p) => p.unitNumber.toLowerCase() === selectedUnit.toLowerCase());
  const latestPayment = myPayments[0];
  const pendingPayment = myPayments.find((p) => p.status === 'pending' || p.status === 'overdue');
  const availableRooms = units.filter((u) => u.status === 'available');

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner in Royal Blue */}
      <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
            <Home className="w-4 h-4" />
            <span>Portal do Morador & Inquilino</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Bem-vindo ao Solar dos Pinheiros
          </h2>
          <p className="text-sm text-blue-100 mt-2 leading-relaxed">
            Reporte anomalias e defeitos no seu quarto ou apartamento (eletricidade, canalização, fechaduras), acompanhe as reparações em tempo real e consulte todos os avisos oficiais do condomínio.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-900 font-extrabold rounded-2xl shadow-md text-sm inline-flex items-center space-x-2 transition-transform hover:scale-105"
            >
              <AlertTriangle className="w-4 h-4 text-slate-900" />
              <span>Reportar Defeito na Habitação</span>
            </button>

            {permission !== 'granted' && (
              <button
                onClick={handleRequestPush}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs border border-white/30 text-white font-bold rounded-2xl text-sm inline-flex items-center space-x-2 transition-colors"
              >
                <Bell className="w-4 h-4 text-white" />
                <span>Ativar Notificações Push</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Select Which Room the Tenant Lives In */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-semibold">A visualizar como morador do Quarto:</span>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
          >
            {units.length > 0 ? (
              units.map((u) => (
                <option key={u.id || u.unitNumber} value={u.unitNumber}>
                  {u.unitNumber} - {u.type}
                </option>
              ))
            ) : (
              <option value="Q-101">Q-101</option>
            )}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Chamados registados para esta unidade: <strong className="text-blue-700 font-bold">{myReports.length}</strong>
        </div>
      </div>

      {/* Tenant Financial Status / Rendas do Quarto */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Situação da Mensalidade & Renda ({selectedUnit})
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o estado de liquidação das mensalidades e referências de pagamento
              </p>
            </div>
          </div>

          <div>
            {pendingPayment ? (
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                pendingPayment.status === 'overdue'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingPayment.status === 'overdue' ? 'Mensalidade em Atraso' : 'Mensalidade a Pagamento'}</span>
              </span>
            ) : latestPayment?.status === 'paid' ? (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mensalidades em Dia</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span>Sem cobrança ativa</span>
              </span>
            )}
          </div>
        </div>

        {myPayments.length === 0 ? (
          <div className="text-center py-5 text-slate-500 text-xs">
            Ainda não há lançamentos de mensalidade registados no sistema para o quarto <strong>{selectedUnit}</strong>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myPayments.map((p) => {
              const isPaid = p.status === 'paid';
              const isOverdue = p.status === 'overdue';

              return (
                <div
                  key={p.id || p.createdAt}
                  className={`p-4 rounded-2xl border transition-all text-xs ${
                    isPaid
                      ? 'bg-slate-50/70 border-emerald-200 hover:border-emerald-300'
                      : isOverdue
                      ? 'bg-rose-50/40 border-rose-300 shadow-xs'
                      : 'bg-amber-50/40 border-amber-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">{p.referenceMonth}</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {isPaid ? 'Liquidado' : isOverdue ? 'Atrasado' : 'Pendente'}
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-1 mb-2">
                    <span className="text-xl font-black text-slate-900">{p.amount.toFixed(2)}</span>
                    <span className="text-xs font-bold text-slate-500">€</span>
                  </div>

                  <div className="space-y-1 text-slate-600 text-[11px] pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vencimento:</span>
                      <span className="font-medium text-slate-800">{p.dueDate}</span>
                    </div>

                    {isPaid && p.paymentDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pago em:</span>
                        <span className="font-semibold text-emerald-700">{p.paymentDate}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-slate-500">Método:</span>
                      <span className="font-medium text-slate-800">{p.paymentMethod || 'MB WAY'}</span>
                    </div>

                    {p.receiptNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recibo:</span>
                        <span className="font-mono text-blue-700 font-bold">{p.receiptNumber}</span>
                      </div>
                    )}
                  </div>

                  {!isPaid && (
                    <div className="mt-3 pt-2 border-t border-slate-200/80 bg-white/70 p-2 rounded-xl text-[11px] text-slate-700">
                      <div className="font-bold text-blue-800 flex items-center space-x-1">
                        <span>Dados de Pagamento ({p.paymentMethod || 'MB WAY'})</span>
                      </div>
                      <p className="mt-0.5 text-slate-500">
                        {p.paymentMethod === 'MB WAY'
                          ? 'Envie para o terminal do condomínio: 912 345 678'
                          : 'Entidade: 21234 | Ref: 987 654 321'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: My Reports + Live Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: My Reported Defects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span>Meus Chamados de Manutenção ({myReports.length})</span>
            </h3>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold inline-flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Chamado</span>
            </button>
          </div>

          {myReports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum defeito reportado</h4>
              <p className="text-xs mt-1 text-slate-500">
                A sua habitação está sem pendências. Se notar alguma avaria na canalização, luzes ou trincos, reporte acima!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map((rep) => {
                const isEmergency = rep.urgency === 'emergency';
                const isResolved = rep.status === 'resolved';

                return (
                  <div
                    key={rep.id || rep.createdAt}
                    className={`p-5 rounded-3xl border transition-all bg-white shadow-xs hover:shadow-sm ${
                      isResolved
                        ? 'border-slate-200 text-slate-500'
                        : isEmergency
                        ? 'border-rose-300 ring-1 ring-rose-500/20'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{rep.category}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isEmergency
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {rep.urgency}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          {rep.description}
                        </p>
                      </div>

                      {/* Status */}
                      <span className={`text-xs px-2.5 py-1 rounded-xl font-bold ml-2 shrink-0 ${
                        isResolved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rep.status === 'scheduled'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {isResolved ? 'Resolvido' : rep.status === 'scheduled' ? 'Técnico Agendado' : 'Aberto'}
                      </span>
                    </div>

                    {rep.adminNotes && (
                      <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900">
                        <strong className="block font-bold text-blue-700 mb-0.5">Resposta do Condomínio:</strong>
                        {rep.adminNotes}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-slate-400">
                      Reportado em: {new Date(rep.createdAt).toLocaleString('pt-PT')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Important Announcements & Push */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <span>Avisos Importantes do Condomínio</span>
            </h3>

            {permission === 'granted' ? (
              <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>Notificações Ativas</span>
              </span>
            ) : (
              <button
                onClick={handleRequestPush}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold underline"
              >
                Ativar Alertas Push
              </button>
            )}
          </div>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 shadow-xs">
                <p className="text-xs">Nenhum aviso emitido pela administração no momento.</p>
              </div>
            ) : (
              announcements.slice(0, 4).map((ann) => {
                const isUrgent = ann.priority === 'urgent';
                return (
                  <div
                    key={ann.id || ann.sentAt}
                    className={`p-5 rounded-3xl border transition-all bg-white shadow-xs ${
                      isUrgent
                        ? 'border-rose-300 ring-1 ring-rose-500/20 shadow-sm'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isUrgent ? 'bg-rose-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {ann.priority === 'urgent' ? '🚨 Urgente' : ann.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(ann.sentAt).toLocaleDateString('pt-PT')}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">
                      {ann.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {ann.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Available Rooms Section (Mostrar quartos disponíveis e vagos) */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Quartos Vagos & Disponíveis no Condomínio</span>
            </h3>
            <p className="text-xs text-slate-500">
              Conhece alguém à procura de quarto ou deseja mudar de tipologia? Veja as vagas abertas.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            {availableRooms.length} quartos livres
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {availableRooms.map((room) => (
            <div
              key={room.id || room.unitNumber}
              className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between shadow-xs hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900">{room.unitNumber}</span>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    Livre / Vago
                  </span>
                </div>
                <p className="text-xs text-blue-700 font-bold mt-1">{room.type}</p>
                <p className="text-[11px] text-slate-500">{room.block} • {room.floor}</p>
                {room.features && (
                  <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {room.features}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Renda Mensal:</span>
                <strong className="text-slate-900 font-extrabold text-sm">{room.rentPrice} € / mês</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Report Defect from Tenant Portal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Reportar Defeito no Quarto ({selectedUnit})</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="mt-4 space-y-4 text-xs sm:text-sm">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Seu Quarto / Habitação *</label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    {units.map((u) => (
                      <option key={u.id || u.unitNumber} value={u.unitNumber}>
                        {u.unitNumber} ({u.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nível de Urgência *</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold text-rose-700"
                  >
                    <option value="emergency">🚨 Emergência (Risco de dano grave)</option>
                    <option value="high">Alta (Urgente)</option>
                    <option value="medium">Média (Inconveniente)</option>
                    <option value="low">Baixa (Pode aguardar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Qual é o tipo de defeito? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center space-x-2 transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500/30 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Descreva o que está a acontecer *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: A tomada ao lado da secretária está sem energia e cheira a queimado, ou há um tubo de água a pingar com força..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Seu Nome</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Telemóvel para Contacto</label>
                  <input
                    type="tel"
                    value={tenantContact}
                    onChange={(e) => setTenantContact(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
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
                    <span>A registar chamado...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submeter Chamado Agora</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
