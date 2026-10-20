'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Wallet, Users, PlusCircle, Trash2, UserPlus, LogOut } from 'lucide-react';
import AbonoModal from '@/components/AbonoModal';
import NuevaVentaModal from '@/components/NuevaVentaModal';
import NuevoClienteModal from '@/components/NuevoClienteModal';

interface Sale {
  id: string;
  total_amount: number;
  balance_due: number;
  status: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('operador');
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  // Modales
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [isVentaModalOpen, setIsVentaModalOpen] = useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUserEmail(session.user.email || '');

    // Obtener rol del perfil de usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile && profile.role) {
      setUserRole(profile.role);
    }

    await fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('id, total_amount, balance_due, status, profiles(full_name, phone)')
      .gt('balance_due', 0)
      .order('balance_due', { ascending: false });

    if (!error && data) {
      setSales(data as unknown as Sale[]);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleOpenAbono = (sale: Sale) => {
    setSelectedSale(sale);
    setIsAbonoModalOpen(true);
  };

  const handleDeleteSale = async (saleId: string, clientName: string) => {
    if (userRole !== 'admin') {
      alert('Solo los administradores pueden eliminar registros de ventas.');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la venta registrada para ${clientName}? Esta acción eliminará los registros de esa venta.`
    );

    if (!confirmDelete) return;

    await supabase.from('payments').delete().eq('sale_id', saleId);
    const { error } = await supabase.from('sales').delete().eq('id', saleId);

    if (error) {
      alert('Error al eliminar la venta: ' + error.message);
    } else {
      fetchDashboardData();
    }
  };

  const totalPending = sales.reduce((acc, sale) => acc + Number(sale.balance_due), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium text-sm">Cargando datos y verificando sesión...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Barra superior con usuario y salir */}
        <div className="flex justify-between items-center text-xs text-gray-500 px-2">
          <span>Sesión activa: <strong className="text-gray-800">{userEmail}</strong> ({userRole.toUpperCase()})</span>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-red-600 hover:text-red-800 font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Encabezado con Botones */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resumen de Cartera</h1>
            <p className="text-sm text-gray-500">Gestión de Cobros y Créditos</p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsClienteModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 rounded-xl font-medium text-sm flex items-center space-x-1.5 shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Cliente</span>
            </button>

            <button
              onClick={() => setIsVentaModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-medium text-sm flex items-center space-x-1.5 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nueva Venta</span>
            </button>
          </div>
        </header>

        {/* Tarjetas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md">
            <p className="text-blue-100 text-sm font-medium">Total Cartera Pendiente</p>
            <h2 className="text-3xl font-extrabold mt-2">
              ${totalPending.toLocaleString('es-CO')} COP
            </h2>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Clientes Deudores Activos</p>
              <h3 className="text-2xl font-bold text-gray-800">{sales.length}</h3>
            </div>
          </div>
        </div>

        {/* Lista de Cuentas */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800">Clientes con Saldo Pendiente</h2>
          </div>

          <div className="divide-y">
            {sales.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No hay ventas registradas con saldo pendiente.</div>
            ) : (
              sales.map((sale) => (
                <div key={sale.id} className="p-4 sm:p-6 flex justify-between items-center hover:bg-gray-50 transition">
                  <div>
                    <p className="font-semibold text-gray-900">{sale.profiles?.full_name}</p>
                    <p className="text-xs text-gray-500">Teléfono: {sale.profiles?.phone || 'Sin registrar'}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-bold text-red-600 text-lg">
                        ${Number(sale.balance_due).toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-gray-400">
                        Total: ${Number(sale.total_amount).toLocaleString('es-CO')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenAbono(sale)}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl font-medium text-xs flex items-center space-x-1 transition shadow-sm"
                      title="Registrar Abono"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Abonar</span>
                    </button>

                    {/* Botón de eliminar visible SOLO para Administradores */}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleDeleteSale(sale.id, sale.profiles?.full_name)}
                        className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-xl transition shadow-sm"
                        title="Eliminar Venta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modales */}
      {selectedSale && (
        <AbonoModal
          saleId={selectedSale.id}
          clientName={selectedSale.profiles?.full_name}
          currentBalance={Number(selectedSale.balance_due)}
          isOpen={isAbonoModalOpen}
          onClose={() => setIsAbonoModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      <NuevaVentaModal
        isOpen={isVentaModalOpen}
        onClose={() => setIsVentaModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <NuevoClienteModal
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </main>
  );
}