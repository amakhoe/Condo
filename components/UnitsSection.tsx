'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Bookmark, 
  User, 
  Filter, 
  Edit3, 
  Trash2, 
  Layers,
  Check
} from 'lucide-react';
import { Unit, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface UnitsSectionProps {
  units: Unit[];
}

export function UnitsSection({ units }: UnitsSectionProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [unitNumber, setUnitNumber] = useState('');
  const [block, setBlock] = useState('Bloco A');
  const [floor, setFloor] = useState('1º Andar');
  const [type, setType] = useState('Quarto Individual');
  const [status, setStatus] = useState<'available' | 'occupied' | 'maintenance' | 'reserved'>('available');
  const [rentPrice, setRentPrice] = useState<number>(350);
  const [features, setFeatures] = useState('Mobilado, Janela exterior, Secretária');
  const [currentTenantName, setCurrentTenantName] = useState('');

  // Counters
  const totalUnits = units.length;
  const availableUnits = units.filter((u) => u.status === 'available');
  const occupiedUnits = units.filter((u) => u.status === 'occupied');
  const maintenanceUnits = units.filter((u) => u.status === 'maintenance');
  const reservedUnits = units.filter((u) => u.status === 'reserved');
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits.length / totalUnits) * 100) : 0;

  // Filtered List
  const filteredUnits = units.filter((u) => {
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    const matchesSearch = 
      u.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.block.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.currentTenantName && u.currentTenantName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleOpenModal = (unitToEdit?: Unit) => {
    if (unitToEdit) {
      setEditingUnit(unitToEdit);
      setUnitNumber(unitToEdit.unitNumber);
      setBlock(unitToEdit.block);
      setFloor(unitToEdit.floor);
      setType(unitToEdit.type);
      setStatus(unitToEdit.status);
      setRentPrice(unitToEdit.rentPrice || 0);
      setFeatures(unitToEdit.features || '');
      setCurrentTenantName(unitToEdit.currentTenantName || '');
    } else {
      setEditingUnit(null);
      setUnitNumber(`Q-${100 + units.length + 1}`);
      setBlock('Bloco A');
      setFloor('1º Andar');
      setType('Quarto Individual');
      setStatus('available');
      setRentPrice(380);
      setFeatures('Mobilado, Roupeiro, WiFi');
      setCurrentTenantName('');
    }
    setIsModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<Unit, 'id'> = {
        unitNumber: unitNumber.trim(),
        block: block.trim(),
        floor: floor.trim(),
        type: type.trim(),
        status,
        rentPrice: Number(rentPrice) || 0,
        features: features.trim(),
        currentTenantName: status === 'occupied' ? currentTenantName.trim() : '',
        createdAt: editingUnit?.createdAt || new Date().toISOString(),
      };

      if (editingUnit && editingUnit.id) {
        await updateDoc(doc(db, 'units', editingUnit.id), payload);
      } else {
        await addDoc(collection(db, 'units'), payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'units');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (unit: Unit, newStatus: 'available' | 'occupied' | 'maintenance' | 'reserved') => {
    if (!unit.id) return;
    try {
      await updateDoc(doc(db, 'units', unit.id), {
        status: newStatus,
        currentTenantName: newStatus === 'available' ? '' : unit.currentTenantName || '',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `units/${unit.id}`);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Tem a certeza que deseja remover este quarto?')) return;
    try {
      await deleteDoc(doc(db, 'units', unitId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `units/${unitId}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Registo de Quartos & Unidades
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Controle de inventário de quartos, disponibilidade em tempo real e estado de ocupação.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-sm shadow-blue-600/30 transition-all text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Registar Novo Quarto</span>
        </button>
      </div>

      {/* Real-time Availability & Occupancy Cards in Light Theme */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Quartos Vagos / Disponíveis - Highlighted Emerald */}
        <div 
          onClick={() => setFilterStatus('available')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            filterStatus === 'available'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Quartos Vagos</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{availableUnits.length}</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">Prontos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalUnits > 0 ? `${Math.round((availableUnits.length / totalUnits) * 100)}% das unidades livres` : '0%'}
          </p>
        </div>

        {/* Quartos Ocupados - Blue */}
        <div 
          onClick={() => setFilterStatus('occupied')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            filterStatus === 'occupied'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ocupados</span>
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{occupiedUnits.length}</span>
            <span className="text-xs text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">{occupancyRate}% taxa</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Com inquilinos ativos</p>
        </div>

        {/* Em Manutenção - Amber */}
        <div 
          onClick={() => setFilterStatus('maintenance')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            filterStatus === 'maintenance'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Manutenção</span>
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{maintenanceUnits.length}</span>
            <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-md">Reparos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pintura ou obras</p>
        </div>

        {/* Total & Reservados */}
        <div 
          onClick={() => setFilterStatus('all')}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            filterStatus === 'all'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Quartos</span>
            <Layers className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{totalUnits}</span>
            <span className="text-xs text-slate-600 font-semibold">Cadastrados</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{reservedUnits.length} reservados</p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Quick Filter Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap ${
              filterStatus === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalUnits})
          </button>
          
          <button
            onClick={() => setFilterStatus('available')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              filterStatus === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Quartos Vagos ({availableUnits.length})</span>
          </button>

          <button
            onClick={() => setFilterStatus('occupied')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap ${
              filterStatus === 'occupied' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ocupados ({occupiedUnits.length})
          </button>

          <button
            onClick={() => setFilterStatus('maintenance')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors whitespace-nowrap ${
              filterStatus === 'maintenance' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Manutenção ({maintenanceUnits.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por quarto, bloco ou morador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

      </div>

      {/* Grid of Rooms / Units */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum quarto encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não há quartos que correspondam ao filtro selecionado. Tente alterar a pesquisa ou registe uma nova unidade.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Quarto Agora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => {
            const isAvailable = unit.status === 'available';
            const isOccupied = unit.status === 'occupied';
            const isMaintenance = unit.status === 'maintenance';

            return (
              <div
                key={unit.id || unit.unitNumber}
                className="bg-white rounded-3xl border border-slate-200 hover:border-blue-300 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between group"
              >
                {/* Top Status Bar Accent */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isAvailable ? 'bg-emerald-500' : isOccupied ? 'bg-blue-600' : 'bg-amber-500'
                  }`}
                />

                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-black text-slate-900 tracking-wide">
                          {unit.unitNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {unit.block} • {unit.floor}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-blue-700 mt-0.5">
                        {unit.type}
                      </p>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="flex flex-col items-end">
                      {isAvailable && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Vago / Livre</span>
                        </span>
                      )}
                      {isOccupied && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ocupado</span>
                        </span>
                      )}
                      {isMaintenance && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          <span>Manutenção</span>
                        </span>
                      )}
                      {unit.status === 'reserved' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Bookmark className="w-3.5 h-3.5 text-purple-600" />
                          <span>Reservado</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rent Price & Tenant */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Renda Mensal</span>
                      <strong className="text-base font-extrabold text-slate-900">
                        {unit.rentPrice ? `${unit.rentPrice} € / mês` : 'Sob consulta'}
                      </strong>
                    </div>

                    {isOccupied && (
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">Inquilino Atual</span>
                        <span className="font-bold text-blue-700 truncate max-w-[140px] block">
                          {unit.currentTenantName || 'Não especificado'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Amenities / Features */}
                  {unit.features && (
                    <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Comodidades:</span>
                      {unit.features}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {/* Quick Status Buttons */}
                  <div className="flex items-center space-x-1">
                    {unit.status !== 'available' && (
                      <button
                        onClick={() => handleQuickStatusChange(unit, 'available')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold transition-colors"
                        title="Marcar Quarto como Vago"
                      >
                        Tornar Vago
                      </button>
                    )}
                    {unit.status !== 'occupied' && (
                      <button
                        onClick={() => handleQuickStatusChange(unit, 'occupied')}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-bold transition-colors"
                        title="Marcar Quarto como Ocupado"
                      >
                        Ocupar
                      </button>
                    )}
                    {unit.status !== 'maintenance' && (
                      <button
                        onClick={() => handleQuickStatusChange(unit, 'maintenance')}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-[11px] font-bold transition-colors"
                        title="Enviar para Reparo/Manutenção"
                      >
                        Manutenção
                      </button>
                    )}
                  </div>

                  {/* Edit and Delete */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenModal(unit)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                      title="Editar detalhes do quarto"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {unit.id && (
                      <button
                        onClick={() => handleDeleteUnit(unit.id!)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Remover quarto"
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

      {/* Modal for Creating or Editing Room (White & Blue Light Theme) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>{editingUnit ? 'Editar Quarto' : 'Registar Novo Quarto'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Identificação / Nº do Quarto *</label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="Ex: Q-101, Apt 204"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estado de Ocupação *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="available">🟢 Vago / Disponível</option>
                    <option value="occupied">🔵 Ocupado</option>
                    <option value="maintenance">🟠 Em Manutenção</option>
                    <option value="reserved">🟣 Reservado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bloco / Torre</label>
                  <input
                    type="text"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="Ex: Bloco A, Ala Poente"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Piso / Andar</label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Ex: R/C, 1º Andar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tipologia do Quarto</label>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="Ex: Quarto Suite, T1, Estúdio"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Preço / Renda Mensal (€)</label>
                  <input
                    type="number"
                    value={rentPrice}
                    onChange={(e) => setRentPrice(Number(e.target.value))}
                    placeholder="Ex: 400"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {status === 'occupied' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nome do Inquilino Atual</label>
                  <input
                    type="text"
                    value={currentTenantName}
                    onChange={(e) => setCurrentTenantName(e.target.value)}
                    placeholder="Ex: António Silva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Características e Comodidades</label>
                <textarea
                  rows={2}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Ex: Mobilado, Ar condicionado, Casa de banho privativa, Varanda"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
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
                      <span>{editingUnit ? 'Atualizar Quarto' : 'Salvar Quarto'}</span>
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
