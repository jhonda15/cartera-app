'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, Trash2, UserPlus, LogOut, 
  Edit2, Pencil, CheckCircle, History, Calendar, CreditCard, Search
} from 'lucide-react';

import AbonoModal from '@/components/AbonoModal';
import NuevaVentaModal from '@/components/NuevaVentaModal';
import NuevoClienteModal from '@/components/NuevoClienteModal';
import NuevoProductoModal from '@/components/NuevoProductoModal';
import EditarVentaModal from '@/components/EditarVentaModal';
import HistorialAbonosModal from '@/components/HistorialAbonosModal';

interface Sale {
  id: string;
  total_amount: number;
  balance_due: number;
  status: string;
  product_type?: string;
  clients: {
    full_name: string;
    phone: string;
  } | null;
}

interface GlobalPayment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  sale_id: string;
  sales?: {
    clients?: {
      full_name: string;
    };
  };
}

export default function DashboardPage() {
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  const [allPayments, setAllPayments] = useState<GlobalPayment[]>([]);
  const [totalCollected, setTotalCollected] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('operador');
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  // Buscador de Pendientes
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Navegación de Pestañas
  const [activeTab, setActiveTab] = useState<'summary' | 'paid' | 'products'>('summary');
  const [productsList, setProductsList] = useState<any[]>([]);

  // Modales
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [isVentaModalOpen, setIsVentaModalOpen] = useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false);
  
  // Modal de Edición
  const [isEditarVentaModalOpen, setIsEditarVentaModalOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<any | null>(null);

  // Modal de Historial de Abonos
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [saleForHistorial, setSaleForHistorial] = useState<any | null>(null);

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
    setLoading(true);

    // 1. Cargar Ventas Pendientes
    const { data: salesData, error: salesErr } = await supabase
      .from('sales')
      .select('id, total_amount, balance_due, status, product_type, clients(full_name, phone)')
      .gt('balance_due', 0)
      .order('balance_due', { ascending: false });

    if (!salesErr && salesData) {
      setPendingSales(salesData as unknown as Sale[]);
    }

    // 2. Cargar Abonos Registrados
    const { data: paymentsData, error: paymentsErr } = await supabase
      .from('payments')
      .select('id, amount, payment_method, payment_date, notes, sale_id, sales(clients(full_name))')
      .order('payment_date', { ascending: false });

    if (!paymentsErr && paymentsData) {
      setAllPayments(paymentsData as unknown as GlobalPayment[]);
      const total = paymentsData.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      setTotalCollected(total);
    }

    setLoading(false);
  };

  const fetchProductsList = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProductsList(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleOpenAbono = (sale: Sale) => {
    setSelectedSale(sale);
    setIsAbonoModalOpen(true);
  };

  const handleDeleteSale = async (saleId: string, clientName?: string) => {
    if (userRole !== 'admin') {
      alert('Solo los administradores pueden eliminar registros.');
      return;
    }

    const name = clientName || 'este cliente';
    if (!window.confirm(`¿Deseas eliminar la venta registrada para ${name}?`)) return;

    await supabase.from('payments').delete().eq('sale_id', saleId);
    const { error } = await supabase.from('sales').delete().eq('id', saleId);

    if (error) alert('Error: ' + error.message);
    else fetchDashboardData();
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (userRole !== 'admin') {
      alert('Solo administradores pueden eliminar abonos.');
      return;
    }

    if (!window.confirm(`¿Deseas eliminar el abono de $${amount.toLocaleString('es-CO')}?`)) return;

    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) alert('Error al eliminar abono: ' + error.message);
    else fetchDashboardData();
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (userRole !== 'admin') {
      alert('Solo los administradores pueden eliminar productos.');
      return;
    }

    if (!window.confirm(`¿Deseas eliminar el producto "${productName}" del catálogo?`)) return;

    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) alert('Error al eliminar producto: ' + error.message);
    else fetchProductsList();
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsProductoModalOpen(true);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setIsProductoModalOpen(true);
  };

  // Filtrado de pendientes en tiempo real por nombre, teléfono o producto
  const filteredPendingSales = pendingSales.filter((sale) => {
    const query = searchTerm.toLowerCase().trim();
    const name = sale.clients?.full_name?.toLowerCase() || '';
    const phone = sale.clients?.phone?.toLowerCase() || '';
    const product = sale.product_type?.toLowerCase() || '';

    return name.includes(query) || phone.includes(query) || product.includes(query);
  });

  const totalPending = pendingSales.reduce((acc, sale) => acc + Number(sale.balance_due), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium text-sm">Cargando información...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Barra superior */}
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

        {/* Encabezado */}
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

        {/* Tarjetas Modulares */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Tarjeta 1: Pendientes por Cobrar */}
          <div 
            onClick={() => setActiveTab('summary')}
            className={`cursor-pointer p-6 rounded-2xl border transition shadow-sm ${
              activeTab === 'summary' ? 'ring-2 ring-red-500 bg-white' : 'bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-xs text-gray-500 font-medium">Por Cobrar (Pendiente)</p>
            <h3 className="text-2xl font-extrabold text-red-600 mt-1">
              ${totalPending.toLocaleString('es-CO')} COP
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-2">{pendingSales.length} Deudores Activos</p>
          </div>

          {/* Tarjeta 2: Total Cobrado */}
          <div 
            onClick={() => setActiveTab('paid')}
            className={`cursor-pointer p-6 rounded-2xl border transition shadow-sm ${
              activeTab === 'paid' ? 'ring-2 ring-emerald-600 bg-white' : 'bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Cobrado (Caja Real)</p>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                  ${totalCollected.toLocaleString('es-CO')} COP
                </h3>
                <p className="text-xs text-emerald-700 font-medium mt-2">
                  {allPayments.length} Abonos Registrados
                </p>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Catálogo */}
          <div 
            onClick={() => { setActiveTab('products'); fetchProductsList(); }}
            className={`cursor-pointer p-6 rounded-2xl border transition shadow-sm ${
              activeTab === 'products' ? 'ring-2 ring-blue-600 bg-white' : 'bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-xs text-gray-500 font-medium">Catálogo de Productos</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">
              {productsList.length} Productos
            </h3>
            <p className="text-xs text-blue-600 font-medium mt-2">Fotos, Costos y Precios</p>
          </div>

        </div>

        {/* LISTA DE CUENTAS PENDIENTES CON BUSCADOR */}
        {activeTab === 'summary' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-bold text-lg text-gray-800">Clientes con Saldo Pendiente</h2>
              
              {/* Buscador */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente, tel o producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                />
              </div>
            </div>

            <div className="divide-y">
              {filteredPendingSales.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  {searchTerm ? 'No se encontraron clientes que coincidan con la búsqueda.' : '¡Excelente! No hay ventas registradas con saldo pendiente.'}
                </div>
              ) : (
                filteredPendingSales.map((sale) => (
                  <div key={sale.id} className="p-4 sm:p-6 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="font-semibold text-gray-900">{sale.clients?.full_name || 'Cliente no asignado'}</p>
                      <p className="text-xs text-gray-500">Teléfono: {sale.clients?.phone || 'Sin registrar'}</p>
                      {sale.product_type && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded mt-1 inline-block">
                          {sale.product_type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="text-right">
                        <p className="font-bold text-red-600 text-lg">
                          ${Number(sale.balance_due).toLocaleString('es-CO')}
                        </p>
                        <p className="text-xs text-gray-400">
                          Total: ${Number(sale.total_amount).toLocaleString('es-CO')}
                        </p>
                      </div>

                      {/* Editar Venta */}
                      <button
                        onClick={() => {
                          setSaleToEdit(sale);
                          setIsEditarVentaModalOpen(true);
                        }}
                        className="bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600 p-2.5 rounded-xl transition shadow-sm"
                        title="Editar valor a pagar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Historial Abonos */}
                      <button
                        onClick={() => {
                          setSaleForHistorial(sale);
                          setIsHistorialModalOpen(true);
                        }}
                        className="bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white p-2.5 rounded-xl transition shadow-sm"
                        title="Ver Historial de Abonos"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      {/* Abonar */}
                      <button
                        onClick={() => handleOpenAbono(sale)}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl font-medium text-xs flex items-center space-x-1 transition shadow-sm"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Abonar</span>
                      </button>

                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDeleteSale(sale.id, sale.clients?.full_name)}
                          className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-xl transition shadow-sm"
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
        )}

        {/* HISTORIAL GENERAL DE ABONOS */}
        {activeTab === 'paid' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-emerald-50/50">
              <div>
                <h2 className="font-bold text-lg text-emerald-900">Historial General de Abonos</h2>
                <p className="text-xs text-emerald-700">Listado de todos los pagos registrados en el sistema</p>
              </div>
            </div>

            <div className="divide-y">
              {allPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Aún no hay abonos registrados en el sistema.</div>
              ) : (
                allPayments.map((pay) => (
                  <div key={pay.id} className="p-4 sm:p-6 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {pay.sales?.clients?.full_name || 'Cliente registrado'}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{pay.payment_date || 'Sin fecha'}</span>
                        <span>•</span>
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        <span className="capitalize">{pay.payment_method || 'Efectivo'}</span>
                      </div>
                      {pay.notes && (
                        <p className="text-[11px] text-gray-500 italic mt-0.5">"{pay.notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-emerald-600 text-lg">
                        +${Number(pay.amount).toLocaleString('es-CO')}
                      </span>

                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDeletePayment(pay.id, pay.amount)}
                          className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-xl transition shadow-sm"
                          title="Eliminar Abono"
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
        )}

        {/* CATÁLOGO DE PRODUCTOS */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-gray-800">Inventario y Precios</h2>
                <p className="text-xs text-gray-500">Gestión de productos y costos</p>
              </div>

              <button
                onClick={handleNewProduct}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-medium text-xs flex items-center space-x-1 shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6">
              {productsList.length === 0 ? (
                <p className="col-span-full text-center text-gray-400 py-6">No hay productos en el catálogo.</p>
              ) : (
                productsList.map((prod) => (
                  <div key={prod.id} className="border rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition bg-white relative group">
                    <div className="w-full h-32 bg-gray-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">Sin Foto</span>
                      )}

                      <div className="absolute top-2 right-2 flex space-x-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-md">
                        <button
                          onClick={() => handleEditProduct(prod)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Editar Producto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition"
                            title="Eliminar Producto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-gray-900 mt-1">{prod.name}</h4>
                    </div>

                    <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs">
                      <div>
                        <span className="text-gray-400 block">Costo:</span>
                        <span className="font-semibold text-gray-700">${Number(prod.purchase_price).toLocaleString('es-CO')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-bold block">Precio Venta:</span>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          ${(Number(prod.sale_price || prod.purchase_price * 2)).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modales */}
      {selectedSale && (
        <AbonoModal
          saleId={selectedSale.id}
          clientName={selectedSale.clients?.full_name || 'Cliente'}
          currentBalance={Number(selectedSale.balance_due)}
          isOpen={isAbonoModalOpen}
          onClose={() => setIsAbonoModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      <EditarVentaModal
        isOpen={isEditarVentaModalOpen}
        saleToEdit={saleToEdit}
        onClose={() => setIsEditarVentaModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

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

      <NuevoProductoModal
        isOpen={isProductoModalOpen}
        productToEdit={selectedProduct}
        onClose={() => setIsProductoModalOpen(false)}
        onSuccess={fetchProductsList}
      />

      <HistorialAbonosModal
        isOpen={isHistorialModalOpen}
        sale={saleForHistorial}
        userRole={userRole}
        onClose={() => setIsHistorialModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </main>
  );
}