import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Notificaciones from './Notificaciones';
import { 
  LayoutDashboard, FileEdit, Wallet, Users, 
  Briefcase, Package, ClipboardList, TrendingUp, 
  Menu, ChevronRight, LogOut, ChevronLeft,
  ShieldCheck, DollarSign 
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
      { path: '/finanzas',      nombre: 'Finanzas', icon: DollarSign },
      { path: '/logistica',     nombre: 'Logística', icon: Package },
      { path: '/gestion',       nombre: 'Gestión Estratégica', icon: TrendingUp },
      { path: '/reclamaciones', nombre: 'Reclamaciones', icon: ClipboardList },
      { path: '/reportes',      nombre: 'Reportes', icon: TrendingUp },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/admin/usuarios', nombre: 'Administrar Usuarios', icon: ShieldCheck },
    ],
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('sidebarOpen') !== 'false');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const fetchPermisos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUsuarioEmail(user.email);

      // Obtener permisos desde Supabase
      const { data: pData } = await supabase
        .from('permisos_usuarios')
        .select('modulo, puede_ver')
        .eq('user_id', user.id);

      const permisosObj = {};
      pData?.forEach(p => { permisosObj[p.modulo] = p.puede_ver; });

      const esAdmin = user.email === 'admin@rebagliati.com';
      
      // Filtrar el menú basado en la base de datos
      const filtrados = NAV_GRUPOS.map(grupo => ({
        ...grupo,
        items: grupo.items.filter(item => esAdmin || permisosObj[item.nombre])
      })).filter(g => g.items.length > 0);

      setMenuItems(filtrados);
    };
    fetchPermisos();
  }, [navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const state = !prev;
      localStorage.setItem('sidebarOpen', state);
      return state;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const moduloActivo = NAV_GRUPOS.flatMap(g => g.items).find(i => i.path === location.pathname)?.nombre || 'ERP';

  const SidebarContent = ({ isMobile = false }) => (
    <div className="relative flex flex-col h-full bg-[#0a1930] text-white border-r border-white/5 overflow-hidden font-sans">
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0a1930] relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#185FA5] to-[#0a1930] flex items-center justify-center border border-white/10">
            <span className="font-black text-[12px]">RD</span>
          </div>
          {(sidebarOpen || isMobile) && (
            <div className="leading-none">
              <p className="font-black text-[13px] tracking-tight">REBAGLIATI</p>
              <p className="text-[9px] text-[#7eb3f5] font-bold uppercase tracking-widest mt-0.5">Sistema ERP</p>
            </div>
          )}
        </div>
        {!isMobile && (
          <button onClick={toggleSidebar} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white">
            {sidebarOpen ? <ChevronLeft size={16}/> : <Menu size={16}/>}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar relative z-10">
        {menuItems.map(grupo => (
          <div key={grupo.label}>
            {(sidebarOpen || isMobile) && (
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.25em] mb-4 px-3">
                {grupo.label}
              </p>
            )}
            <div className="space-y-1">
              {grupo.items.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                      active 
                        ? 'bg-[#185FA5] text-white shadow-lg shadow-[#185FA5]/20' 
                        : 'text-white/40 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? 'text-white' : 'group-hover:text-[#7eb3f5]'} />
                    {(sidebarOpen || isMobile) && <span className="text-[13px] font-bold">{item.nombre}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 bg-black/20 border-t border-white/5 relative z-10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#185FA5] to-[#0a1930] flex items-center justify-center text-[10px] font-black border border-white/20">
            {usuarioEmail?.slice(0,2).toUpperCase()}
          </div>
          {(sidebarOpen || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black truncate opacity-80 uppercase tracking-tight">{usuarioEmail?.split('@')[0]}</p>
              <button onClick={handleLogout} className="text-[9px] text-red-400/60 hover:text-red-400 flex items-center gap-1 mt-0.5 font-black uppercase tracking-widest">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-[#0a1930]/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      
      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-50 md:relative transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-64' : 'w-20'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <SidebarContent isMobile={mobileOpen} />
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 relative z-30">
          <div className="flex items-center gap-6">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-gray-400 hover:text-[#0a1930]"><Menu size={20}/></button>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-300 tracking-[0.3em] uppercase">Módulo</span>
              <ChevronRight size={12} className="text-gray-200" />
              <span className="text-[14px] font-black text-[#0a1930] uppercase tracking-tighter">{moduloActivo}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none">Lima, PE</p>
              <p className="text-[11px] font-bold text-[#0a1930] mt-1">{new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</p>
            </div>
            <div className="w-px h-8 bg-gray-100 mx-2" />
            <Notificaciones />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#f8fafc] custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); }
      `}} />
    </div>
  );
}