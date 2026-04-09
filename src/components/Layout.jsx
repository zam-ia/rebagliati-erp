import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Notificaciones from './Notificaciones';

// Iconos premium y minimalistas
import { 
  LayoutDashboard, FileEdit, Wallet, Users, 
  Briefcase, Package, ClipboardList, TrendingUp, 
  Menu, ChevronRight, LogOut, ChevronLeft
} from 'lucide-react';

const NAV_GRUPOS = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard',     nombre: 'Dashboard', icon: LayoutDashboard },
      { path: '/inscripciones', nombre: 'Inscripciones', icon: FileEdit },
      { path: '/caja',          nombre: 'Caja y Pagos', icon: Wallet },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/crm',           nombre: 'CRM Clientes', icon: Users },
      { path: '/rrhh',          nombre: 'RRHH', icon: Briefcase },
      { path: '/logistica',     nombre: 'Logística', icon: Package },
      { path: '/reclamaciones', nombre: 'Reclamaciones', icon: ClipboardList },
      { path: '/reportes',      nombre: 'Reportes', icon: TrendingUp },
    ],
  },
];

export default function Layout({ children }) {
  const location  = useLocation();
  const navigate  = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [usuario, setUsuario]       = useState('');
  const [fechaHoy, setFechaHoy]     = useState('');

  useEffect(() => {
    const d = new Date();
    setFechaHoy(d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email || '';
      setUsuario(email ? email.split('@')[0] : 'Usuario');
    });
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarOpen', newState);
      return newState;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const initials = usuario.slice(0, 2).toUpperCase() || 'US';
  const moduloActivo = NAV_GRUPOS
    .flatMap(g => g.items)
    .find(i => i.path === location.pathname)?.nombre || 'Panel de Control';

  // Componente interno del Sidebar (para móvil y desktop)
  const SidebarContent = ({ onItemClick, isMobile = false }) => {
    const showText = sidebarOpen || isMobile;
    return (
      <div className="flex flex-col h-full bg-[#11284e] text-white font-sans">
        
        {/* HEADER con LOGO + BOTÓN HAMBURGUESA */}
        <div className="flex items-center justify-between gap-2 px-3 h-14 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-[#185FA5]/30 text-[#7eb3f5]">
              <span className="text-[11px] font-bold">RD</span>
            </div>
            {showText && (
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[13px] font-bold leading-none tracking-wide text-white/95">Rebagliati</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">Diplomados</div>
              </div>
            )}
          </div>
          {/* Botón de menú (hamburguesa) – solo en desktop, porque en móvil el drawer se abre con otro botón (ver más abajo) */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
            </button>
          )}
        </div>

        {/* NAV ITEMS */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 custom-scrollbar">
          {NAV_GRUPOS.map(grupo => (
            <div key={grupo.label} className="px-3">
              {showText && (
                <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {grupo.label}
                </p>
              )}
              <div className="space-y-1">
                {grupo.items.map(item => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onItemClick}
                      title={(!showText) ? item.nombre : ''}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group
                        ${isActive 
                          ? 'bg-[#185FA5] text-white shadow-md' 
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                      {showText && (
                        <span className={`text-[13px] truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
                          {item.nombre}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER USUARIO */}
        <div className="p-3 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#185FA5] text-white text-[11px] font-bold shadow-inner">
              {initials}
            </div>
            {showText && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate text-white/90">
                    {usuario || 'Usuario'}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    En línea
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f0f2f5] font-sans">

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-slate-900/40 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar móvil (drawer) */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex flex-col w-64 md:hidden transition-transform duration-300 shadow-2xl"
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <SidebarContent onItemClick={() => setMobileOpen(false)} isMobile={true} />
      </aside>

      {/* Sidebar desktop (colapsable) */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300 shadow-lg relative z-20"
        style={{ width: sidebarOpen ? 220 : 72 }}
      >
        <SidebarContent onItemClick={() => {}} isMobile={false} />
      </aside>

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">

        {/* Topbar más limpio (sin botón de menú) */}
        <header className="shrink-0 flex items-center justify-between px-5 md:px-6 h-14 bg-white border-b border-[#e8ecf0] z-10">
          {/* Breadcrumb (solo visible en escritorio) */}
          <div className="hidden sm:flex items-center gap-2 text-[13px]">
            <span className="text-slate-400 font-medium">ERP</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="font-semibold text-[#11284e]">{moduloActivo}</span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <span className="hidden sm:block text-[11px] font-medium px-2.5 py-1 rounded-md text-slate-500 bg-slate-50 border border-slate-200">
              {fechaHoy}
            </span>
            <div className="text-slate-500 hover:text-[#185FA5] transition-colors flex items-center">
              <Notificaciones />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto h-full">
            {children}
          </div>
        </main>

      </div>

      {/* Estilo scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      ` }} />
    </div>
  );
}