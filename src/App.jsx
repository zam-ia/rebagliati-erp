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
import GestionEstrategica from './pages/GestionEstrategica'; // <-- Nueva página añadida

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5]">
        <div className="w-12 h-12 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-[#11284e] font-bold animate-pulse">Cargando sistema...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública */}
        <Route path="/login" element={<Login />} />

        {/* Redirección inicial */}
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Rutas Protegidas */}
        {[
          { path: '/dashboard', component: <Dashboard /> },
          { path: '/inscripciones', component: <Inscripciones /> },
          { path: '/caja', component: <Caja /> },
          { path: '/crm', component: <CRM /> },
          { path: '/rrhh', component: <RRHH /> },
          { path: '/logistica', component: <Logistica /> },
          { path: '/reclamaciones', component: <Reclamaciones /> },
          { path: '/reportes', component: <Reportes /> },
          { path: '/gestion', component: <GestionEstrategica /> }, // <-- Ruta habilitada
        ].map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute>
                <Layout>{route.component}</Layout>
              </ProtectedRoute>
            }
          />
        ))}

        {/* Fallback para rutas no encontradas */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;