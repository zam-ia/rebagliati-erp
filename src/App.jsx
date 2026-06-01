import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import { getFirstAllowedRoute, hasAnyPermission, isAdminUser } from './lib/access';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inscripciones from './pages/Inscripciones';
import Caja from './pages/Caja';
import Ventas from './pages/Ventas';
import Marketing from './pages/Marketing';
import TabPlaneacionEstrategica from './pages/marketing/TabPlaneacionEstrategica';
import TabCRM from './pages/marketing/TabCRM';
import TabCampanas from './pages/marketing/TabCampanas';
import TabCalendarioContenido from './pages/marketing/TabCalendarioContenido';
import TabProduccionCreativa from './pages/marketing/TabProduccionCreativa';
import TabBibliotecaActivos from './pages/marketing/TabBibliotecaActivos';
import TabPublicidadPresupuesto from './pages/marketing/TabPublicidadPresupuesto';
import TabAutomatizacion from './pages/marketing/TabAutomatizacion';
import TabMetricasAnalytics from './pages/marketing/TabMetricasAnalytics';
import TabGestionMarca from './pages/marketing/TabGestionMarca';
import TabColaboracionFlujos from './pages/marketing/TabColaboracionFlujos';
import TabBriefingContenido from './pages/marketing/TabBriefingContenido';
import RRHH from './pages/RRHH';
import Logistica from './pages/Logistica';
import Reclamaciones from './pages/Reclamaciones';
import Reportes from './pages/Reportes';
import GestionEstrategica from './pages/GestionEstrategica';
import AdminUsuarios from './pages/AdminUsuarios';
import Finanzas from './pages/finanzas';
import FormularioAutoevaluacion from './pages/rrhh/FormularioAutoevaluacion';

function LoadingScreen({ subtext = 'Iniciando modulos' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white animate-in fade-in duration-500">
      <div className="w-10 h-10 border-4 border-[#0a1930]/10 border-t-[#185FA5] rounded-full animate-spin mb-4" />
      <div className="text-center">
        <p className="text-[#0a1930] font-black text-[10px] uppercase tracking-[0.4em]">Rebagliati ERP</p>
        <p className="text-slate-400 text-[9px] font-bold uppercase mt-2 tracking-widest animate-pulse">{subtext}</p>
      </div>
    </div>
  );
}

function SmartHome() {
  const [destino, setDestino] = useState(null);

  useEffect(() => {
    const resolverRuta = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setDestino('/login');
        return;
      }

      const { data: permisos } = await supabase
        .from('permisos_usuarios')
        .select('modulo, puede_ver')
        .eq('user_id', session.user.id)
        .eq('puede_ver', true);

      setDestino(getFirstAllowedRoute(session.user.email, permisos || []));
    };

    resolverRuta();
  }, []);

  if (!destino) return <LoadingScreen subtext="Validando seguridad y permisos" />;
  return <Navigate to={destino} replace />;
}

function ProtectedRoute({ children, requiredPermissions = [] }) {
  const location = useLocation();
  const [state, setState] = useState({
    session: undefined,
    allowed: true,
    redirectTo: '/dashboard',
  });
  const permissionKey = requiredPermissions.join('|');

  useEffect(() => {
    let active = true;
    const required = permissionKey ? permissionKey.split('|') : [];

    const resolveAccess = async (session) => {
      if (!active) return;
      if (!session) {
        setState({ session: null, allowed: false, redirectTo: '/login' });
        return;
      }

      if (isAdminUser(session.user.email) || required.length === 0) {
        setState({ session, allowed: true, redirectTo: '/dashboard' });
        return;
      }

      const { data: permisos } = await supabase
        .from('permisos_usuarios')
        .select('modulo, puede_ver')
        .eq('user_id', session.user.id)
        .eq('puede_ver', true);

      const allowed = hasAnyPermission(permisos || [], required);
      setState({
        session,
        allowed,
        redirectTo: allowed ? '/dashboard' : getFirstAllowedRoute(session.user.email, permisos || []),
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => resolveAccess(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAccess(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [location.pathname, permissionKey]);

  if (state.session === undefined) return <LoadingScreen subtext="Verificando sesion activa" />;
  if (!state.session) return <Navigate to="/login" replace />;
  if (!state.allowed) return <Navigate to={state.redirectTo || '/dashboard'} replace />;

  return children;
}

export default function App() {
  const rutasPrivadas = [
    { path: '/dashboard', component: <Dashboard /> },
    { path: '/inscripciones', component: <Inscripciones />, requiredPermissions: ['Inscripciones'] },
    { path: '/ventas', component: <Ventas />, requiredPermissions: ['Ventas', 'ventas_dashboard'] },
    { path: '/caja', component: <Caja />, requiredPermissions: ['Caja', 'Caja y Pagos'] },
    { path: '/marketing', component: <Marketing />, requiredPermissions: ['Marketing', 'marketing_dashboard'] },
    { path: '/marketing/dashboard', component: <Marketing />, requiredPermissions: ['Marketing', 'marketing_dashboard'] },
    { path: '/marketing/planeacion', component: <TabPlaneacionEstrategica />, requiredPermissions: ['Marketing', 'marketing_planeacion'] },
    { path: '/marketing/crm', component: <TabCRM />, requiredPermissions: ['Marketing', 'marketing_crm'] },
    { path: '/marketing/campanas', component: <TabCampanas />, requiredPermissions: ['Marketing', 'marketing_campanas'] },
    { path: '/marketing/calendario', component: <TabCalendarioContenido />, requiredPermissions: ['Marketing', 'marketing_calendario'] },
    { path: '/marketing/produccion', component: <TabProduccionCreativa />, requiredPermissions: ['Marketing', 'marketing_produccion'] },
    { path: '/marketing/biblioteca', component: <TabBibliotecaActivos />, requiredPermissions: ['Marketing', 'marketing_biblioteca'] },
    { path: '/marketing/publicidad', component: <TabPublicidadPresupuesto />, requiredPermissions: ['Marketing', 'marketing_publicidad'] },
    { path: '/marketing/automatizacion', component: <TabAutomatizacion />, requiredPermissions: ['Marketing', 'marketing_automatizacion'] },
    { path: '/marketing/metricas', component: <TabMetricasAnalytics />, requiredPermissions: ['Marketing', 'marketing_metricas'] },
    { path: '/marketing/marca', component: <TabGestionMarca />, requiredPermissions: ['Marketing', 'marketing_marca'] },
    { path: '/marketing/colaboracion', component: <TabColaboracionFlujos />, requiredPermissions: ['Marketing', 'marketing_colaboracion'] },
    { path: '/marketing/briefing', component: <TabBriefingContenido />, requiredPermissions: ['Marketing', 'marketing_briefing'] },
    { path: '/crm', component: <Navigate to="/marketing" replace />, requiredPermissions: ['Marketing', 'marketing_crm'] },
    { path: '/rrhh/*', component: <RRHH /> },
    { path: '/finanzas', component: <Finanzas />, requiredPermissions: ['Finanzas'] },
    { path: '/logistica', component: <Logistica />, requiredPermissions: ['Logística'] },
    { path: '/reclamaciones', component: <Reclamaciones />, requiredPermissions: ['Reclamaciones'] },
    { path: '/reportes', component: <Reportes />, requiredPermissions: ['Reportes'] },
    { path: '/gestion', component: <GestionEstrategica />, requiredPermissions: ['Gestión Estratégica'] },
    { path: '/admin/usuarios', component: <AdminUsuarios />, requiredPermissions: ['admin usuarios', 'Administrar Usuarios'] },
  ];

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<SmartHome />} />
        <Route path="/evaluacion/:token" element={<FormularioAutoevaluacion />} />

        {rutasPrivadas.map(({ path, component, requiredPermissions }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute requiredPermissions={requiredPermissions}>
                <Layout>{component}</Layout>
              </ProtectedRoute>
            }
          />
        ))}

        <Route path="*" element={<SmartHome />} />
      </Routes>
    </HashRouter>
  );
}
