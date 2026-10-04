'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Send, 
  Volume2, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Radio, 
  XCircle, 
  Check 
} from 'lucide-react';
import { Announcement, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { NotificationService } from '../lib/notifications';

interface AnnouncementsSectionProps {
  announcements: Announcement[];
}

export function AnnouncementsSection({ announcements }: AnnouncementsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent' | 'normal' | 'low'>('all');
  const [permission, setPermission] = useState<NotificationPermission>(() => NotificationService.getPermissionState());

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('urgent');
  const [category, setCategory] = useState('Manutenção Geral');
  const [authorName, setAuthorName] = useState('Administração do Condomínio');

  const handleRequestPush = async () => {
    const res = await NotificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      NotificationService.sendPush('Notificações Ativadas com Sucesso!', {
        body: 'Você receberá todos os comunicados urgentes do condomínio em tempo real.',
        soundType: 'success',
      });
    }
  };

  const handleTestPush = () => {
    NotificationService.sendPush('Teste de Aviso Push do Condomínio', {
      body: 'Este é um teste do sistema de notificações em tempo real para os condóminos.',
      soundType: 'urgent',
    });
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<Announcement, 'id'> = {
        title: title.trim(),
        message: message.trim(),
        priority,
        category: category.trim(),
        sentAt: new Date().toISOString(),
        authorName: authorName.trim(),
      };

      await addDoc(collection(db, 'announcements'), payload);

      NotificationService.sendPush(title.trim(), {
        body: message.trim(),
        soundType: priority === 'urgent' ? 'urgent' : 'normal',
      });

      setIsModalOpen(false);
      setTitle('');
      setMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Deseja eliminar este aviso?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (filterPriority === 'all') return true;
    return a.priority === filterPriority;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Mural de Avisos & Notificações Push
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Envio de comunicados oficiais e transmissão de notificações push instantâneas aos moradores.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-sm shadow-blue-600/30 transition-all text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir Novo Comunicado Push</span>
        </button>
      </div>

      {/* Push Notification Center Card in White & Blue */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50 via-white to-blue-50/50 border border-blue-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">Canal de Notificações Push dos Moradores</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                permission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {permission === 'granted' ? 'Navegador Inscrito' : 'Permissão Pendente'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Alerta os moradores sobre cortes de água, manutenções na rede elétrica e reuniões mesmo com o navegador em segundo plano.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          {permission !== 'granted' ? (
            <button
              onClick={handleRequestPush}
              className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ativar Notificações no Dispositivo</span>
            </button>
          ) : (
            <button
              onClick={handleTestPush}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-2xl text-xs transition-colors flex items-center space-x-1.5 shadow-2xs"
            >
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span>Disparar Notificação de Teste</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilterPriority('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filterPriority === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos os Avisos ({announcements.length})
        </button>

        <button
          onClick={() => setFilterPriority('urgent')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
            filterPriority === 'urgent'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>🚨 Urgentes ({announcements.filter((a) => a.priority === 'urgent').length})</span>
        </button>

        <button
          onClick={() => setFilterPriority('normal')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filterPriority === 'normal' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Normais ({announcements.filter((a) => a.priority === 'normal').length})
        </button>

        <button
          onClick={() => setFilterPriority('low')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filterPriority === 'low' ? 'bg-slate-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Informativos ({announcements.filter((a) => a.priority === 'low').length})
        </button>
      </div>

      {/* Feed of Announcements */}
      {filteredAnnouncements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum comunicado no mural</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Emita um novo aviso para notificar todos os moradores sobre novidades, regras ou manutenções.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Emitir Primeiro Comunicado</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const isUrgent = ann.priority === 'urgent';
            return (
              <div
                key={ann.id || ann.sentAt}
                className={`p-6 rounded-3xl border shadow-xs hover:shadow-sm transition-all relative overflow-hidden bg-white ${
                  isUrgent
                    ? 'border-rose-300 ring-1 ring-rose-500/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Urgent top accent */}
                {isUrgent && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 animate-pulse" />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isUrgent
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {ann.priority === 'urgent' ? '🚨 Aviso Urgente' : ann.category || 'Comunicado'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {ann.authorName}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-1.5 leading-snug">
                      {ann.title}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(ann.sentAt).toLocaleString('pt-PT')}</span>
                    </span>

                    {ann.id && (
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id!)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar aviso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {ann.message}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Emitir Novo Comunicado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span>Emitir Comunicado com Notificação Push</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Título do Comunicado *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Interrupção Temporária no Fornecimento de Água"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioridade do Alerta *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-bold text-rose-700"
                  >
                    <option value="urgent">🚨 Urgente (Disparo Imediato)</option>
                    <option value="normal">📢 Normal</option>
                    <option value="low">ℹ️ Baixa Prioridade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                  >
                    <option value="Manutenção Hidráulica">Manutenção Hidráulica (Água)</option>
                    <option value="Manutenção Elétrica">Manutenção Elétrica</option>
                    <option value="Reunião de Condomínio">Reunião / Assembleia</option>
                    <option value="Limpeza e Zelo">Limpeza e Zelo</option>
                    <option value="Segurança e Regras">Segurança e Regras</option>
                    <option value="Outro Comunicado">Outro Comunicado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assinatura / Emissor</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Ex: Administração do Condomínio"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Conteúdo da Mensagem *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva os detalhes, datas, horários e recomendações para os moradores..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium">
                ⚡ Ao publicar este aviso, o sistema enviará uma notificação push com aviso sonoro para os condóminos inscritos.
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
                    <span>A emitir...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Emitir e Transmitir Push</span>
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
