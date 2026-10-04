'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  onSnapshot, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { 
  db, 
  testConnection, 
  Unit, 
  Tenant, 
  CleaningStaff, 
  CleaningSchedule, 
  MaintenanceReport, 
  Announcement, 
  Payment,
  OperationType, 
  handleFirestoreError 
} from '../lib/firebase';
import { seedCondominiumData } from '../lib/seedData';
import { NotificationService } from '../lib/notifications';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { DashboardSection } from '../components/DashboardSection';
import { UnitsSection } from '../components/UnitsSection';
import { TenantsSection } from '../components/TenantsSection';
import { PaymentsSection } from '../components/PaymentsSection';
import { CleaningSection } from '../components/CleaningSection';
import { MaintenanceSection } from '../components/MaintenanceSection';
import { AnnouncementsSection } from '../components/AnnouncementsSection';
import { TenantPortalView } from '../components/TenantPortalView';
import { Building2, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [activeView, setActiveView] = useState<'admin' | 'tenant'>('admin');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'units' | 'tenants' | 'payments' | 'cleaning' | 'maintenance' | 'announcements'>('dashboard');
  const [selectedUnitReportFilter, setSelectedUnitReportFilter] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Real-time Firestore States
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cleaningStaff, setCleaningStaff] = useState<CleaningStaff[]>([]);
  const [cleaningSchedules, setCleaningSchedules] = useState<CleaningSchedule[]>([]);
  const [maintenanceReports, setMaintenanceReports] = useState<MaintenanceReport[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const isInitialLoadRef = useRef(true);
  const previousReportCountRef = useRef(0);

  // Validate Firestore connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listeners in Real-time with onSnapshot
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    try {
      // 1. Units
      const unsubUnits = onSnapshot(
        collection(db, 'units'),
        (snapshot) => {
          const list: Unit[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<Unit, 'id'>) });
          });
          list.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
          setUnits(list);
          setIsLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'units');
        }
      );
      unsubs.push(unsubUnits);

      // 2. Tenants
      const unsubTenants = onSnapshot(
        collection(db, 'tenants'),
        (snapshot) => {
          const list: Tenant[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<Tenant, 'id'>) });
          });
          list.sort((a, b) => a.name.localeCompare(b.name));
          setTenants(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'tenants');
        }
      );
      unsubs.push(unsubTenants);

      // 3. Cleaning Staff
      const unsubStaff = onSnapshot(
        collection(db, 'cleaning_staff'),
        (snapshot) => {
          const list: CleaningStaff[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<CleaningStaff, 'id'>) });
          });
          list.sort((a, b) => a.name.localeCompare(b.name));
          setCleaningStaff(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'cleaning_staff');
        }
      );
      unsubs.push(unsubStaff);

      // 4. Cleaning Schedules
      const unsubSchedules = onSnapshot(
        collection(db, 'cleaning_schedules'),
        (snapshot) => {
          const list: CleaningSchedule[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<CleaningSchedule, 'id'>) });
          });
          list.sort((a, b) => b.date.localeCompare(a.date));
          setCleaningSchedules(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'cleaning_schedules');
        }
      );
      unsubs.push(unsubSchedules);

      // 5. Maintenance Reports (Real-time Defect Tracking)
      const unsubReports = onSnapshot(
        collection(db, 'maintenance_reports'),
        (snapshot) => {
          const list: MaintenanceReport[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<MaintenanceReport, 'id'>) });
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Trigger audio if new defect arrived after initial load
          if (!isInitialLoadRef.current && list.length > previousReportCountRef.current) {
            const newest = list[0];
            NotificationService.sendPush(`Novo Defeito Reportado: ${newest.unitNumber}`, {
              body: `${newest.category}: ${newest.description.substring(0, 60)}...`,
              soundType: newest.urgency === 'emergency' ? 'urgent' : 'normal',
            });
          }

          previousReportCountRef.current = list.length;
          isInitialLoadRef.current = false;
          setMaintenanceReports(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'maintenance_reports');
        }
      );
      unsubs.push(unsubReports);

      // 6. Announcements
      const unsubAnnounce = onSnapshot(
        collection(db, 'announcements'),
        (snapshot) => {
          const list: Announcement[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<Announcement, 'id'>) });
          });
          list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
          setAnnouncements(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'announcements');
        }
      );
      unsubs.push(unsubAnnounce);

      // 7. Payments (Mensalidades & Rendas)
      const unsubPayments = onSnapshot(
        collection(db, 'payments'),
        (snapshot) => {
          const list: Payment[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<Payment, 'id'>) });
          });
          list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
          setPayments(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'payments');
        }
      );
      unsubs.push(unsubPayments);

    } catch (err) {
      console.error('Snapshot attachment error:', err);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Quick Seed Handler
  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedCondominiumData();
      NotificationService.sendPush('Dados de Demonstração Carregados!', {
        body: 'Quartos, inquilinos, mensalidades, escalas e relatórios foram gerados com sucesso.',
        soundType: 'success',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Automatically seed on initial load if database is empty
  useEffect(() => {
    const checkAndAutoSeed = async () => {
      try {
        const snap = await getDocs(collection(db, 'units'));
        if (snap.empty) {
          await seedCondominiumData();
        }
      } catch (err) {
        console.warn('Auto-seed check:', err);
      }
    };
    checkAndAutoSeed();
  }, []);

  const availableUnitsCount = units.filter((u) => u.status === 'available').length;
  const openReportsCount = maintenanceReports.filter((r) => r.status === 'open' || r.status === 'scheduled').length;
  const criticalReportsCount = maintenanceReports.filter(
    (r) => (r.urgency === 'emergency' || r.urgency === 'high') && r.status !== 'resolved'
  ).length;
  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending' || p.status === 'overdue').length;
  const today = new Date().toISOString().split('T')[0];
  const todayCleaningCount = cleaningSchedules.filter((s) => s.date === today).length;
  const morningCleaningCount = cleaningSchedules.filter((s) => s.date === today && s.shift === 'morning').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        availableUnitsCount={availableUnitsCount}
        openReportsCount={openReportsCount}
        criticalReportsCount={criticalReportsCount}
        morningCleaningCount={morningCleaningCount}
        announcementsCount={announcements.length}
        pendingPaymentsCount={pendingPaymentsCount}
        isSeeding={isSeeding}
        onSeedData={handleSeed}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area (Offset by Sidebar on Desktop) */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(true)}
          activeView={activeView}
          activeTab={activeTab}
          availableUnitsCount={availableUnitsCount}
          openReportsCount={openReportsCount}
          todayCleaningCount={todayCleaningCount}
          announcements={announcements}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Main Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          
          {/* Loading Indicator */}
          {isLoading && units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-xs">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">A conectar à base de dados em tempo real do condomínio...</p>
            </div>
          ) : activeView === 'tenant' ? (
            /* Tenant Portal Mode */
            <TenantPortalView
              reports={maintenanceReports}
              announcements={announcements}
              units={units}
              payments={payments}
            />
          ) : (
            /* Admin Mode Tabs */
            <div>
              {activeTab === 'dashboard' && (
                <DashboardSection
                  units={units}
                  tenants={tenants}
                  cleaningStaff={cleaningStaff}
                  cleaningSchedules={cleaningSchedules}
                  maintenanceReports={maintenanceReports}
                  payments={payments}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'units' && (
                <UnitsSection units={units} />
              )}

              {activeTab === 'tenants' && (
                <TenantsSection
                  tenants={tenants}
                  units={units}
                  onSelectTenantReports={(unitNumber) => {
                    setSelectedUnitReportFilter(unitNumber);
                    setActiveTab('maintenance');
                  }}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentsSection
                  payments={payments}
                  tenants={tenants}
                  units={units}
                />
              )}

              {activeTab === 'cleaning' && (
                <CleaningSection
                  staffList={cleaningStaff}
                  schedules={cleaningSchedules}
                />
              )}

              {activeTab === 'maintenance' && (
                <MaintenanceSection
                  reports={maintenanceReports}
                  defaultUnitFilter={selectedUnitReportFilter}
                  onClearUnitFilter={() => setSelectedUnitReportFilter(undefined)}
                />
              )}

              {activeTab === 'announcements' && (
                <AnnouncementsSection announcements={announcements} />
              )}
            </div>
          )}

        </main>

        {/* Footer in Light Theme */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800">CondoGest</span>
              <span>— Sistema de Gestão de Condomínio Residencial</span>
            </div>
            <div className="flex items-center space-x-4 text-slate-500 font-medium">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Firestore em Tempo Real</span>
              </span>
              <span>•</span>
              <span>Web Push Notifications</span>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
