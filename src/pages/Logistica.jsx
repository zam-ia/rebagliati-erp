// src/pages/Logistica.jsx
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Tags, Warehouse, ScrollText, Layers, 
  ClipboardList, ShoppingCart, Users, Truck, ShieldCheck, TrendingUp, 
  Menu, Bell, Search, ChevronLeft, ChevronRight, X
} from 'lucide-react';

// Importaciones de los componentes (asegúrate de que todos existan en ./logistica/)
import DashboardLogistica from './logistica/DashboardLogistica';
import Productos from './logistica/Productos';
import Familias from './logistica/Familias';
import Almacenes from './logistica/Almacenes';
import Kardex from './logistica/Kardex';
import Lotes from './logistica/Lotes';
import Requerimientos from './logistica/Requerimientos';
import Compras from './logistica/Compras';
import Proveedores from './logistica/Proveedores';
import Despachos from './logistica/Despachos';
import Auditorias from './logistica/Auditorias';
import ReportesLogistica from './logistica/ReportesLogistica';

const MENU_LOGISTICA = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'productos', icon: Package, label: 'Maestro de Productos' },
  { id: 'familias', icon: Tags, label: 'Familias / Categorías' },
  { id: 'almacenes', icon: Warehouse, label: 'Almacenes' },
  { id: 'kardex', icon: ScrollText, label: 'Kardex / Movimientos' },
  { id: 'lotes', icon: Layers, label: 'Lotes y Vencimientos' },
  { id: 'requerimientos', icon: ClipboardList, label: 'Requerimientos' },
  { id: 'compras', icon: ShoppingCart, label: 'Compras' },
  { id: 'proveedores', icon: Users, label: 'Proveedores' },
  { id: 'despachos', icon: Truck, label: 'Despachos' },
  { id: 'auditorias', icon: ShieldCheck, label: 'Auditorías' },
  { id: 'reportes', icon: TrendingUp, label: 'Reportes' },
];

const componentMap = {
  dashboard: DashboardLogistica,
  productos: Productos,
  familias: Familias,
  almacenes: Almacenes,
  kardex: Kardex,
  lotes: Lotes,
  requerimientos: Requerimientos,
  compras: Compras,
  proveedores: Proveedores,
  despachos: Despachos,
  auditorias: Auditorias,
  reportes: ReportesLogistica,
};

export default function Logistica() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [fechaActual, setFechaActual] = useState('');

  const ActiveComp = componentMap[activeTab];
  const activeLabel = MENU_LOGISTICA.find(item => item.id === activeTab)?.label || 'Logística';

  useEffect(() => {
    const fecha = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    setFechaActual(fecha.charAt(0).toUpperCase() + fecha.slice(1));
  }, []);

  return (
    <div className="flex h-screen bg-[#f0f2f5] font-sans text-slate-800 overflow-hidden">
      
      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR CORPORATIVO */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[#11284e] text-white flex flex-col transition-all duration-300 shadow-2xl md:shadow-none
        ${isCollapsed ? 'w-[64px]' : 'w-[220px]'} 
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Header del Sidebar */}
        <div className={`h-16 flex items-center border-b border-white/10 ${isCollapsed ? 'justify-center' : 'justify-between px-5'}`}>
          {!isCollapsed && <h2 className="text-lg font-black tracking-widest uppercase text-white/90">Logística</h2>}
          <div className="md:hidden">
            <button onClick={() => setIsMobileOpen(false)} className="text-white/50 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-1 px-2">
            {MENU_LOGISTICA.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => { setActiveTab(item.id); setIsMobileOpen(false); }}
                    className={`w-full flex items-center rounded-xl transition-all duration-200 group
                      ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'}
                      ${isActive 
                        ? 'bg-[#185FA5] text-white shadow-lg shadow-[#185FA5]/30' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} strokeWidth={isActive ? 2.5 : 2} />
                    {!isCollapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Toggle Collapse (Solo Desktop) */}
        <div className="hidden md:flex border-t border-white/10 p-4">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /><span className="text-sm font-semibold">Colapsar</span></div>}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR VIP */}
        <header className="h-16 bg-white border-b border-[#e8ecf0] px-4 md:px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:block">
              <div className="flex items-center text-sm font-medium text-slate-400">
                <span>Gestión Logística</span>
                <span className="mx-2">/</span>
                <span className="text-[#185FA5] font-bold">{activeLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:flex relative group">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#185FA5] transition-colors" />
              <input 
                type="text" 
                placeholder="Búsqueda rápida..." 
                className="bg-slate-50 border border-transparent focus:border-[#185FA5]/30 focus:bg-white rounded-full pl-10 pr-4 py-2 text-sm w-48 md:w-64 transition-all outline-none"
              />
            </div>
            <div className="hidden lg:block text-xs font-semibold text-slate-400">
              {fechaActual}
            </div>
            <button className="relative p-2 text-slate-400 hover:text-[#185FA5] transition-colors rounded-full hover:bg-blue-50">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* ÁREA DE TRABAJO */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto h-full">
            {ActiveComp ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ActiveComp />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white">
                <Package size={48} className="mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-700">Sección en Construcción</h3>
                <p className="text-sm mt-2">El módulo de {activeLabel} estará disponible pronto.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Estilos para ocultar scrollbar en el sidebar pero mantener funcionalidad */}
      <style dangerouslySetWidth={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}