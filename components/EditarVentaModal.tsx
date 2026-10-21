'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, X, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  saleToEdit: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditarVentaModal({
  isOpen,
  saleToEdit,
  onClose,
  onSuccess,
}: Props) {
  const [totalAmount, setTotalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (saleToEdit) {
      setTotalAmount(saleToEdit.total_amount ? saleToEdit.total_amount.toString() : '');
    }
  }, [saleToEdit, isOpen]);

  if (!isOpen || !saleToEdit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const newTotal = parseFloat(totalAmount);
    if (isNaN(newTotal) || newTotal < 0) {
      setErrorMsg('Ingresa un valor válido');
      setLoading(false);
      return;
    }

    try {
      // Obtener el total de abonos recibidos hasta el momento
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('sale_id', saleToEdit.id);

      if (paymentsError) throw paymentsError;

      const totalPayments = paymentsData.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const newBalance = newTotal - totalPayments;
      const newStatus = newBalance <= 0 ? 'paid' : 'pending';

      // Actualizar el valor total y el saldo pendiente
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          sale_price: newTotal,
          total_amount: newTotal,
          balance_due: newBalance < 0 ? 0 : newBalance,
          status: newStatus,
        })
        .eq('id', saleToEdit.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Error al actualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Editar Valor a Pagar</h3>
              <p className="text-xs text-gray-500">{saleToEdit.clients?.full_name || 'Cliente'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Producto / Concepto
            </label>
            <input
              type="text"
              disabled
              value={saleToEdit.product_type || 'Venta general'}
              className="w-full px-3 py-2 bg-gray-100 border rounded-xl text-xs font-medium text-gray-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nuevo Valor de la Venta ($ COP) *
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="Ej: 140000"
              required
              className="w-full px-4 py-2.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-base text-gray-900 bg-blue-50/50"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Si el cliente ya hizo abonos, el saldo a deber se calculará automáticamente.
            </span>
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
              className="w-1/2 py-2.5 border text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition text-xs flex justify-center items-center space-x-1 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambio'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}