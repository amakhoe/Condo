'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Users, 
  Clock, 
  Sun, 
  Sunset, 
  Moon, 
  Plus, 
  CheckCircle2, 
  Phone, 
  Mail, 
  XCircle, 
  Check, 
  Trash2, 
  CalendarCheck,
  Building
} from 'lucide-react';
import { CleaningStaff, CleaningSchedule, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface CleaningSectionProps {
  staffList: CleaningStaff[];
  schedules: CleaningSchedule[];
}

const DEPARTMENTS = [
  'Hall de Entrada & Portaria Principal',
  'Corredores & Átrios (Bloco A)',
  'Corredores & Átrios (Bloco B)',
  'Escadarias de Emergência & Elevadores',
  'Salão de Festas & Área Gourmet',
  'Piscina & Zona de Lazer Exterior',
  'Garagem Subsolo & Parqueamento',
  'Depósito Geral de Resíduos / Lixeira',
  'Ginásio & Vestiários do Condomínio',
  'Terraço / Cobertura Técnica',
];

export function CleaningSection({ staffList, schedules }: CleaningSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'schedules' | 'staff'>('schedules');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Schedule
  const [scheduleStaffId, setScheduleStaffId] = useState('');
  const [scheduleStaffName, setScheduleStaffName] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleShift, setScheduleShift] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [scheduleDepartment, setScheduleDepartment] = useState(DEPARTMENTS[0]);
  const [scheduleNotes, setScheduleNotes] = useState('');

  // Form State - Staff
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('+351 ');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffStatus, setStaffStatus] = useState<'active' | 'vacation' | 'inactive'>('active');
  const [staffShiftPref, setStaffShiftPref] = useState('Período da Manhã (08:00 - 13:00)');
  const [staffNotes, setStaffNotes] = useState('');

  // Filter schedules
  const filteredSchedules = schedules.filter((s) => {
    const matchesShift = shiftFilter === 'all' || s.shift === shiftFilter;
    const matchesDept = departmentFilter === 'all' || s.departmentOrArea === departmentFilter;
    const matchesDate = !dateFilter || s.date === dateFilter;
    return matchesShift && matchesDept && matchesDate;
  });

  // Morning Cleaners calculation for quick highlight
  const morningSchedules = schedules.filter((s) => s.shift === 'morning');

  const handleOpenScheduleModal = () => {
    if (staffList.length > 0) {
      setScheduleStaffId(staffList[0].id || '');
      setScheduleStaffName(staffList[0].name);
    } else {
      setScheduleStaffId('');
      setScheduleStaffName('');
    }
    setScheduleDate(new Date().toISOString().split('T')[0]);
    setScheduleShift('morning');
    setScheduleDepartment(DEPARTMENTS[0]);
    setScheduleNotes('');
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleStaffName.trim() || !scheduleDepartment.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<CleaningSchedule, 'id'> = {
        staffId: scheduleStaffId,
        staffName: scheduleStaffName,
        date: scheduleDate,
        shift: scheduleShift,
        departmentOrArea: scheduleDepartment,
        status: 'scheduled',
        notes: scheduleNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'cleaning_schedules'), payload);
      setIsScheduleModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'cleaning_schedules');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleScheduleStatus = async (sch: CleaningSchedule, nextStatus: 'scheduled' | 'in_progress' | 'completed') => {
    if (!sch.id) return;
    try {
      await updateDoc(doc(db, 'cleaning_schedules', sch.id), {
        status: nextStatus,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `cleaning_schedules/${sch.id}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Deseja eliminar esta escala de limpeza?')) return;
    try {
      await deleteDoc(doc(db, 'cleaning_schedules', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cleaning_schedules/${id}`);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<CleaningStaff, 'id'> = {
        name: staffName.trim(),
        phone: staffPhone.trim(),
        email: staffEmail.trim(),
        status: staffStatus,
        shiftPreference: staffShiftPref.trim(),
        notes: staffNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'cleaning_staff'), payload);
      setIsStaffModalOpen(false);
      setStaffName('');
      setStaffNotes('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'cleaning_staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Deseja desativar este funcionário?')) return;
    try {
      await deleteDoc(doc(db, 'cleaning_staff', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cleaning_staff/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Equipa de Limpeza & Escala de Trabalho
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Quem vai limpar durante o período da manhã e quais departamentos do condomínio serão higienizados.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-2xl text-xs sm:text-sm inline-flex items-center space-x-1.5 transition-colors"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Registar Funcionário</span>
          </button>

          <button
            onClick={handleOpenScheduleModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-sm shadow-blue-600/30 text-xs sm:text-sm inline-flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Escalar Horário</span>
          </button>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('schedules')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === 'schedules'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Escalas de Horários ({schedules.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('staff')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === 'staff'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Equipa de Limpeza ({staffList.length})</span>
          </button>
        </div>

        {/* Morning Shift Special Callout */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <Sun className="w-4 h-4 text-amber-600" />
          <span>Escalados para a <strong>Manhã</strong>:</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
            {morningSchedules.length}
          </span>
        </div>
      </div>

      {/* VIEW: SCHEDULES */}
      {activeSubTab === 'schedules' && (
        <div className="space-y-4">
          
          {/* Filters Bar: Shifts (Morning highlight), Department and Date */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              {/* Shift Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setShiftFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    shiftFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({schedules.length})
                </button>

                {/* Período da Manhã (Explicit user requirement) */}
                <button
                  onClick={() => setShiftFilter('morning')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
                    shiftFilter === 'morning'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Período da Manhã ({morningSchedules.length})</span>
                </button>

                <button
                  onClick={() => setShiftFilter('afternoon')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1.5 ${
                    shiftFilter === 'afternoon' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Sunset className="w-3.5 h-3.5" />
                  <span>Tarde ({schedules.filter((s) => s.shift === 'afternoon').length})</span>
                </button>

                <button
                  onClick={() => setShiftFilter('night')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1.5 ${
                    shiftFilter === 'night' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Noite ({schedules.filter((s) => s.shift === 'night').length})</span>
                </button>
              </div>

              {/* Department & Date Filter */}
              <div className="flex items-center space-x-2 text-xs">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option value="all">Todos os Departamentos</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                  title="Filtrar por data específica"
                />

                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
                    title="Limpar filtro de data"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Schedules Listing */}
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Nenhuma escala agendada para os filtros selecionados</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Crie uma nova escala especificando o funcionário, o período (ex: Manhã) e o departamento do condomínio.
              </p>
              <button
                onClick={handleOpenScheduleModal}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Escalar Horário Agora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((sch) => {
                const isMorning = sch.shift === 'morning';
                const isAfternoon = sch.shift === 'afternoon';
                const isCompleted = sch.status === 'completed';

                return (
                  <div
                    key={sch.id || `${sch.staffName}-${sch.date}`}
                    className={`rounded-3xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                      isCompleted
                        ? 'bg-slate-50/80 border-slate-200 opacity-90'
                        : isMorning
                        ? 'bg-white border-amber-300 hover:border-amber-400'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      {/* Top Header: Shift Pill + Date */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isMorning
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : isAfternoon
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {isMorning && <Sun className="w-3.5 h-3.5 text-amber-600" />}
                          {isAfternoon && <Sunset className="w-3.5 h-3.5 text-blue-600" />}
                          {!isMorning && !isAfternoon && <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                          <span>{isMorning ? 'Período da Manhã' : isAfternoon ? 'Período da Tarde' : 'Período da Noite'}</span>
                        </span>

                        <span className="text-xs text-slate-500 font-semibold">
                          {sch.date}
                        </span>
                      </div>

                      {/* Who is cleaning (Funcionário) */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-black text-sm shadow-xs">
                          {sch.staffName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-semibold uppercase">Funcionário(a) Escalado(a):</span>
                          <h4 className="font-bold text-slate-900 text-base leading-tight">
                            {sch.staffName}
                          </h4>
                        </div>
                      </div>

                      {/* Which department / area of condo (Departamento a Limpar) */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs mb-3">
                        <div className="flex items-center space-x-1.5 text-blue-700 font-bold mb-1">
                          <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Departamento / Área a Limpar:</span>
                        </div>
                        <p className="text-slate-900 font-bold pl-5 text-sm">
                          {sch.departmentOrArea}
                        </p>
                      </div>

                      {/* Instructions / Notes */}
                      {sch.notes && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                          &ldquo;{sch.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Footer Actions: Status and Delete */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {/* Status toggle buttons */}
                      <div className="flex items-center space-x-1.5">
                        {sch.status !== 'completed' ? (
                          <>
                            {sch.status === 'scheduled' && (
                              <button
                                onClick={() => handleToggleScheduleStatus(sch, 'in_progress')}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold"
                              >
                                Iniciar
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleScheduleStatus(sch, 'completed')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Concluir</span>
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Limpeza Concluída</span>
                          </span>
                        )}
                      </div>

                      {sch.id && (
                        <button
                          onClick={() => handleDeleteSchedule(sch.id!)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar escala"
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

        </div>
      )}

      {/* VIEW: STAFF MEMBERS (Registro de funcionários de limpeza) */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          {staffList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Nenhum funcionário de limpeza cadastrado</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Adicione membros à equipa de limpeza para que possam ser escalados nos horários de trabalho.
              </p>
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registar Funcionário</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((st) => (
                <div
                  key={st.id || st.name}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-5 shadow-xs hover:shadow-md flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-black text-base shadow-xs">
                          {st.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base leading-tight">
                            {st.name}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block ${
                            st.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {st.status === 'active' ? 'Ativo(a)' : st.status === 'vacation' ? 'Férias' : 'Inativo'}
                          </span>
                        </div>
                      </div>

                      {st.id && (
                        <button
                          onClick={() => handleDeleteStaff(st.id!)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remover funcionário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-medium">{st.phone || 'Sem telefone'}</span>
                      </div>

                      {st.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span>{st.email}</span>
                        </div>
                      )}

                      {st.shiftPreference && (
                        <div className="flex items-center space-x-2 text-blue-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Turno: {st.shiftPreference}</span>
                        </div>
                      )}

                      {st.notes && (
                        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 mt-2">
                          <span className="font-bold text-slate-800 block mb-0.5">Especialidade / Notas:</span>
                          {st.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setScheduleStaffId(st.id || '');
                        setScheduleStaffName(st.name);
                        setScheduleShift('morning');
                        setIsScheduleModalOpen(true);
                      }}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar à Escala de Limpeza</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Escalar Horário de Limpeza */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Escalar Horário de Limpeza</span>
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-4 text-xs sm:text-sm">
              
              {/* Quem vai limpar (Funcionário) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Quem vai limpar? (Funcionário) *
                </label>
                {staffList.length > 0 ? (
                  <select
                    value={scheduleStaffName}
                    onChange={(e) => {
                      const selected = staffList.find((s) => s.name === e.target.value);
                      setScheduleStaffName(e.target.value);
                      if (selected && selected.id) setScheduleStaffId(selected.id);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  >
                    {staffList.map((st) => (
                      <option key={st.id || st.name} value={st.name}>
                        {st.name} ({st.shiftPreference || 'Turno Geral'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={scheduleStaffName}
                    onChange={(e) => setScheduleStaffName(e.target.value)}
                    placeholder="Ex: Dona Maria de Fátima"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                )}
              </div>

              {/* Data e Período (Destaque Manhã) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Data da Escala *</label>
                  <input
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Período de Trabalho *</label>
                  <select
                    value={scheduleShift}
                    onChange={(e) => setScheduleShift(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold text-amber-700"
                  >
                    <option value="morning">☀️ Período da Manhã (08:00 - 13:00)</option>
                    <option value="afternoon">🌤️ Período da Tarde (13:00 - 18:00)</option>
                    <option value="night">🌙 Período da Noite (18:00 - 22:00)</option>
                  </select>
                </div>
              </div>

              {/* Qual departamento do condomínio vai limpar */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Qual departamento do condomínio vai limpar? *
                </label>
                <select
                  value={scheduleDepartment}
                  onChange={(e) => setScheduleDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-semibold"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instruções / Checklist */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Checklist e Instruções Específicas
                </label>
                <textarea
                  rows={2}
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="Ex: Desinfeção de corrimões, limpeza de espelhos, recolha de lixo da recepção..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
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
                      <span>Salvar Escala</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Registar Funcionário de Limpeza */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Registar Novo Funcionário de Limpeza</span>
              </h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome Completo do Funcionário *</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Ex: Dona Maria de Fátima"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Telefone / Telemóvel *</label>
                  <input
                    type="tel"
                    required
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="+351 965 112 334"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estado</label>
                  <select
                    value={staffStatus}
                    onChange={(e) => setStaffStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="active">🟢 Ativo(a)</option>
                    <option value="vacation">🏖️ Em Férias</option>
                    <option value="inactive">⚪ Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="limpeza@condominio.pt"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Turno de Preferência</label>
                  <select
                    value={staffShiftPref}
                    onChange={(e) => setStaffShiftPref(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  >
                    <option value="Período da Manhã (08:00 - 13:00)">☀️ Período da Manhã</option>
                    <option value="Período da Tarde (13:00 - 18:00)">🌤️ Período da Tarde</option>
                    <option value="Disponibilidade Total">Rotativo / Ambos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Especialidades ou Observações</label>
                <textarea
                  rows={2}
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="Ex: Experiente em polimento de pisos de granito e lavagem de garagens com alta pressão..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
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
                    <span>A guardar...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Funcionário</span>
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
