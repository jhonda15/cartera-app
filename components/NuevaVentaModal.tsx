'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, PlusCircle, X, UserCheck } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
}

interface NuevaVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NuevaVentaModal({
  isOpen,
  onClose,
  onSuccess,
}: NuevaVentaModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .order('full_name', { ascending: true });

    if (!error && data) {
      setProfiles(data);
      if (data.length > 0) setSelectedUserId(data[0].id);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const amount = parseFloat(totalAmount);

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Ingresa un monto válido para la venta');
      setLoading(false);
      return;
    }

    if (!selectedUserId) {
      setErrorMsg('Selecciona un cliente');
      setLoading(false);
      return;
    }

    // Insertar la nueva venta (balance_due arranca igual al total)
    const { error } = await supabase.from('sales').insert([
      {
        client_id: selectedUserId,
        total_amount: amount,
        balance_due: amount,
        status: 'pending',
      },
    ]);

    if (error) {
      setErrorMsg('Error al registrar la venta: ' + error.message);
      setLoading(false);
    } else {
      setLoading(false);
      setTotalAmount('');
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Encabezado */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Nueva Venta a Crédito</h3>
              <p className="text-xs text-gray-500">Asignar deuda a cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Seleccionar Cliente */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cliente
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 bg-white font-medium text-sm"
              >
                {profiles.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} ({client.phone || 'Sin tel'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monto Total */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Monto Total de la Venta ($)
            </label>
            <input
              type="number"
              step="100"
              placeholder="Ej: 150000"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium text-lg"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {errorMsg}
            </p>
          )}

          {/* Botones */}
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
              className="w-1/2 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition text-sm flex justify-center items-center space-x-1 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Crear Venta'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}