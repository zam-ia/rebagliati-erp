import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  RRHH_ROUTE_PERMISSIONS,
  getFirstAllowedRrhhRoute,
  hasAnyPermission,
  isAdminUser,
} from '../lib/access';

import DashboardRRHH from './rrhh/DashboardRRHH';
import TabPerfilEmpleado from './rrhh/TabPerfilEmpleado';
import TabBase from './rrhh/TabBase';
import TabDirectorio from './rrhh/TabDirectorio';
import TabReclutamiento from './rrhh/TabReclutamiento';
import TabHorarios from './rrhh/TabHorarios';
import TabVacaciones from './rrhh/TabVacaciones';
import TabDescansos from './rrhh/TabDescansos';
import TabEvaluacion from './rrhh/TabEvaluacion';
import TabLocadores from './rrhh/TabLocadores';
import TabPlanillaPagos from './rrhh/TabPlanillaPagos';
import TabPlanilla from './rrhh/TabPlanilla';
import TabDocumentos from './rrhh/TabDocumentos';
import TabCeses from './rrhh/TabCeses';

const RRHH_COMPONENTS = {
  dashboard: <DashboardRRHH />,
  perfil: <TabPerfilEmpleado />,
  base: <TabBase />,
  directorio: <TabDirectorio />,
  reclutamiento: <TabReclutamiento />,
  horarios: <TabHorarios />,
  vacaciones: <TabVacaciones />,
  descansos: <TabDescansos />,
  evaluacion: <TabEvaluacion />,
  locadores: <TabLocadores />,
  planilla_pagos: <TabPlanillaPagos />,
  novedades: <TabPlanilla />,
  documentos: <TabDocumentos />,
  ceses: <TabCeses />,
};

function RrhhProtectedTab({ children, permissions, userEmail, userPermissions, fallbackRoute }) {
  const allowed = isAdminUser(userEmail) || hasAnyPermission(userPermissions, permissions);
  if (!allowed) return <Navigate to={fallbackRoute || '/dashboard'} replace />;
  return children;
}

export default function RRHH() {
  const [primerRuta, setPrimerRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userPermissions, setUserPermissions] = useState([]);

  useEffect(() => {
    const obtenerPermisos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPrimerRuta('/login');
        setLoading(false);
        return;
      }

      const { data: permisos } = await supabase
        .from('permisos_usuarios')
        .select('modulo, puede_ver')
        .eq('user_id', session.user.id)
        .eq('puede_ver', true);

      setUserEmail(session.user.email);
      setUserPermissions(permisos || []);
      setPrimerRuta(getFirstAllowedRrhhRoute(session.user.email, permisos || []));
      setLoading(false);
    };

    obtenerPermisos();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">Cargando modulo...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={primerRuta} replace />} />
      {RRHH_ROUTE_PERMISSIONS.map(({ path, permissions }) => (
        <Route
          key={path}
          path={path}
          element={
            <RrhhProtectedTab
              permissions={permissions}
              userEmail={userEmail}
              userPermissions={userPermissions}
              fallbackRoute={primerRuta}
            >
              {RRHH_COMPONENTS[path]}
            </RrhhProtectedTab>
          }
        />
      ))}
      <Route path="*" element={<Navigate to={primerRuta || '/dashboard'} replace />} />
    </Routes>
  );
}
