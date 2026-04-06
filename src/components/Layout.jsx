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
  const [usuario, setUsuario] = useState(() => {
    const user = supabase.auth.getUser();
    return user?.email || 'Usuario';
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col" style={{ backgroundColor: '#185FA5' }}>
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-bold">RD</h1>
          <p className="text-sm text-blue-200">Rebagliati Diplomados</p>
        </div>
        <nav className="flex-1 py-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-3 hover:bg-blue-700 transition-colors ${
                location.pathname === item.path ? 'bg-blue-700 border-l-4 border-white' : ''
              }`}
            >
              <span>{item.icono}</span>
              <span>{item.nombre}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {menuItems.find(item => item.path === location.pathname)?.nombre || 'ERP'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">👤 {usuario}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;