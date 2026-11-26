'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, Trash2, UserPlus, LogOut, 
  Pencil, CheckCircle, History, Calendar, CreditCard, Search, Building2,
  Menu, X, LayoutDashboard, Users, Receipt, ShoppingBag, Phone, MessageCircle,
  TrendingDown, ArrowUpRight, DollarSign, ChevronRight, Edit2, ShieldAlert,
  ShieldCheck, Power, RefreshCw
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

interface Product {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  image_url: string | null;
  empresa_id?: string;
  deleted_at?: string | null;
}

interface EmpresaSaaS {
  id: string;
  nombre: string;
  nit: string | null;
  estado: 'activo' | 'suspendido';
  plan?: string;
  fecha_vencimiento?: string | null;
  created_at: string;
}

type TabType = 'dashboard' | 'debtors' | 'payments' | 'products' | 'superadmin';

export default function DashboardPage() {
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  const [allPayments, setAllPayments] = useState<GlobalPayment[]>([]);
  const [totalCollected, setTotalCollected] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('operador');
  const [userEmail, setUserEmail] = useState<string>('');
  const [empresaId, setEmpresaId] = useState<string>('');
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [empresaNit, setEmpresaNit] = useState<string>('');
  
  // SuperAdmin SaaS
  const [allEmpresas, setAllEmpresas] = useState<EmpresaSaaS[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const router = useRouter();

  // Navegación Mobile-First y Menú Lateral
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Buscador de Pendientes
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Productos
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Modales
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  const isSuperAdmin = userRole === 'superadmin' || empresaNit === '1088304727' || empresaId === '10883047-2700-0000-0000-000000000000';

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

    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, empresa_id, empresas(id, nombre, nit, estado)')
        .eq('id', session.user.id)
        .single();

      if (!profileErr && profile) {
        if (profile.role) setUserRole(profile.role);
        if (profile.empresa_id) setEmpresaId(profile.empresa_id);

        const empresaData: any = Array.isArray(profile.empresas) ? profile.empresas[0] : profile.empresas;
        if (empresaData) {
          if (empresaData.nombre) setEmpresaNombre(empresaData.nombre);
          if (empresaData.nit) setEmpresaNit(empresaData.nit);
          if (empresaData.estado === 'suspendido') {
            alert('Tu empresa se encuentra en estado SUSPENDIDO. Contacta al administrador para renovar tu acceso.');
            await supabase.auth.signOut();
            router.push('/login');
            return;
          }
        }
      } else {
        // Fallback defensivo si la migración de empresas aún no se ha ejecutado
        const { data: basicProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (basicProfile?.role) setUserRole(basicProfile.role);
      }
    } catch (err) {
      console.warn('Error consultando perfil:', err);
    }

    await fetchDashboardData();
    await fetchProductsList();
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Ventas Pendientes (excluyendo ventas anuladas/borradas lógicamente)
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('id, total_amount, balance_due, status, product_type, clients(full_name, phone)')
        .gt('balance_due', 0)
        .is('deleted_at', null)
        .order('balance_due', { ascending: false });

      if (!salesErr && salesData) {
        setPendingSales(salesData as unknown as Sale[]);
      } else {
        // Fallback defensivo si la columna deleted_at no existe aún en la tabla
        const { data: fallbackSales } = await supabase
          .from('sales')
          .select('id, total_amount, balance_due, status, product_type, clients(full_name, phone)')
          .gt('balance_due', 0)
          .order('balance_due', { ascending: false });
        if (fallbackSales) setPendingSales(fallbackSales as unknown as Sale[]);
      }

      // 2. Cargar Abonos Registrados (excluyendo abonos anulados)
      const { data: paymentsData, error: paymentsErr } = await supabase
        .from('payments')
        .select('id, amount, payment_method, payment_date, notes, sale_id, sales(clients(full_name))')
        .is('deleted_at', null)
        .order('payment_date', { ascending: false });

      if (!paymentsErr && paymentsData) {
        setAllPayments(paymentsData as unknown as GlobalPayment[]);
        const total = paymentsData.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        setTotalCollected(total);
      } else {
        // Fallback si deleted_at no existe aún
        const { data: fallbackPayments } = await supabase
          .from('payments')
          .select('id, amount, payment_method, payment_date, notes, sale_id, sales(clients(full_name))')
          .order('payment_date', { ascending: false });
        if (fallbackPayments) {
          setAllPayments(fallbackPayments as unknown as GlobalPayment[]);
          const total = fallbackPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
          setTotalCollected(total);
        }
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsList = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (!error && data) {
      setProductsList(data as Product[]);
    } else {
      const { data: fallback } = await supabase.from('products').select('*').order('name');
      if (fallback) setProductsList(fallback as Product[]);
    }
  };

  const fetchEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, nit, estado, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllEmpresas(data);
      }
    } catch (err) {
      console.error('Error al cargar empresas:', err);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const handleToggleEstadoEmpresa = async (id: string, currentEstado: string, nombre: string) => {
    const newEstado = currentEstado === 'activo' ? 'suspendido' : 'activo';
    const actionText = newEstado === 'suspendido' 
      ? `¿Estás seguro de SUSPENDER a "${nombre}"? Sus usuarios no podrán ingresar hasta que se active.`
      : `¿Deseas ACTIVAR a "${nombre}" para permitirle acceso a la plataforma?`;

    if (!window.confirm(actionText)) return;

    const { error } = await supabase
      .from('empresas')
      .update({ estado: newEstado })
      .eq('id', id);

    if (error) {
      alert('Error al cambiar estado: ' + error.message);
    } else {
      setAllEmpresas((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, estado: newEstado } : emp))
      );
    }
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
    if (userRole !== 'admin' && !isSuperAdmin) {
      alert('Solo los administradores pueden anular registros.');
      return;
    }

    const name = clientName || 'este cliente';
    if (!window.confirm(`¿Deseas anular la venta registrada para ${name}? Esta acción se registrará en auditoría.`)) return;

    // 1. Intentar anulación transaccional con Soft Delete vía RPC
    const { error: rpcErr } = await supabase.rpc('anular_venta_segura', {
      p_sale_id: saleId,
      p_empresa_id: empresaId || null,
      p_motivo: 'Anulado por administrador',
    });

    if (rpcErr) {
      // Fallback a soft delete directo o físico
      const { error: softErr } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', saleId);

      if (softErr) {
        await supabase.from('payments').delete().eq('sale_id', saleId);
        await supabase.from('sales').delete().eq('id', saleId);
      }
    }

    fetchDashboardData();
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (userRole !== 'admin' && !isSuperAdmin) {
      alert('Solo administradores pueden anular abonos.');
      return;
    }

    if (!window.confirm(`¿Deseas anular el abono de $${amount.toLocaleString('es-CO')}? Quedará registrado en auditoría.`)) return;

    // 1. Intentar anulación transaccional vía RPC
    const { error: rpcErr } = await supabase.rpc('anular_abono_seguro', {
      p_payment_id: paymentId,
      p_empresa_id: empresaId || null,
      p_motivo: 'Anulación de abono desde historial general',
    });

    if (rpcErr) {
      const { error: softErr } = await supabase
        .from('payments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', paymentId);

      if (softErr) {
        await supabase.from('payments').delete().eq('id', paymentId);
      }
    }

    fetchDashboardData();
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (userRole !== 'admin' && !isSuperAdmin) {
      alert('Solo los administradores pueden eliminar productos.');
      return;
    }

    if (!window.confirm(`¿Deseas eliminar el producto "${productName}" del catálogo?`)) return;

    const { error: softErr } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', productId);

    if (softErr) {
      await supabase.from('products').delete().eq('id', productId);
    }

    fetchProductsList();
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsProductoModalOpen(true);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setIsProductoModalOpen(true);
  };

  // Filtrado de pendientes en tiempo real
  const filteredPendingSales = pendingSales.filter((sale) => {
    const query = searchTerm.toLowerCase().trim();
    const name = sale.clients?.full_name?.toLowerCase() || '';
    const phone = sale.clients?.phone?.toLowerCase() || '';
    const product = sale.product_type?.toLowerCase() || '';

    return name.includes(query) || phone.includes(query) || product.includes(query);
  });

  const totalPending = pendingSales.reduce((acc, sale) => acc + Number(sale.balance_due), 0);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Resumen General';
      case 'debtors': return 'Cobros y Deudores';
      case 'payments': return 'Historial de Abonos';
      case 'products': return 'Catálogo de Productos';
      case 'superadmin': return 'Gestión SaaS (Empresas)';
      default: return 'Cartera App';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-600 font-medium text-sm">Cargando Cartera App...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row antialiased">
      
      {/* =========================================================================
          MENÚ LATERAL (DRAWER RESPONSIVE)
      ========================================================================== */}
      
      {/* Backdrop oscuro para móvil */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:static md:z-auto
      `}>
        {/* Cabecera del Menú Lateral */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
                CA
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-900 leading-tight">Cartera App</h2>
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Multi-Empresa</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tarjeta de la Empresa Activa */}
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100 rounded-xl space-y-1">
            <div className="flex items-center space-x-1.5 text-blue-800 font-bold text-xs truncate">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{empresaNombre || 'Empresa Principal'}</span>
            </div>
            {empresaNit && (
              <p className="text-[11px] text-blue-700/80 font-medium pl-5">
                NIT: <span className="font-bold">{empresaNit}</span>
              </p>
            )}
            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-blue-100/60">
              <span className="truncate max-w-[140px]">{userEmail}</span>
              <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold uppercase text-[9px]">
                {isSuperAdmin ? 'SUPERADMIN' : userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Opciones de Navegación */}
        <nav className="p-4 space-y-1.5 overflow-y-auto flex-1">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="w-5 h-5" />
              <span>Resumen General</span>
            </div>
            <ChevronRight className={`w-4 h-4 opacity-50 ${activeTab === 'dashboard' ? 'text-white' : ''}`} />
          </button>

          <button
            onClick={() => { setActiveTab('debtors'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition ${
              activeTab === 'debtors'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5" />
              <span>Cobros y Deudores</span>
            </div>
            {pendingSales.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'debtors' ? 'bg-white text-blue-700' : 'bg-red-100 text-red-600'
              }`}>
                {pendingSales.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Receipt className="w-5 h-5" />
              <span>Historial de Abonos</span>
            </div>
            {allPayments.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'payments' ? 'bg-white text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {allPayments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ShoppingBag className="w-5 h-5" />
              <span>Catálogo de Productos</span>
            </div>
            {productsList.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'products' ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {productsList.length}
              </span>
            )}
          </button>

          {/* Módulo SuperAdmin (Visible únicamente para el dueño SaaS / SuperAdmin) */}
          {isSuperAdmin && (
            <div className="pt-2">
              <button
                onClick={() => { setActiveTab('superadmin'); setIsSidebarOpen(false); fetchEmpresas(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition border ${
                  activeTab === 'superadmin'
                    ? 'bg-purple-700 text-white border-purple-600 shadow-sm shadow-purple-600/30'
                    : 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:text-purple-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span>Gestión SaaS (Empresas)</span>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                  activeTab === 'superadmin' ? 'bg-white text-purple-800' : 'bg-purple-200 text-purple-900'
                }`}>
                  Admin
                </span>
              </button>
            </div>
          )}

          {/* Accesos de Creación Rápida en el Drawer */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 px-3">Acciones Rápidas</p>
            <button
              onClick={() => { setIsVentaModalOpen(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Registrar Nueva Venta</span>
            </button>
            <button
              onClick={() => { setIsClienteModalOpen(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Registrar Nuevo Cliente</span>
            </button>
          </div>
        </nav>

        {/* Pie del Drawer: Cerrar Sesión */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          CONTENEDOR PRINCIPAL
      ========================================================================== */}
      <div className="flex-1 flex flex-col min-h-screen pb-20 md:pb-8">
        
        {/* BARRA SUPERIOR MOBILE & DESKTOP (STICKY) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl transition md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                {getTabTitle()}
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Empresa: <strong className="text-slate-700">{empresaNombre || 'Cartera'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsClienteModalOpen(true)}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Cliente</span>
            </button>
            <button
              onClick={() => setIsVentaModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Nueva Venta</span>
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
        <main className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">

          {/* -------------------------------------------------------------------
              PESTAÑA 1: RESUMEN GENERAL (DASHBOARD)
          -------------------------------------------------------------------- */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Tarjetas Principales de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                
                {/* Saldo Pendiente por Cobrar */}
                <div 
                  onClick={() => setActiveTab('debtors')}
                  className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs hover:border-red-300 transition cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Por Cobrar (Pendiente)</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                        ${totalPending.toLocaleString('es-CO')}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {pendingSales.length} {pendingSales.length === 1 ? 'cliente deudor' : 'clientes deudores'}
                      </p>
                    </div>
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl group-hover:scale-105 transition">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-red-600">
                    <span>Gestionar cobros</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Total Cobrado en Caja Real */}
                <div 
                  onClick={() => setActiveTab('payments')}
                  className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Caja Real (Total Cobrado)</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                        ${totalCollected.toLocaleString('es-CO')}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {allPayments.length} abonos registrados
                      </p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-emerald-600">
                    <span>Ver detalle de abonos</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Catálogo de Productos */}
                <div 
                  onClick={() => setActiveTab('products')}
                  className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition cursor-pointer relative overflow-hidden group sm:col-span-2 lg:col-span-1"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Inventario & Catálogo</p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                        {productsList.length} <span className="text-lg font-semibold text-slate-500">items</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Precios, costos y fotos</p>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                    <span>Ver catálogo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

              </div>

              {/* Acciones Rápidas Táctiles (Mobile-First) */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md shadow-blue-500/10">
                <h3 className="font-bold text-sm">Cobro & Ventas Rápidas</h3>
                <p className="text-xs text-blue-100 mt-0.5 mb-3">Registra ventas a crédito o nuevos clientes en segundos</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setIsVentaModalOpen(true)}
                    className="flex items-center justify-center space-x-1.5 bg-white text-blue-700 py-2.5 px-3 rounded-xl font-bold text-xs hover:bg-blue-50 transition"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    <span>Nueva Venta</span>
                  </button>
                  <button
                    onClick={() => setIsClienteModalOpen(true)}
                    className="flex items-center justify-center space-x-1.5 bg-blue-800/60 hover:bg-blue-800 text-white py-2.5 px-3 rounded-xl font-bold text-xs border border-white/20 transition"
                  >
                    <UserPlus className="w-4 h-4 text-white" />
                    <span>Nuevo Cliente</span>
                  </button>
                </div>
              </div>

              {/* Vista Rápida de Clientes Pendientes Urgentes */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-800">Deudas Principales por Cobrar</h3>
                  <button 
                    onClick={() => setActiveTab('debtors')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>Ver todos ({pendingSales.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {pendingSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {sale.clients?.full_name || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {sale.product_type || 'Venta a crédito'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          <p className="font-black text-sm text-red-600">
                            ${Number(sale.balance_due).toLocaleString('es-CO')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenAbono(sale)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-xs transition"
                        >
                          Abonar
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingSales.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-8">¡Al día! No tienes ventas pendientes por cobrar.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* -------------------------------------------------------------------
              PESTAÑA 2: COBROS Y DEUDORES
          -------------------------------------------------------------------- */}
          {activeTab === 'debtors' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Buscador Rápido Fijo */}
              <div className="sticky top-14 z-20 bg-slate-50 pt-1 pb-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, teléfono o producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 mt-2 px-1">
                  <span>Mostrando <strong>{filteredPendingSales.length}</strong> deudores</span>
                  <span className="font-semibold text-red-600">
                    Total: ${filteredPendingSales.reduce((acc, s) => acc + Number(s.balance_due), 0).toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* Lista de Tarjetas de Deudores (Mobile Cards) */}
              <div className="space-y-3">
                {filteredPendingSales.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
                    <p className="text-sm font-medium">No se encontraron clientes que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  filteredPendingSales.map((sale) => (
                    <div 
                      key={sale.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition"
                    >
                      {/* Cabecera del Cliente */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-base text-slate-900 leading-snug">
                            {sale.clients?.full_name || 'Cliente sin nombre'}
                          </h4>
                          {sale.product_type && (
                            <span className="inline-block mt-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              {sale.product_type}
                            </span>
                          )}
                        </div>

                        {/* Montos */}
                        <div className="text-right shrink-0">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Saldo a Deber</p>
                          <p className="text-lg font-black text-red-600">
                            ${Number(sale.balance_due).toLocaleString('es-CO')}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Total: ${Number(sale.total_amount).toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>

                      {/* Datos de Contacto Directo */}
                      {sale.clients?.phone && (
                        <div className="flex items-center space-x-2 pt-1 text-xs">
                          <a
                            href={`https://wa.me/57${sale.clients.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp ({sale.clients.phone})</span>
                          </a>
                          <a
                            href={`tel:${sale.clients.phone}`}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                            title="Llamar"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {/* Barra de Acciones */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1">
                          {/* Historial */}
                          <button
                            onClick={() => { setSaleForHistorial(sale); setIsHistorialModalOpen(true); }}
                            className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition"
                            title="Ver historial de abonos"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Editar Valor */}
                          <button
                            onClick={() => { setSaleToEdit(sale); setIsEditarVentaModalOpen(true); }}
                            className="p-2 text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition"
                            title="Editar valor a pagar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Eliminar (solo admin) */}
                          {(userRole === 'admin' || isSuperAdmin) && (
                            <button
                              onClick={() => handleDeleteSale(sale.id, sale.clients?.full_name)}
                              className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Botón Principal de Abono */}
                        <button
                          onClick={() => handleOpenAbono(sale)}
                          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Registrar Abono</span>
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* -------------------------------------------------------------------
              PESTAÑA 3: HISTORIAL GENERAL DE ABONOS
          -------------------------------------------------------------------- */}
          {activeTab === 'payments' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Tarjeta de Resumen */}
              <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-emerald-200 tracking-wider">Caja Real Recaudada</p>
                  <h3 className="text-2xl sm:text-3xl font-black mt-1">
                    ${totalCollected.toLocaleString('es-CO')}
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">{allPayments.length} abonos registrados en el sistema</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Lista de Abonos */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                {allPayments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Aún no hay abonos registrados.</div>
                ) : (
                  allPayments.map((pay) => (
                    <div key={pay.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="min-w-0 pr-3">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {pay.sales?.clients?.full_name || 'Cliente registrado'}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                          <span className="inline-flex items-center space-x-1 text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{pay.payment_date || 'Sin fecha'}</span>
                          </span>
                          <span>•</span>
                          <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                            {pay.payment_method || 'Efectivo'}
                          </span>
                        </div>
                        {pay.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1 truncate">
                            "{pay.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-black text-emerald-600 text-base">
                          +${Number(pay.amount).toLocaleString('es-CO')}
                        </span>
                        {(userRole === 'admin' || isSuperAdmin) && (
                          <button
                            onClick={() => handleDeletePayment(pay.id, pay.amount)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar abono"
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

          {/* -------------------------------------------------------------------
              PESTAÑA 4: CATÁLOGO DE PRODUCTOS
          -------------------------------------------------------------------- */}
          {activeTab === 'products' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Catálogo de Productos</h3>
                  <p className="text-xs text-slate-500">Administra precios de compra y venta</p>
                </div>
                <button
                  onClick={handleNewProduct}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nuevo Producto</span>
                </button>
              </div>

              {/* Grid de Productos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {productsList.length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
                    No hay productos registrados en el catálogo.
                  </div>
                ) : (
                  productsList.map((prod) => (
                    <div 
                      key={prod.id} 
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition"
                    >
                      {/* Imagen y Categoría */}
                      <div className="w-full h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">Sin Foto</span>
                        )}
                        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-xs text-slate-700 px-2 py-0.5 rounded-md shadow-xs">
                          {prod.category}
                        </span>

                        <div className="absolute top-2 right-2 flex space-x-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg shadow-xs">
                          <button
                            onClick={() => handleEditProduct(prod)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {(userRole === 'admin' || isSuperAdmin) && (
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Información */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">{prod.name}</h4>

                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block font-medium">Costo Compra</span>
                            <span className="font-bold text-slate-700">${Number(prod.purchase_price).toLocaleString('es-CO')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-600 text-[10px] block font-bold">Precio Venta</span>
                            <span className="font-black text-emerald-700 text-sm">
                              ${(Number(prod.sale_price || prod.purchase_price * 2)).toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* -------------------------------------------------------------------
              PESTAÑA 5: GESTIÓN SAAS / EMPRESAS (SUPERADMIN)
          -------------------------------------------------------------------- */}
          {activeTab === 'superadmin' && isSuperAdmin && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Tarjeta de Encabezado SuperAdmin */}
              <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 bg-purple-500/30 border border-purple-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-purple-200 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                    <span>Panel de Control SaaS</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">Administración de Empresas</h3>
                  <p className="text-xs text-purple-200 mt-0.5">Controla las suscripciones, activa o suspende el acceso a tus clientes</p>
                </div>
                <button
                  onClick={fetchEmpresas}
                  disabled={loadingEmpresas}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEmpresas ? 'animate-spin' : ''}`} />
                  <span>Actualizar Lista</span>
                </button>
              </div>

              {/* Métricas Globales del SaaS */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Empresas Totales</p>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{allEmpresas.length}</h4>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase">Activas (Al día)</p>
                  <h4 className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                    {allEmpresas.filter(e => e.estado === 'activo').length}
                  </h4>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-xs">
                  <p className="text-[10px] sm:text-xs font-bold text-red-600 uppercase">Suspendidas</p>
                  <h4 className="text-xl sm:text-2xl font-black text-red-600 mt-1">
                    {allEmpresas.filter(e => e.estado === 'suspendido').length}
                  </h4>
                </div>
              </div>

              {/* Lista de Empresas Registradas */}
              <div className="space-y-3">
                {loadingEmpresas ? (
                  <p className="text-center text-xs text-slate-400 py-8">Cargando empresas registradas...</p>
                ) : allEmpresas.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                    No hay empresas adicionales registradas.
                  </div>
                ) : (
                  allEmpresas.map((emp) => {
                    const isMainCompany = emp.id === '10883047-2700-0000-0000-000000000000' || emp.nit === '1088304727';
                    const isActivo = emp.estado === 'activo';

                    return (
                      <div
                        key={emp.id}
                        className={`bg-white p-4 sm:p-5 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                          isMainCompany ? 'border-purple-200 bg-purple-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-slate-900 text-base">{emp.nombre}</h4>
                            {isMainCompany && (
                              <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
                                Tu Empresa Matriz
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isActivo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {emp.estado}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span>NIT/Doc: <strong className="text-slate-700">{emp.nit || 'Sin registrar'}</strong></span>
                            <span>•</span>
                            <span>Registro: {emp.created_at ? new Date(emp.created_at).toLocaleDateString('es-CO') : 'N/A'}</span>
                          </div>
                        </div>

                        {/* Botones de Control de Cuenta */}
                        {!isMainCompany && (
                          <div className="flex items-center space-x-2">
                            {isActivo ? (
                              <button
                                onClick={() => handleToggleEstadoEmpresa(emp.id, emp.estado, emp.nombre)}
                                className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition shadow-xs"
                                title="Suspender acceso por falta de pago"
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span>Suspender Cuenta</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleEstadoEmpresa(emp.id, emp.estado, emp.nombre)}
                                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                title="Reactivar acceso"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Activar Cuenta</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </main>

        {/* =========================================================================
            BARRA DE NAVEGACIÓN INFERIOR (BOTTOM NAVIGATION MOBILE)
        ========================================================================== */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden flex justify-around items-center py-2 px-1 shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition ${
              activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('debtors')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl relative transition ${
              activeTab === 'debtors' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Deudores</span>
            {pendingSales.length > 0 && (
              <span className="absolute top-0 right-3 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingSales.length > 99 ? '99+' : pendingSales.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition ${
              activeTab === 'payments' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Abonos</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition ${
              activeTab === 'products' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Catálogo</span>
          </button>
        </nav>

      </div>

      {/* =========================================================================
          MODALES DE LA APLICACIÓN
      ========================================================================== */}
      {selectedSale && (
        <AbonoModal
          saleId={selectedSale.id}
          clientName={selectedSale.clients?.full_name || 'Cliente'}
          currentBalance={Number(selectedSale.balance_due)}
          isOpen={isAbonoModalOpen}
          empresaId={empresaId}
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
        empresaId={empresaId}
        onClose={() => setIsVentaModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <NuevoClienteModal
        isOpen={isClienteModalOpen}
        empresaId={empresaId}
        onClose={() => setIsClienteModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <NuevoProductoModal
        isOpen={isProductoModalOpen}
        productToEdit={selectedProduct}
        empresaId={empresaId}
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

    </div>
  );
}