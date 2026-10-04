'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Zap, 
  Droplet, 
  Lock, 
  Wind, 
  Home, 
  Clock, 
  CheckCircle2, 
  Wrench, 
  Phone, 
  User, 
  Image as ImageIcon, 
  XCircle, 
  Check, 
  MessageSquare, 
  Trash2,
  AlertOctagon
} from 'lucide-react';
import { MaintenanceReport, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { NotificationService } from '../lib/notifications';

interface MaintenanceSectionProps {
  reports: MaintenanceReport[];
  defaultUnitFilter?: string;
  onClearUnitFilter?: () => void;
}

const CATEGORIES = [
  { id: 'Instalação Elétrica Defeituosa', label: 'Instalação Elétrica Defeituosa', icon: Zap, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'Tubos de Água / Canalização / Fugas', label: 'Tubos de Água com Defeito / Fugas', icon: Droplet, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'Portas / Fechaduras & Segurança', label: 'Fechaduras & Portas', icon: Lock, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { id: 'Ar Condicionado / Ventilação', label: 'Ar Condicionado / Climatização', icon: Wind, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  { id: 'Infiltração / Humidade / Paredes', label: 'Infiltração & Humidade', icon: Home, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'Outro Defeito Estrutural', label: 'Outro Defeito Geral', icon: Wrench, color: 'text-slate-700 bg-slate-100 border-slate-200' },
];

export function MaintenanceSection({ reports, defaultUnitFilter, onClearUnitFilter }: MaintenanceSectionProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Note Modal
  const [selectedReportForNotes, setSelectedReportForNotes] = useState<MaintenanceReport | null>(null);
  const [adminNoteText, setAdminNoteText] = useState('');

  // Form State for Report
  const [tenantName, setTenantName] = useState('');
  const [tenantContact, setTenantContact] = useState('');
  const [unitNumber, setUnitNumber] = useState(defaultUnitFilter || 'Q-101');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'emergency'>('high');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Counters
  const openCount = reports.filter((r) => r.status === 'open').length;
  const reviewingCount = reports.filter((r) => r.status === 'reviewing').length;
  const scheduledCount = reports.filter((r) => r.status === 'scheduled').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const emergencyCount = reports.filter((r) => r.urgency === 'emergency' && r.status !== 'resolved').length;

  const filteredReports = reports.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || r.urgency === urgencyFilter;
    const matchesUnit = !defaultUnitFilter || r.unitNumber.toLowerCase() === defaultUnitFilter.toLowerCase();
    const matchesSearch =
      r.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesUrgency && matchesUnit && matchesSearch;
  });

  const handleOpenReportModal = () => {
    setTenantName('');
    setTenantContact('+351 ');
    setUnitNumber(defaultUnitFilter || 'Q-101');
    setCategory(CATEGORIES[0].id);
    setUrgency('high');
    setDescription('');
    setPhotoUrl('');
    setIsModalOpen(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !unitNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<MaintenanceReport, 'id'> = {
        tenantName: tenantName.trim() || 'Inquilino',
        tenantContact: tenantContact.trim(),
        unitNumber: unitNumber.trim().toUpperCase(),
        category,
        urgency,
        description: description.trim(),
        photoUrl: photoUrl.trim() || '',
        status: 'open',
        adminNotes: '',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'maintenance_reports'), payload);
      
      NotificationService.sendPush(`Novo Defeito: ${unitNumber.trim()}`, {
        body: `${category} - ${description.trim().substring(0, 80)}...`,
        soundType: urgency === 'emergency' ? 'urgent' : 'normal',
      });

      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'maintenance_reports');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (report: MaintenanceReport, newStatus: 'open' | 'reviewing' | 'scheduled' | 'resolved') => {
    if (!report.id) return;
    try {
      const updateData: Partial<MaintenanceReport> = {
        status: newStatus,
      };
      if (newStatus === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'maintenance_reports', report.id), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `maintenance_reports/${report.id}`);
    }
  };

  const handleSaveAdminNote = async () => {
    if (!selectedReportForNotes || !selectedReportForNotes.id) return;
    try {
      await updateDoc(doc(db, 'maintenance_reports', selectedReportForNotes.id), {
        adminNotes: adminNoteText.trim(),
      });
      setSelectedReportForNotes(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `maintenance_reports/${selectedReportForNotes.id}`);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Deseja eliminar este relatório de defeito?')) return;
    try {
      await deleteDoc(doc(db, 'maintenance_reports', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `maintenance_reports/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Relatórios de Defeitos & Manutenção
                </h2>
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Tempo Real</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Canal de reporte de anomalias nas habitações (instalações elétricas, canalização de água, fechaduras).
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenReportModal}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-sm shadow-blue-600/30 transition-all text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Reportar Novo Defeito</span>
        </button>
      </div>

      {/* Unit Filter Warning if active */}
      {defaultUnitFilter && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
          <span>A filtrar chamados apenas para a unidade: <strong className="font-bold">{defaultUnitFilter}</strong></span>
          {onClearUnitFilter && (
            <button
              onClick={onClearUnitFilter}
              className="text-xs text-blue-700 hover:text-blue-900 underline font-bold"
            >
              Mostrar todas as habitações
            </button>
          )}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        <div 
          onClick={() => setStatusFilter('open')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'open'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Abertos / Novos</span>
            <AlertOctagon className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{openCount}</span>
            {emergencyCount > 0 && (
              <span className="text-xs text-rose-800 font-bold bg-rose-100 px-2 py-0.5 rounded-md">
                {emergencyCount} emergência
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Aguardando atendimento</p>
        </div>

        <div 
          onClick={() => setStatusFilter('scheduled')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'scheduled'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Técnico Agendado</span>
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{scheduledCount}</span>
            <span className="text-xs text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-md">Em reparo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Eletricistas / Canalizadores</p>
        </div>

        <div 
          onClick={() => setStatusFilter('resolved')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resolvidos</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{resolvedCount}</span>
            <span className="text-xs text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-md">Concluídos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Avarias solucionadas</p>
        </div>

        <div 
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Chamados</span>
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{reports.length}</span>
            <span className="text-xs text-slate-600 font-semibold">Registados</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Histórico completo</p>
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
            Todos ({reports.length})
          </button>
          
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
              statusFilter === 'open'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Abertos ({openCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
              statusFilter === 'scheduled' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Técnico Agendado ({scheduledCount})
          </button>

          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
              statusFilter === 'resolved' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Resolvidos ({resolvedCount})
          </button>
        </div>

        {/* Urgency & Search */}
        <div className="flex items-center space-x-2 text-xs">
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
          >
            <option value="all">Todas as Urgências</option>
            <option value="emergency">🚨 Apenas Emergência</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar defeito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-slate-800">Nenhum defeito reportado pendente</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Todas as manutenções das habitações estão em dia ou não há chamados com os filtros atuais.
          </p>
          <button
            onClick={handleOpenReportModal}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registar Novo Defeito</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const isEmergency = report.urgency === 'emergency';
            const isHigh = report.urgency === 'high';
            const isResolved = report.status === 'resolved';
            const isScheduled = report.status === 'scheduled';
            const categoryObj = CATEGORIES.find((c) => c.id === report.category) || CATEGORIES[0];
            const CategoryIcon = categoryObj.icon;

            return (
              <div
                key={report.id || report.createdAt}
                className={`bg-white rounded-3xl border p-5 shadow-xs hover:shadow-md flex flex-col justify-between transition-all relative overflow-hidden group ${
                  isResolved
                    ? 'border-slate-200 opacity-90'
                    : isEmergency
                    ? 'border-rose-300 ring-1 ring-rose-500/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Emergency top stripe */}
                {isEmergency && !isResolved && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 animate-pulse" />
                )}

                <div>
                  {/* Card Header: Unit Number + Urgency + Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-extrabold text-blue-900 px-2.5 py-1 bg-blue-50 rounded-xl border border-blue-200 flex items-center space-x-1.5">
                        <Home className="w-3.5 h-3.5 text-blue-600" />
                        <span>{report.unitNumber}</span>
                      </span>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isEmergency
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                          : isHigh
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {report.urgency === 'emergency' ? '🚨 Emergência' : `Urgência: ${report.urgency}`}
                      </span>
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1 ${
                      isResolved
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isScheduled
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : report.status === 'reviewing'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {isResolved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {isScheduled && <Wrench className="w-3 h-3 text-amber-600" />}
                      <span>
                        {isResolved
                          ? 'Resolvido'
                          : isScheduled
                          ? 'Técnico Agendado'
                          : report.status === 'reviewing'
                          ? 'Em Análise'
                          : 'Aberto'}
                      </span>
                    </span>
                  </div>

                  {/* Category Pill */}
                  <div className="flex items-center space-x-2 mb-3">
                    <div className={`p-1.5 rounded-xl border flex items-center space-x-1.5 text-xs font-bold ${categoryObj.color}`}>
                      <CategoryIcon className="w-4 h-4 shrink-0" />
                      <span>{report.category}</span>
                    </div>
                  </div>

                  {/* Defect Description */}
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3 whitespace-pre-wrap">
                    {report.description}
                  </p>

                  {/* Tenant info */}
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pb-2">
                    <span className="flex items-center space-x-1 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{report.tenantName}</span>
                    </span>
                    {report.tenantContact && (
                      <span className="flex items-center space-x-1 text-slate-600 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{report.tenantContact}</span>
                      </span>
                    )}
                  </div>

                  {/* Admin Technical Notes */}
                  {report.adminNotes && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 mb-2">
                      <span className="font-bold text-blue-700 block mb-0.5">Nota do Condomínio / Técnico:</span>
                      {report.adminNotes}
                    </div>
                  )}

                  {/* Photo Preview if attached */}
                  {report.photoUrl && (
                    <div className="mb-2">
                      <a
                        href={report.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center space-x-1 underline"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Ver foto comprovativa do defeito</span>
                      </a>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400">
                    Aberto em: {new Date(report.createdAt).toLocaleString('pt-PT')}
                    {report.resolvedAt && (
                      <span className="text-emerald-700 font-semibold block">
                        Solucionado em: {new Date(report.resolvedAt).toLocaleString('pt-PT')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {report.status !== 'resolved' ? (
                      <>
                        {report.status === 'open' && (
                          <button
                            onClick={() => handleStatusChange(report, 'reviewing')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold"
                          >
                            Analisar
                          </button>
                        )}
                        {report.status !== 'scheduled' && (
                          <button
                            onClick={() => handleStatusChange(report, 'scheduled')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold"
                          >
                            Agendar Técnico
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(report, 'resolved')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Marcar Resolvido</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(report, 'open')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        Reabrir Chamado
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setSelectedReportForNotes(report);
                        setAdminNoteText(report.adminNotes || '');
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Adicionar Nota Técnica"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {report.id && (
                      <button
                        onClick={() => handleDeleteReport(report.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar relatório"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Report New Defect */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Reportar Defeito ou Avaria</span>
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
                  <label className="block text-slate-700 font-semibold mb-1">Nº do Quarto / Habitação *</label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="Ex: Q-101, Apt 204"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nível de Urgência *</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold text-rose-700"
                  >
                    <option value="emergency">🚨 Emergência (Imediata)</option>
                    <option value="high">Alta (Urgente)</option>
                    <option value="medium">Média (Normal)</option>
                    <option value="low">Baixa (Pode aguardar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Categoria do Defeito (Selecione) *
                </label>
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
                            ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-500/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Descrição Detalhada do Defeito *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: O disjuntor do quarto cai repetidamente ao ligar o aquecedor e a tomada está a emitir faíscas..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Seu Nome (Inquilino)</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Ex: António Silva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Telefone para Contacto</label>
                  <input
                    type="tel"
                    value={tenantContact}
                    onChange={(e) => setTenantContact(e.target.value)}
                    placeholder="+351 912 345 678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">URL de Foto / Evidência (Opcional)</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-defeito.jpg"
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
                    <span>A enviar...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Enviar Relatório em Tempo Real</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Technical Note */}
      {selectedReportForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 mb-3">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Nota do Condomínio ({selectedReportForNotes.unitNumber})</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Adicione instruções técnicas, data agendada para visita ou peças necessárias.
            </p>
            <textarea
              rows={3}
              value={adminNoteText}
              onChange={(e) => setAdminNoteText(e.target.value)}
              placeholder="Ex: Eletricista Sr. Joaquim virá hoje às 16h com novos disjuntores."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedReportForNotes(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdminNote}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
