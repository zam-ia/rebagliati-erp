import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Notificaciones from './Notificaciones';

const NAV_GRUPOS = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard',     nombre: 'Dashboard', icon: '📊' },
      { path: '/inscripciones', nombre: 'Inscripciones', icon: '📝' },
      { path: '/caja',          nombre: 'Caja y Pagos', icon: '💰' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/crm',           nombre: 'CRM Clientes', icon: '👥' },
      { path: '/rrhh',          nombre: 'RRHH', icon: '👔' },
      { path: '/reclamaciones', nombre: 'Reclamaciones', icon: '📋' },
      { path: '/reportes',      nombre: 'Reportes', icon: '📈' },
    ],
  },
];

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

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

  const initials = usuario.slice(0, 2).toUpperCase();
  const moduloActivo = NAV_GRUPOS
    .flatMap(g => g.items)
    .find(i => i.path === location.pathname)?.nombre || 'Panel de Control';

  // Sidebar content reutilizable
  const SidebarContent = ({ onItemClick, isMobile = false }) => (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1e4280' }}>
          <span className="text-xs font-bold" style={{ color: '#7eb3f5' }}>RD</span>
        </div>
        {(sidebarOpen || isMobile) && (
          <div className="flex-1">
            <div className="text-white text-sm font-semibold leading-tight">Rebagliati</div>
            <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.3)', fontSize: 9 }}>
              Diplomados
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {NAV_GRUPOS.map(grupo => (
          <div key={grupo.label}>
            {(sidebarOpen || isMobile) && (
              <p className="px-5 mb-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,.25)', fontSize: 9 }}>
                {grupo.label}
              </p>
            )}
            <div className="px-3 space-y-0.5">
              {grupo.items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    title={(!sidebarOpen && !isMobile) ? item.nombre : ''}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    {(sidebarOpen || isMobile) && (
                      <span className="text-sm font-medium transition-colors"
                        style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: isActive ? 500 : 400 }}>
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

      <div className="px-3 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', paddingTop: 12 }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
            style={{ background: '#1e4280', color: '#7eb3f5' }}>
            {initials}
          </div>
          {(sidebarOpen || isMobile) && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {usuario}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>En línea</div>
              </div>
              <button onClick={handleLogout}
                className="text-xs px-2 py-1 rounded-md transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}>
                Salir
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#f0f2f5' }}>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar móvil (drawer) */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex flex-col w-64 md:hidden transition-transform duration-300"
        style={{
          background: '#11284e',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <SidebarContent onItemClick={() => setMobileOpen(false)} isMobile={true} />
      </aside>

      {/* Sidebar desktop (colapsable) */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          background: '#11284e',
          width: sidebarOpen ? 220 : 64,
          minHeight: '100vh',
        }}
      >
        <SidebarContent onItemClick={() => {}} isMobile={false} />
      </aside>

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">

        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center gap-4 px-5 md:px-7 bg-white border-b" style={{ height: 56, borderColor: '#e8ecf0' }}>
          
          {/* Botón de hamburguesa */}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#11284e' }}
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(true);
              } else {
                toggleSidebar();
              }
            }}
            title={window.innerWidth < 768 ? "Abrir menú" : (sidebarOpen ? "Ocultar menú" : "Mostrar menú")}
          >
            <MenuIcon />
          </button>

          <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
            <span>ERP</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span className="font-semibold text-sm" style={{ color: '#11284e' }}>{moduloActivo}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-xs px-3 py-1.5 rounded-lg border"
              style={{ color: '#94a3b8', background: '#f8fafc', borderColor: '#e8ecf0', fontSize: 11 }}>
              {fechaHoy}
            </span>

            {/* Componente de notificaciones */}
            <Notificaciones />

            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
              style={{ background: '#f0f2f5', color: '#11284e' }}>
              {initials || <UserIcon />}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ padding: '24px 20px', paddingLeft: 24, paddingRight: 24 }}>
          <div style={{ maxWidth: 1600, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}