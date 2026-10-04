'use client';

import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Volume2, 
  Check, 
  User, 
  ShieldCheck,
  Radio
} from 'lucide-react';
import { NotificationService } from '../lib/notifications';
import { Announcement } from '../lib/firebase';

interface HeaderProps {
  onToggleSidebar: () => void;
  activeView: 'admin' | 'tenant';
  activeTab: 'dashboard' | 'units' | 'tenants' | 'payments' | 'cleaning' | 'maintenance' | 'announcements';
  availableUnitsCount: number;
  openReportsCount: number;
  todayCleaningCount: number;
  announcements: Announcement[];
  onSelectTab: (tab: 'dashboard' | 'units' | 'tenants' | 'payments' | 'cleaning' | 'maintenance' | 'announcements') => void;
}

const TAB_TITLES: { [key: string]: { title: string; subtitle: string } } = {
  dashboard: { title: 'Dashboard Geral', subtitle: 'Métricas globais de ocupação, manutenção e limpeza' },
  units: { title: 'Quartos & Unidades', subtitle: 'Controle de disponibilidade, quartos vagos e ocupados' },
  tenants: { title: 'Registo de Clientes', subtitle: 'Cadastro de inquilinos, documentos e contactos de emergência' },
  payments: { title: 'Mensalidades & Rendas', subtitle: 'Cobrança de rendas, emissão de recibos e controle financeiro' },
  cleaning: { title: 'Equipa de Limpeza & Escalas', subtitle: 'Escalas de trabalho por turno (manhã/tarde) e departamentos' },
  maintenance: { title: 'Defeitos & Manutenção', subtitle: 'Relatórios de avarias elétricas, canalização e resolução' },
  announcements: { title: 'Mural de Avisos & Push', subtitle: 'Transmissão de comunicados urgentes aos moradores' },
};

export function Header({
  onToggleSidebar,
  activeView,
  activeTab,
  availableUnitsCount,
  openReportsCount,
  todayCleaningCount,
  announcements,
  onSelectTab,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(() => NotificationService.getPermissionState());

  const handleRequestPush = async () => {
    const res = await NotificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      NotificationService.sendPush('Notificações Ativadas com Sucesso!', {
        body: 'Você receberá os comunicados urgentes do condomínio no seu ecrã.',
        soundType: 'success',
      });
    }
  };

  const handleTestSound = () => {
    NotificationService.playAlertSound('urgent');
  };

  const urgentAnnouncements = announcements.filter((a) => a.priority === 'urgent');
  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs flex items-center justify-between px-4 sm:px-6 lg:px-8">
      
      {/* Left: Mobile Menu Trigger & Page Breadcrumb */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden border border-slate-200"
          title="Abrir Menu Lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-blue-600 hidden sm:inline">CondoGest</span>
            <span className="text-xs text-slate-400 hidden sm:inline">/</span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-none">
              {activeView === 'tenant' ? 'Portal do Inquilino' : currentTabInfo.title}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 hidden md:block">
            {activeView === 'tenant' ? 'Reporte avarias e consulte comunicados oficiais' : currentTabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick KPI Chips & Notifications */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Quick Indicators (Desktop) */}
        {activeView === 'admin' && (
          <div className="hidden xl:flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Vagos:</span>
              <strong className="font-bold text-emerald-900">{availableUnitsCount}</strong>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Abertos:</span>
              <strong className="font-bold text-amber-900">{openReportsCount}</strong>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Limpezas Hoje:</span>
              <strong className="font-bold text-blue-900">{todayCleaningCount}</strong>
            </div>
          </div>
        )}

        {/* Push Notification Bell & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
            title="Avisos do Condomínio e Notificações Push"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {announcements.length > 0 && (
              <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                urgentAnnouncements.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'
              }`}>
                {announcements.length}
              </span>
            )}
          </button>

          {/* Light Theme Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 text-slate-800 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">Notificações Push</h4>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  permission === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {permission === 'granted' ? '✅ Ativas' : 'Pendente'}
                </span>
              </div>

              {/* Activate Push Banner */}
              {permission !== 'granted' && (
                <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                  <p className="font-medium text-blue-900 mb-2">
                    Receba notificações no telemóvel/ecrã para cortes de água, reuniões e emergências.
                  </p>
                  <button
                    onClick={handleRequestPush}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 font-bold rounded-lg text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Ativar Notificações no Dispositivo</span>
                  </button>
                </div>
              )}

              {/* Sound Test */}
              <div className="mt-3 flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Sinal Sonoro de Alertas</span>
                <button
                  onClick={handleTestSound}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center space-x-1 shadow-2xs"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Testar Som</span>
                </button>
              </div>

              {/* Recent Announcements */}
              <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Últimos Comunicados
                </p>
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Nenhum aviso emitido ainda.</p>
                ) : (
                  announcements.slice(0, 3).map((a) => (
                    <div
                      key={a.id || a.title}
                      className={`p-2.5 rounded-xl border text-xs ${
                        a.priority === 'urgent'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate max-w-[200px]">{a.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          a.priority === 'urgent' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {a.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{a.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    onSelectTab('announcements');
                    setShowNotifications(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Abrir Mural Completo →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User / Administration Avatar Badge */}
        <div className="flex items-center space-x-2.5 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {activeView === 'admin' ? 'AD' : 'IN'}
          </div>
          <div className="hidden sm:block text-left text-xs leading-tight">
            <span className="font-bold text-slate-800 block">
              {activeView === 'admin' ? 'Síndico / Admin' : 'Inquilino'}
            </span>
            <span className="text-[11px] text-slate-400">
              {activeView === 'admin' ? 'Gestão Geral' : 'Quarto Q-101'}
            </span>
          </div>
        </div>

      </div>

    </header>
  );
}
