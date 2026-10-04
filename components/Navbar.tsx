'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Bell, 
  UserCheck, 
  ShieldCheck, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Home,
  Check,
  BarChart3
} from 'lucide-react';
import { NotificationService } from '../lib/notifications';
import { Announcement } from '../lib/firebase';

interface NavbarProps {
  activeView: 'admin' | 'tenant';
  setActiveView: (view: 'admin' | 'tenant') => void;
  activeTab: 'dashboard' | 'units' | 'tenants' | 'cleaning' | 'maintenance' | 'announcements';
  setActiveTab: (tab: 'dashboard' | 'units' | 'tenants' | 'cleaning' | 'maintenance' | 'announcements') => void;
  announcements: Announcement[];
  availableUnitsCount: number;
  openReportsCount: number;
  todayCleaningCount: number;
  onSeedData: () => Promise<void>;
  isSeeding: boolean;
}

export function Navbar({
  activeView,
  setActiveView,
  activeTab,
  setActiveTab,
  announcements,
  availableUnitsCount,
  openReportsCount,
  todayCleaningCount,
  onSeedData,
  isSeeding,
}: NavbarProps) {
  const [permission, setPermission] = useState<NotificationPermission>(() => NotificationService.getPermissionState());
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleRequestPush = async () => {
    const res = await NotificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      NotificationService.sendPush('Notificações Ativadas!', {
        body: 'Você receberá avisos importantes do condomínio em tempo real.',
        soundType: 'success',
      });
    }
  };

  const handleTestSound = () => {
    NotificationService.playAlertSound('urgent');
  };

  const urgentAnnouncements = announcements.filter((a) => a.priority === 'urgent');

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Condo Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                  CondoGest
                </span>
                <span className="text-[10px] tracking-wider uppercase font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  Gestão Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Residencial Solar dos Pinheiros
              </p>
            </div>
          </div>

          {/* Quick Realtime Indicators */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium">Quartos Vagos:</span>
              <strong className="font-bold text-white text-sm">{availableUnitsCount}</strong>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-950/60 border border-amber-500/30 text-amber-300 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">Defeitos Abertos:</span>
              <strong className="font-bold text-white text-sm">{openReportsCount}</strong>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium">Limpezas Hoje:</span>
              <strong className="font-bold text-white text-sm">{todayCleaningCount}</strong>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* View Switcher: Admin vs Portal do Inquilino */}
            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 flex items-center text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveView('admin')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'admin'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Painel de Administração e Síndico"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Administração</span>
                <span className="sm:hidden">Admin</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveView('tenant')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'tenant'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Portal do Inquilino para Reportar Defeitos e Ver Avisos"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Portal do Inquilino</span>
                <span className="sm:hidden">Inquilino</span>
              </button>
            </div>

            {/* Push Notifications Toggle & Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Notificações Push e Avisos Importantes"
              >
                <Bell className="w-5 h-5" />
                {announcements.length > 0 && (
                  <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    urgentAnnouncements.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'
                  }`}>
                    {announcements.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotificationsMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-4 z-50 text-slate-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <h4 className="font-semibold text-sm text-white">Notificações Push</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {permission === 'granted' ? '✅ Ativas no navegador' : 'Aguardando permissão'}
                    </span>
                  </div>

                  {/* Browser Push Permission CTA */}
                  {permission !== 'granted' && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-xs">
                      <p className="font-medium text-blue-200 mb-2">
                        Receba avisos imediatos de corte de água, obras e emergências direto no telemóvel/ecrã.
                      </p>
                      <button
                        onClick={handleRequestPush}
                        className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg text-white transition-colors flex items-center justify-center space-x-1.5 shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Ativar Notificações Push</span>
                      </button>
                    </div>
                  )}

                  {/* Audio Chime tester */}
                  <div className="mt-3 flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-700/50">
                    <span className="text-slate-300">Sinal Sonoro de Alertas</span>
                    <button
                      onClick={handleTestSound}
                      className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-[11px] font-medium flex items-center space-x-1"
                    >
                      <Volume2 className="w-3 h-3 text-amber-300" />
                      <span>Testar Som</span>
                    </button>
                  </div>

                  {/* Recent Announcements Feed */}
                  <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                              : 'bg-slate-900/60 border-slate-700 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white truncate max-w-[200px]">{a.title}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              a.priority === 'urgent' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {a.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{a.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700 text-center">
                    <button
                      onClick={() => {
                        setActiveTab('announcements');
                        setShowNotificationsMenu(false);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Abrir Mural de Avisos Completo →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seed Demo Data Button */}
            <button
              type="button"
              onClick={onSeedData}
              disabled={isSeeding}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-500/30 text-indigo-200 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50"
              title="Carregar Dados Demonstrativos de Quartos, Clientes, Limpezas e Defeitos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Dados Demo</span>
            </button>

          </div>
        </div>

        {/* Admin Navigation Tabs */}
        {activeView === 'admin' && (
          <nav className="flex space-x-1 overflow-x-auto pb-2 sm:pb-3 scrollbar-none text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('units')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'units'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Quartos & Unidades</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-900/50">
                {availableUnitsCount} vagos
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'tenants'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Registro de Clientes</span>
            </button>

            <button
              onClick={() => setActiveTab('cleaning')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'cleaning'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Equipa de Limpeza & Escalas</span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'maintenance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Defeitos & Manutenção</span>
              {openReportsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-bold">
                  {openReportsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'announcements'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Avisos & Notificações</span>
            </button>
          </nav>
        )}

      </div>
    </header>
  );
}
