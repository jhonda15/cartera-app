'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, CheckCircle2, X } from 'lucide-react';

interface AbonoModalProps {
  saleId: string;
  clientName: string;
  currentBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AbonoModal({
  saleId,
  clientName,
  currentBalance,
  isOpen,
  onClose,
  onSuccess,
}: AbonoModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('nequi');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0');
      setLoading(false);
      return;
    }

    if (numAmount > currentBalance) {
      setErrorMsg('El abono no puede superar el saldo pendiente');
      setLoading(false);
      return;
    }

    // Insertar el pago (El Trigger de Supabase descuenta la deuda automáticamente)
    const { error } = await supabase.from('payments').insert([
      {
        sale_id: saleId,
        amount: numAmount,
        payment_method: method,
        notes: notes.trim() || null,
      },
    ]);

    if (error) {
      setErrorMsg('Error al registrar el abono: ' + error.message);
      setLoading(false);
    } else {
      setLoading(false);
      setAmount('');
      setNotes('');
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Encabezado */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Registrar Abono</h3>
            <p className="text-xs text-gray-500">Cliente: <span className="font-semibold text-gray-700">{clientName}</span></p>
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
          
          {/* Saldo Actual */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-medium text-red-600">Saldo Pendiente:</span>
            <span className="font-extrabold text-red-700 text-base">
              ${currentBalance.toLocaleString('es-CO')} COP
            </span>
          </div>

          {/* Input Monto */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Monto del Abono ($)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="100"
                placeholder="Ej: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 font-medium text-lg"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Método de Pago
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 bg-white"
            >
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Bancolombia / Transferencia</option>
            </select>
          </div>

          {/* Notas Opcionales */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notas / Referencia (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Comprobante Nequi #1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 text-sm"
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
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Abonar'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}