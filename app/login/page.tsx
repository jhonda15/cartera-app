'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Building2, User, Mail, Lock, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Campos para Registro de Nueva Empresa
  const [fullName, setFullName] = useState('');
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [nit, setNit] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (isRegister) {
      // Flujo de Registro de Nueva Empresa
      if (!empresaNombre.trim()) {
        setError('El nombre de tu empresa o negocio es obligatorio');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('La contraseña debe tener mínimo 6 caracteres');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || 'Administrador',
            empresa_nombre: empresaNombre.trim(),
            nit: nit.trim() || null,
          },
        },
      });

      if (signUpError) {
        setError('Error al registrarse: ' + signUpError.message);
        setLoading(false);
      } else {
        // Si Supabase no requiere confirmación de email y devolvió sesión directa:
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setSuccessMsg('¡Cuenta creada con éxito! Si tu proyecto tiene confirmación de correo habilitada, revisa tu bandeja de entrada para verificar tu correo antes de ingresar.');
          setLoading(false);
          setIsRegister(false);
        }
      }
    } else {
      // Flujo de Inicio de Sesión
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError('Credenciales inválidas. Por favor verifica tu correo y contraseña.');
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Cabecera con selector Iniciar Sesión / Registrarse */}
        <div className="p-6 pb-4 text-center bg-gradient-to-b from-blue-50/50 to-white">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/25 mb-3">
            CA
          </div>
          <h1 className="text-2xl font-black text-slate-900">Cartera App</h1>
          <p className="text-xs text-slate-500 mt-1">Plataforma de Cobros, Ventas y Gestión Multi-Empresa</p>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mt-5">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                !isRegister ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                isRegister ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Crear Empresa
            </button>
          </div>
        </div>

        {/* Mensajes de Alerta */}
        <div className="px-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs border border-red-200">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl text-xs border border-emerald-200 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleAuth} className="p-6 pt-3 space-y-3.5">
          
          {/* Campos exclusivos del Registro */}
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-900"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de tu Negocio / Empresa *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={empresaNombre}
                    onChange={(e) => setEmpresaNombre(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-900"
                    placeholder="Ej: Distribuciones JP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NIT o Cédula (Opcional)</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-900"
                    placeholder="Ej: 900123456"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-900"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-900"
                placeholder="••••••••"
              />
            </div>
            {isRegister && (
              <p className="text-[10px] text-slate-400 mt-1">Mínimo 6 caracteres</p>
            )}
          </div>

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center space-x-1.5 mt-2"
          >
            <span>{loading ? 'Procesando...' : isRegister ? 'Registrar mi Empresa' : 'Entrar al Sistema'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            {isRegister ? (
              <>¿Ya tienes cuenta? <button type="button" onClick={() => setIsRegister(false)} className="text-blue-600 font-bold hover:underline">Inicia Sesión</button></>
            ) : (
              <>¿Quieres usar Cartera App para tu negocio? <button type="button" onClick={() => setIsRegister(true)} className="text-blue-600 font-bold hover:underline">Registra tu empresa</button></>
            )}
          </p>
        </div>

      </div>
    </main>
  );
}
