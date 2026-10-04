'use client';

import React from 'react';
import { 
  Building2, 
  AlertTriangle, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  Wrench, 
  Sparkles, 
  Sun, 
  ArrowUpRight, 
  Clock, 
  AlertOctagon,
  ShieldAlert,
  BarChart3,
  PieChart as PieChartIcon,
  CreditCard
} from 'lucide-react';
import { 
  Unit, 
  Tenant, 
  CleaningStaff, 
  CleaningSchedule, 
  MaintenanceReport,
  Payment
} from '../lib/firebase';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface DashboardSectionProps {
  units: Unit[];
  tenants: Tenant[];
  cleaningStaff: CleaningStaff[];
  cleaningSchedules: CleaningSchedule[];
  maintenanceReports: MaintenanceReport[];
  payments: Payment[];
  onNavigateTab: (tab: 'dashboard' | 'units' | 'tenants' | 'payments' | 'cleaning' | 'maintenance' | 'announcements') => void;
}

const emptySubscribe = () => () => {};

export function DashboardSection({
  units,
  tenants,
  cleaningStaff,
  cleaningSchedules,
  maintenanceReports,
  payments,
  onNavigateTab,
}: DashboardSectionProps) {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // 1. Estatísticas de Quartos e Ocupação
  const totalUnits = units.length;
  const availableUnits = units.filter((u) => u.status === 'available').length;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  const maintenanceUnits = units.filter((u) => u.status === 'maintenance').length;
  const reservedUnits = units.filter((u) => u.status === 'reserved').length;
  const occupancyPercentage = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0';

  // 1.1 Estatísticas de Pagamentos
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter((p) => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;

  const monthlyRevenue = units
    .filter((u) => u.status === 'occupied')
    .reduce((acc, curr) => acc + (curr.rentPrice || 0), 0);

  // 2. Estatísticas de Defeitos e Manutenção
  const openReports = maintenanceReports.filter((r) => r.status !== 'resolved');
  const criticalDefects = openReports.filter(
    (r) => r.urgency === 'emergency' || r.urgency === 'high'
  ).length;
  const emergencyDefects = openReports.filter((r) => r.urgency === 'emergency').length;
  const resolvedReports = maintenanceReports.filter((r) => r.status === 'resolved').length;

  // 3. Estatísticas de Funcionários de Limpeza
  const totalStaff = cleaningStaff.length;
  const activeStaff = cleaningStaff.filter((s) => s.status === 'active').length;
  const vacationStaff = cleaningStaff.filter((s) => s.status === 'vacation').length;
  const today = new Date().toISOString().split('T')[0];
  const todaySchedules = cleaningSchedules.filter((s) => s.date === today);
  const morningCleanersCount = todaySchedules.filter((s) => s.shift === 'morning').length;

  // 4. Dados para Gráfico de Ocupação (Pizza/Donut)
  const occupancyChartData = [
    { name: 'Ocupados', value: occupiedUnits, color: '#2563eb' }, // blue-600
    { name: 'Vagos / Disponíveis', value: availableUnits, color: '#10b981' }, // emerald-500
    { name: 'Em Manutenção', value: maintenanceUnits, color: '#f59e0b' }, // amber-500
    { name: 'Reservados', value: reservedUnits, color: '#8b5cf6' }, // purple-500
  ].filter((item) => item.value > 0);

  // 5. Dados para Gráfico de Defeitos por Categoria (Barras)
  const categoryMap: { [key: string]: { abertos: number; resolvidos: number } } = {};
  maintenanceReports.forEach((rep) => {
    let shortName = rep.category;
    if (shortName.includes('Elétrica')) shortName = 'Elétrica';
    else if (shortName.includes('Água') || shortName.includes('Canalização')) shortName = 'Canalização/Água';
    else if (shortName.includes('Fechaduras') || shortName.includes('Portas')) shortName = 'Fechaduras/Portas';
    else if (shortName.includes('Ar Condicionado')) shortName = 'Climatização';
    else if (shortName.includes('Infiltração')) shortName = 'Infiltrações';
    else shortName = 'Outros Defeitos';

    if (!categoryMap[shortName]) {
      categoryMap[shortName] = { abertos: 0, resolvidos: 0 };
    }
    if (rep.status === 'resolved') {
      categoryMap[shortName].resolvidos += 1;
    } else {
      categoryMap[shortName].abertos += 1;
    }
  });

  const categoryChartData = Object.keys(categoryMap).map((cat) => ({
    categoria: cat,
    Abertos: categoryMap[cat].abertos,
    Resolvidos: categoryMap[cat].resolvidos,
  }));

  // 6. Dados para Gráfico de Escalas por Turno
  const shiftChartData = [
    {
      turno: 'Manhã (08h-13h)',
      escalados: cleaningSchedules.filter((s) => s.shift === 'morning').length,
      fill: '#f59e0b',
    },
    {
      turno: 'Tarde (13h-18h)',
      escalados: cleaningSchedules.filter((s) => s.shift === 'afternoon').length,
      fill: '#3b82f6',
    },
    {
      turno: 'Noite (18h-22h)',
      escalados: cleaningSchedules.filter((s) => s.shift === 'night').length,
      fill: '#6366f1',
    },
  ];

  // 7. Dados para Gráfico de Defeitos por Urgência (Pizza)
  const urgencyChartData = [
    { name: '🚨 Emergência', value: openReports.filter((r) => r.urgency === 'emergency').length, color: '#ef4444' },
    { name: 'Alta Urgência', value: openReports.filter((r) => r.urgency === 'high').length, color: '#f97316' },
    { name: 'Média', value: openReports.filter((r) => r.urgency === 'medium').length, color: '#2563eb' },
    { name: 'Baixa', value: openReports.filter((r) => r.urgency === 'low').length, color: '#94a3b8' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Dashboard & Estatísticas Gerais
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Visão consolidada em tempo real da ocupação do condomínio, ocorrências críticas e equipa de limpeza.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Sincronização em Tempo Real</span>
          </span>
        </div>
      </div>

      {/* KPI Headline Cards: Ocupação Total, Defeitos Críticos Abertos, Funcionários Ativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Taxa de Ocupação & Quartos */}
        <div 
          onClick={() => onNavigateTab('units')}
          className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-5 rounded-3xl shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ocupação Total</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">{occupancyPercentage}%</span>
            <span className="text-xs text-blue-700 font-semibold">{occupiedUnits} de {totalUnits} unidades</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
            <span className="text-emerald-700 font-bold flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{availableUnits} quartos vagos</span>
            </span>
            <span className="text-slate-500 font-semibold">{monthlyRevenue} € / mês</span>
          </div>
        </div>

        {/* 2. Defeitos Críticos Abertos */}
        <div 
          onClick={() => onNavigateTab('maintenance')}
          className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 p-5 rounded-3xl shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
        >
          {criticalDefects > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-500 animate-pulse" />
          )}
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Defeitos Críticos</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">{criticalDefects}</span>
            {emergencyDefects > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                {emergencyDefects} Emergência!
              </span>
            ) : (
              <span className="text-xs text-rose-700 font-semibold">Alta / Emergência</span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
            <span className="text-slate-500">Total pendentes: <strong className="text-slate-800">{openReports.length}</strong></span>
            <span className="text-emerald-700 font-semibold">{resolvedReports} resolvidos</span>
          </div>
        </div>

        {/* 3. Funcionários de Limpeza Ativos */}
        <div 
          onClick={() => onNavigateTab('cleaning')}
          className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 p-5 rounded-3xl shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Funcionários Ativos</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">{activeStaff}</span>
            <span className="text-xs text-indigo-700 font-semibold">de {totalStaff} colaboradores</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
            <span className="text-amber-800 font-semibold flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>{morningCleanersCount} na escala da manhã</span>
            </span>
            {vacationStaff > 0 && (
              <span className="text-slate-500">{vacationStaff} em férias</span>
            )}
          </div>
        </div>

        {/* 4. Inquilinos Registados */}
        <div 
          onClick={() => onNavigateTab('tenants')}
          className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 p-5 rounded-3xl shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inquilinos Ativos</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {tenants.filter((t) => t.status === 'active').length}
            </span>
            <span className="text-xs text-emerald-700 font-semibold">Moradores atuais</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
            <span className="text-slate-500">Total histórico: <strong className="text-slate-800">{tenants.length}</strong></span>
            <span className="text-blue-600 font-semibold flex items-center space-x-0.5">
              <span>Gerir</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

      </div>

      {/* Financial Overview Banner */}
      <div 
        onClick={() => onNavigateTab('payments')}
        className="cursor-pointer p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4 group hover:shadow-lg transition-all"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 group-hover:scale-105 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Gestão de Mensalidades & Rendas</span>
              {overdueCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-slate-950 animate-pulse">
                  {overdueCount} em atraso
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-black mt-0.5">
              Receita Arrecadada: {totalPaid} €
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              {pendingCount} mensalidades pendentes ({totalPending} €) • {overdueCount} em atraso ({totalOverdue} €)
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigateTab('payments');
          }}
          className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-extrabold rounded-2xl text-xs flex items-center space-x-1.5 shadow-sm transition-transform hover:scale-105"
        >
          <span>Gerir Pagamentos & Recibos</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-blue-700" />
        </button>
      </div>

      {/* Main Charts Row: Recharts Visualizations in White & Blue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Ocupação das Unidades (Pizza / Donut) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Distribuição de Ocupação dos Quartos</h3>
            </div>
            <button
              onClick={() => onNavigateTab('units')}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
            >
              <span>Gerir Quartos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Proporção de quartos vagos, ocupados, em processo de manutenção e reservados no condomínio.
          </p>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            {mounted && occupancyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {occupancyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: any, name: any) => [`${value} quartos`, name]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">A carregar dados de ocupação...</div>
            )}
          </div>

          {/* Quick breakdown footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-700 block font-bold text-base">{availableUnits}</span>
              <span className="text-emerald-800 text-[11px] font-medium">Vagos</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-blue-700 block font-bold text-base">{occupiedUnits}</span>
              <span className="text-blue-800 text-[11px] font-medium">Ocupados</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-amber-700 block font-bold text-base">{maintenanceUnits}</span>
              <span className="text-amber-800 text-[11px] font-medium">Manutenção</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-100">
              <span className="text-purple-700 block font-bold text-base">{reservedUnits}</span>
              <span className="text-purple-800 text-[11px] font-medium">Reservados</span>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Defeitos por Categoria (Barras com Recharts) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <Wrench className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Relatórios de Defeitos por Categoria</h3>
            </div>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center space-x-1"
            >
              <span>Ver Chamados</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Volume de ocorrências reportadas pelos inquilinos (abertos vs resolvidos) por especialidade técnica.
          </p>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            {mounted && categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="categoria" 
                    stroke="#64748b" 
                    fontSize={11} 
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>}
                  />
                  <Bar dataKey="Abertos" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Resolvidos" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">Sem relatórios de defeitos registados.</div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>🚨 Defeitos críticos não resolvidos: <strong className="text-rose-600">{criticalDefects}</strong></span>
            <span className="text-emerald-700 font-semibold">{resolvedReports} resolvidos com sucesso</span>
          </div>
        </div>

      </div>

      {/* Second Row: Turnos de Limpeza & Urgência de Ocorrências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 3: Escalas de Limpeza por Turno (Manhã vs Tarde vs Noite) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <Sun className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Escalas de Limpeza por Período</h3>
            </div>
            <button
              onClick={() => onNavigateTab('cleaning')}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
            >
              <span>Escala Completa</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Volume de turnos programados, com destaque para a alocação no <strong>Período da Manhã</strong>.
          </p>

          <div className="h-60 w-full flex items-center justify-center">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="turno" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: any) => [`${value} turnos agendados`, 'Escalas']}
                  />
                  <Bar dataKey="escalados" radius={[8, 8, 0, 0]}>
                    {shiftChartData.map((entry, index) => (
                      <Cell key={`shift-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">A carregar turnos...</div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-amber-800 font-semibold flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>Turno da Manhã: {cleaningSchedules.filter((s) => s.shift === 'morning').length} escalas</span>
            </span>
            <span className="text-slate-500">Total colaboradores: <strong className="text-slate-900">{activeStaff} ativos</strong></span>
          </div>
        </div>

        {/* Gráfico 4: Ocorrências Abertas por Nível de Urgência */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Gravidade das Ocorrências Pendentes</h3>
            </div>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1"
            >
              <span>Resolver Urgências</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Distribuição dos chamados em aberto por grau de risco (Emergência imediata vs Alta prioridade).
          </p>

          <div className="h-60 w-full flex items-center justify-center">
            {mounted && urgencyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {urgencyChartData.map((entry, index) => (
                      <Cell key={`urgency-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: any, name: any) => [`${value} chamados`, name]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 text-xs py-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">Nenhum defeito urgente em aberto no momento!</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>🚨 Emergências: <strong className="text-rose-600">{emergencyDefects}</strong></span>
            <span>Alta: <strong className="text-amber-600">{openReports.filter((r) => r.urgency === 'high').length}</strong></span>
            <span>Média/Baixa: <strong className="text-blue-600">{openReports.filter((r) => r.urgency === 'medium' || r.urgency === 'low').length}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
}
