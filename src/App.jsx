// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';

// Importación de Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inscripciones from './pages/Inscripciones';
import Caja from './pages/Caja';
import CRM from './pages/CRM';
import RRHH from './pages/RRHH';
import Logistica from './pages/Logistica';
import Reclamaciones from './pages/Reclamaciones';
import Reportes from './pages/Reportes';
import GestionEstrategica from './pages/GestionEstrategica';
import AdminUsuarios from './pages/AdminUsuarios';
import Finanzas from './pages/finanzas';   // <-- NUEVA IMPORTACIÓN (estructura carpetas)

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5]">
        <div className="w-10 h-10 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#11284e] font-bold text-sm uppercase tracking-widest">Iniciando ERP...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {
  // Array de configuración de rutas privadas
  const rutasPrivadas = [
    { path: '/dashboard', component: <Dashboard /> },
    { path: '/inscripciones', component: <Inscripciones /> },
    { path: '/caja', component: <Caja /> },
    { path: '/crm', component: <CRM /> },
    { path: '/rrhh', component: <RRHH /> },
    { path: '/logistica', component: <Logistica /> },
    { path: '/reclamaciones', component: <Reclamaciones /> },
    { path: '/reportes', component: <Reportes /> },
    { path: '/gestion', component: <GestionEstrategica /> },
    { path: '/admin/usuarios', component: <AdminUsuarios /> },
    { path: '/finanzas', component: <Finanzas /> },  // <-- NUEVA RUTA FINANZAS
  ];

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Renderizado Dinámico de Rutas Protegidas */}
        {rutasPrivadas.map((ruta) => (
          <Route
            key={ruta.path}
            path={ruta.path}
            element={
              <ProtectedRoute>
                <Layout>{ruta.component}</Layout>
              </ProtectedRoute>
            }
          />
        ))}

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;