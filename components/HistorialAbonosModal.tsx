'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { History, X, Calendar, CreditCard, DollarSign, Trash2 } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
}

interface Props {
  isOpen: boolean;
  sale: any;
  userRole?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function HistorialAbonosModal({ isOpen, sale, userRole = 'admin', onClose, onSuccess }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sale?.id) {
      fetchPayments();
    }
  }, [isOpen, sale]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('sale_id', sale.id)
      .order('payment_date', { ascending: false });

    if (!error && data) {
      setPayments(data as Payment[]);
    }
    setLoading(false);
  };

  const handleDeletePayment = async (paymentId: string, paymentAmount: number) => {
    if (!window.confirm(`¿Deseas eliminar este abono de $${paymentAmount.toLocaleString('es-CO')}?`)) return;

    setDeletingId(paymentId);
    try {
      // 1. Eliminar el registro del abono
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) throw deleteError;

      // 2. Recalcular el nuevo saldo sumando nuevamente el monto eliminado a la deuda actual
      const newBalance = Number(sale.balance_due) + Number(paymentAmount);
      const newStatus = newBalance > 0 ? 'pending' : 'paid';

      // 3. Actualizar la venta en la base de datos
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          balance_due: newBalance,
          status: newStatus,
        })
        .eq('id', sale.id);

      if (updateError) throw updateError;

      // 4. Actualizar estado local y notificar
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      sale.balance_due = newBalance; // Actualizar valor local de la venta en pantalla
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Error al eliminar abono: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen || !sale) return null;

  const totalAbonado = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Encabezado */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Historial de Abonos</h3>
              <p className="text-xs text-gray-500">
                Cliente: <strong className="text-gray-700">{sale.clients?.full_name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la Venta */}
        <div className="p-4 bg-gray-50 border-b grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-gray-400 block font-medium">Total Venta</span>
            <span className="font-bold text-gray-800 text-sm">
              ${Number(sale.total_amount).toLocaleString('es-CO')}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Total Abonado</span>
            <span className="font-bold text-emerald-600 text-sm">
              ${totalAbonado.toLocaleString('es-CO')}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Saldo Pendiente</span>
            <span className="font-bold text-red-600 text-sm">
              ${Number(sale.balance_due).toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Lista de Abonos */}
        <div className="p-5 max-h-80 overflow-y-auto space-y-3">
          {loading ? (
            <p className="text-center text-xs text-gray-400 py-4">Cargando abonos...</p>
          ) : payments.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <DollarSign className="w-8 h-8 mx-auto mb-1 text-gray-300" />
              <p className="text-xs">No hay abonos registrados para esta venta.</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="p-3 border rounded-xl bg-white hover:bg-gray-50 transition flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium mb-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{payment.payment_date || 'Sin fecha'}</span>
                    <span className="text-gray-300">•</span>
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span className="capitalize">{payment.payment_method || 'Efectivo'}</span>
                  </div>
                  {payment.notes && (
                    <p className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded italic">
                      "{payment.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-extrabold text-emerald-600 text-base">
                    +${Number(payment.amount).toLocaleString('es-CO')}
                  </span>

                  {/* Botón para Eliminar Abono Duplicado */}
                  <button
                    onClick={() => handleDeletePayment(payment.id, payment.amount)}
                    disabled={deletingId === payment.id}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Eliminar este abono"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cierre */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}