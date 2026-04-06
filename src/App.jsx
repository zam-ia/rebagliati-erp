import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inscripciones from './pages/Inscripciones';  // ← IMPORT del módulo Inscripciones

// Páginas temporales para los otros módulos
const Caja = () => <div className="text-center py-10"><h1 className="text-2xl">Caja y Pagos - Próximamente</h1></div>;
const CRM = () => <div className="text-center py-10"><h1 className="text-2xl">CRM Clientes - Próximamente</h1></div>;
const RRHH = () => <div className="text-center py-10"><h1 className="text-2xl">RRHH - Próximamente</h1></div>;
const Reclamaciones = () => <div className="text-center py-10"><h1 className="text-2xl">Reclamaciones - Próximamente</h1></div>;
const Reportes = () => <div className="text-center py-10"><h1 className="text-2xl">Reportes - Próximamente</h1></div>;

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
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
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
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/inscripciones" element={
          <ProtectedRoute>
            <Layout><Inscripciones /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/caja" element={
          <ProtectedRoute>
            <Layout><Caja /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/crm" element={
          <ProtectedRoute>
            <Layout><CRM /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/rrhh" element={
          <ProtectedRoute>
            <Layout><RRHH /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/reclamaciones" element={
          <ProtectedRoute>
            <Layout><Reclamaciones /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/reportes" element={
          <ProtectedRoute>
            <Layout><Reportes /></Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;