'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileDown, 
  Printer, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  X, 
  Wrench, 
  FileText,
  Sparkles,
  Zap,
  Droplet
} from 'lucide-react';
import { MaintenanceReport } from '../lib/firebase';
import { generateMaintenancePdf, PdfExportFilters } from '../lib/pdfExport';
import { NotificationService } from '../lib/notifications';

interface MaintenancePdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: MaintenanceReport[];
  initialUnitFilter?: string;
}

type PeriodPreset = 'all' | 'today' | '7days' | '30days' | 'current_month' | 'quarter' | 'custom';

export function MaintenancePdfExportModal({
  isOpen,
  onClose,
  reports,
  initialUnitFilter,
}: MaintenancePdfExportModalProps) {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>(initialUnitFilter || 'all');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Available unique units and categories from reports
  const allUnits = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.unitNumber) set.add(r.unitNumber);
    });
    return Array.from(set).sort();
  }, [reports]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [reports]);

  // Compute period boundaries based on preset
  const periodBoundaries = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date = new Date();
    let label = 'Todo o Histórico';

    if (periodPreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      label = `Hoje (${start.toLocaleDateString('pt-PT')})`;
    } else if (periodPreset === '7days') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = `Últimos 7 dias (${start.toLocaleDateString('pt-PT')} a ${end.toLocaleDateString('pt-PT')})`;
    } else if (periodPreset === '30days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      label = `Últimos 30 dias (${start.toLocaleDateString('pt-PT')} a ${end.toLocaleDateString('pt-PT')})`;
    } else if (periodPreset === 'current_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = `Mês Atual (${now.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })})`;
    } else if (periodPreset === 'quarter') {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      label = `Últimos 90 dias (${start.toLocaleDateString('pt-PT')} a ${end.toLocaleDateString('pt-PT')})`;
    } else if (periodPreset === 'custom') {
      start = startDate ? new Date(`${startDate}T00:00:00`) : null;
      end = endDate ? new Date(`${endDate}T23:59:59`) : new Date();
      label = `${startDate ? new Date(startDate).toLocaleDateString('pt-PT') : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString('pt-PT') : 'Hoje'}`;
    }

    return { start, end, label };
  }, [periodPreset, startDate, endDate]);

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const repDate = new Date(r.createdAt);

      // Period filter
      if (periodBoundaries.start && repDate < periodBoundaries.start) return false;
      if (periodBoundaries.end && repDate > periodBoundaries.end) return false;

      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Urgency filter
      if (urgencyFilter === 'critical') {
        if (r.urgency !== 'emergency' && r.urgency !== 'high') return false;
      } else if (urgencyFilter !== 'all' && r.urgency !== urgencyFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

      // Unit filter
      if (unitFilter !== 'all' && r.unitNumber.toLowerCase() !== unitFilter.toLowerCase()) return false;

      return true;
    });
  }, [reports, periodBoundaries, statusFilter, urgencyFilter, categoryFilter, unitFilter]);

  if (!isOpen) return null;

  // Counts for summary
  const totalInReport = filteredReports.length;
  const resolvedInReport = filteredReports.filter((r) => r.status === 'resolved').length;
  const emergencyInReport = filteredReports.filter((r) => r.urgency === 'emergency').length;
  const scheduledInReport = filteredReports.filter((r) => r.status === 'scheduled').length;
  const resolutionRate = totalInReport > 0 ? Math.round((resolvedInReport / totalInReport) * 100) : 0;

  const handleDownloadPdf = () => {
    if (filteredReports.length === 0) {
      alert('Não existem reparos no período e filtros selecionados para exportar.');
      return;
    }

    setIsExporting(true);
    try {
      const filters: PdfExportFilters = {
        periodLabel: periodBoundaries.label,
        status:
          statusFilter === 'all'
            ? 'Todos os estados'
            : statusFilter === 'resolved'
            ? 'Apenas Resolvidos'
            : statusFilter === 'scheduled'
            ? 'Em Reparo / Agendado'
            : statusFilter === 'open'
            ? 'Abertos'
            : statusFilter,
        urgency:
          urgencyFilter === 'all'
            ? 'Todas as urgências'
            : urgencyFilter === 'critical'
            ? 'Críticos (Emergência & Alta)'
            : urgencyFilter,
        category: categoryFilter === 'all' ? 'Todas as categorias' : categoryFilter,
        unitNumber: unitFilter === 'all' ? undefined : unitFilter,
      };

      generateMaintenancePdf(filteredReports, filters);

      NotificationService.sendPush('Relatório PDF Gerado!', {
        body: `Descarregado relatório com ${filteredReports.length} registos de manutenção para o período: ${periodBoundaries.label}.`,
        soundType: 'success',
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Ocorreu um erro ao gerar o documento PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
              <FileDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  Exportar Relatório de Manutenção para PDF
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
                  Oficial A4
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                Gere e transfira o histórico detalhado de defeitos, reparações e intervenções técnicas por período.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Controls, Right Preview */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* 1. Period Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>1. Selecionar Período do Relatório</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPeriodPreset('all')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  periodPreset === 'all'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Todo o Histórico
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('today')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  periodPreset === 'today'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Hoje (24h)
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('7days')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  periodPreset === '7days'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Últimos 7 dias
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('30days')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  periodPreset === '30days'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Últimos 30 dias
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('current_month')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  periodPreset === 'current_month'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mês Corrente
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('quarter')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  periodPreset === 'quarter'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Último Trimestre
              </button>

              <button
                type="button"
                onClick={() => setPeriodPreset('custom')}
                className={`col-span-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  periodPreset === 'custom'
                    ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Personalizado (Data de Início e Fim)
              </button>
            </div>

            {/* Custom Date Inputs */}
            {periodPreset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Data de Início:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Data de Fim:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Additional Scope Filters */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>2. Refinar Âmbito dos Registos</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              
              {/* Status */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">Estado de Resolução</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="all">Todos os Estados</option>
                  <option value="resolved">Apenas Resolvidos (Reparações Concluídas)</option>
                  <option value="scheduled">Em Reparo / Agendado</option>
                  <option value="reviewing">Em Análise Técnica</option>
                  <option value="open">Abertos / Novos</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nível de Urgência</label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="all">Todas as Urgências</option>
                  <option value="critical">Críticos (Emergência & Alta)</option>
                  <option value="emergency">Apenas Emergência</option>
                  <option value="high">Apenas Alta</option>
                  <option value="medium">Apenas Média</option>
                  <option value="low">Apenas Baixa</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">Categoria de Avaria</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="all">Todas as Categorias</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">Quarto / Unidade</label>
                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="all">Todas as Habitações</option>
                  {allUnits.map((u) => (
                    <option key={u} value={u}>
                      Quarto {u}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* 3. Live PDF Document Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>3. Pré-visualização do Relatório Oficial</span>
              </label>

              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {totalInReport} {totalInReport === 1 ? 'registo incluído' : 'registos incluídos'}
              </span>
            </div>

            {/* Document Sheet Paper (A4 Preview mockup) */}
            <div className="bg-slate-100 p-3 sm:p-5 rounded-3xl border border-slate-200 shadow-inner">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 text-slate-800 space-y-4 font-sans text-xs">
                
                {/* Header in Blue */}
                <div className="bg-blue-800 text-white -m-5 sm:-m-6 p-5 sm:p-6 rounded-t-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Condomínio Residencial</span>
                    <h4 className="text-base sm:text-lg font-black tracking-tight">SOLAR DOS PINHEIROS</h4>
                    <p className="text-xs text-blue-100 font-medium mt-0.5">
                      RELATÓRIO OFICIAL DE MANUTENÇÃO & HISTÓRICO DE REPAROS
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-[11px] text-blue-200">
                    <p>Emissão: <strong className="text-white">{new Date().toLocaleDateString('pt-PT')}</strong></p>
                    <p>Doc ID: <span className="font-mono text-white">REL-MAN-{new Date().getFullYear()}</span></p>
                  </div>
                </div>

                {/* Filter info box */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="font-bold text-slate-800">Período: </span>
                    <span className="text-blue-700 font-bold">{periodBoundaries.label}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Filtro de Estado: </span>
                    <span>{statusFilter === 'all' ? 'Todos os estados' : statusFilter}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Filtro de Urgência: </span>
                    <span>{urgencyFilter === 'all' ? 'Todas as urgências' : urgencyFilter}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Unidade: </span>
                    <span>{unitFilter === 'all' ? 'Todas as habitações' : `Quarto ${unitFilter}`}</span>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="block text-lg font-black text-slate-900 leading-none">{totalInReport}</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Reparos</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="block text-lg font-black text-emerald-800 leading-none">{resolvedInReport}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase">Resolvidos ({resolutionRate}%)</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <span className="block text-lg font-black text-amber-800 leading-none">{scheduledInReport}</span>
                    <span className="text-[10px] text-amber-700 font-semibold uppercase">Em Atendimento</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <span className="block text-lg font-black text-rose-800 leading-none">{emergencyInReport}</span>
                    <span className="text-[10px] text-rose-700 font-semibold uppercase">Emergências</span>
                  </div>
                </div>

                {/* Sample items table preview */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2">Data</th>
                        <th className="p-2">Quarto</th>
                        <th className="p-2">Inquilino</th>
                        <th className="p-2">Categoria</th>
                        <th className="p-2">Urgência</th>
                        <th className="p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            Nenhum registo encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        filteredReports.slice(0, 5).map((rep) => {
                          const dateStr = new Date(rep.createdAt).toLocaleDateString('pt-PT');
                          return (
                            <tr key={rep.id || rep.createdAt} className="hover:bg-slate-50">
                              <td className="p-2 font-mono text-slate-500">{dateStr}</td>
                              <td className="p-2 font-bold text-slate-900">{rep.unitNumber}</td>
                              <td className="p-2 text-slate-700">{rep.tenantName || 'Inquilino'}</td>
                              <td className="p-2 text-slate-800 font-medium truncate max-w-[150px]">{rep.category}</td>
                              <td className="p-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                                  rep.urgency === 'emergency'
                                    ? 'bg-rose-100 text-rose-800'
                                    : rep.urgency === 'high'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {rep.urgency}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                                  rep.status === 'resolved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rep.status === 'scheduled'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {rep.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {filteredReports.length > 5 && (
                    <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-500 font-medium border-t border-slate-200">
                      + {filteredReports.length - 5} outros registos de reparo serão incluídos no PDF final completo.
                    </div>
                  )}
                </div>

                <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                  <span>Documento oficial para auditoria de condomínio e arquivo predial</span>
                  <span>Página 1 de 1 (ou mais consoante o volume)</span>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>
              O PDF gerado inclui cabeçalho com carimbo, estatísticas agregadas e tabela detalhada.
            </span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl border border-slate-300 text-xs sm:text-sm transition-colors flex-1 sm:flex-initial"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handlePrintDocument}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-2xl border border-slate-300 text-xs sm:text-sm transition-colors inline-flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial shadow-xs"
              title="Abrir diálogo de impressão do navegador"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              disabled={isExporting || filteredReports.length === 0}
              onClick={handleDownloadPdf}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl shadow-sm shadow-blue-600/30 text-xs sm:text-sm transition-all inline-flex items-center justify-center space-x-2 flex-1 sm:flex-initial"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? 'A gerar PDF...' : 'Descarregar PDF (.pdf)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
