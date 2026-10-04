'use client';

import React from 'react';
import { 
  Building2, 
  BarChart3, 
  UserCheck, 
  Sparkles, 
  AlertTriangle, 
  Bell, 
  ShieldCheck, 
  User, 
  RefreshCw, 
  Radio, 
  CheckCircle2, 
  X,
  Layers,
  Sun,
  CreditCard
} from 'lucide-react';
import { Announcement } from '../lib/firebase';

interface SidebarProps {
  activeView: 'admin' | 'tenant';
  setActiveView: (view: 'admin' | 'tenant') => void;
  activeTab: 'dashboard' | 'units' | 'tenants' | 'payments' | 'cleaning' | 'maintenance' | 'announcements';
  setActiveTab: (tab: 'dashboard' | 'units' | 'tenants' | 'payments' | 'cleaning' | 'maintenance' | 'announcements') => void;
  availableUnitsCount: number;
  openReportsCount: number;
  criticalReportsCount: number;
  morningCleaningCount: number;
  announcementsCount: number;
  pendingPaymentsCount: number;
  isSeeding: boolean;
  onSeedData: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  activeView,
  setActiveView,
  activeTab,
  setActiveTab,
  availableUnitsCount,
  openReportsCount,
  criticalReportsCount,
  morningCleaningCount,
  announcementsCount,
  pendingPaymentsCount,
  isSeeding,
  onSeedData,
  isOpen,
  onClose,
}: SidebarProps) {

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'units',
      label: 'Quartos & Unidades',
      icon: Building2,
      badge: `${availableUnitsCount} vagos`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'tenants',
      label: 'Registo de Clientes',
      icon: UserCheck,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'payments',
      label: 'Mensalidades & Rendas',
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} pendentes` : null,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    },
    {
      id: 'cleaning',
      label: 'Equipa de Limpeza',
      icon: Sparkles,
      badge: morningCleaningCount > 0 ? `${morningCleaningCount} manhã` : null,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'maintenance',
      label: 'Defeitos & Avarias',
      icon: AlertTriangle,
      badge: openReportsCount > 0 ? `${openReportsCount} abertos` : null,
      badgeColor: criticalReportsCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' : 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'announcements',
      label: 'Avisos & Notificações',
      icon: Bell,
      badge: announcementsCount > 0 ? `${announcementsCount}` : null,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-sm flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand & Close (mobile) */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100">
            <div 
              onClick={() => {
                setActiveTab('dashboard');
                onClose();
              }}
              className="flex items-center space-x-3 cursor-pointer select-none"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    Condo<span className="text-blue-600">Gest</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Pro
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                  Solar dos Pinheiros
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Perspective Switcher: Admin vs Portal do Inquilino */}
          <div className="p-4">
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center text-xs font-semibold text-slate-600 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveView('admin')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl transition-all ${
                  activeView === 'admin'
                    ? 'bg-white text-blue-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('tenant')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl transition-all ${
                  activeView === 'tenant'
                    ? 'bg-white text-blue-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Inquilino</span>
              </button>
            </div>
          </div>

          {/* Navigation Items (Admin View) */}
          {activeView === 'admin' ? (
            <nav className="px-3 space-y-1">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu Principal
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-blue-700/80 text-white border-blue-500'
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          ) : (
            /* Tenant Mode Sidebar Nav */
            <div className="px-4 py-2 space-y-3">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-1">
                  Portal do Inquilino
                </span>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Consulte os seus chamados, reporte novas avarias no quarto e receba os avisos do condomínio.
                </p>
              </div>

              <button
                onClick={() => setActiveView('admin')}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center space-x-2 shadow-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Voltar ao Painel Admin</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* Quick Demo Data Seeder */}
          <button
            type="button"
            onClick={onSeedData}
            disabled={isSeeding}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            title="Preencher com dados demonstrativos de quartos, inquilinos e escalas"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'A Carregar...' : 'Carregar Dados Demo'}</span>
          </button>

          {/* Real-time Status Indicator */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-700">Firestore Ativo</span>
            </span>
            <span className="text-blue-600 font-semibold">Tempo Real</span>
          </div>
        </div>
      </aside>
    </>
  );
}
