// src/pages/rrhh/DashboardRRHH.jsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Users, UserCheck, UserX, TrendingUp, AlertTriangle, UserPlus,
  Calendar, Clock, DollarSign, Briefcase, FileText, RefreshCw,
  ChevronRight, Star, ThumbsDown, Eye, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

// ══════════════════════════════════════════════════════════════════════════════
// COLORES Y CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════════════════════
const COLORS = ['#185FA5', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#e2e8f0', '#f1f5f9'];
const MES_ACTUAL = new Date().toISOString().slice(0, 7);
const MES_ANTERIOR = (() => {
  const hoy = new Date();
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`;
})();

// ── Helpers ───────────────────────────────────────────────────────────────
const formatSoles = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);

function calcularPuntajeVisible(neto) {
  return Math.max(0, Math.min(100, 100 + neto));
}

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

  // ═══ INSERTAR NOTIFICACIONES DE CONTRATOS POR VENCER ═══
  useEffect(() => {
    if (contratosPorVencer > 0) {
      const insertarNotificacion = async () => {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        const hoy = new Date().toISOString().split('T')[0];
        const { data: existente } = await supabase
          .from('notificaciones')
          .select('id')
          .eq('mensaje', `📋 ${contratosPorVencer} contratos por vencer en los próximos 30 días`)
          .gte('created_at', hoy)
          .maybeSingle();

        if (!existente) {
          await supabase.from('notificaciones').insert({
            mensaje: `📋 ${contratosPorVencer} contratos por vencer en los próximos 30 días`,
            ruta: '/rrhh/documentos',
            leida: false,
            user_id: userId || null,
          });
        }
      };
      insertarNotificacion();
    }
  }, [contratosPorVencer]);

  // ═══ KPIs PRINCIPALES ═══
  const kpis = useMemo(() => {
    const totalPlanilla = empleados.filter(e => e.estado === 'activo').length;
    const totalComplementarios = locadores.length;
    const totalPersonas = empleados.length + totalComplementarios;

    const scoresPlanilla = evaluaciones
      .filter(ev => ev.tipo_persona !== 'complementario')
      .map(ev => calcularPuntajeVisible(ev.punt_final));
    const scoresComplementarios = evaluaciones
      .filter(ev => ev.tipo_persona === 'complementario')
      .map(ev => calcularPuntajeVisible(ev.punt_final));
    const promedioGeneral = [...scoresPlanilla, ...scoresComplementarios].length
      ? Math.round([...scoresPlanilla, ...scoresComplementarios].reduce((a, b) => a + b, 0) / [...scoresPlanilla, ...scoresComplementarios].length)
      : 0;

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

  // ═══ DISTRIBUCIÓN POR ÁREAS (planilla) ═══
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
      const cargo = e.cargo || 'Sin cargo';
      conteo[cargo] = (conteo[cargo] || 0) + 1;
    });
    return Object.entries(conteo).map(([cargo, count]) => ({ cargo, count }));
  }, [empleados]);

  // ═══ TENDENCIA DE DESEMPEÑO (ÚLTIMOS 6 MESES) ═══
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

  // ═══ ASISTENCIA DEL MES ═══
  const datosAsistencia = useMemo(() => {
    let tardanzas = 0, faltasInjustificadas = 0, faltasJustificadas = 0;
    asistencias.forEach(a => {
      if (a.tardanza && a.justificacion) return;
      if (a.tardanza) tardanzas++;
      if (a.falta && a.justificacion) faltasJustificadas++;
      if (a.falta && !a.justificacion) faltasInjustificadas++;
    });
    return { tardanzas, faltasInjustificadas, faltasJustificadas };
  }, [asistencias]);

  const tardanzasPorArea = useMemo(() => {
    const mapa = {};
    asistencias.forEach(a => {
      if (!a.tardanza || a.justificacion) return;
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

  // ═══ TOP 5 Y BOTTOM 5 ═══
  const top5 = useMemo(() => {
    return evaluaciones
      .filter(ev => ev.empleado_id)
      .map(ev => {
        const emp = empleados.find(e => e.id === ev.empleado_id) || locadores.find(l => l.id === ev.empleado_id);
        return {
          id: ev.empleado_id,
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : ev.empleado_nombre,
          puntaje: calcularPuntajeVisible(ev.punt_final)
        };
      })
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 5);
  }, [evaluaciones, empleados, locadores]);

  const bottom5 = useMemo(() => {
    return evaluaciones
      .filter(ev => ev.empleado_id)
      .map(ev => {
        const emp = empleados.find(e => e.id === ev.empleado_id) || locadores.find(l => l.id === ev.empleado_id);
        return {
          id: ev.empleado_id,
          nombre: emp ? `${emp.nombre} ${emp.apellido}` : ev.empleado_nombre,
          puntaje: calcularPuntajeVisible(ev.punt_final)
        };
      })
      .sort((a, b) => a.puntaje - b.puntaje)
      .slice(0, 5);
  }, [evaluaciones, empleados, locadores]);

  // ═══ ALERTAS ═══
  const alertas = useMemo(() => {
    const lista = [];
    if (kpis.enRiesgo > 0) lista.push({ texto: `${kpis.enRiesgo} colaboradores con desempeño en caída`, ruta: '/rrhh/evaluacion' });
    if (datosAsistencia.tardanzas > 50) lista.push({ texto: `Alto nivel de tardanzas (${datosAsistencia.tardanzas})`, ruta: '/rrhh/novedades' });
    if (datosAsistencia.faltasInjustificadas > 0) lista.push({ texto: `${datosAsistencia.faltasInjustificadas} faltas injustificadas este mes`, ruta: '/rrhh/descansos' });
    if (contratosPorVencer > 0) lista.push({ texto: `${contratosPorVencer} contratos por vencer en los próximos 30 días`, ruta: '/rrhh/documentos' });
    return lista;
  }, [kpis, datosAsistencia, contratosPorVencer]);

  // ═══ FUNCIONES DE NAVEGACIÓN ═══
  const irARuta = (ruta) => navigate(ruta);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-[#185FA5]" size={32} />
          <p className="text-gray-500 font-medium">Cargando Centro de Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 space-y-8">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl shadow-blue-100/20 border border-blue-50 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
              <Users className="w-6 h-6 text-[#185FA5]" />
            </div>
            <h2 className="text-2xl font-black text-[#0B1527] tracking-tight">Dashboard de Recursos Humanos</h2>
          </div>
          <p className="text-gray-400 text-sm font-medium ml-12">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center gap-2">
            <Download size={14} /> Exportar Reporte
          </button>
          <button onClick={() => window.location.reload()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-gray-200">
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* ═══ KPIs PRINCIPALES ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Colaboradores', value: kpis.totalPersonas, icon: <Users size={20} className="text-blue-600" />, bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Planilla', value: kpis.totalPlanilla, icon: <UserCheck size={20} className="text-emerald-600" />, bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Complementarios', value: kpis.totalComplementarios, icon: <Briefcase size={20} className="text-purple-600" />, bg: 'bg-purple-50', border: 'border-purple-100' },
          { label: 'Promedio Desempeño', value: `${kpis.promedioGeneral} pts`, icon: <TrendingUp size={20} className="text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'En Riesgo', value: kpis.enRiesgo, icon: <AlertTriangle size={20} className="text-red-600" />, bg: 'bg-red-50', border: 'border-red-100' },
          { label: 'Nuevos Ingresos', value: kpis.nuevosIngresosTotal, icon: <UserPlus size={20} className="text-teal-600" />, bg: 'bg-teal-50', border: 'border-teal-100' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} ${kpi.border} rounded-2xl p-5 border hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-xl shadow-sm">{kpi.icon}</div>
            </div>
            <p className="text-2xl font-black text-gray-800">{kpi.value}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ BLOQUE 1: TALENTO Y ESTRUCTURA ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-[#0B1527] mb-2">Distribución por Áreas</h3>
          <p className="text-sm text-gray-400 mb-6">Composición del equipo por departamento</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribucionAreas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={5}>
                  {distribucionAreas.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-[#0B1527] mb-2">Distribución por Cargo</h3>
          <p className="text-sm text-gray-400 mb-6">Cantidad de colaboradores por puesto</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribucionCargos}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="cargo" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="count" fill="#185FA5" radius={[8, 8, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ BLOQUE 2: DESEMPEÑO Y EVALUACIONES ═══ */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-[#0B1527] mb-2">Evolución del Desempeño</h3>
        <p className="text-sm text-gray-400 mb-6">Tendencia de puntuaciones en los últimos 6 meses</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tendenciaDesempeno}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }} />
              <Line type="monotone" dataKey="promedio" stroke="#185FA5" strokeWidth={3} dot={{ r: 5, fill: '#185FA5' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ TOP 5 / BOTTOM 5 ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h4 className="font-black text-[#0B1527] mb-4 flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-amber-50 rounded-lg"><Star size={18} className="text-amber-500" /></div> Top 5 Desempeño
          </h4>
          <div className="space-y-2">
            {top5.map((p, i) => (
              <div key={i} className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-200 flex items-center justify-center text-xs font-black text-emerald-700">{i + 1}</span>
                  <span className="text-sm font-bold text-gray-700">{p.nombre}</span>
                </div>
                <span className="font-black text-emerald-600">{p.puntaje} pts</span>
              </div>
            ))}
            {top5.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin datos de evaluación este mes.</p>}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h4 className="font-black text-[#0B1527] mb-4 flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-rose-50 rounded-lg"><ThumbsDown size={18} className="text-rose-500" /></div> Atención Requerida
          </h4>
          <div className="space-y-2">
            {bottom5.map((p, i) => (
              <div key={i} className="flex justify-between items-center bg-rose-50 p-4 rounded-2xl border border-rose-100 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-rose-200 flex items-center justify-center text-xs font-black text-rose-700">{i + 1}</span>
                  <span className="text-sm font-bold text-gray-700">{p.nombre}</span>
                </div>
                <span className="font-black text-rose-600">{p.puntaje} pts</span>
              </div>
            ))}
            {bottom5.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Todos los evaluados superan los 70 pts.</p>}
          </div>
        </div>
      </div>

      {/* ═══ BLOQUE 3: ASISTENCIA Y DISCIPLINA ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-[#0B1527] mb-2">Asistencia del Mes</h3>
          <p className="text-sm text-gray-400 mb-6">Resumen de incidencias del período actual</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tardanzas', value: datosAsistencia.tardanzas, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Faltas Injust.', value: datosAsistencia.faltasInjustificadas, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
              { label: 'Faltas Justif.', value: datosAsistencia.faltasJustificadas, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Horas Extras', value: horasExtras.toFixed(1), color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            ].map(d => (
              <div key={d.label} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow`}>
                <p className={`text-3xl font-black ${d.color}`}>{d.value}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-[#0B1527] mb-2">Tardanzas por Área</h3>
          <p className="text-sm text-gray-400 mb-6">Distribución de impuntualidad por departamento</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tardanzasPorArea}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="area" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="tardanzas" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ BLOQUE 4: VACACIONES ═══ */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-[#0B1527] mb-2">Vacaciones y Carga Laboral</h3>
        <p className="text-sm text-gray-400 mb-6">Seguimiento de días pendientes y próximas ausencias</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Días Pendientes', value: diasVacacionesPendientes, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Próximas (30 días)', value: proximasVacaciones, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Riesgo de Burnout', value: kpis.enRiesgo, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map(d => (
            <div key={d.label} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow`}>
              <p className={`text-3xl font-black ${d.color}`}>{d.value}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ BLOQUE 5: RECLUTAMIENTO ═══ */}
      {reclutamiento && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
          <h3 className="text-lg font-black text-[#0B1527] mb-2">Reclutamiento</h3>
          <p className="text-sm text-gray-400 mb-6">Pipeline actual de selección de personal</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Postulantes', value: reclutamiento.postulantes || 0, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'En Evaluación', value: reclutamiento.en_evaluacion || 0, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'En Entrevista', value: reclutamiento.en_entrevista || 0, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: 'Contratados', value: reclutamiento.contratados || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Rechazados', value: reclutamiento.rechazados || 0, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
            ].map(d => (
              <div key={d.label} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow`}>
                <p className={`text-3xl font-black ${d.color}`}>{d.value}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ BLOQUE 6: PLANILLA ═══ */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-[#0B1527] mb-2">Planilla y Pagos</h3>
        <p className="text-sm text-gray-400 mb-6">Estado financiero del capital humano</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Planilla Total', value: formatSoles(planillaDatos.actual), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'vs Mes Anterior', value: planillaDatos.anterior > 0 ? `${(((planillaDatos.actual - planillaDatos.anterior) / planillaDatos.anterior) * 100).toFixed(1)}%` : '—', color: planillaDatos.anterior > 0 ? (planillaDatos.actual >= planillaDatos.anterior ? 'text-rose-600' : 'text-emerald-600') : 'text-gray-400', bg: planillaDatos.anterior > 0 ? (planillaDatos.actual >= planillaDatos.anterior ? 'bg-rose-50' : 'bg-emerald-50') : 'bg-gray-50', border: planillaDatos.anterior > 0 ? (planillaDatos.actual >= planillaDatos.anterior ? 'border-rose-100' : 'border-emerald-100') : 'border-gray-100' },
            { label: 'Pagos Pendientes', value: pagosPendientes > 0 ? formatSoles(pagosPendientes) : 'Sin pagos', color: pagosPendientes > 0 ? 'text-rose-600' : 'text-emerald-600', bg: pagosPendientes > 0 ? 'bg-rose-50' : 'bg-emerald-50', border: pagosPendientes > 0 ? 'border-rose-100' : 'border-emerald-100' },
          ].map(d => (
            <div key={d.label} className={`${d.bg} ${d.border} rounded-2xl p-5 text-center border hover:shadow-sm transition-shadow`}>
              <p className={`text-xl font-black ${d.color}`}>{d.value}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ALERTAS CRÍTICAS ═══ */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-[#0B1527] mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-rose-500" /></div> Alertas Críticas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alertas.map((alerta, i) => (
            <div key={i} onClick={() => irARuta(alerta.ruta)} className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-rose-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-rose-200 flex items-center justify-center text-rose-600 font-black text-sm group-hover:scale-110 transition-transform">!</div>
              <span className="text-sm font-bold text-gray-700 flex-1">{alerta.texto}</span>
              <Eye size={16} className="text-rose-400 group-hover:text-rose-600 transition-colors" />
            </div>
          ))}
          {alertas.length === 0 && (
            <p className="text-xs text-gray-400 col-span-2 text-center py-4">No hay alertas críticas en este momento.</p>
          )}
        </div>
      </div>

      {/* ═══ ACCIONES RÁPIDAS ═══ */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl shadow-blue-100/20 border border-blue-50">
        <h3 className="text-lg font-black text-[#0B1527] mb-4">Acciones Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Registrar Evaluación', icon: <FileText size={14} />, ruta: '/rrhh/evaluacion' },
            { label: 'Registrar Incidencia', icon: <AlertTriangle size={14} />, ruta: '/rrhh/novedades' },
            { label: 'Crear Contrato', icon: <Briefcase size={14} />, ruta: '/rrhh/documentos' },
            { label: 'Nuevo Colaborador', icon: <UserPlus size={14} />, ruta: '/rrhh/base' },
            { label: 'Asignar Vacaciones', icon: <Calendar size={14} />, ruta: '/rrhh/vacaciones' },
            { label: 'Ver Planilla', icon: <DollarSign size={14} />, ruta: '/rrhh/planilla_pagos' },
          ].map(btn => (
            <button key={btn.label} onClick={() => irARuta(btn.ruta)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}