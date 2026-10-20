'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, X, CheckCircle2 } from 'lucide-react';

interface NuevoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NuevoClienteModal({
  isOpen,
  onClose,
  onSuccess,
}: NuevoClienteModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('El nombre es obligatorio');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('profiles').insert([
      {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      },
    ]);

    if (error) {
      setErrorMsg('Error al registrar cliente: ' + error.message);
      setLoading(false);
    } else {
      setLoading(false);
      setFullName('');
      setPhone('');
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Nuevo Cliente</h3>
              <p className="text-xs text-gray-500">Registrar en la base de datos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo *</label>
            <input
              type="text"
              placeholder="Ej: María Gómez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              placeholder="Ej: 3001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 font-medium text-sm"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition text-sm flex justify-center items-center space-x-1 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Crear Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}