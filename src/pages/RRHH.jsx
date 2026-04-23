// src/pages/RRHH.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Importación de todos los tabs
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
import TabDocumentos from './rrhh/TabDocumentos'; // ✅ Importar nuevo componente

export default function RRHH() {
  const [primerRuta, setPrimerRuta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerPrimerPermitido = async () => {
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

      const permisosModulos = permisos?.map(p => p.modulo) || [];

      // Si tiene el módulo padre 'RRHH', acceso total -> redirige a perfil
      if (permisosModulos.includes('RRHH')) {
        setPrimerRuta('/rrhh/perfil');
        setLoading(false);
        return;
      }

      // Si no, busca el primer permiso específico disponible
      const rutasDisponibles = [
        { modulo: 'rrhh_perfil', ruta: '/rrhh/perfil' },
        { modulo: 'rrhh_base', ruta: '/rrhh/base' },
        { modulo: 'rrhh_directorio', ruta: '/rrhh/directorio' },
        { modulo: 'rrhh_reclutamiento', ruta: '/rrhh/reclutamiento' },
        { modulo: 'rrhh_horarios', ruta: '/rrhh/horarios' },
        { modulo: 'rrhh_vacaciones', ruta: '/rrhh/vacaciones' },
        { modulo: 'rrhh_descansos', ruta: '/rrhh/descansos' },
        { modulo: 'rrhh_evaluacion', ruta: '/rrhh/evaluacion' },
        { modulo: 'rrhh_locadores', ruta: '/rrhh/locadores' },
        { modulo: 'rrhh_planilla_pagos', ruta: '/rrhh/planilla_pagos' },
        { modulo: 'rrhh_novedades', ruta: '/rrhh/novedades' },
        { modulo: 'rrhh_documentos', ruta: '/rrhh/documentos' }, // ✅ Nueva ruta
      ];

      const primera = rutasDisponibles.find(r => permisosModulos.includes(r.modulo))?.ruta || '/rrhh/perfil';
      setPrimerRuta(primera);
      setLoading(false);
    };

    obtenerPrimerPermitido();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">Cargando módulo...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={primerRuta} replace />} />
      <Route path="perfil" element={<TabPerfilEmpleado />} />
      <Route path="base" element={<TabBase />} />
      <Route path="directorio" element={<TabDirectorio />} />
      <Route path="reclutamiento" element={<TabReclutamiento />} />
      <Route path="horarios" element={<TabHorarios />} />
      <Route path="vacaciones" element={<TabVacaciones />} />
      <Route path="descansos" element={<TabDescansos />} />
      <Route path="evaluacion" element={<TabEvaluacion />} />
      <Route path="locadores" element={<TabLocadores />} />
      <Route path="planilla_pagos" element={<TabPlanillaPagos />} />
      <Route path="novedades" element={<TabPlanilla />} />
      <Route path="documentos" element={<TabDocumentos />} /> {/* ✅ Nueva ruta */}
    </Routes>
  );
}