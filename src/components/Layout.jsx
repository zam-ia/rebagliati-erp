// src/components/Layout.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Notificaciones from './Notificaciones';
import {
  LayoutDashboard, FileEdit, Wallet, Users,
  Briefcase, Package, ClipboardList, TrendingUp,
  Menu, ChevronRight, LogOut, ChevronLeft,
  ShieldCheck, DollarSign, ChevronDown,
  Clock, Calendar, AlertCircle, FileText, UserPlus,
  Target, Megaphone, CalendarDays, Palette,
  FolderOpen, Bot, BarChart3, Building2, MessageSquare
} from 'lucide-react';

const NAV_GRUPOS = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard',     nombre: 'Dashboard', icon: LayoutDashboard, permiso: 'Dashboard' },
      { path: '/inscripciones', nombre: 'Inscripciones', icon: FileEdit, permiso: 'Inscripciones' },
      { path: '/caja',          nombre: 'Caja y Pagos', icon: Wallet, permiso: 'Caja' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        nombre: 'Marketing',
        icon: TrendingUp,
        permiso: 'Marketing',
        subItems: [
          { path: '/marketing/dashboard',        nombre: 'Dashboard',             icon: LayoutDashboard, permiso: 'marketing_dashboard' },
          { path: '/marketing/planeacion',       nombre: 'Planeación Estratégica',icon: Target,           permiso: 'marketing_planeacion' },
          { path: '/marketing/crm',              nombre: 'CRM',                   icon: Users,            permiso: 'marketing_crm' },
          { path: '/marketing/campanas',         nombre: 'Gestión de Campañas',   icon: Megaphone,        permiso: 'marketing_campanas' },
          { path: '/marketing/calendario',       nombre: 'Calendario de Contenido',icon: CalendarDays,    permiso: 'marketing_calendario' },
          { path: '/marketing/produccion',       nombre: 'Producción Creativa',   icon: Palette,          permiso: 'marketing_produccion' },
          { path: '/marketing/biblioteca',       nombre: 'Biblioteca de Activos', icon: FolderOpen,       permiso: 'marketing_biblioteca' },
          { path: '/marketing/publicidad',       nombre: 'Publicidad y Ppto.',    icon: DollarSign,       permiso: 'marketing_publicidad' },
          { path: '/marketing/automatizacion',   nombre: 'Automatización',        icon: Bot,              permiso: 'marketing_automatizacion' },
          { path: '/marketing/metricas',         nombre: 'Métricas y Analytics',  icon: BarChart3,        permiso: 'marketing_metricas' },
          { path: '/marketing/marca',            nombre: 'Gestión de Marca',      icon: Building2,        permiso: 'marketing_marca' },
          { path: '/marketing/colaboracion',     nombre: 'Colaboración y Flujos', icon: MessageSquare,    permiso: 'marketing_colaboracion' },
          { path: '/marketing/briefing',         nombre: 'Briefing de Contenido', icon: ClipboardList,    permiso: 'marketing_briefing' }, // ⭐ NUEVO
        ],
      },
      {
        nombre: 'RRHH',
        icon: Briefcase,
        permiso: 'RRHH',
        subItems: [
          { path: '/rrhh/perfil',           nombre: 'Perfil 360°', icon: LayoutDashboard, permiso: 'rrhh_perfil' },
          { path: '/rrhh/base',             nombre: 'Base de datos', icon: Users, permiso: 'rrhh_base' },
          { path: '/rrhh/directorio',       nombre: 'Directorio', icon: Users, permiso: 'rrhh_directorio' },
          { path: '/rrhh/reclutamiento',    nombre: 'Reclutamiento', icon: UserPlus, permiso: 'rrhh_reclutamiento' },
          { path: '/rrhh/horarios',         nombre: 'Horarios', icon: Clock, permiso: 'rrhh_horarios' },
          { path: '/rrhh/vacaciones',       nombre: 'Vacaciones', icon: Calendar, permiso: 'rrhh_vacaciones' },
          { path: '/rrhh/descansos',        nombre: 'Descansos médicos', icon: AlertCircle, permiso: 'rrhh_descansos' },
          { path: '/rrhh/evaluacion',       nombre: 'Evaluación', icon: FileText, permiso: 'rrhh_evaluacion' },
          { path: '/rrhh/locadores',        nombre: 'Locadores', icon: Briefcase, permiso: 'rrhh_locadores' },
          { path: '/rrhh/planilla_pagos',   nombre: 'Planilla y Pagos', icon: FileText, permiso: 'rrhh_planilla_pagos' },
          { path: '/rrhh/novedades',        nombre: 'Novedades Planilla', icon: AlertCircle, permiso: 'rrhh_novedades' },
          { path: '/rrhh/documentos',       nombre: 'Contratos y documentos', icon: FileText, permiso: 'rrhh_documentos' },
        ],
      },
      { path: '/finanzas',      nombre: 'Finanzas', icon: DollarSign, permiso: 'Finanzas' },
      { path: '/logistica',     nombre: 'Logística', icon: Package, permiso: 'Logística' },
      { path: '/gestion',       nombre: 'Gestión Estratégica', icon: TrendingUp, permiso: 'Gestión Estratégica' },
      { path: '/reclamaciones', nombre: 'Reclamaciones', icon: ClipboardList, permiso: 'Reclamaciones' },
      { path: '/reportes',      nombre: 'Reportes', icon: TrendingUp, permiso: 'Reportes' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/admin/usuarios', nombre: 'Usuarios', icon: ShieldCheck, permiso: 'admin usuarios' },
    ],
  },
];

function MenuItem({ item, sidebarOpen, isMobile, location, expandSidebar }) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const Icon = item.icon;
  
  const isActive = useMemo(() => {
    if (item.subItems) return item.subItems.some(sub => location.pathname === sub.path);
    return location.pathname === item.path;
  }, [item, location.pathname]);

  useEffect(() => {
    if (!sidebarOpen && !isMobile) setSubmenuOpen(false);
  }, [sidebarOpen, isMobile]);

  if (item.subItems) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => {
            if (sidebarOpen || isMobile) {
              setSubmenuOpen(!submenuOpen);
            } else {
              expandSidebar();
              setSubmenuOpen(true);
            }
          }}
          className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 group ${
            isActive 
              ? 'bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white shadow-lg shadow-[#185FA5]/25 border border-white/10' 
              : 'text-white/50 hover:bg-white/5 hover:text-white hover:shadow-sm'
          }`}
        >
          <Icon size={18} className={`${isActive ? 'text-white' : 'group-hover:text-[#7eb3f5] transition-colors duration-300'}`} />
          {(sidebarOpen || isMobile) && (
            <>
              <span className="text-[13px] font-semibold flex-1 text-left tracking-tight">{item.nombre}</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${submenuOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
        
        {(sidebarOpen || isMobile) && submenuOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3 py-1 animate-in slide-in-from-top-2 duration-300">
            {item.subItems.map(sub => {
              const subActive = location.pathname === sub.path;
              return (
                <Link
                  key={sub.path}
                  to={sub.path}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-[12px] transition-all duration-200 group ${
                    subActive 
                      ? 'text-[#7eb3f5] font-semibold bg-[#7eb3f5]/10 shadow-sm shadow-[#7eb3f5]/10' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <sub.icon size={13} className={subActive ? 'text-[#7eb3f5]' : 'text-white/30 group-hover:text-white/60 transition-colors'} />
                  <span>{sub.nombre}</span>
                  {subActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7eb3f5] shadow-[0_0_6px_rgba(126,179,245,0.6)]" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 group mb-0.5 ${
        isActive 
          ? 'bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white shadow-lg shadow-[#185FA5]/25 border border-white/10' 
          : 'text-white/50 hover:bg-white/5 hover:text-white hover:shadow-sm'
      }`}
    >
      <Icon size={18} className={`${isActive ? 'text-white' : 'group-hover:text-[#7eb3f5] transition-colors duration-300'}`} />
      {(sidebarOpen || isMobile) && (
        <>
          <span className="text-[13px] font-semibold tracking-tight">{item.nombre}</span>
          {isActive && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
          )}
        </>
      )}
    </Link>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('sidebarOpen') !== 'false');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const [tareasHoy, setTareasHoy] = useState([]);

  useEffect(() => {
    const obtenerNombre = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('perfiles_usuarios')
          .select('nombre')
          .eq('id', user.id)
          .single();
        if (data?.nombre) setNombreUsuario(data.nombre);
        else setNombreUsuario(user.email?.split('@')[0] || 'Usuario');
      }
    };
    obtenerNombre();
  }, []);

  useEffect(() => {
    const yaMostrado = sessionStorage.getItem('bienvenida_mostrada');
    if (!yaMostrado) {
      const cargarTareasHoy = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const hoy = new Date().toISOString().split('T')[0];
          const { data } = await supabase
            .from('tareas_usuario')
            .select('*')
            .eq('user_id', user.id)
            .eq('completada', false)
            .eq('fecha_recordatorio', hoy);
          if (data && data.length > 0) {
            setTareasHoy(data);
            setMostrarBienvenida(true);
            sessionStorage.setItem('bienvenida_mostrada', 'true');
          }
        }
      };
      cargarTareasHoy();
    }
  }, []);

  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  useEffect(() => {
    const fetchPermisos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      setUsuarioEmail(user.email);

      const { data: pData } = await supabase
        .from('permisos_usuarios')
        .select('modulo, puede_ver')
        .eq('user_id', user.id);
      const permisosObj = {};
      pData?.forEach(p => { permisosObj[p.modulo] = p.puede_ver; });

      const esAdmin = user.email === 'admin@rebagliati.com';

      const filtrados = NAV_GRUPOS.map(grupo => ({
        ...grupo,
        items: grupo.items
          .map(item => {
            if (item.subItems) {
              const tienePermisoPadre = esAdmin || permisosObj[item.permiso] === true;
              if (tienePermisoPadre) {
                return { ...item, subItems: item.subItems };
              }
              const subsFiltrados = item.subItems.filter(sub =>
                esAdmin || permisosObj[sub.permiso] === true
              );
              return subsFiltrados.length > 0 ? { ...item, subItems: subsFiltrados } : null;
            }
            return (esAdmin || permisosObj[item.permiso] === true) ? item : null;
          })
          .filter(Boolean)
      })).filter(grupo => grupo.items.length > 0);

      setMenuItems(filtrados);
    };
    fetchPermisos();
  }, [navigate]);

  const moduloActivo = useMemo(() => {
    for (const grupo of NAV_GRUPOS) {
      for (const item of grupo.items) {
        if (item.subItems) {
          const sub = item.subItems.find(s => s.path === location.pathname);
          if (sub) return sub.nombre;
        }
        if (item.path === location.pathname) return item.nombre;
      }
    }
    return 'ERP';
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#F4F7FA] font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-[#0a1930]/50 backdrop-blur-md z-40 md:hidden transition-opacity duration-300" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar VIP */}
      <aside className={`fixed inset-y-0 left-0 z-50 md:relative transition-all duration-300 ease-out bg-gradient-to-b from-[#0B1527] to-[#091220] shadow-2xl shadow-black/20 ${sidebarOpen ? 'w-[260px]' : 'w-20'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full border-r border-white/5 relative z-10">
          
          {/* Logo Section */}
          <div className="h-[72px] flex items-center justify-between px-5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#185FA5] to-[#0B2A4A] flex items-center justify-center border border-white/10 shadow-lg shadow-[#185FA5]/20">
                <span className="font-bold text-[14px] text-white">R</span>
              </div>
              {sidebarOpen && (
                <div className="animate-in fade-in duration-500">
                  <p className="font-bold text-[14px] tracking-tight text-white leading-none">REBAGLIATI</p>
                  <p className="text-[9px] text-[#7eb3f5] font-bold uppercase tracking-[0.25em] mt-1 opacity-80">Corporativo</p>
                </div>
              )}
            </div>
            {!mobileOpen && (
              <button 
                onClick={() => { setSidebarOpen(!sidebarOpen); localStorage.setItem('sidebarOpen', !sidebarOpen); }} 
                className="hidden md:flex p-2 hover:bg-white/10 rounded-xl transition-all duration-300 text-white/40 hover:text-white hover:scale-105"
              >
                {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 custom-scrollbar">
            {menuItems.map(grupo => (
              <div key={grupo.label}>
                {sidebarOpen && (
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-3 px-3">
                    {grupo.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {grupo.items.map(item => (
                    <MenuItem 
                      key={item.nombre} 
                      item={item} 
                      sidebarOpen={sidebarOpen} 
                      isMobile={mobileOpen} 
                      location={location} 
                      expandSidebar={() => { setSidebarOpen(true); localStorage.setItem('sidebarOpen', 'true'); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User Footer */}
          <div className="p-4 bg-[#08101E]/80 backdrop-blur-sm border-t border-white/5 shrink-0">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#185FA5]/30 to-[#0B2A4A]/30 flex items-center justify-center text-[12px] font-bold border border-[#185FA5]/30 text-[#7eb3f5] shadow-sm">
                {usuarioEmail?.slice(0, 2).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 animate-in fade-in duration-500">
                  <p className="text-[12px] font-semibold truncate text-white/90 uppercase">
                    {usuarioEmail?.split('@')[0]}
                  </p>
                  <button 
                    onClick={handleLogout} 
                    className="text-[11px] text-red-400/70 hover:text-red-400 flex items-center gap-1.5 mt-1 font-medium transition-colors hover:bg-red-500/10 px-1.5 py-0.5 rounded-lg -ml-1.5"
                  >
                    <LogOut size={12} /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-[72px] bg-white/80 backdrop-blur-xl border-b border-slate-200/40 flex items-center justify-between px-6 md:px-8 shrink-0 z-[60] shadow-sm shadow-slate-200/50">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setMobileOpen(true)} 
              className="md:hidden p-2 text-slate-500 hover:text-[#0B1527] bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-slate-100/80 backdrop-blur-sm rounded-lg hidden sm:block border border-slate-200/50 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Módulo</span>
              </div>
              <ChevronRight size={14} className="text-slate-400 hidden sm:block" />
              <h1 className="text-[15px] font-bold text-[#0B1527] uppercase tracking-tight">{moduloActivo}</h1>
            </div>
            {/* Saludo VIP */}
            <div className="hidden md:flex items-center gap-2 text-slate-500 text-[13px] ml-4 pl-4 border-l border-slate-200">
              <span>{getSaludo()},</span>
              <span className="font-bold text-[#185FA5]">{nombreUsuario}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="hidden lg:block text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">En línea</p>
              <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                <p className="text-[11px] font-semibold text-slate-700">
                  {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200/80 mx-1" />
            
            <div className="relative z-[70]">
              <Notificaciones />
            </div>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-[#F4F7FA] via-white to-blue-50/20 custom-scrollbar relative z-0">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Modal de bienvenida mejorado */}
      {mostrarBienvenida && (
        <div 
          className="fixed inset-0 bg-[#0B1527]/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all duration-300"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl shadow-blue-500/10 border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm shadow-blue-200/50">
              <Calendar size={28} className="text-[#185FA5]" />
            </div>
            <h3 className="text-lg font-bold text-[#0B1527]">Tareas programadas hoy</h3>
            <p className="text-slate-500 text-sm mt-2 mb-5 leading-relaxed">
              Estas son tus actividades pendientes para hoy:
            </p>
            
            <ul className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
              {tareasHoy.map(tarea => (
                <li key={tarea.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all group">
                  <p className="font-semibold text-sm text-[#0B1527] group-hover:text-[#185FA5] transition-colors">{tarea.titulo}</p>
                  {tarea.descripcion && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{tarea.descripcion}</p>}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => setMostrarBienvenida(false)}
              className="mt-6 w-full bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#185FA5]/20 hover:shadow-[#185FA5]/30 active:scale-[0.98]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.08); border-radius: 20px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.15); }
        @keyframes fadeIn {
          from { opacity: 0; backdrop-filter: blur(0); }
          to { opacity: 1; backdrop-filter: blur(12px); }
        }
      `}} />
    </div>
  );
}