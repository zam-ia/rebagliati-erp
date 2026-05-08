// src/pages/rrhh/TabPerfilEmpleado.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  X, TrendingUp, TrendingDown, Minus, ChevronRight, Star, AlertTriangle,
  Award, Target, Zap, Shield, User, Briefcase, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

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
// NUEVOS HELPERS (promedio, ranking, fit)
// ══════════════════════════════════════════════════════════════════════════════
function promedioCompetencias(lista = []) {
  if (!lista.length) return 0;
  return Math.round(lista.reduce((acc, item) => acc + Number(item.puntaje || 0), 0) / lista.length);
}

function ordenarCompetencias(lista = [], orden = 'desc') {
  return [...lista].sort((a, b) =>
    orden === 'desc'
      ? Number(b.puntaje || 0) - Number(a.puntaje || 0)
      : Number(a.puntaje || 0) - Number(b.puntaje || 0)
  );
}

function getFitPuesto(promGen, promPuesto, scoreActual) {
  const score = Math.round(
    (promPuesto * 0.5) +
    (promGen * 0.25) +
    ((scoreActual ?? 100) * 0.25)
  );
  if (score >= 90) return { nivel: 'Encaje sobresaliente', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (score >= 80) return { nivel: 'Buen encaje funcional', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (score >= 70) return { nivel: 'Encaje en desarrollo', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { nivel: 'Encaje crítico', color: 'text-rose-600', bg: 'bg-rose-50' };
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPETENCIAS PREDEFINIDAS (sin cambios)
// ══════════════════════════════════════════════════════════════════════════════
const COMPETENCIAS_GENERALES_NOMBRES = [
  'Responsabilidad',
  'Comunicación',
  'Organización',
  'Trabajo en equipo',
  'Cumplimiento de normas',
  'Calidad del trabajo',
  'Proactividad',
  'Inteligencia emocional laboral'
];

const COMPETENCIAS_POR_PUESTO = {
  'Ejecutivo de ventas': [
    'Persuasión',
    'Seguimiento comercial',
    'Cierre de ventas',
    'Manejo de objeciones',
    'Velocidad de respuesta',
    'Registro en CRM'
  ],
  'Coordinador académico': [
    'Coordinación académica',
    'Comunicación con docentes',
    'Gestión de cronogramas',
    'Control de asistencias',
    'Seguimiento de participantes',
    'Validación de documentación'
  ],
  'Cajera': [
    'Manejo de caja',
    'Atención al cliente cajera',
    'Exactitud en pagos',
    'Organización de documentos',
    'Resolución de incidencias',
    'Confidencialidad'
  ],
  'Gerente': [
    'Liderazgo estratégico',
    'Decisiones gerenciales',
    'Gestión financiera',
    'Gestión de equipos',
    'Visión de crecimiento',
    'Control de indicadores'
  ],
  'Recursos Humanos': [
    'Gestión de personal',
    'Reclutamiento y selección',
    'Administración de planillas',
    'Gestión del clima laboral',
    'Cumplimiento normativo RRHH',
    'Gestión de evaluaciones'
  ],
};

function getCompetenciasPorPuesto(cargo) {
  return COMPETENCIAS_POR_PUESTO[cargo] || [
    'Responsabilidad técnica',
    'Cumplimiento de plazos',
    'Calidad de trabajo',
    'Colaboración de equipo',
    'Comunicación efectiva',
    'Iniciativa'
  ];
}

async function asegurarCompetenciasExisten() {
  const { data: existentes } = await supabase.from('competencias').select('nombre');
  const nombresExistentes = new Set(existentes?.map(c => c.nombre) || []);
  const nuevas = [];
  COMPETENCIAS_GENERALES_NOMBRES.forEach(nombre => {
    if (!nombresExistentes.has(nombre)) nuevas.push({ nombre, tipo: 'general', puesto: null });
  });
  Object.entries(COMPETENCIAS_POR_PUESTO).forEach(([cargo, nombres]) => {
    nombres.forEach(nombre => {
      if (!nombresExistentes.has(nombre)) nuevas.push({ nombre, tipo: 'especifica', puesto: cargo });
    });
  });
  if (nuevas.length > 0) {
    await supabase.from('competencias').upsert(nuevas, { onConflict: 'nombre' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS MEJORADOS
// ══════════════════════════════════════════════════════════════════════════════

/** Tarjeta con radar y lista de fortalezas/brechas */
function RadarCompetenciasCard({ titulo, subtitulo, datos, colorStroke, fillColor, fillOpacity }) {
  const promedio = promedioCompetencias(datos);
  const fortalezas = ordenarCompetencias(datos, 'desc').slice(0, 2);
  const brechas = ordenarCompetencias(datos, 'asc').slice(0, 2);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="mb-2">
        <h4 className="font-black text-slate-800 text-base">{titulo}</h4>
        {subtitulo && (
          <p className="text-[10px] uppercase tracking-[0.22em] font-black text-slate-400 mt-0.5">
            {subtitulo}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-2xl font-black text-slate-800">{promedio}</span>
          <span className="text-xs text-slate-400">pts promedio</span>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] flex items-center justify-center">
        {datos.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart outerRadius={75} data={datos}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#64748b' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar
                name="Colaborador"
                dataKey="puntaje"
                stroke={colorStroke}
                fill={fillColor}
                fillOpacity={fillOpacity}
                strokeWidth={2.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-400 italic">Sin datos</p>
        )}
      </div>

      {/* Fortalezas y brechas */}
      <div className="mt-4 space-y-1.5">
        {fortalezas.map((c, i) => (
          <div key={`for-${i}`} className="flex items-center text-xs bg-emerald-50 rounded-lg px-2 py-1 gap-1">
            <Award size={14} className="text-emerald-600" />
            <span className="font-semibold text-emerald-800">{c.nombre}</span>
            <span className="ml-auto font-bold text-emerald-700">{c.puntaje ?? 0}</span>
          </div>
        ))}
        {brechas.map((c, i) => (
          <div key={`bre-${i}`} className="flex items-center text-xs bg-rose-50 rounded-lg px-2 py-1 gap-1">
            <AlertTriangle size={14} className="text-rose-500" />
            <span className="font-semibold text-rose-800">{c.nombre}</span>
            <span className="ml-auto font-bold text-rose-700">{c.puntaje ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tarjeta central premium: perfil 360° */
function Perfil360Centro({ persona, scoreVisible, clasifActual, fitPuestoData, promedioGen, promedioPuesto, competenciasGen, competenciasPuesto }) {
  const fotoUrl = persona?.foto_url;
  const nombre = persona?.nombre || '';
  const apellido = persona?.apellido || '';
  const cargo = persona?.cargo || persona?.modalidad || 'Sin cargo';
  const horario = persona?.horarios;

  // Combinamos top fortalezas de ambas listas (máxima dispersión posible)
  const todasCompetencias = [...competenciasGen, ...competenciasPuesto];
  const fortalezasTop = ordenarCompetencias(todasCompetencias, 'desc').slice(0, 3);
  const brechasTop = ordenarCompetencias(todasCompetencias, 'asc').slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-[2rem] p-6 text-white shadow-xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl translate-x-10 -translate-y-10" />
      <div className="relative z-10">
        {/* Foto */}
        <div className="w-28 h-28 mx-auto rounded-full border-4 border-white/20 p-1 mb-4 shadow-2xl">
          {fotoUrl ? (
            <img src={fotoUrl} alt={`${nombre} ${apellido}`} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-3xl font-light">
              {getInitials(nombre, apellido)}
            </div>
          )}
        </div>

        <h3 className="text-xl font-bold">{nombre} {apellido}</h3>
        <p className="text-blue-200 text-xs font-bold mt-1">{cargo}</p>
        {horario && <p className="text-[10px] text-blue-200/60 mt-0.5">{horario.nombre} ({horario.tipo})</p>}

        {/* Score y fit */}
        <div className="mt-5 flex justify-around gap-4 w-full">
          <div className="flex flex-col items-center px-3 py-2 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-2xl font-black text-white">{scoreVisible}</span>
            <span className="text-[9px] uppercase tracking-widest text-blue-200/80">Score</span>
          </div>
          <div className="flex flex-col items-center px-3 py-2 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-2xl font-black text-white">{fitPuestoData?.nivel ? '✓' : '—'}</span>
            <span className="text-[9px] uppercase tracking-widest text-blue-200/80">Fit Puesto</span>
          </div>
          <div className="flex flex-col items-center px-3 py-2 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-2xl font-black text-white">{promedioGen}</span>
            <span className="text-[9px] uppercase tracking-widest text-blue-200/80">Gen.</span>
          </div>
          <div className="flex flex-col items-center px-3 py-2 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-2xl font-black text-white">{promedioPuesto}</span>
            <span className="text-[9px] uppercase tracking-widest text-blue-200/80">Puesto</span>
          </div>
        </div>

        {/* Clasificación */}
        {clasifActual && (
          <div className={`mt-4 px-4 py-1 rounded-full border ${clasifActual.border} ${clasifActual.bg} ${clasifActual.color} text-xs font-black uppercase tracking-wider`}>
            {clasifActual.texto}
          </div>
        )}

        {/* Fortalezas y brechas combinadas */}
        <div className="mt-4 w-full space-y-1">
          {fortalezasTop.map((c, i) => (
            <div key={`f-${i}`} className="flex items-center text-[10px] bg-white/10 rounded-lg px-2 py-1 gap-1 text-white">
              <Star size={12} className="text-yellow-300" />
              <span className="font-semibold truncate">{c.nombre}</span>
              <span className="ml-auto font-bold">{c.puntaje ?? 0}</span>
            </div>
          ))}
          {brechasTop.map((c, i) => (
            <div key={`b-${i}`} className="flex items-center text-[10px] bg-white/10 rounded-lg px-2 py-1 gap-1 text-white">
              <AlertTriangle size={12} className="text-rose-300" />
              <span className="font-semibold truncate">{c.nombre}</span>
              <span className="ml-auto font-bold">{c.puntaje ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Resumen de decisión ejecutivo */
function DecisionSummary({ indiceAptitud, fitPuestoData }) {
  if (!indiceAptitud) return null;
  const { indice, estado, color, bg, recomendacion } = indiceAptitud;
  return (
    <div className={`rounded-2xl p-5 border-2 ${bg} border-current/10 flex flex-col sm:flex-row justify-between items-start gap-4`}>
      <div>
        <h4 className="text-sm font-black uppercase tracking-widest opacity-70">Índice de Aptitud Laboral</h4>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-4xl font-black ${color}`}>{indice}%</span>
          <span className={`text-xs font-bold uppercase ${color} opacity-80`}>{estado}</span>
        </div>
        <p className="text-xs text-slate-600 mt-2 max-w-xl">{recomendacion}</p>
      </div>
      {fitPuestoData && (
        <div className={`rounded-xl px-4 py-3 ${fitPuestoData.bg} border border-current/10`}>
          <p className="text-[10px] uppercase tracking-widest font-black opacity-70">Fit del Puesto</p>
          <p className={`text-lg font-black ${fitPuestoData.color}`}>{fitPuestoData.nivel}</p>
        </div>
      )}
    </div>
  );
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
  const [errorPerfil, setErrorPerfil] = useState(null);
  const [incidenciasActuales, setIncidenciasActuales] = useState(null);
  const [puntajeVisibleActual, setPuntajeVisibleActual] = useState(null);
  const [datosGrafico, setDatosGrafico] = useState([]);

  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [competenciasGenerales, setCompetenciasGenerales] = useState([]);
  const [competenciasPuesto, setCompetenciasPuesto] = useState([]);

  const [periodoCompetencias, setPeriodoCompetencias] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  const periodoActual = useMemo(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // ═══ ÍNDICE DE APTITUD (corregida validación) ═══
  const indiceAptitud = useMemo(() => {
    if (puntajeVisibleActual === null || puntajeVisibleActual === undefined) return null;
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

  const promedioGen = useMemo(() => promedioCompetencias(competenciasGenerales), [competenciasGenerales]);
  const promedioPue = useMemo(() => promedioCompetencias(competenciasPuesto), [competenciasPuesto]);
  const fitPuestoData = useMemo(() => getFitPuesto(promedioGen, promedioPue, puntajeVisibleActual), [promedioGen, promedioPue, puntajeVisibleActual]);

  // ═══ CARGA INICIAL ═══
  useEffect(() => {
    const cargarListas = async () => {
      try {
        const [empRes, locRes] = await Promise.all([
          supabase.from('empleados').select('*, horarios(id, nombre, tipo, hora_entrada, hora_salida, dias_trabajo, descansos)').order('apellido', { ascending: true }),
          supabase.from('locadores').select('*').eq('estado', 'activo').order('apellido', { ascending: true })
        ]);
        if (empRes.error) throw empRes.error;
        if (locRes.error) throw locRes.error;
        setEmpleados(empRes.data || []);
        setLocadores(locRes.data || []);
      } catch (error) {
        console.error("Error cargando listas:", error);
        setErrorPerfil("No se pudieron cargar las listas de colaboradores.");
      }
    };
    cargarListas();
  }, []);

  // ═══ CALCULAR INCIDENCIAS DESDE ASISTENCIA ═══
  const calcularIncidenciasDesdeAsistencia = useCallback(async (empleadoId, mes) => {
    const primerDia = `${mes}-01`;
    const ultimoDia = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);
    const { data: asistenciasData, error } = await supabase
      .from('asistencia')
      .select('*')
      .eq('empleado_id', empleadoId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);
    if (error) throw error;
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

  // ═══ CARGA DE COMPETENCIAS (corregida: recibe objeto persona) ═══
  const cargarCompetencias = async (persona, periodo) => {
    const personaId = persona.id;
    const cargo = persona.cargo || persona.modalidad || 'General';
    const nombresPuesto = getCompetenciasPorPuesto(cargo);

    const [compRes, puntRes] = await Promise.all([
      supabase.from('competencias').select('id, nombre, tipo'),
      supabase.from('colaborador_competencias').select('competencia_id, puntaje')
        .eq('empleado_id', personaId)
        .eq('periodo', periodo)
    ]);
    if (compRes.error) throw compRes.error;
    if (puntRes.error) throw puntRes.error;

    const competenciasData = compRes.data || [];
    const puntajesData = puntRes.data || [];

    const mapaPuntajes = {};
    puntajesData.forEach(p => { mapaPuntajes[p.competencia_id] = p.puntaje; });

    const genComp = [];
    const puestoComp = [];

    competenciasData.forEach(comp => {
      if (COMPETENCIAS_GENERALES_NOMBRES.includes(comp.nombre)) {
        genComp.push({
          nombre: comp.nombre,
          puntaje: mapaPuntajes[comp.id] ?? 0,
          max: 100
        });
      } else if (nombresPuesto.includes(comp.nombre)) {
        puestoComp.push({
          nombre: comp.nombre,
          puntaje: mapaPuntajes[comp.id] ?? 0,
          max: 100
        });
      }
    });

    // Asegurar listas completas
    const genNombresSet = new Set(genComp.map(c => c.nombre));
    COMPETENCIAS_GENERALES_NOMBRES.forEach(nombre => {
      if (!genNombresSet.has(nombre)) genComp.push({ nombre, puntaje: 0, max: 100 });
    });
    const puestoNombresSet = new Set(puestoComp.map(c => c.nombre));
    nombresPuesto.forEach(nombre => {
      if (!puestoNombresSet.has(nombre)) puestoComp.push({ nombre, puntaje: 0, max: 100 });
    });

    setCompetenciasGenerales(genComp);
    setCompetenciasPuesto(puestoComp);
  };

  // ═══ CARGA COMPLETA DE DATOS (refactorizada) ═══
  const cargarDatosPersona = useCallback(async (persona) => {
    if (!persona) return;
    const esPlanilla = tipoPersonal === 'planilla';
    const personaId = persona.id;
    try {
      // Evaluaciones
      const { data: evData, error: evError } = await supabase
        .from('evaluaciones')
        .select('*')
        .eq('empleado_id', personaId)
        .eq('tipo_persona', tipoPersonal)
        .order('mes', { ascending: false });
      if (evError) throw evError;
      setEvaluaciones(evData || []);

      // Vacaciones, descansos, asistencia
      if (esPlanilla) {
        const [vac, des, asis] = await Promise.all([
          supabase.from('vacaciones').select('*').eq('empleado_id', personaId).order('fecha_inicio', { ascending: false }),
          supabase.from('descansos_medicos').select('*').eq('empleado_id', personaId).order('fecha', { ascending: false }),
          supabase.from('asistencia').select('*').eq('empleado_id', personaId).order('fecha', { ascending: false })
        ]);
        if (vac.error) throw vac.error;
        if (des.error) throw des.error;
        if (asis.error) throw asis.error;
        setVacaciones(vac.data || []);
        setDescansos(des.data || []);
        setAsistencias(asis.data || []);
      } else {
        setVacaciones([]);
        setDescansos([]);
        setAsistencias([]);
      }

      await asegurarCompetenciasExisten();
      await cargarCompetencias(persona, periodoCompetencias);

      // Puntaje mensual
      if (esPlanilla) {
        const incidencias = await calcularIncidenciasDesdeAsistencia(personaId, periodoActual);
        const evaluacionMes = (evData || []).find(e => e.mes === periodoActual);
        const neto = calcularPuntajeNeto({ ...incidencias, asist_perfecta: evaluacionMes?.asist_perfecta || false });
        setIncidenciasActuales(incidencias);
        setPuntajeVisibleActual(puntajeVisible(neto));
      } else {
        const evaluacionMes = (evData || []).find(e => e.mes === periodoActual);
        setIncidenciasActuales({ tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0, falta_feriado: 0 });
        setPuntajeVisibleActual(evaluacionMes ? puntajeVisible(evaluacionMes.punt_final) : 100);
      }
      setErrorPerfil(null);
    } catch (error) {
      console.error("Error cargando perfil:", error);
      setErrorPerfil("No se pudo cargar el expediente. Intente actualizar nuevamente.");
    }
  }, [tipoPersonal, periodoActual, periodoCompetencias, calcularIncidenciasDesdeAsistencia]);

  // ═══ REACCIONES ═══
  useEffect(() => {
    if (personaSeleccionada) {
      cargarCompetencias(personaSeleccionada, periodoCompetencias);
    }
  }, [periodoCompetencias]);

  useEffect(() => {
    if (personaSeleccionada) {
      setCargando(true);
      cargarDatosPersona(personaSeleccionada).finally(() => setCargando(false));
    }
  }, [personaSeleccionada, cargarDatosPersona]);

  // ═══ GRÁFICO DE EVOLUCIÓN ═══
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
        puntos.push({ mes: m.label, puntaje: 100 });
      }
    }
    setDatosGrafico(puntos);
  }, [personaSeleccionada, tipoPersonal, evaluaciones, calcularIncidenciasDesdeAsistencia]);

  useEffect(() => {
    prepararGrafico();
  }, [prepararGrafico]);

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

  if (errorPerfil && !personaSeleccionada) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {errorPerfil}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 p-4 sm:p-6 lg:p-8">
      {/* Header mejorado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Expediente Corporativo</h2>
          <p className="text-slate-400 text-xs sm:text-sm">Perfil ejecutivo del talento humano</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex gap-2">
            <button
              onClick={() => { setTipoPersonal('planilla'); setPersonaSeleccionada(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tipoPersonal === 'planilla' ? 'bg-[#11284e] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Planilla
            </button>
            <button
              onClick={() => { setTipoPersonal('complementario'); setPersonaSeleccionada(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tipoPersonal === 'complementario' ? 'bg-[#11284e] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Complementarios
            </button>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={refrescarDatos} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all">🔄 Actualizar</button>
            <select
              value={personaSeleccionada?.id ? String(personaSeleccionada.id) : ''}
              onChange={(e) =>
                setPersonaSeleccionada(personas.find(p => String(p.id) === e.target.value) || null)
              }
              className="w-full sm:w-72 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#11284e] transition-all outline-none"
            >
              <option value="">Seleccionar {tipoPersonal === 'planilla' ? 'Colaborador...' : 'Complementario...'}</option>
              {personas.map(p => (
                <option key={p.id} value={String(p.id)}>{p.apellido} {p.nombre}{p.cargo ? ` — ${p.cargo}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error inline */}
      {errorPerfil && personaSeleccionada && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorPerfil}
          <button onClick={refrescarDatos} className="ml-4 underline font-bold">Reintentar</button>
        </div>
      )}

      {personaSeleccionada ? (
        <>
          {/* Nivel 2: Resumen superior ejecutivo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
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

            {/* Gráfico de evolución */}
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

          {/* Nivel 3: Mapa de Encaje del Colaborador */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4">
              <RadarCompetenciasCard
                titulo="Competencias Generales"
                subtitulo="Base cultural"
                datos={competenciasGenerales}
                colorStroke="#11284e"
                fillColor="#11284e"
                fillOpacity={0.15}
              />
            </div>
            <div className="xl:col-span-4 flex flex-col">
              <Perfil360Centro
                persona={personaSeleccionada}
                scoreVisible={puntajeVisibleActual ?? '—'}
                clasifActual={clasifActual}
                fitPuestoData={fitPuestoData}
                promedioGen={promedioGen}
                promedioPuesto={promedioPue}
                competenciasGen={competenciasGenerales}
                competenciasPuesto={competenciasPuesto}
              />
            </div>
            <div className="xl:col-span-4">
              <RadarCompetenciasCard
                titulo="Competencias del Puesto"
                subtitulo={personaSeleccionada?.cargo || personaSeleccionada?.modalidad || 'General'}
                datos={competenciasPuesto}
                colorStroke="#2563eb"
                fillColor="#3b82f6"
                fillOpacity={0.15}
              />
            </div>
          </div>

          {/* Nivel 4: Resumen de decisión */}
          <DecisionSummary indiceAptitud={indiceAptitud} fitPuestoData={fitPuestoData} />

          {/* Nivel 5: Historial operativo */}
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
                  <span className="text-xs font-bold uppercase tracking-widest">Cargando expediente...</span>
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
          <div className="text-6xl mb-4 text-slate-300">🧑‍💼</div>
          <p className="text-slate-500 font-medium text-lg">Seleccione un colaborador</p>
          <p className="text-slate-400 text-sm mt-1">El expediente corporativo mostrará desempeño, competencias, historial e índice de aptitud laboral.</p>
        </div>
      )}
    </div>
  );
}