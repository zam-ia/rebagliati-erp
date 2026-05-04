// src/pages/rrhh/TabPerfilEmpleado.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { X, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE PUNTAJE Y CLASIFICACIÓN (idénticas a Evaluación)
// ══════════════════════════════════════════════════════════════════════════════
function calcularPuntajeNeto(incidencias) {
  let p = 0;
  p -= (incidencias.tard_leve || 0) * 1;
  p -= (incidencias.tard_grave || 0) * 2;
  p -= (incidencias.permiso_sj || 0) * 3;
  p -= (incidencias.falta_inj || 0) * 5;
  p -= (incidencias.falta_feriado || 0) * 6;
  if (incidencias.asist_perfecta) p += 5;
  return p;
}

function puntajeVisible(neto) {
  return Math.max(0, Math.min(100, 100 + neto));
}

function getClasificacion(visible) {
  if (visible >= 95) return { texto: 'Executive Premium', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  if (visible >= 80) return { texto: 'Standard Professional', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
  return { texto: 'Performance Review Required', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' };
}

function getInitials(nombre, apellido) {
  return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPETENCIAS PREDEFINIDAS
// ══════════════════════════════════════════════════════════════════════════════
const COMPETENCIAS_GENERALES_NOMBRES = [
  'Responsabilidad', 'Comunicación', 'Trabajo en equipo', 'Adaptabilidad',
  'Inteligencia emocional', 'Proactividad', 'Organización', 'Cumplimiento de normas'
];

const COMPETENCIAS_POR_PUESTO = {
  'Ejecutivo de ventas': ['Persuasión', 'Seguimiento comercial', 'Cierre de ventas', 'Manejo de objeciones', 'Velocidad de respuesta', 'Registro en CRM'],
  'Coordinador académico': ['Coordinación académica', 'Comunicación con docentes', 'Gestión de cronogramas', 'Control de asistencias', 'Seguimiento de participantes', 'Validación de documentación'],
  'Cajera': ['Manejo de caja', 'Atención al cliente', 'Exactitud en pagos', 'Organización de documentos', 'Resolución de incidencias', 'Confidencialidad'],
  'Gerente': ['Liderazgo estratégico', 'Toma de decisiones', 'Gestión financiera', 'Gestión de equipos', 'Visión de crecimiento', 'Control de indicadores'],
};

function getCompetenciasPorPuesto(cargo) {
  return COMPETENCIAS_POR_PUESTO[cargo] || [
    'Responsabilidad técnica', 'Cumplimiento de plazos', 'Calidad de trabajo',
    'Trabajo en equipo', 'Comunicación', 'Iniciativa'
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function TabPerfilEmpleado() {
  const [activeTab, setActiveTab] = useState('Evaluaciones');
  const [empleados, setEmpleados] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [tipoPersonal, setTipoPersonal] = useState('planilla');
  const [personaSeleccionada, setPersonaSeleccionada] = useState(null);
  const [vacaciones, setVacaciones] = useState([]);
  const [descansos, setDescansos] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [incidenciasActuales, setIncidenciasActuales] = useState(null);
  const [puntajeVisibleActual, setPuntajeVisibleActual] = useState(null);
  const [datosGrafico, setDatosGrafico] = useState([]);

  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [competenciasGenerales, setCompetenciasGenerales] = useState([]);
  const [competenciasPuesto, setCompetenciasPuesto] = useState([]);

  const periodoActual = useMemo(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const indiceAptitud = useMemo(() => {
    if (!puntajeVisibleActual) return null;
    const desempeno = puntajeVisibleActual;
    const competenciasGen = competenciasGenerales.length
      ? competenciasGenerales.reduce((a, c) => a + c.puntaje, 0) / competenciasGenerales.length
      : 0;
    const competenciasPue = competenciasPuesto.length
      ? competenciasPuesto.reduce((a, c) => a + c.puntaje, 0) / competenciasPuesto.length
      : 0;
    const asistencia = 100 - ((incidenciasActuales?.tard_leve || 0) * 2 + (incidenciasActuales?.tard_grave || 0) * 5 + (incidenciasActuales?.falta_inj || 0) * 10);
    const indice = Math.round((desempeno * 0.4) + (competenciasPue * 0.3) + (competenciasGen * 0.2) + (Math.max(0, asistencia) * 0.1));
    let estado, color, bg, recomendacion;
    if (indice >= 90) { estado = 'Apto para ascenso inmediato'; color = 'text-emerald-700'; bg = 'bg-emerald-50'; recomendacion = 'El colaborador cumple con los requisitos para asumir mayores responsabilidades.'; }
    else if (indice >= 80) { estado = 'Apto con observaciones menores'; color = 'text-blue-700'; bg = 'bg-blue-50'; recomendacion = 'Reforzar competencias específicas antes del ascenso.'; }
    else if (indice >= 70) { estado = 'En desarrollo para el puesto'; color = 'text-amber-700'; bg = 'bg-amber-50'; recomendacion = 'Se requiere un plan de mejora enfocado en las brechas detectadas.'; }
    else if (indice >= 60) { estado = 'Requiere plan de mejora'; color = 'text-orange-700'; bg = 'bg-orange-50'; recomendacion = 'Evaluar desempeño y establecer metas de corto plazo.'; }
    else { estado = 'No apto actualmente'; color = 'text-rose-700'; bg = 'bg-rose-50'; recomendacion = 'Requiere seguimiento y reestructuración de funciones.'; }
    return { indice, estado, color, bg, recomendacion };
  }, [puntajeVisibleActual, competenciasGenerales, competenciasPuesto, incidenciasActuales]);

  useEffect(() => {
    const cargarListas = async () => {
      const [empRes, locRes] = await Promise.all([
        supabase.from('empleados').select('*, horarios(id, nombre, tipo, hora_entrada, hora_salida, dias_trabajo, descansos)').order('apellido', { ascending: true }),
        supabase.from('locadores').select('*').eq('estado', 'activo').order('apellido', { ascending: true })
      ]);
      setEmpleados(empRes.data || []);
      setLocadores(locRes.data || []);
    };
    cargarListas();
  }, []);

  const calcularIncidenciasDesdeAsistencia = useCallback(async (empleadoId, mes) => {
    const primerDia = `${mes}-01`;
    const ultimoDia = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);
    const { data: asistenciasData } = await supabase
      .from('asistencia')
      .select('*')
      .eq('empleado_id', empleadoId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);
    let tard_leve = 0, tard_grave = 0, falta_inj = 0, permiso_sj = 0, falta_feriado = 0;
    asistenciasData?.forEach(reg => {
      if (reg.tardanza && !reg.justificacion) {
        const minutos = reg.minutos || 0;
        if (minutos <= 15) tard_leve++;
        else tard_grave++;
      }
      if (reg.falta && !reg.justificacion) falta_inj++;
    });
    return { tard_leve, tard_grave, falta_inj, permiso_sj, falta_feriado };
  }, []);

  const cargarDatosPersona = useCallback(async (persona) => {
    if (!persona) return;
    setCargando(true);
    try {
      const esPlanilla = tipoPersonal === 'planilla';
      const personaId = persona.id;

      // Cargar evaluaciones (tanto planilla como complementario ahora están en la tabla unificada)
      const { data: evData } = await supabase
        .from('evaluaciones')
        .select('*')
        .eq('empleado_id', personaId)
        .eq('tipo_persona', tipoPersonal)
        .order('mes', { ascending: false });
      setEvaluaciones(evData || []);

      if (esPlanilla) {
        const [vac, des, asis] = await Promise.all([
          supabase.from('vacaciones').select('*').eq('empleado_id', personaId).order('fecha_inicio', { ascending: false }),
          supabase.from('descansos_medicos').select('*').eq('empleado_id', personaId).order('fecha', { ascending: false }),
          supabase.from('asistencia').select('*').eq('empleado_id', personaId).order('fecha', { ascending: false })
        ]);
        setVacaciones(vac.data || []);
        setDescansos(des.data || []);
        setAsistencias(asis.data || []);
      } else {
        setVacaciones([]);
        setDescansos([]);
        setAsistencias([]);
      }

      // Cargar competencias desde BD (común)
      const { data: puntajesData } = await supabase
        .from('colaborador_competencias')
        .select('puntaje, competencia_id, competencias!inner(nombre, tipo, puesto)')
        .eq('empleado_id', personaId)
        .eq('periodo', periodoActual);

      const puntajesMap = {};
      puntajesData?.forEach(p => {
        if (p.competencias) puntajesMap[p.competencias.nombre] = p.puntaje;
      });

      const genComp = COMPETENCIAS_GENERALES_NOMBRES.map(nombre => ({
        nombre,
        puntaje: puntajesMap[nombre] ?? 0,
        max: 100
      }));

      const cargo = persona.cargo || persona.modalidad || 'General';
      const nombresPuesto = getCompetenciasPorPuesto(cargo);
      const puestoComp = nombresPuesto.map(nombre => ({
        nombre,
        puntaje: puntajesMap[nombre] ?? 0,
        max: 100
      }));

      setCompetenciasGenerales(genComp);
      setCompetenciasPuesto(puestoComp);

      // Calcular puntaje actual
      if (esPlanilla) {
        const incidencias = await calcularIncidenciasDesdeAsistencia(personaId, periodoActual);
        const evaluacionMes = (evData || []).find(e => e.mes === periodoActual);
        const asistPerfecta = evaluacionMes?.asist_perfecta || false;
        const neto = calcularPuntajeNeto({ ...incidencias, asist_perfecta: asistPerfecta });
        const visible = puntajeVisible(neto);
        setIncidenciasActuales(incidencias);
        setPuntajeVisibleActual(visible);
      } else {
        // Complementario: incidencias 0, tomamos puntaje de la evaluación o 100
        const evaluacionMes = (evData || []).find(e => e.mes === periodoActual);
        const visible = evaluacionMes ? puntajeVisible(evaluacionMes.punt_final) : 100;
        setIncidenciasActuales({ tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0, falta_feriado: 0 });
        setPuntajeVisibleActual(visible);
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setCargando(false);
    }
  }, [tipoPersonal, periodoActual, calcularIncidenciasDesdeAsistencia]);

  useEffect(() => {
    if (personaSeleccionada) cargarDatosPersona(personaSeleccionada);
  }, [personaSeleccionada, cargarDatosPersona]);

  // Gráfico de evolución (ahora para ambos)
  const prepararGrafico = useCallback(async () => {
    if (!personaSeleccionada) {
      setDatosGrafico([]);
      return;
    }
    const personaId = personaSeleccionada.id;
    const esPlanilla = tipoPersonal === 'planilla';

    const meses = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.push({ mes, label: mes.slice(5) });
    }

    const puntos = [];
    for (const m of meses) {
      const ev = evaluaciones.find(e => e.mes === m.mes);
      if (ev) {
        puntos.push({ mes: m.label, puntaje: puntajeVisible(ev.punt_final) });
      } else if (esPlanilla) {
        const inc = await calcularIncidenciasDesdeAsistencia(personaId, m.mes);
        const neto = calcularPuntajeNeto({ ...inc, asist_perfecta: false });
        puntos.push({ mes: m.label, puntaje: puntajeVisible(neto) });
      } else {
        // complementario sin evaluación -> asumimos 100
        puntos.push({ mes: m.label, puntaje: 100 });
      }
    }
    setDatosGrafico(puntos);
  }, [personaSeleccionada, tipoPersonal, evaluaciones, calcularIncidenciasDesdeAsistencia]);

  useEffect(() => { prepararGrafico(); }, [prepararGrafico]);

  const refrescarDatos = async () => {
    if (!personaSeleccionada) return;
    setCargando(true);
    await cargarDatosPersona(personaSeleccionada);
    await prepararGrafico();
    setCargando(false);
  };

  const clasifActual = puntajeVisibleActual !== null ? getClasificacion(puntajeVisibleActual) : null;
  const horario = personaSeleccionada?.horarios;
  const tendencia = datosGrafico.length >= 2
    ? datosGrafico[datosGrafico.length - 1].puntaje - datosGrafico[0].puntaje
    : 0;

  const personas = tipoPersonal === 'planilla' ? empleados : locadores;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Expediente Corporativo</h2>
          <p className="text-slate-400 text-xs sm:text-sm">Visualización integral del talento humano</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex gap-2">
            <button
              onClick={() => { setTipoPersonal('planilla'); setPersonaSeleccionada(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tipoPersonal === 'planilla' ? 'bg-[#11284e] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              🧑‍💼 Planilla
            </button>
            <button
              onClick={() => { setTipoPersonal('complementario'); setPersonaSeleccionada(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tipoPersonal === 'complementario' ? 'bg-[#11284e] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              📋 Complementarios
            </button>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={refrescarDatos} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all">🔄 Actualizar</button>
            <select
              value={personaSeleccionada?.id || ''}
              onChange={(e) => setPersonaSeleccionada(personas.find(p => p.id === e.target.value))}
              className="w-full sm:w-72 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#11284e] transition-all outline-none"
            >
              <option value="">Seleccionar {tipoPersonal === 'planilla' ? 'Colaborador...' : 'Complementario...'}</option>
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.apellido} {p.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {personaSeleccionada ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 p-1 mb-4 shadow-2xl">
                  {personaSeleccionada.foto_url ? (
                    <img src={personaSeleccionada.foto_url} className="w-full h-full rounded-full object-cover" alt="Perfil" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-2xl font-light">
                      {getInitials(personaSeleccionada.nombre, personaSeleccionada.apellido)}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold">{personaSeleccionada.nombre} {personaSeleccionada.apellido}</h3>
                <p className="text-blue-200 text-xs font-bold mt-1">
                  {tipoPersonal === 'planilla' ? personaSeleccionada.cargo : personaSeleccionada.modalidad || 'Complementario'}
                </p>
                {horario && (
                  <div className="mt-1 text-xs text-blue-200/70">{horario.nombre} ({horario.tipo})</div>
                )}
                <div className="mt-5 w-full grid grid-cols-2 gap-2">
                  <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                    <span className="block text-lg font-bold">{tipoPersonal === 'planilla' ? vacaciones.reduce((sum, v) => sum + v.dias_usados, 0) : '—'}</span>
                    <span className="text-[9px] uppercase opacity-60">Vacaciones</span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                    <span className="block text-lg font-bold">{tipoPersonal === 'planilla' ? asistencias.filter(a => a.tardanza).length : '—'}</span>
                    <span className="text-[9px] uppercase opacity-60">Tardanzas</span>
                  </div>
                </div>
                {puntajeVisibleActual !== null && clasifActual && (
                  <div className={`mt-4 w-full rounded-xl p-3 ${clasifActual.bg} ${clasifActual.border} border`}>
                    <p className="text-xs uppercase tracking-widest font-bold opacity-70">Score actual</p>
                    <p className={`text-3xl font-black ${clasifActual.color}`}>{puntajeVisibleActual} pts</p>
                    <p className="text-xs font-bold mt-1">{clasifActual.texto}</p>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800">Evolución de Desempeño</h4>
                <div className="flex items-center gap-2">
                  {tendencia > 0 ? <TrendingUp size={14} className="text-emerald-500" /> : tendencia < 0 ? <TrendingDown size={14} className="text-rose-500" /> : <Minus size={14} className="text-amber-500" />}
                  <span className="text-xs font-bold text-slate-500">{tendencia >= 0 ? '+' : ''}{tendencia} pts</span>
                  {evaluaciones.length > 0 && (
                    <button onClick={() => setShowHistoricoModal(true)} className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                      Histórico <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosGrafico}>
                    <defs>
                      <linearGradient id="colorPuntaje" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#11284e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#11284e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="puntaje" stroke="#11284e" strokeWidth={3} fillOpacity={1} fill="url(#colorPuntaje)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Radares */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4">Competencias Generales</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={100} data={competenciasGenerales}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name="Colaborador" dataKey="puntaje" stroke="#11284e" fill="#11284e" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4">Competencias del Puesto: {personaSeleccionada.cargo || personaSeleccionada.modalidad || 'General'}</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={100} data={competenciasPuesto}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name="Colaborador" dataKey="puntaje" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {indiceAptitud && (
            <div className={`rounded-2xl p-6 border-2 ${indiceAptitud.bg} border-current/10`}>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest opacity-70">Índice de Aptitud Laboral</h4>
                  <div className={`text-4xl font-black ${indiceAptitud.color}`}>{indiceAptitud.indice}%</div>
                  <div className="text-sm font-bold mt-1">{indiceAptitud.estado}</div>
                </div>
                <div className="max-w-xs text-xs text-slate-600">
                  <p className="font-bold mb-1">Recomendación:</p>
                  <p>{indiceAptitud.recomendacion}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pestañas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-50 px-6 bg-slate-50/50 overflow-x-auto">
              {tipoPersonal === 'planilla' ? (
                ['Evaluaciones', 'Vacaciones', 'Descansos', 'Asistencias', 'Tardanzas', 'Observaciones'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-[#11284e] text-[#11284e]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >{tab}</button>
                ))
              ) : (
                <button className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] border-b-2 border-[#11284e] text-[#11284e]">
                  Datos generales
                </button>
              )}
            </div>
            <div className="p-6">
              {cargando ? (
                <div className="flex flex-col items-center py-12 text-slate-400 animate-pulse">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-[#11284e] rounded-full animate-spin mb-4"></div>
                  <span className="text-xs font-bold uppercase tracking-widest">Sincronizando Data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {tipoPersonal === 'planilla' ? (
                    <>
                      {activeTab === 'Evaluaciones' && (
                        <table className="w-full text-left">
                          <thead><tr className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100"><th className="pb-4">Periodo</th><th className="pb-4">Puntaje</th><th className="pb-4">Estatus</th><th className="pb-4">Observaciones</th></tr></thead>
                          <tbody className="divide-y divide-slate-50">
                            {evaluaciones.map(ev => {
                              const visible = puntajeVisible(ev.punt_final);
                              const c = getClasificacion(visible);
                              return (
                                <tr key={ev.id} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="py-4 font-bold text-slate-700">{ev.mes}</td>
                                  <td className="py-4 font-black text-[#11284e]">{visible} <span className="text-[10px] opacity-40">pts</span></td>
                                  <td className="py-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${c.bg} ${c.color} ${c.border}`}>{c.texto}</span></td>
                                  <td className="py-4 text-xs text-slate-500 max-w-xs truncate">{ev.observaciones || 'Sin detalles'}</td>
                                </tr>
                              );
                            })}
                            {evaluaciones.length === 0 && <tr><td colSpan="4" className="py-8 text-center text-slate-300 italic">No hay evaluaciones guardadas.</td></tr>}
                          </tbody>
                        </table>
                      )}
                      {activeTab === 'Vacaciones' && (
                        <table className="w-full text-left">
                          <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Inicio</th><th>Fin</th><th>Días</th><th>Estado</th></tr></thead>
                          <tbody>{vacaciones.map(v => (<tr key={v.id} className="border-t"><td className="py-3">{v.fecha_inicio}</td><td className="py-3">{v.fecha_fin}</td><td className="py-3">{v.dias_usados}</td><td className="py-3">{v.estado}</td></tr>))}</tbody>
                        </table>
                      )}
                      {activeTab === 'Descansos' && (
                        <table className="w-full text-left">
                          <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Fecha</th><th>Días</th><th>Diagnóstico</th></tr></thead>
                          <tbody>{descansos.map(d => (<tr key={d.id} className="border-t"><td className="py-3">{d.fecha}</td><td className="py-3">{d.dias}</td><td className="py-3">{d.diagnostico}</td></tr>))}</tbody>
                        </table>
                      )}
                      {activeTab === 'Asistencias' && (
                        <table className="w-full text-left">
                          <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Fecha</th><th>Tardanza</th><th>Justificación</th></tr></thead>
                          <tbody>{asistencias.map((a, idx) => (<tr key={idx} className="border-t"><td className="py-3">{a.fecha}</td><td className="py-3">{a.tardanza ? 'Sí' : 'No'}</td><td className="py-3">{a.justificacion || '—'}</td></tr>))}</tbody>
                        </table>
                      )}
                      {activeTab === 'Tardanzas' && (
                        <table className="w-full text-left">
                          <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Fecha</th><th>Minutos</th><th>Justificación</th></tr></thead>
                          <tbody>{asistencias.filter(a => a.tardanza).map((a, idx) => (<tr key={idx} className="border-t"><td className="py-3">{a.fecha}</td><td className="py-3">{a.minutos || '—'}</td><td className="py-3">{a.justificacion || '—'}</td></tr>))}</tbody>
                        </table>
                      )}
                      {activeTab === 'Observaciones' && (
                        <div className="text-slate-500 text-sm italic py-4">Observaciones internas del colaborador (pendiente de integración).</div>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-500 text-sm">
                      <p className="font-bold mb-2">Información del complementario:</p>
                      <p><strong>Nombre:</strong> {personaSeleccionada.nombre} {personaSeleccionada.apellido}</p>
                      <p><strong>Modalidad:</strong> {personaSeleccionada.modalidad}</p>
                      <p><strong>Sueldo base:</strong> S/ {Number(personaSeleccionada.sueldo_base || 0).toLocaleString('es-PE')}</p>
                      <p><strong>DNI:</strong> {personaSeleccionada.dni || '—'}</p>
                      <p className="mt-3 text-xs text-slate-400">Las evaluaciones de desempeño ahora están disponibles en la pestaña Evaluaciones.</p>
                      {evaluaciones.length > 0 && (
                        <table className="w-full text-left mt-4">
                          <thead><tr className="text-[10px] uppercase text-slate-400 font-bold border-b"><th className="pb-4">Periodo</th><th className="pb-4">Puntaje</th><th className="pb-4">Estatus</th></tr></thead>
                          <tbody>
                            {evaluaciones.map(ev => {
                              const visible = puntajeVisible(ev.punt_final);
                              const c = getClasificacion(visible);
                              return (
                                <tr key={ev.id} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="py-4 font-bold text-slate-700">{ev.mes}</td>
                                  <td className="py-4 font-black text-[#11284e]">{visible} pts</td>
                                  <td className="py-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${c.bg} ${c.color} ${c.border}`}>{c.texto}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal histórico */}
          {showHistoricoModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
                  <h3 className="text-xl font-black text-slate-800">Histórico de Desempeño</h3>
                  <button onClick={() => setShowHistoricoModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 uppercase">Promedio histórico</p>
                      <p className="text-2xl font-black text-slate-800">{datosGrafico.length ? Math.round(datosGrafico.reduce((a,b) => a+b.puntaje, 0) / datosGrafico.length) : 0} pts</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 uppercase">Mejor periodo</p>
                      <p className="text-2xl font-black text-emerald-600">{datosGrafico.length ? Math.max(...datosGrafico.map(d => d.puntaje)) : 0} pts</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 uppercase">Tendencia</p>
                      <p className={`text-2xl font-black ${tendencia > 0 ? 'text-emerald-600' : tendencia < 0 ? 'text-rose-600' : 'text-amber-600'}`}>{tendencia >= 0 ? '+' : ''}{tendencia} pts</p>
                    </div>
                  </div>
                  <table className="w-full text-left">
                    <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Periodo</th><th>Puntaje</th><th>Categoría</th><th>Observación</th></tr></thead>
                    <tbody className="divide-y">
                      {evaluaciones.map(ev => {
                        const visible = puntajeVisible(ev.punt_final);
                        const c = getClasificacion(visible);
                        return (
                          <tr key={ev.id}><td className="py-3 font-bold">{ev.mes}</td><td className="py-3 font-black">{visible} pts</td><td className="py-3"><span className={`px-2 py-1 rounded-full text-[9px] font-bold ${c.bg} ${c.color}`}>{c.texto}</span></td><td className="py-3 text-xs text-slate-500">{ev.observaciones || '—'}</td></tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-4 text-slate-200">📁</div>
          <p className="text-slate-400 font-medium">Seleccione un colaborador para visualizar su perfil ejecutivo.</p>
        </div>
      )}
    </div>
  );
}