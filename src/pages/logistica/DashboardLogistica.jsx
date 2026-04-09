// src/pages/logistica/DashboardLogistica.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, AlertTriangle, TrendingUp, ShoppingCart, 
  DollarSign, Clock, RefreshCw, ChevronRight,
  Boxes, ShieldAlert, ClipboardCheck
} from 'lucide-react';

export default function DashboardLogistica() {
  const [stats, setStats] = useState({
    totalProductos: 0,
    stockValorizado: 0,
    productosBajoStock: 0,
    productosVencidos: 0,
    ordenesPendientes: 0,
    movimientosMes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    
    // Total productos activos
    const { count: totalProductos } = await supabase.from('productos').select('*', { count: 'exact', head: true }).eq('activo', true);
    
    // Stock valorizado
    const { data: lotes } = await supabase.from('inventario_lotes').select('stock_actual, costo_unitario');
    const stockValorizado = lotes?.reduce((acc, l) => acc + (l.stock_actual * (l.costo_unitario || 0)), 0) || 0;
    
    // Productos bajo stock mínimo
    const { data: productosBajo } = await supabase.from('productos').select('id, stock_minimo');
    let bajoStock = 0;
    for (const p of productosBajo || []) {
      const { data: lotesProd } = await supabase.from('inventario_lotes').select('stock_actual').eq('producto_id', p.id);
      const totalStock = lotesProd?.reduce((s, l) => s + l.stock_actual, 0) || 0;
      if (totalStock <= p.stock_minimo) bajoStock++;
    }
    
    // Productos vencidos
    const hoy = new Date().toISOString().split('T')[0];
    const { count: vencidos } = await supabase.from('inventario_lotes').select('*', { count: 'exact', head: true }).lt('fecha_vencimiento', hoy).gt('stock_actual', 0);
    
    // Órdenes de compra pendientes
    const { count: ordenesPend } = await supabase.from('ordenes_compra').select('*', { count: 'exact', head: true }).in('estado', ['Pendiente', 'Aprobada']);
    
    // Movimientos del mes
    const primerDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { count: movimientos } = await supabase.from('movimientos_inventario').select('*', { count: 'exact', head: true }).gte('created_at', primerDia);

    setStats({
      totalProductos: totalProductos || 0,
      stockValorizado,
      productosBajoStock: bajoStock,
      productosVencidos: vencidos || 0,
      ordenesPendientes: ordenesPend || 0,
      movimientosMes: movimientos || 0
    });
    setLoading(false);
  };

  // Pantalla de carga profesional
  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded-lg mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Catálogo de Productos',
      value: stats.totalProductos,
      sublabel: 'Productos activos en sistema',
      icon: <Package size={24} />,
      color: 'blue',
      trend: 'Inventario Base'
    },
    {
      label: 'Valor de Inventario',
      value: `S/ ${stats.stockValorizado.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      sublabel: 'Costo total en almacenes',
      icon: <DollarSign size={24} />,
      color: 'emerald',
      trend: 'Activos Corrientes'
    },
    {
      label: 'Bajo Stock Mínimo',
      value: stats.productosBajoStock,
      sublabel: 'Requieren reposición urgente',
      icon: <ShieldAlert size={24} />,
      color: 'rose',
      trend: 'Riesgo Crítico',
      alert: stats.productosBajoStock > 0
    },
    {
      label: 'Lotes Vencidos',
      value: stats.productosVencidos,
      sublabel: 'Pérdida de inventario detectada',
      icon: <Clock size={24} />,
      color: 'amber',
      trend: 'Control de Calidad',
      alert: stats.productosVencidos > 0
    },
    {
      label: 'Compras Pendientes',
      value: stats.ordenesPendientes,
      sublabel: 'Órdenes en proceso/aprobación',
      icon: <ClipboardCheck size={24} />,
      color: 'indigo',
      trend: 'Abastecimiento'
    },
    {
      label: 'Flujo Logístico',
      value: stats.movimientosMes,
      sublabel: 'Movimientos registrados este mes',
      icon: <RefreshCw size={24} />,
      color: 'purple',
      trend: 'Actividad Operativa'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-600 border-blue-100',
      emerald: 'bg-emerald-500 text-emerald-600 border-emerald-100',
      rose: 'bg-rose-500 text-rose-600 border-rose-100',
      amber: 'bg-amber-500 text-amber-600 border-amber-100',
      indigo: 'bg-indigo-500 text-indigo-600 border-indigo-100',
      purple: 'bg-purple-500 text-purple-600 border-purple-100'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-[#11284e] tracking-tight flex items-center gap-3">
            Dashboard Logístico
            <span className="bg-blue-100 text-blue-600 text-[10px] uppercase px-2 py-1 rounded-md tracking-widest font-black">Real-Time</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Análisis de rendimiento y control de existencias</p>
        </div>
        <button 
          onClick={cargarDatos}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#185FA5] hover:shadow-md transition-all group"
        >
          <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-[2.5rem] p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}
          >
            {/* Background Decoration */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${card.color === 'rose' || card.color === 'amber' ? 'bg-red-500' : 'bg-blue-500'}`} />

            <div className="flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-${card.color}-100 bg-${card.color}-500 text-white`}>
                {card.icon}
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${card.alert ? 'text-rose-500 animate-pulse' : 'text-gray-400'}`}>
                {card.trend}
                <ChevronRight size={12} />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">{card.label}</p>
              <h2 className={`text-4xl font-black tracking-tighter ${card.alert ? 'text-rose-600' : 'text-[#11284e]'}`}>
                {card.value}
              </h2>
              <p className="text-xs text-gray-400 font-medium ml-1">{card.sublabel}</p>
            </div>

            {/* Warning indicator for critical stats */}
            {card.alert && (
              <div className="mt-4 flex items-center gap-2 bg-rose-50 p-2 rounded-xl border border-rose-100">
                <AlertTriangle size={14} className="text-rose-500" />
                <span className="text-[10px] font-bold text-rose-600 uppercase">Requiere Atención</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer / Quick Actions Placeholder */}
      <div className="mt-12 p-8 bg-gradient-to-r from-[#11284e] to-[#185FA5] rounded-[2.5rem] shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold">Optimización de Inventario</h3>
            <p className="text-blue-100 text-sm opacity-80">El sistema ha detectado {stats.productosBajoStock} productos con stock crítico. Sugerimos revisar las órdenes de compra.</p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl font-bold text-sm transition-all border border-white/10">
              Ver Alertas
            </button>
            <button className="px-6 py-3 bg-white text-[#11284e] rounded-2xl font-black text-sm hover:shadow-lg transition-all">
              Gestionar Compras
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      </div>
    </div>
  );
}