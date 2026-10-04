'use client';

import React, { useState } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  FileText, 
  Home, 
  Calendar, 
  Edit3, 
  Trash2, 
  XCircle, 
  Check, 
  ShieldAlert, 
  User 
} from 'lucide-react';
import { Tenant, Unit, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface TenantsSectionProps {
  tenants: Tenant[];
  units: Unit[];
  onSelectTenantReports?: (unitNumber: string) => void;
}

export function TenantsSection({ tenants, units, onSelectTenantReports }: TenantsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [moveInDate, setMoveInDate] = useState('');

  // Available rooms for assigning
  const availableUnits = units.filter((u) => u.status === 'available');

  const filteredTenants = tenants.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.document.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenModal = (tenantToEdit?: Tenant) => {
    if (tenantToEdit) {
      setEditingTenant(tenantToEdit);
      setName(tenantToEdit.name);
      setEmail(tenantToEdit.email);
      setPhone(tenantToEdit.phone);
      setDocumentNumber(tenantToEdit.document);
      setUnitNumber(tenantToEdit.unitNumber);
      setStatus(tenantToEdit.status);
      setEmergencyContact(tenantToEdit.emergencyContact || '');
      setMoveInDate(tenantToEdit.moveInDate || '');
    } else {
      setEditingTenant(null);
      setName('');
      setEmail('');
      setPhone('+351 ');
      setDocumentNumber('NIF: ');
      setUnitNumber(availableUnits.length > 0 ? availableUnits[0].unitNumber : (units[0]?.unitNumber || ''));
      setStatus('active');
      setEmergencyContact('');
      setMoveInDate(new Date().toISOString().split('T')[0]);
    }
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unitNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<Tenant, 'id'> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        document: documentNumber.trim(),
        unitNumber: unitNumber.trim(),
        status,
        emergencyContact: emergencyContact.trim(),
        moveInDate: moveInDate || new Date().toISOString().split('T')[0],
        createdAt: editingTenant?.createdAt || new Date().toISOString(),
      };

      if (editingTenant && editingTenant.id) {
        await updateDoc(doc(db, 'tenants', editingTenant.id), payload);
      } else {
        await addDoc(collection(db, 'tenants'), payload);

        // Also update unit status if available
        const targetUnit = units.find((u) => u.unitNumber === unitNumber);
        if (targetUnit && targetUnit.id && targetUnit.status === 'available') {
          await updateDoc(doc(db, 'units', targetUnit.id), {
            status: 'occupied',
            currentTenantName: name.trim(),
          });
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tenants');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Deseja realmente remover este inquilino do registo?')) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tenants/${tenantId}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Registo de Clientes & Inquilinos
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Cadastro de moradores, alocação de quartos, documentos e contactos de emergência.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-sm shadow-blue-600/30 transition-all text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Registar Novo Inquilino</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({tenants.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ativos ({tenants.filter((t) => t.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'inactive' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inativos ({tenants.filter((t) => t.status === 'inactive').length})
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome, NIF, quarto ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Tenants Table & Cards */}
      {filteredTenants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum inquilino registado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Cadastre os inquilinos para associá-los aos quartos e gerir manutenções e avisos do condomínio.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registar Inquilino</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map((tenant) => (
            <div
              key={tenant.id || tenant.email}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-5 shadow-xs hover:shadow-md flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-black text-base shadow-xs">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">
                        {tenant.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Home className="w-3 h-3 text-blue-600" />
                          <span>{tenant.unitNumber}</span>
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          tenant.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenModal(tenant)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {tenant.id && (
                      <button
                        onClick={() => handleDeleteTenant(tenant.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details list */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium">{tenant.phone || 'Não informado'}</span>
                  </div>

                  {tenant.email && (
                    <div className="flex items-center space-x-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{tenant.email}</span>
                    </div>
                  )}

                  {tenant.document && (
                    <div className="flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{tenant.document}</span>
                    </div>
                  )}

                  {tenant.moveInDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Data de Entrada: {tenant.moveInDate}</span>
                    </div>
                  )}

                  {tenant.emergencyContact && (
                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mt-2">
                      <div className="flex items-center space-x-1 font-bold text-amber-800 mb-0.5">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        <span>Contacto de Emergência:</span>
                      </div>
                      <span>{tenant.emergencyContact}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              {onSelectTenantReports && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onSelectTenantReports(tenant.unitNumber)}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <span>Ver Chamados de {tenant.unitNumber}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal to Register / Edit Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>{editingTenant ? 'Editar Registo de Inquilino' : 'Novo Registo de Inquilino'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome Completo do Inquilino *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: António Silva"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Quarto / Habitação *</label>
                  <select
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    {units.length === 0 ? (
                      <option value="Q-101">Q-101 (Padrão)</option>
                    ) : (
                      units.map((u) => (
                        <option key={u.id || u.unitNumber} value={u.unitNumber}>
                          {u.unitNumber} - {u.type} ({u.status === 'available' ? '🟢 Vago' : u.status})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estado</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="active">🟢 Ativo (A residir)</option>
                    <option value="inactive">⚪ Inativo / Histórico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Telefone / Telemóvel *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351 912 345 678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="morador@email.pt"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Documento / NIF</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="NIF: 245981320"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Data de Entrada</label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contacto de Emergência</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Ex: Maria Silva (Mãe) - 918 223 344"
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
                    <span>A guardar...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingTenant ? 'Atualizar Inquilino' : 'Registar Inquilino'}</span>
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
