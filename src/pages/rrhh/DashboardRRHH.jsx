// src/pages/rrhh/DashboardRRHH.jsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Users, UserCheck, TrendingUp, AlertTriangle, UserPlus,
  Calendar, Clock, DollarSign, Briefcase, FileText, RefreshCw,
  Star, ThumbsDown, Download, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

// ═══ PALETA PASTEL ARMONIOSA CON AZUL PRINCIPAL ═══
const COLORS = [
  '#185FA5', // azul institucional
  '#5b9bd5', // azul claro
  '#9dc3e6', // azul pastel
  '#6abf87', // verde menta
  '#b4d9c1', // verde agua
  '#c8a2c8', // lavanda
  '#f4a261', // melocotón
  '#e76f51', // coral suave
  '#f1c0b9', // rosa palo
  '#d4a5a5', // rosado antiguo
];
const MES_ACTUAL = new Date().toISOString().slice(0, 7);

const formatSoles = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

function calcularPuntajeVisible(neto) {
  return Math.max(0, Math.min(100, 100 + neto));
}

// Agrupación de cargos
const AGRUPADOR_PALABRAS = [
  { clave: 'asistente', grupo: 'Asistente' },
  { clave: 'asesor', grupo: 'Asesor' },
  { clave: 'coordinador', grupo: 'Coordinador' },
  { clave: 'ejecutivo', grupo: 'Ejecutivo de Ventas' },
  { clave: 'analista', grupo: 'Analista' },
  { clave: 'practicante', grupo: 'Practicante' },
  { clave: 'gerente', grupo: 'Gerencia' },
  { clave: 'jefe', grupo: 'Jefatura' },
  { clave: 'director', grupo: 'Dirección' },
  { clave: 'diseñador', grupo: 'Diseño' },
  { clave: 'community', grupo: 'Marketing' },
  { clave: 'marketing', grupo: 'Marketing' },
  { clave: 'ventas', grupo: 'Ventas' },
  { clave: 'cajera', grupo: 'Caja' },
  { clave: 'caja', grupo: 'Caja' },
];

const normalizarTexto = (texto) => (texto || '').toLowerCase().trim();

const agruparCargo = (cargo) => {
  if (!cargo) return 'Sin cargo';
  const clave = normalizarTexto(cargo);
  for (const { clave: palabra, grupo } of AGRUPADOR_PALABRAS) {
    if (clave.includes(palabra)) return grupo;
  }
  return cargo;
};

export default function DashboardRRHH() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [vacaciones, setVacaciones] = useState([]);
  const [reclutamiento, setReclutamiento] = useState(null);
  const [planillaDatos, setPlanillaDatos] = useState({ actual: 0, anterior: 0 });
  const [horasExtras, setHorasExtras] = useState(0);
  const [pagosPendientes, setPagosPendientes] = useState(0);
  const [contratosPorVencer, setContratosPorVencer] = useState(0);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalTitulo, setModalTitulo] = useState('');
  const [modalColumnas, setModalColumnas] = useState([]);
  const [modalFilas, setModalFilas] = useState([]);
  const [modalContenido, setModalContenido] = useState(null);

  // ═══ CARGA DE DATOS ═══
  useEffect(() => {
    const cargarTodo = async () => {
      setCargando(true);
      try {
        const primerDiaMes = `${MES_ACTUAL}-01`;
        const ultimoDiaMes = `${MES_ACTUAL}-31`;

        const [
          { data: emp }, { data: loc },
          { data: eva }, { data: asis },
          { data: vac }, { data: rec },
          { data: he }, { data: pagos },
          { data: contratosVenc }
        ] = await Promise.all([
          supabase.from('empleados').select('*'),
          supabase.from('locadores').select('*').eq('estado', 'activo'),
          supabase.from('evaluaciones').select('*').eq('mes', MES_ACTUAL),
          supabase.from('asistencia').select('*').gte('fecha', primerDiaMes).lte('fecha', ultimoDiaMes),
          supabase.from('vacaciones').select('*'),
          supabase.from('reclutamiento').select('*').maybeSingle(),
          supabase.from('horas_extras').select('horas_decimal').eq('estado', 'Aprobado').gte('fecha', primerDiaMes).lte('fecha', ultimoDiaMes),
          supabase.from('egresos').select('monto').eq('estado', 'Pendiente').eq('area', 'RRHH'),
          supabase.from('empleados').select('id').not('fin_contrato', 'is', null).lte('fin_contrato', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        ]);

        setEmpleados(emp || []);
        setLocadores(loc || []);

        const planillaActual = (emp || []).filter(e => e.estado === 'activo').reduce((s, e) => s + (e.sueldo_total || e.sueldo_bruto || 0), 0)
          + (loc || []).reduce((s, l) => s + (l.sueldo_base || 0), 0);
        const { data: empAnt } = await supabase.from('empleados').select('estado, sueldo_total, sueldo_bruto');
        const { data: locAnt } = await supabase.from('locadores').select('estado, sueldo_base');
        const planillaAnterior = (empAnt || []).filter(e => e.estado === 'activo').reduce((s, e) => s + (e.sueldo_total || e.sueldo_bruto || 0), 0)
          + (locAnt || []).filter(l => l.estado === 'activo').reduce((s, l) => s + (l.sueldo_base || 0), 0);

        setPlanillaDatos({ actual: planillaActual, anterior: planillaAnterior });
        setEvaluaciones(eva || []);
        setAsistencias(asis || []);
        setVacaciones(vac || []);
        setReclutamiento(rec || { postulantes: 0, en_evaluacion: 0, en_entrevista: 0, contratados: 0, rechazados: 0 });

        const totalHE = (he || []).reduce((s, h) => s + (h.horas_decimal || 0), 0);
        setHorasExtras(totalHE);
        const totalPagos = (pagos || []).reduce((s, p) => s + (p.monto || 0), 0);
        setPagosPendientes(totalPagos);
        setContratosPorVencer(contratosVenc?.length || 0);
      } catch (err) {
        console.error('Error cargando dashboard RRHH:', err);
      } finally {
        setCargando(false);
      }
    };
    cargarTodo();
  }, []);

  // ═══ NOTIFICACIONES ═══
  useEffect(() => {
    if (contratosPorVencer > 0) {
      const insertarNotificacion = async () => {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        const hoy = new Date().toISOString().split('T')[0];
        const { data: existente } = await supabase
          .from('notificaciones')
          .select('id')
          .eq('mensaje', `${contratosPorVencer} contratos por vencer en los próximos 30 días`)
          .gte('created_at', hoy)
          .maybeSingle();

        if (!existente) {
          await supabase.from('notificaciones').insert({
            mensaje: `${contratosPorVencer} contratos por vencer en los próximos 30 días`,
            ruta: '/rrhh/documentos',
            leida: false,
            user_id: userId || null,
          });
        }
      };
      insertarNotificacion();
    }
  }, [contratosPorVencer]);

  // ═══ KPIs ═══
  const kpis = useMemo(() => {
    const totalPlanilla = empleados.filter(e => e.estado === 'activo').length;
    const totalComplementarios = locadores.length;
    const totalPersonas = totalPlanilla + totalComplementarios;

    const scores = evaluaciones.map(ev => calcularPuntajeVisible(ev.punt_final));
    const promedioGeneral = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const enRiesgo = evaluaciones.filter(ev => calcularPuntajeVisible(ev.punt_final) < 70).length;

    const hoy = new Date();
    const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    const nuevosIngresosPlanilla = empleados.filter(e => e.fecha_ingreso_planilla >= primerDiaMes).length;
    const nuevosIngresosComplementarios = locadores.filter(l => l.fecha_inicio >= primerDiaMes).length;

    return {
      totalPersonas,
      totalPlanilla,
      totalComplementarios,
      promedioGeneral,
      enRiesgo,
      nuevosIngresosTotal: nuevosIngresosPlanilla + nuevosIngresosComplementarios,
    };
  }, [empleados, locadores, evaluaciones]);

  // ═══ DISTRIBUCIÓN POR ÁREAS ═══
  const distribucionAreas = useMemo(() => {
    const conteo = {};
    empleados.forEach(e => {
      const area = e.area || 'Sin área';
      conteo[area] = (conteo[area] || 0) + 1;
    });
    return Object.entries(conteo).map(([name, value]) => ({ name, value }));
  }, [empleados]);

  // ═══ DISTRIBUCIÓN POR CARGO ═══
  const distribucionCargos = useMemo(() => {
    const conteo = {};
    empleados.forEach(e => {
      const cargoAgrupado = agruparCargo(e.cargo);
      conteo[cargoAgrupado] = (conteo[cargoAgrupado] || 0) + 1;
    });
    return Object.entries(conteo).map(([cargo, count]) => ({ cargo, count })).sort((a, b) => b.count - a.count);
  }, [empleados]);

  // ═══ TENDENCIA DESEMPEÑO ═══
  const tendenciaDesempeno = useMemo(() => {
    const meses = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.push(mes);
    }
    return meses.map(mes => ({
      mes: mes.slice(5),
      promedio: evaluaciones.filter(ev => ev.mes === mes).length
        ? Math.round(evaluaciones.filter(ev => ev.mes === mes).reduce((a, ev) => a + calcularPuntajeVisible(ev.punt_final), 0) / evaluaciones.filter(ev => ev.mes === mes).length)
        : 0
    }));
  }, [evaluaciones]);

  // ═══ ASISTENCIA (IGNORA REGISTROS SIN empleado_id) ═══
  const datosAsistencia = useMemo(() => {
    let tardanzas = 0, faltasInjustificadas = 0, faltasJustificadas = 0, descansosMedicos = 0;
    const empleadosConFaltasInjust = [];
    const empleadosConDescansoMedico = [];

    asistencias.forEach(a => {
      // Ignorar registros sin empleado_id (no se puede identificar al colaborador)
      if (!a.empleado_id) return;

      if (a.tardanza && !a.justificacion) tardanzas++;
      if (a.falta && a.justificacion) faltasJustificadas++;

      if (a.falta && !a.justificacion) {
        faltasInjustificadas++;
        const emp = empleados.find(e => e.id === a.empleado_id) || locadores.find(l => l.id === a.empleado_id);
        empleadosConFaltasInjust.push({
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : `ID ${a.empleado_id}`,
          fecha: a.fecha,
          area: emp?.area || '—',
          cargo: emp?.cargo || emp?.modalidad || '—',
        });
      }

      if (a.descanso_medico) {
        descansosMedicos++;
        const emp = empleados.find(e => e.id === a.empleado_id) || locadores.find(l => l.id === a.empleado_id);
        empleadosConDescansoMedico.push({
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : `ID ${a.empleado_id}`,
          fecha: a.fecha,
          area: emp?.area || '—',
          cargo: emp?.cargo || emp?.modalidad || '—',
        });
      }
    });

    return { tardanzas, faltasInjustificadas, faltasJustificadas, descansosMedicos, empleadosConFaltasInjust, empleadosConDescansoMedico };
  }, [asistencias, empleados, locadores]);

  const tardanzasPorArea = useMemo(() => {
    const mapa = {};
    asistencias.forEach(a => {
      if (!a.empleado_id || !a.tardanza || a.justificacion) return;
      const emp = empleados.find(e => e.id === a.empleado_id);
      const area = emp?.area || 'Sin área';
      mapa[area] = (mapa[area] || 0) + 1;
    });
    return Object.entries(mapa).map(([area, tardanzas]) => ({ area, tardanzas }));
  }, [asistencias, empleados]);

  // ═══ VACACIONES ═══
  const diasVacacionesPendientes = useMemo(() => {
    return vacaciones.reduce((s, v) => s + (v.dias_disponibles || v.dias_usados || 0), 0);
  }, [vacaciones]);

  const proximasVacaciones = useMemo(() => {
    const hoy = new Date();
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);
    return vacaciones.filter(v => {
      if (!v.fecha_inicio) return false;
      const inicio = new Date(v.fecha_inicio);
      return inicio >= hoy && inicio <= limite;
    }).length;
  }, [vacaciones]);

  // ═══ TOP 5 / BOTTOM 5 ═══
  const top5 = useMemo(() => {
    return evaluaciones.filter(ev => ev.empleado_id).map(ev => {
      const emp = empleados.find(e => e.id === ev.empleado_id) || locadores.find(l => l.id === ev.empleado_id);
      return {
        id: ev.empleado_id,
        nombre: emp ? `${emp.nombre} ${emp.apellido}` : ev.empleado_nombre,
        puntaje: calcularPuntajeVisible(ev.punt_final)
      };
    }).sort((a, b) => b.puntaje - a.puntaje).slice(0, 5);
  }, [evaluaciones, empleados, locadores]);

  const bottom5 = useMemo(() => {
    return evaluaciones.filter(ev => ev.empleado_id).map(ev => {
      const emp = empleados.find(e => e.id === ev.empleado_id) || locadores.find(l => l.id === ev.empleado_id);
      return {
        id: ev.empleado_id,
        nombre: emp ? `${emp.nombre} ${emp.apellido}` : ev.empleado_nombre,
        puntaje: calcularPuntajeVisible(ev.punt_final)
      };
    }).filter(p => p.puntaje < 70).sort((a, b) => a.puntaje - b.puntaje).slice(0, 5);
  }, [evaluaciones, empleados, locadores]);

  // ═══ MANEJADORES DE MODALES ═══
  const abrirNuevosIngresos = () => {
    const hoy = new Date();
    const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    const nuevosPlanilla = empleados.filter(e => e.fecha_ingreso_planilla >= primerDiaMes).map(e => ({
      nombre: `${e.nombre} ${e.apellido}`,
      area: e.area || '—',
      cargo: e.cargo || '—',
      sueldo: formatSoles(e.sueldo_total || e.sueldo_bruto),
    }));
    const nuevosComplementarios = locadores.filter(l => l.fecha_inicio >= primerDiaMes).map(l => ({
      nombre: `${l.nombre} ${l.apellido}`,
      area: l.area || '—',
      cargo: l.modalidad || '—',
      sueldo: formatSoles(l.sueldo_base),
    }));

    const contenido = (
      <div className="space-y-6">
        {nuevosPlanilla.length > 0 && (
          <div>
            <h4 className="text-sm font-black text-gray-800 mb-2 bg-blue-50 px-3 py-1 rounded-lg">Planilla ({nuevosPlanilla.length})</h4>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-100"><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Área</th><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Cargo</th><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Sueldo</th></tr></thead>
              <tbody className="divide-y">{nuevosPlanilla.map((f, i)=><tr key={i} className="hover:bg-gray-50"><td className="p-3 text-gray-900">{f.nombre}</td><td className="p-3 text-gray-800">{f.area}</td><td className="p-3 text-gray-800">{f.cargo}</td><td className="p-3 text-gray-900 font-semibold">{f.sueldo}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        {nuevosComplementarios.length > 0 && (
          <div>
            <h4 className="text-sm font-black text-gray-800 mb-2 bg-purple-50 px-3 py-1 rounded-lg">Complementarios ({nuevosComplementarios.length})</h4>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-100"><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Área</th><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Modalidad</th><th className="p-3 text-left text-xs font-bold text-gray-700 uppercase">Sueldo</th></tr></thead>
              <tbody className="divide-y">{nuevosComplementarios.map((f,i)=><tr key={i} className="hover:bg-gray-50"><td className="p-3 text-gray-900">{f.nombre}</td><td className="p-3 text-gray-800">{f.area}</td><td className="p-3 text-gray-800">{f.cargo}</td><td className="p-3 text-gray-900 font-semibold">{f.sueldo}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        {nuevosPlanilla.length === 0 && nuevosComplementarios.length === 0 && <p className="text-center text-gray-700 py-8 font-medium">No hay nuevos ingresos este mes</p>}
      </div>
    );
    setModalTitulo(`Nuevos Ingresos – ${MES_ACTUAL}`);
    setModalContenido(contenido);
    setModalFilas([]);
    setModalColumnas([]);
    setModalAbierto(true);
  };

  const abrirEnRiesgo = () => {
    const riesgos = evaluaciones.filter(ev => calcularPuntajeVisible(ev.punt_final) < 70).map(ev => {
      const emp = empleados.find(e => e.id === ev.empleado_id) || locadores.find(l => l.id === ev.empleado_id);
      return { nombre: emp ? `${emp.nombre} ${emp.apellido}` : ev.empleado_nombre, puntaje: calcularPuntajeVisible(ev.punt_final), area: emp?.area || '—', cargo: emp?.cargo || emp?.modalidad || '—' };
    });
    setModalTitulo('Colaboradores en Riesgo (Puntaje < 70)');
    setModalColumnas([{ key: 'nombre', label: 'Nombre' },{ key: 'puntaje', label: 'Puntaje' },{ key: 'area', label: 'Área' },{ key: 'cargo', label: 'Cargo' }]);
    setModalFilas(riesgos);
    setModalContenido(null);
    setModalAbierto(true);
  };

  const abrirFaltasInjust = () => {
    setModalTitulo('Faltas Injustificadas del Mes');
    setModalColumnas([{ key: 'nombre', label: 'Colaborador' },{ key: 'fecha', label: 'Fecha' },{ key: 'area', label: 'Área' },{ key: 'cargo', label: 'Cargo' }]);
    setModalFilas(datosAsistencia.empleadosConFaltasInjust);
    setModalContenido(null);
    setModalAbierto(true);
  };

  const abrirDescansosMedicos = () => {
    setModalTitulo('Descansos Médicos del Mes');
    setModalColumnas([{ key: 'nombre', label: 'Colaborador' },{ key: 'fecha', label: 'Fecha' },{ key: 'area', label: 'Área' },{ key: 'cargo', label: 'Cargo' }]);
    setModalFilas(datosAsistencia.empleadosConDescansoMedico);
    setModalContenido(null);
    setModalAbierto(true);
  };

  const abrirArea = (area) => {
    const empleadosArea = empleados.filter(e => (e.area || 'Sin área') === area).map(e => ({ nombre: `${e.nombre} ${e.apellido}`, cargo: agruparCargo(e.cargo), sueldo: formatSoles(e.sueldo_total || e.sueldo_bruto) }));
    setModalTitulo(`Empleados en ${area}`);
    setModalColumnas([{ key: 'nombre', label: 'Nombre' },{ key: 'cargo', label: 'Cargo' },{ key: 'sueldo', label: 'Sueldo' }]);
    setModalFilas(empleadosArea);
    setModalContenido(null);
    setModalAbierto(true);
  };

  const abrirCargo = (cargoAgrupado) => {
    const empleadosCargo = empleados.filter(e => agruparCargo(e.cargo) === cargoAgrupado).map(e => ({ nombre: `${e.nombre} ${e.apellido}`, area: e.area || '—', cargoOriginal: e.cargo || '—', sueldo: formatSoles(e.sueldo_total || e.sueldo_bruto) }));
    setModalTitulo(`Empleados agrupados en: ${cargoAgrupado}`);
    setModalColumnas([{ key: 'nombre', label: 'Nombre' },{ key: 'area', label: 'Área' },{ key: 'cargoOriginal', label: 'Cargo específico' },{ key: 'sueldo', label: 'Sueldo' }]);
    setModalFilas(empleadosCargo);
    setModalContenido(null);
    setModalAbierto(true);
  };

  const abrirTop5 = () => {
    const todos = evaluaciones.filter(ev => ev.empleado_id).map(ev => {
      const emp = empleados.find(e => e.id === ev.empleado_id) || locadores.find(l => l.id === ev.empleado_id);
      return { nombre: emp ? `${emp.nombre} ${emp.apellido}` : ev.empleado_nombre, puntaje: calcularPuntajeVisible(ev.punt_final), area: emp?.area || '—', cargo: emp?.cargo || emp?.modalidad || '—' };
    }).sort((a,b) => b.puntaje - a.puntaje);
    setModalTitulo('Ranking completo de Desempeño');
    setModalColumnas([{ key: 'nombre', label: 'Nombre' },{ key: 'puntaje', label: 'Puntaje' },{ key: 'area', label: 'Área' },{ key: 'cargo', label: 'Cargo' }]);
    setModalFilas(todos);
    setModalContenido(null);
    setModalAbierto(true);
  };

  const abrirBottom5 = () => {
    const todos = evaluaciones.filter(ev => ev.empleado_id).map(ev => {
      const emp = empleados.find(e => e.id === ev.empleado_id) || locadores.find(l => l.id === ev.empleado_id);
      return { nombre: emp ? `${emp.nombre} ${emp.apellido}` : ev.empleado_nombre, puntaje: calcularPuntajeVisible(ev.punt_final), area: emp?.area || '—', cargo: emp?.cargo || emp?.modalidad || '—' };
    }).filter(p => p.puntaje < 70).sort((a,b) => a.puntaje - b.puntaje);
    setModalTitulo('Colaboradores en Riesgo (Puntaje < 70)');
    setModalColumnas([{ key: 'nombre', label: 'Nombre' },{ key: 'puntaje', label: 'Puntaje' },{ key: 'area', label: 'Área' },{ key: 'cargo', label: 'Cargo' }]);
    setModalFilas(todos);
    setModalContenido(null);
    setModalAbierto(true);
  };

  // ═══ ALERTAS ═══
  const alertas = useMemo(() => {
    const lista = [];
    if (kpis.enRiesgo > 0) lista.push({ texto: `${kpis.enRiesgo} colaboradores con desempeño en caída`, action: abrirEnRiesgo });
    if (datosAsistencia.tardanzas > 50) lista.push({ texto: `Alto nivel de tardanzas (${datosAsistencia.tardanzas})`, action: () => navigate('/rrhh/novedades') });
    if (datosAsistencia.faltasInjustificadas > 0) lista.push({ texto: `${datosAsistencia.faltasInjustificadas} faltas injustificadas este mes`, action: abrirFaltasInjust });
    if (datosAsistencia.descansosMedicos > 0) lista.push({ texto: `${datosAsistencia.descansosMedicos} días de descanso médico`, action: abrirDescansosMedicos });
    if (contratosPorVencer > 0) lista.push({ texto: `${contratosPorVencer} contratos por vencer en los próximos 30 días`, action: () => navigate('/rrhh/documentos') });
    return lista;
  }, [kpis, datosAsistencia, contratosPorVencer, navigate]);

  const irARuta = (ruta) => navigate(ruta);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-[#185FA5]" size={32} />
          <p className="text-gray-700 font-medium">Cargando Centro de Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl shadow-blue-100/20 border border-blue-50 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm"><Users className="w-6 h-6 text-[#185FA5]" /></div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard de Recursos Humanos</h2>
          </div>
          <p className="text-gray-700 text-sm font-medium ml-12">{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center gap-2"><Download size={14} /> Exportar Reporte</button>
          <button onClick={()=>window.location.reload()} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-gray-200"><RefreshCw size={14} /> Actualizar</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Colaboradores', value: kpis.totalPersonas, icon: <Users size={20} className="text-blue-700" />, bg: 'bg-blue-50', border: 'border-blue-100', click: null },
          { label: 'Planilla', value: kpis.totalPlanilla, icon: <UserCheck size={20} className="text-emerald-700" />, bg: 'bg-emerald-50', border: 'border-emerald-100', click: null },
          { label: 'Complementarios', value: kpis.totalComplementarios, icon: <Briefcase size={20} className="text-purple-700" />, bg: 'bg-purple-50', border: 'border-purple-100', click: null },
          { label: 'Promedio Desempeño', value: `${kpis.promedioGeneral} pts`, icon: <TrendingUp size={20} className="text-amber-700" />, bg: 'bg-amber-50', border: 'border-amber-100', click: null },
          { label: 'En Riesgo', value: kpis.enRiesgo, icon: <AlertTriangle size={20} className="text-red-700" />, bg: 'bg-red-50', border: 'border-red-100', click: abrirEnRiesgo },
          { label: 'Nuevos Ingresos', value: kpis.nuevosIngresosTotal, icon: <UserPlus size={20} className="text-teal-700" />, bg: 'bg-teal-50', border: 'border-teal-100', click: abrirNuevosIngresos },
        ].map(kpi => (
          <div key={kpi.label} onClick={kpi.click} className={`${kpi.bg} ${kpi.border} rounded-2xl p-5 border hover:shadow-md transition-shadow ${kpi.click ? 'cursor-pointer' : ''}`}>
            <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-white rounded-xl shadow-sm">{kpi.icon}</div></div>
            <p className="text-2xl font-black text-gray-900">{kpi.value}</p>
            <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* BLOQUE 1: TALENTO Y ESTRUCTURA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-gray-900 mb-2">Distribución por Áreas</h3>
          <p className="text-sm text-gray-700 mb-6">Composición del equipo por departamento (clic en una porción para ver detalle)</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribucionAreas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={5} onClick={(data)=>data?.name&&abrirArea(data.name)} style={{cursor:'pointer'}}>
                  {distribucionAreas.map((_,idx)=><Cell key={idx} fill={COLORS[idx%COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:'12px',border:'none',boxShadow:'0 10px 25px rgba(0,0,0,0.08)'}}/>
                <Legend wrapperStyle={{fontSize:'12px',fontWeight:700,color:'#0f172a'}} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-gray-900 mb-2">Distribución por Cargo</h3>
          <p className="text-sm text-gray-700 mb-6">Cantidad de colaboradores por puesto (clic en una barra para ver detalle)</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribucionCargos}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                <XAxis dataKey="cargo" tick={{fontSize:11,fontWeight:600,fill:'#0f172a'}} angle={-15} textAnchor="end" height={80}/>
                <YAxis allowDecimals={false} tick={{fontSize:11,fontWeight:600,fill:'#0f172a'}}/>
                <Tooltip contentStyle={{borderRadius:'12px',border:'none',boxShadow:'0 10px 25px rgba(0,0,0,0.08)'}}/>
                <Bar dataKey="count" fill="#185FA5" radius={[8,8,0,0]} barSize={35} onClick={(data)=>data?.cargo&&abrirCargo(data.cargo)} style={{cursor:'pointer'}}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 2: DESEMPEÑO */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-gray-900 mb-2">Evolución del Desempeño</h3>
        <p className="text-sm text-gray-700 mb-6">Tendencia de puntuaciones en los últimos 6 meses</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tendenciaDesempeno}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
              <XAxis dataKey="mes" tick={{fontSize:11,fontWeight:600,fill:'#0f172a'}}/>
              <YAxis domain={[0,100]} tick={{fontSize:11,fontWeight:600,fill:'#0f172a'}}/>
              <Tooltip contentStyle={{borderRadius:'12px',border:'none',boxShadow:'0 10px 25px rgba(0,0,0,0.08)'}}/>
              <Line type="monotone" dataKey="promedio" stroke="#185FA5" strokeWidth={3} dot={{r:5,fill:'#185FA5'}} activeDot={{r:7}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TOP 5 / BOTTOM 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-gray-900 flex items-center gap-2 text-lg"><div className="p-1.5 bg-amber-50 rounded-lg"><Star size={18} className="text-amber-600"/></div> Top 5 Desempeño</h4>
            <button onClick={abrirTop5} className="text-xs text-blue-600 hover:underline font-bold">Ver todos</button>
          </div>
          <div className="space-y-2">
            {top5.map((p,i)=><div key={i} className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100 hover:shadow-sm"><div className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-emerald-200 flex items-center justify-center text-xs font-black text-emerald-800">{i+1}</span><span className="text-sm font-bold text-gray-800">{p.nombre}</span></div><span className="font-black text-emerald-700">{p.puntaje} pts</span></div>)}
            {top5.length===0&&<p className="text-xs text-gray-700 text-center py-4">Sin datos de evaluación este mes.</p>}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-gray-900 flex items-center gap-2 text-lg"><div className="p-1.5 bg-rose-50 rounded-lg"><ThumbsDown size={18} className="text-rose-600"/></div> Atención Requerida (&lt;70 pts)</h4>
            <button onClick={abrirBottom5} className="text-xs text-blue-600 hover:underline font-bold">Ver todos</button>
          </div>
          <div className="space-y-2">
            {bottom5.map((p,i)=><div key={i} className="flex justify-between items-center bg-rose-50 p-4 rounded-2xl border border-rose-100 hover:shadow-sm"><div className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-rose-200 flex items-center justify-center text-xs font-black text-rose-800">{i+1}</span><span className="text-sm font-bold text-gray-800">{p.nombre}</span></div><span className="font-black text-rose-700">{p.puntaje} pts</span></div>)}
            {bottom5.length===0&&<p className="text-xs text-gray-700 text-center py-4">Todos los evaluados superan los 70 pts.</p>}
          </div>
        </div>
      </div>

      {/* ASISTENCIA Y DISCIPLINA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-gray-900 mb-2">Asistencia del Mes</h3>
          <p className="text-sm text-gray-700 mb-6">Resumen de incidencias del período actual</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tardanzas', value: datosAsistencia.tardanzas, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', click: null },
              { label: 'Faltas Injust.', value: datosAsistencia.faltasInjustificadas, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100', click: abrirFaltasInjust },
              { label: 'Faltas Justif.', value: datosAsistencia.faltasJustificadas, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', click: null },
              { label: 'Descansos Méd.', value: datosAsistencia.descansosMedicos, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', click: abrirDescansosMedicos },
            ].map(d => (
              <div key={d.label} onClick={d.click} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow ${d.click?'cursor-pointer':''}`}>
                <p className={`text-3xl font-black ${d.color}`}>{d.value}</p>
                <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-2">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-gray-900 mb-2">Tardanzas por Área</h3>
          <p className="text-sm text-gray-700 mb-6">Distribución de impuntualidad por departamento</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tardanzasPorArea}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                <XAxis dataKey="area" tick={{fontSize:11,fontWeight:600,fill:'#0f172a'}}/>
                <YAxis allowDecimals={false} tick={{fontSize:11,fontWeight:600,fill:'#0f172a'}}/>
                <Tooltip contentStyle={{borderRadius:'12px',border:'none',boxShadow:'0 10px 25px rgba(0,0,0,0.08)'}}/>
                <Bar dataKey="tardanzas" fill="#f59e0b" radius={[8,8,0,0]} barSize={35}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* VACACIONES */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-gray-900 mb-2">Vacaciones y Carga Laboral</h3>
        <p className="text-sm text-gray-700 mb-6">Seguimiento de días pendientes y próximas ausencias</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Días Pendientes', value: diasVacacionesPendientes, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Próximas (30 días)', value: proximasVacaciones, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Riesgo de Burnout', value: kpis.enRiesgo, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map(d => (
            <div key={d.label} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow`}>
              <p className={`text-3xl font-black ${d.color}`}>{d.value}</p>
              <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-2">{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RECLUTAMIENTO */}
      {reclutamiento && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-gray-900 mb-2">Reclutamiento</h3>
          <p className="text-sm text-gray-700 mb-6">Pipeline actual de selección</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Postulantes', value: reclutamiento.postulantes||0, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'En Evaluación', value: reclutamiento.en_evaluacion||0, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'En Entrevista', value: reclutamiento.en_entrevista||0, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: 'Contratados', value: reclutamiento.contratados||0, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Rechazados', value: reclutamiento.rechazados||0, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
            ].map(d => (
              <div key={d.label} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow`}>
                <p className={`text-3xl font-black ${d.color}`}>{d.value}</p>
                <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-2">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLANILLA */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-gray-900 mb-2">Planilla y Pagos</h3>
        <p className="text-sm text-gray-700 mb-6">Estado financiero del capital humano</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Planilla Total', value: formatSoles(planillaDatos.actual), color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'vs Mes Anterior', value: planillaDatos.anterior>0?`${(((planillaDatos.actual-planillaDatos.anterior)/planillaDatos.anterior)*100).toFixed(1)}%`:'—', color: planillaDatos.anterior>0?(planillaDatos.actual>=planillaDatos.anterior?'text-rose-700':'text-emerald-700'):'text-gray-700', bg: planillaDatos.anterior>0?(planillaDatos.actual>=planillaDatos.anterior?'bg-rose-50':'bg-emerald-50'):'bg-gray-50', border: planillaDatos.anterior>0?(planillaDatos.actual>=planillaDatos.anterior?'border-rose-100':'border-emerald-100'):'border-gray-100' },
            { label: 'Pagos Pendientes', value: pagosPendientes>0?formatSoles(pagosPendientes):'Sin pagos', color: pagosPendientes>0?'text-rose-700':'text-emerald-700', bg: pagosPendientes>0?'bg-rose-50':'bg-emerald-50', border: pagosPendientes>0?'border-rose-100':'border-emerald-100' },
          ].map(d => (
            <div key={d.label} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow`}>
              <p className={`text-xl font-black ${d.color}`}>{d.value}</p>
              <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-2">{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ALERTAS CRÍTICAS */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2"><div className="p-1.5 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-rose-600"/></div> Alertas Críticas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertas.map((alerta,i)=>(
            <div key={i} onClick={alerta.action} className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-rose-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-rose-200 flex items-center justify-center text-rose-700 font-black text-sm group-hover:scale-110 transition-transform">!</div>
              <span className="text-sm font-bold text-gray-800 flex-1">{alerta.texto}</span>
            </div>
          ))}
          {alertas.length===0&&<p className="text-xs text-gray-700 col-span-2 text-center py-4">No hay alertas críticas en este momento.</p>}
        </div>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Registrar Evaluación', icon: <FileText size={14}/>, ruta: '/rrhh/evaluacion' },
            { label: 'Registrar Incidencia', icon: <AlertTriangle size={14}/>, ruta: '/rrhh/novedades' },
            { label: 'Crear Contrato', icon: <Briefcase size={14}/>, ruta: '/rrhh/documentos' },
            { label: 'Nuevo Colaborador', icon: <UserPlus size={14}/>, ruta: '/rrhh/base' },
            { label: 'Asignar Vacaciones', icon: <Calendar size={14}/>, ruta: '/rrhh/vacaciones' },
            { label: 'Ver Planilla', icon: <DollarSign size={14}/>, ruta: '/rrhh/planilla_pagos' },
          ].map(btn=>(
            <button key={btn.label} onClick={()=>irARuta(btn.ruta)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODAL GENÉRICO */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-[8vh] pb-[8vh]">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-xl font-black text-gray-900">{modalTitulo}</h3>
              <button onClick={()=>{setModalAbierto(false);setModalContenido(null);}} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              {modalContenido ? modalContenido : (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-100">{modalColumnas.map(col=><th key={col.key} className="p-3 text-left text-xs font-bold text-gray-700 uppercase">{col.label}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {modalFilas.map((fila,i)=><tr key={i} className="hover:bg-gray-50">{modalColumnas.map(col=><td key={col.key} className="p-3 text-gray-800 text-sm">{fila[col.key]}</td>)}</tr>)}
                  </tbody>
                </table>
              )}
              {!modalContenido && modalFilas.length===0 && <p className="text-center text-gray-700 py-8 font-medium">No hay datos disponibles</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}