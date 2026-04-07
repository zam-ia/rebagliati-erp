import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const menuItems = [
  { path: '/dashboard', nombre: 'Dashboard', icono: '📊' },
  { path: '/inscripciones', nombre: 'Inscripciones', icono: '📝' },
  { path: '/caja', nombre: 'Caja y Pagos', icono: '💰' },
  { path: '/crm', nombre: 'CRM Clientes', icono: '👥' },
  { path: '/rrhh', nombre: 'RRHH', icono: '👔' },
  { path: '/reclamaciones', nombre: 'Reclamaciones', icono: '📋' },
  { path: '/reportes', nombre: 'Reportes', icono: '📈' },
];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarAbierto, setSidebarAbierto] = useState(() => {
    const saved = localStorage.getItem('sidebarAbierto');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Corregido: getUser es asíncrono, pero para el estado inicial podemos dejarlo así o usar un useEffect
  const [usuario] = useState('Usuario'); 

  const toggleSidebar = () => {
    const nuevoEstado = !sidebarAbierto;
    setSidebarAbierto(nuevoEstado);
    localStorage.setItem('sidebarAbierto', nuevoEstado);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar con estilo minimalista */}
      <aside
        className={`bg-[#185FA5] text-white flex flex-col transition-all duration-500 ease-in-out shadow-xl z-20 ${
          sidebarAbierto ? 'w-64' : 'w-20'
        }`}
      >
        {/* Header del Sidebar con las 3 líneas */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          {sidebarAbierto && (
            <span className="text-2xl font-black tracking-tighter transition-opacity duration-300">
              RD<span className="text-blue-300">.</span>
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-white/10 transition-all active:scale-90"
            title="Menú"
          >
            {/* Icono de 3 líneas (Hamburguesa) */}
            <div className="space-y-1.5">
              <div className={`h-0.5 bg-white transition-all ${sidebarAbierto ? 'w-6' : 'w-5'}`}></div>
              <div className="h-0.5 w-6 bg-white"></div>
              <div className={`h-0.5 bg-white transition-all ${sidebarAbierto ? 'w-6' : 'w-4'}`}></div>
            </div>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-6 space-y-2 px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-white text-[#185FA5] shadow-lg font-bold' 
                    : 'text-blue-100 hover:bg-white/10'
                } ${!sidebarAbierto && 'justify-center px-0'}`}
                title={!sidebarAbierto ? item.nombre : ''}
              >
                <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
                  {item.icono}
                </span>
                {sidebarAbierto && (
                  <span className="text-sm tracking-wide transition-opacity duration-300">
                    {item.nombre}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout más estético abajo */}
        <div className="p-4 border-t border-white/10">
           <button 
             onClick={handleLogout}
             className={`flex items-center gap-4 w-full p-3 rounded-xl hover:bg-red-500/20 text-red-100 transition-colors ${!sidebarAbierto && 'justify-center'}`}
           >
             <span className="text-xl">🚪</span>
             {sidebarAbierto && <span className="text-xs font-bold uppercase tracking-widest">Salir</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Superior Moderno */}
        <header className="h-20 bg-white border-b border-gray-100 px-8 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-[0.2em] mb-0.5">Módulo Actual</h2>
            <p className="text-xl font-bold text-gray-800 tracking-tight">
              {menuItems.find(item => item.path === location.pathname)?.nombre || 'Panel de Control'}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right hidden sm:block">
              <span className="text-sm font-bold text-gray-800">{usuario}</span>
              <span className="text-[10px] text-green-500 font-bold uppercase">En línea</span>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-blue-50">
              👤
            </div>
          </div>
        </header>

        {/* Contenedor de las páginas */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;