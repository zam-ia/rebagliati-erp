import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';

// Páginas
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
import Finanzas from './pages/finanzas';

// Mapa para redirección inteligente
const MAPA_RUTAS = {
  'Dashboard': '/dashboard',
  'Inscripciones': '/inscripciones',
  'Caja y Pagos': '/caja',
  'CRM Clientes': '/crm',
  'RRHH': '/rrhh',
  'Finanzas': '/finanzas',
  'Logística': '/logistica',
  'Gestión Estratégica': '/gestion',
  'Reclamaciones': '/reclamaciones',
  'Reportes': '/reportes',
  'Administrar Usuarios': '/admin/usuarios',
};

// Componente de Carga Estilizado
function LoadingScreen({ subtext = "Iniciando Módulos" }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-[#0a1930]/10 border-t-[#185FA5] rounded-full animate-spin mb-4" />
      <div className="text-center">
        <p className="text-[#0a1930] font-black text-[10px] uppercase tracking-[0.4em]">Rebagliati ERP</p>
        <p className="text-gray-300 text-[9px] font-bold uppercase mt-2 tracking-widest animate-pulse">{subtext}</p>
      </div>
    </div>
  );
}

// Director de Tráfico: Decide a dónde va el usuario al entrar
function SmartHome() {
  const [destino, setDestino] = useState(null);

  useEffect(() => {
    const resolverRuta = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setDestino('/login'); return; }

      const { data: permisos } = await supabase
        .from('permisos_usuarios')
        .select('modulo')
        .eq('user_id', session.user.id)
        .eq('puede_ver', true);

      if (session.user.email === 'admin@rebagliati.com') {
        setDestino('/dashboard');
        return;
      }

      if (!permisos || permisos.length === 0) {
        setDestino('/dashboard'); // Fallback
        return;
      }

      // Mandar al primer módulo que tenga permitido
      for (const p of permisos) {
        if (MAPA_RUTAS[p.modulo]) {
          setDestino(MAPA_RUTAS[p.modulo]);
          return;
        }
      }
      setDestino('/dashboard');
    };
    resolverRuta();
  }, []);

  if (!destino) return <LoadingScreen subtext="Validando Seguridad" />;
  return <Navigate to={destino} replace />;
}

// Protector de Rutas
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const rutasPrivadas = [
    { path: '/dashboard',     component: <Dashboard /> },
    { path: '/inscripciones', component: <Inscripciones /> },
    { path: '/caja',          component: <Caja /> },
    { path: '/crm',           component: <CRM /> },
    { path: '/rrhh',          component: <RRHH /> },
    { path: '/finanzas',      component: <Finanzas /> },
    { path: '/logistica',     component: <Logistica /> },
    { path: '/reclamaciones', component: <Reclamaciones /> },
    { path: '/reportes',      component: <Reportes /> },
    { path: '/gestion',       component: <GestionEstrategica /> },
    { path: '/admin/usuarios',component: <AdminUsuarios /> },
  ];

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<SmartHome />} />
        
        {rutasPrivadas.map(({ path, component }) => (
          <Route 
            key={path} 
            path={path} 
            element={
              <ProtectedRoute>
                <Layout>{component}</Layout>
              </ProtectedRoute>
            } 
          />
        ))}

        <Route path="*" element={<SmartHome />} />
      </Routes>
    </BrowserRouter>
  );
}