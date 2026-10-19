'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  CreditCard, 
  FileText, 
  Check 
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface AuthViewProps {
  onSuccess?: () => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const { 
    signIn, 
    signUp, 
    sendPasswordReset, 
    authError, 
    clearAuthError 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recovery form state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySentTo, setRecoverySentTo] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regRole, setRegRole] = useState<'admin' | 'tenant'>('admin');
  const [regUnit, setRegUnit] = useState('Q-101');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setIsSubmitting(true);
    const ok = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (ok && onSuccess) onSuccess();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();

    if (regPassword !== regPasswordConfirm) {
      alert('As palavras-passe não coincidem. Por favor, tente novamente.');
      return;
    }

    if (regPassword.length < 6) {
      alert('A palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    const ok = await signUp(regEmail, regPassword, regName, regRole, regUnit);
    setIsSubmitting(false);
    if (ok && onSuccess) onSuccess();
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    setIsSubmitting(true);
    const ok = await sendPasswordReset(recoveryEmail);
    setIsSubmitting(false);

    if (ok) {
      setRecoverySentTo(recoveryEmail);
    }
  };

  // Demo auto-logins
  const handleDemoLogin = async (role: 'admin' | 'tenant') => {
    setIsSubmitting(true);
    clearAuthError();

    const email = role === 'admin' ? 'sindico@condogest.pt' : 'morador.q101@condogest.pt';
    const password = 'CondoGest2026!';
    const name = role === 'admin' ? 'Manuel Silva (Síndico)' : 'João Pereira (Morador Q-101)';

    // Try logging in first
    let ok = await signIn(email, password);
    if (!ok) {
      // If user doesn't exist yet, auto-create the demo account
      ok = await signUp(email, password, name, role, role === 'tenant' ? 'Q-101' : undefined);
    }

    setIsSubmitting(false);
    if (ok && onSuccess) onSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 mb-3">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          CondoGest
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Sistema Integrado de Gestão de Condomínio & Moradias
        </p>
      </div>

      {/* Main Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-slate-200 rounded-3xl">

          {/* Error Banner */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{authError}</div>
              <button 
                type="button" 
                onClick={clearAuthError}
                className="text-rose-400 hover:text-rose-700 font-bold ml-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* MODE 1: Iniciar Sessão (Login) */}
          {mode === 'login' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Iniciar Sessão</h2>
                  <p className="text-xs text-slate-500">Aceda à gestão do seu condomínio</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-xl border border-blue-100 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Firebase Auth</span>
                </span>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço de Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="exemplo@condogest.pt"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Palavra-passe
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthError();
                        setRecoveryEmail(loginEmail);
                        setRecoverySentTo(null);
                        setMode('recovery');
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Esqueceu-se da palavra-passe?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 mt-2"
                >
                  {isSubmitting ? (
                    <span>A verificar credenciais...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Entrar no Sistema</span>
                    </>
                  )}
                </button>
              </form>

              {/* Recovery prompt link badge */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Não tem conta?</span>
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    setMode('register');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Criar Nova Conta
                </button>
              </div>

              {/* Quick Demo Logins */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <span className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider text-center mb-3">
                  Acesso Rápido de Teste (1-Clique)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin')}
                    disabled={isSubmitting}
                    className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all text-center flex flex-col items-center justify-center"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-600 mb-1" />
                    <span>Conta Síndico</span>
                    <span className="text-[10px] text-blue-500 font-normal">Painel Geral</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoLogin('tenant')}
                    disabled={isSubmitting}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all text-center flex flex-col items-center justify-center"
                  >
                    <User className="w-4 h-4 text-slate-600 mb-1" />
                    <span>Conta Inquilino</span>
                    <span className="text-[10px] text-slate-500 font-normal">Quarto Q-101</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* MODE 2: Recuperação de Palavra-passe */}
          {mode === 'recovery' && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    setRecoverySentTo(null);
                    setMode('login');
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Recuperação de Palavra-passe</h2>
                  <p className="text-xs text-slate-500">Redefina o seu acesso de forma segura</p>
                </div>
              </div>

              {recoverySentTo ? (
                /* Success message */
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-in fade-in">
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <h3 className="font-bold text-sm">Email de Redefinição Enviado!</h3>
                  </div>
                  
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Um email com as instruções oficiais do Firebase Authentication para redefinir a sua palavra-passe foi enviado para:
                  </p>

                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 font-mono text-xs font-bold text-emerald-700 text-center">
                    {recoverySentTo}
                  </div>

                  <p className="text-[11px] text-emerald-700">
                    • Verifique a sua caixa de entrada e também a pasta de <strong>Spam / Lixo Eletrónico</strong>.<br />
                    • Clique na ligação recebida para escolher uma nova palavra-passe com total segurança.
                  </p>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoverySentTo(null);
                        setMode('login');
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Voltar ao Início de Sessão
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecoverySubmit({ preventDefault: () => {} } as React.FormEvent)}
                      className="text-xs text-emerald-700 hover:underline text-center"
                    >
                      Não recebeu? Clique aqui para reenviar
                    </button>
                  </div>
                </div>
              ) : (
                /* Recovery input form */
                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-start space-x-2">
                    <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Introduza o endereço de email associado à sua conta. O Firebase enviará uma mensagem segura com a ligação para criar uma nova palavra-passe.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campo de Email para Recuperação *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="Insira o seu email de registo"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <span>A enviar email de recuperação...</span>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Enviar Link de Recuperação</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthError();
                        setMode('login');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Lembrou-se da palavra-passe? <strong className="text-blue-600">Voltar ao Login</strong>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* MODE 3: Criar Nova Conta (Register) */}
          {mode === 'register' && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    setMode('login');
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Criar Nova Conta</h2>
                  <p className="text-xs text-slate-500">Registe-se para aceder ao condomínio</p>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Maria Santos"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço de Email *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="maria@exemplo.pt"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Palavra-passe *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mín. 6 carateres"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="Repetir palavra-passe"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Mínimo de 6 caracteres</span>
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showRegPassword ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>

                {/* Perfil Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Perfil *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole('admin')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                        regRole === 'admin'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 mb-1" />
                      <span>Administrador</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole('tenant')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                        regRole === 'tenant'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <User className="w-4 h-4 mb-1" />
                      <span>Morador / Inquilino</span>
                    </button>
                  </div>
                </div>

                {regRole === 'tenant' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fração / Quarto Associado *
                    </label>
                    <select
                      value={regUnit}
                      onChange={(e) => setRegUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:bg-white font-bold"
                    >
                      <option value="Q-101">Q-101 — Quarto Individual (Piso 1)</option>
                      <option value="Q-102">Q-102 — Quarto Suíte (Piso 1)</option>
                      <option value="Q-201">Q-201 — Quarto Duplo (Piso 2)</option>
                      <option value="Q-202">Q-202 — Quarto Individual (Piso 2)</option>
                      <option value="Q-301">Q-301 — Suíte Premium (Piso 3)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 mt-3"
                >
                  {isSubmitting ? (
                    <span>A criar conta...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Criar Conta & Entrar</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAuthError();
                      setMode('login');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Já tem conta registada? <strong className="text-blue-600">Iniciar Sessão</strong>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Feature summary footer */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Recursos do CondoGest</p>
          <p>
            Quartos & Unidades • Registo de Clientes • Mensalidades & Relatório PDF • Escalas de Limpeza • Avarias em Tempo Real
          </p>
        </div>

      </div>

    </div>
  );
}
