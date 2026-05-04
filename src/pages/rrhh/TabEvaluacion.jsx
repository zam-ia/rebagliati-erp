// src/pages/rrhh/TabEvaluacion.jsx
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

// REGLAS DE NEGOCIO (Base 0)
const REGLAS = [
  { concepto: 'Puntaje base inicial', puntos: 0, tipo: 'base' },
  { concepto: 'Tardanza leve', puntos: -1, tipo: 'descuento' },
  { concepto: 'Tardanza grave', puntos: -2, tipo: 'descuento' },
  { concepto: 'Permiso sin justificar', puntos: -3, tipo: 'descuento' },
  { concepto: 'Falta injustificada', puntos: -5, tipo: 'descuento' },
  { concepto: 'Falta post-feriado', puntos: -6, tipo: 'descuento' },
  { concepto: 'Asistencia perfecta mensual', puntos: +5, tipo: 'bono' },
];

const OBSERVACIONES_CUALITATIVAS = [
  "Seleccionar una observación...",
  "Cumple funciones asignadas, con oportunidades de mejora en iniciativa",
  "Requiere mayor participación o generación de propuestas",
  "Presenta dificultades en la resolución autónoma de tareas",
  "Nivel de proactividad por desarrollar",
  "Cumplimiento adecuado, con margen de mejora en análisis y criterio",
  "Desempeño sobresaliente y proactivo"
];

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
  return 100 + neto;
}

function getClasificacion(visible) {
  if (visible >= 95) return { texto: 'Excelente', colorClase: 'text-emerald-700', bgClase: 'bg-emerald-50 border-emerald-200' };
  if (visible >= 80) return { texto: 'Regular', colorClase: 'text-amber-600', bgClase: 'bg-amber-50 border-amber-200' };
  return { texto: 'Bajo Desempeño', colorClase: 'text-rose-700', bgClase: 'bg-rose-50 border-rose-200' };
}

function getInitials(nombre, apellido) {
  return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
}

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

export default function TabEvaluacion() {
  const [vista, setVista] = useState('mensual');
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [mesSelec, setMesSelec] = useState(MES_ACTUAL);
  const [modalEv, setModalEv] = useState(null);
  const [historico, setHistorico] = useState({});
  const [form, setForm] = useState({
    tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0, falta_feriado: 0,
    asist_perfecta: false,
    observaciones: '', detalle_extra: ''
  });
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState([]);
  const [incidenciasCache, setIncidenciasCache] = useState({});

  // ── Estados para competencias ────────────────────────────────────────────
  const [empleadoCompSeleccionado, setEmpleadoCompSeleccionado] = useState(null);
  const [tipoPersonalComp, setTipoPersonalComp] = useState('planilla');
  const [periodoComp, setPeriodoComp] = useState(MES_ACTUAL);
  const [puntajesCompetencias, setPuntajesCompetencias] = useState({});
  const [cargandoCompetencias, setCargandoCompetencias] = useState(false);

  // ── Estados para autoevaluación ──────────────────────────────────────────
  const [tipoPersonalAuto, setTipoPersonalAuto] = useState('planilla');
  const [personaAutoSeleccionada, setPersonaAutoSeleccionada] = useState(null);
  const [periodoAuto, setPeriodoAuto] = useState(MES_ACTUAL);
  const [tokenGenerado, setTokenGenerado] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [cargandoAuto, setCargandoAuto] = useState(false);

  // ═══ TIPO DE PERSONAL PARA AUDITORÍA MENSUAL, RANKING E HISTÓRICO ═══
  const [tipoPersonalMensual, setTipoPersonalMensual] = useState('planilla');

  // Cargar empleados, locadores y evaluaciones
  const cargarDatosBase = async () => {
    setCargando(true);
    const [empRes, locRes, evRes] = await Promise.all([
      supabase.from('empleados').select('*'),
      supabase.from('locadores').select('*').eq('estado', 'activo'),
      supabase.from('evaluaciones').select('*').eq('mes', mesSelec)
    ]);
    setEmpleados(empRes.data || []);
    setLocadores(locRes.data || []);
    setEvaluaciones(evRes.data || []);
    setCargando(false);
  };

  useEffect(() => { cargarDatosBase(); }, [mesSelec]);

  // Cargar histórico (puntajes guardados por mes)
  const cargarHistorico = async () => {
    const { data } = await supabase.from('evaluaciones').select('empleado_id, mes, punt_final, tipo_persona');
    const agrupado = {};
    data?.forEach(ev => {
      if (!agrupado[ev.empleado_id]) agrupado[ev.empleado_id] = {};
      agrupado[ev.empleado_id][ev.mes.slice(5)] = ev.punt_final;
    });
    setHistorico(agrupado);
  };
  useEffect(() => { cargarHistorico(); }, []);

  const calcularIncidenciasDesdeAsistencia = useCallback(async (empleadoId) => {
    if (incidenciasCache[empleadoId]) return incidenciasCache[empleadoId];
    const primerDia = `${mesSelec}-01`;
    const ultimoDia = new Date(mesSelec.split('-')[0], mesSelec.split('-')[1], 0).toISOString().slice(0, 10);
    const { data: asistencias } = await supabase
      .from('asistencia')
      .select('*')
      .eq('empleado_id', empleadoId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);
    let tard_leve = 0, tard_grave = 0, falta_inj = 0, permiso_sj = 0, falta_feriado = 0;
    asistencias?.forEach(reg => {
      if (reg.tardanza && !reg.justificacion) {
        const minutos = reg.minutos || 0;
        if (minutos <= 15) tard_leve++;
        else tard_grave++;
      }
      if (reg.falta && !reg.justificacion) falta_inj++;
    });
    const resultado = { tard_leve, tard_grave, falta_inj, permiso_sj, falta_feriado };
    setIncidenciasCache(prev => ({ ...prev, [empleadoId]: resultado }));
    return resultado;
  }, [mesSelec, incidenciasCache]);

  const construirDatos = useCallback(async () => {
    const nuevosDatos = [];
    for (const emp of empleados) {
      const incidencias = await calcularIncidenciasDesdeAsistencia(emp.id);
      const ev = evaluaciones.find(e => e.empleado_id === emp.id && e.tipo_persona === 'planilla');
      const neto = calcularPuntajeNeto({ ...incidencias, asist_perfecta: ev?.asist_perfecta || false });
      const visible = puntajeVisible(neto);
      nuevosDatos.push({
        ...emp,
        ...ev,
        empleado_real_id: emp.id,
        id: emp.id,
        evaluado: !!ev,
        puntaje_visible: visible,
        incidencias_reales: incidencias,
        observaciones: ev?.observaciones || '',
        asist_perfecta: ev?.asist_perfecta || false,
        detalle_extra: ev?.detalle_extra || '',
        tipo_persona: 'planilla'
      });
    }
    setDatos(nuevosDatos);
  }, [empleados, evaluaciones, calcularIncidenciasDesdeAsistencia]);

  useEffect(() => { if (empleados.length) construirDatos(); }, [empleados, evaluaciones, construirDatos]);

  const refrescarDatos = () => {
    setIncidenciasCache({});
    construirDatos();
  };

  const guardarEvaluacion = async () => {
    if (!modalEv) return;
    const personaId = modalEv.id;
    const tipo = modalEv.tipo_persona || (tipoPersonalMensual === 'planilla' ? 'planilla' : 'complementario');
    
    // Si es planilla, calculamos incidencias reales, si es complementario, van en 0
    let incidencias;
    if (tipo === 'planilla') {
      incidencias = await calcularIncidenciasDesdeAsistencia(personaId);
    } else {
      incidencias = { tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0, falta_feriado: 0 };
    }
    
    const puntajeNeto = calcularPuntajeNeto({ ...incidencias, asist_perfecta: form.asist_perfecta });
    
    const registro = {
      empleado_id: personaId,
      empleado_nombre: `${modalEv.nombre} ${modalEv.apellido || ''}`.trim(),
      mes: mesSelec,
      area: modalEv.area || 'Complementario',
      tipo_persona: tipo,
      ...incidencias,
      asist_perfecta: form.asist_perfecta,
      observaciones: form.observaciones,
      detalle_extra: form.detalle_extra,
      punt_final: puntajeNeto,
    };
    
    const { error } = await supabase.from('evaluaciones').upsert(registro, { onConflict: 'empleado_id,mes,tipo_persona' });
    if (error) { alert('Error al guardar: ' + error.message); return; }
    setModalEv(null);
    setForm({ tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0, falta_feriado: 0, asist_perfecta: false, observaciones: '', detalle_extra: '' });
    await cargarDatosBase();
    await cargarHistorico();
    setIncidenciasCache({});
    construirDatos();
    alert('Evaluación guardada correctamente');
  };

  const abrirModalEvaluacion = async (personaData) => {
    const tipo = personaData.tipo_persona || (tipoPersonalMensual === 'planilla' ? 'planilla' : 'complementario');
    let incidencias;
    if (tipo === 'planilla') {
      incidencias = await calcularIncidenciasDesdeAsistencia(personaData.id);
    } else {
      incidencias = { tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0, falta_feriado: 0 };
    }
    setForm({
      tard_leve: incidencias.tard_leve,
      tard_grave: incidencias.tard_grave,
      falta_inj: incidencias.falta_inj,
      permiso_sj: incidencias.permiso_sj,
      falta_feriado: incidencias.falta_feriado,
      asist_perfecta: personaData.asist_perfecta || false,
      observaciones: personaData.observaciones || '',
      detalle_extra: personaData.detalle_extra || ''
    });
    setModalEv({ ...personaData, tipo_persona: tipo });
  };

  // ═══ LÓGICA DE COMPETENCIAS (evaluación manual por RRHH) ═══
  const cargarCompetenciasEmpleado = useCallback(async (personaId, periodo) => {
    setCargandoCompetencias(true);
    try {
      const { data: competenciasData } = await supabase.from('competencias').select('id, nombre, tipo, puesto');
      if (!competenciasData) return;
      const { data: puntajesExistentes } = await supabase
        .from('colaborador_competencias')
        .select('competencia_id, puntaje, observacion')
        .eq('empleado_id', personaId)
        .eq('periodo', periodo);
      const mapaPuntajes = {};
      puntajesExistentes?.forEach(p => { mapaPuntajes[p.competencia_id] = { puntaje: p.puntaje || '', observacion: p.observacion || '' }; });
      const nuevoPuntajes = {};
      competenciasData.forEach(comp => {
        nuevoPuntajes[comp.id] = {
          nombre: comp.nombre, tipo: comp.tipo, puesto: comp.puesto,
          puntaje: mapaPuntajes[comp.id]?.puntaje || '',
          observacion: mapaPuntajes[comp.id]?.observacion || ''
        };
      });
      setPuntajesCompetencias(nuevoPuntajes);
    } catch (err) { console.error('Error cargando competencias:', err); }
    finally { setCargandoCompetencias(false); }
  }, []);

  useEffect(() => {
    if (empleadoCompSeleccionado && periodoComp) {
      cargarCompetenciasEmpleado(empleadoCompSeleccionado.id, periodoComp);
    }
  }, [empleadoCompSeleccionado, periodoComp, cargarCompetenciasEmpleado]);

  const handlePuntajeChange = (competenciaId, value) => {
    const puntaje = value === '' ? '' : Math.min(100, Math.max(0, Number(value)));
    setPuntajesCompetencias(prev => ({ ...prev, [competenciaId]: { ...prev[competenciaId], puntaje } }));
  };
  const handleObservacionChange = (competenciaId, value) => {
    setPuntajesCompetencias(prev => ({ ...prev, [competenciaId]: { ...prev[competenciaId], observacion: value } }));
  };

  const guardarCompetencias = async () => {
    if (!empleadoCompSeleccionado) return;
    setCargandoCompetencias(true);
    try {
      const updates = Object.entries(puntajesCompetencias)
        .filter(([_, data]) => data.puntaje !== '' && !isNaN(data.puntaje))
        .map(([competenciaId, data]) => ({
          empleado_id: empleadoCompSeleccionado.id,
          competencia_id: competenciaId,
          periodo: periodoComp,
          puntaje: Number(data.puntaje),
          observacion: data.observacion || null
        }));
      if (updates.length === 0) { alert('Ingrese al menos un puntaje válido.'); return; }
      const { error } = await supabase.from('colaborador_competencias').upsert(updates, { onConflict: 'empleado_id,competencia_id,periodo' });
      if (error) throw error;
      alert('Competencias actualizadas correctamente');
    } catch (err) { alert('Error al guardar competencias: ' + err.message); }
    finally { setCargandoCompetencias(false); }
  };

  // ═══ LÓGICA DE AUTOEVALUACIÓN (generación de link corregida) ═══
  const generarLinkAutoevaluacion = async () => {
    if (!personaAutoSeleccionada) { alert('Seleccione un colaborador'); return; }
    setCargandoAuto(true);
    try {
      const token = crypto.randomUUID();
      const registro = {
        token,
        periodo: periodoAuto,
        usado: false,
        tipo_persona: tipoPersonalAuto,
        persona_id: personaAutoSeleccionada.id,
      };
      if (tipoPersonalAuto === 'planilla') {
        registro.empleado_id = personaAutoSeleccionada.id;
      } else {
        registro.locador_id = personaAutoSeleccionada.id;
      }
      const { error } = await supabase.from('evaluacion_tokens').insert(registro);
      if (error) throw error;
      setTokenGenerado(token);
      setLinkCopiado(false);
    } catch (err) { alert('Error al generar link: ' + err.message); }
    finally { setCargandoAuto(false); }
  };

  const copiarLink = () => {
    const link = `${window.location.origin}/#/evaluacion/${tokenGenerado}`;
    navigator.clipboard.writeText(link).then(() => setLinkCopiado(true));
  };

  // ═══ DATOS PARA TABLAS ═══
  const personasMensual = tipoPersonalMensual === 'planilla' ? empleados : locadores;
  const personasAuto = tipoPersonalAuto === 'planilla' ? empleados : locadores;
  const personasComp = tipoPersonalComp === 'planilla' ? empleados : locadores;

  // Combinar ranking con ambos grupos (planilla usa datos[] y complementarios usan evaluaciones de la tabla)
  const ranking = [
    ...datos.filter(d => d.evaluado).sort((a, b) => b.puntaje_visible - a.puntaje_visible),
    ...locadores
      .filter(loc => evaluaciones.some(ev => ev.empleado_id === loc.id && ev.tipo_persona === 'complementario'))
      .map(loc => {
        const ev = evaluaciones.find(e => e.empleado_id === loc.id && e.tipo_persona === 'complementario');
        return {
          ...loc,
          puntaje_visible: puntajeVisible(ev.punt_final),
          evaluado: true,
          area: 'Complementario',
          nombre: loc.nombre,
          apellido: loc.apellido
        };
      }),
    ...locadores
      .filter(loc => !evaluaciones.some(ev => ev.empleado_id === loc.id && ev.tipo_persona === 'complementario'))
      .map(loc => ({
        ...loc,
        puntaje_visible: null,
        evaluado: false,
        area: 'Complementario',
        nombre: loc.nombre,
        apellido: loc.apellido
      }))
  ].sort((a, b) => (b.puntaje_visible ?? 0) - (a.puntaje_visible ?? 0));

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-sans text-slate-800 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#11284e] to-[#185FA5] rounded-3xl p-8 md:p-10 mb-8 shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Gestión de <span className="text-[#7eb3f5]">Desempeño</span>
            </h2>
            <p className="text-white/70 mt-2 max-w-xl text-sm md:text-base leading-relaxed font-medium">
              Auditoría mensual, competencias y autoevaluaciones 360°
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={refrescarDatos} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-sm border border-white/10">
              🔄 Actualizar
            </button>
            <div className="bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10">
              <input type="month" value={mesSelec} onChange={e => setMesSelec(e.target.value)} className="bg-transparent border-none text-white px-4 py-2 outline-none cursor-pointer font-bold tracking-wider" style={{ colorScheme: 'dark' }} />
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-1 mb-8 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-blue-50 shadow-lg shadow-blue-100/20">
        {[
          ['mensual', 'Auditoría Mensual'],
          ['competencias', 'Competencias'],
          ['autoevaluacion', 'Autoevaluación 360°'],
          ['ranking', 'Boletín de Resultados'],
          ['historico', 'Histórico Anual'],
          ['reglas', 'Métricas Oficiales']
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={`text-xs px-5 py-2.5 font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${
              vista === id
                ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md shadow-blue-500/20'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* VISTA MENSUAL */}
      {vista === 'mensual' && (
        <div className="bg-white/80 backdrop-blur-sm border border-blue-50 rounded-3xl shadow-xl shadow-blue-100/20 overflow-hidden p-6">
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Tipo de personal</label>
            <div className="flex gap-2">
              <button onClick={() => setTipoPersonalMensual('planilla')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tipoPersonalMensual === 'planilla' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                🧑‍💼 Planilla
              </button>
              <button onClick={() => setTipoPersonalMensual('complementario')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tipoPersonalMensual === 'complementario' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                📋 Complementarios
              </button>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <th className="p-4 pl-8 text-[10px] font-black text-gray-400 uppercase tracking-wider">Colaborador</th>
                  {tipoPersonalMensual === 'planilla' ? (
                    <>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Área</th>
                      <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Incidencias</th>
                      <th className="p-4 w-1/4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Evaluación</th>
                      <th className="p-4 text-center w-32 text-[10px] font-black text-gray-400 uppercase tracking-wider">Rendimiento</th>
                      <th className="p-4 pr-8 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Gestión</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Modalidad</th>
                      <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Sueldo Base</th>
                      <th className="p-4 text-center w-32 text-[10px] font-black text-gray-400 uppercase tracking-wider">Rendimiento</th>
                      <th className="p-4 pr-8 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Gestión</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tipoPersonalMensual === 'planilla' ? (
                  datos.map(d => {
                    const visible = d.puntaje_visible;
                    const clasif = getClasificacion(visible);
                    const totalIncidencias = (d.incidencias_reales?.tard_leve||0)+(d.incidencias_reales?.tard_grave||0)+(d.incidencias_reales?.falta_inj||0)+(d.incidencias_reales?.falta_feriado||0)+(d.incidencias_reales?.permiso_sj||0);
                    return (
                      <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="p-4 pl-8">
                          <div className="flex items-center gap-3">
                            {d.foto_url ? <img src={d.foto_url} className="w-9 h-9 rounded-xl object-cover shadow-sm border border-white" /> : <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-[#185FA5] flex items-center justify-center text-xs font-bold shadow-inner">{getInitials(d.nombre, d.apellido)}</div>}
                            <div>
                              <div className="font-bold text-gray-800 text-xs">{d.nombre} {d.apellido}</div>
                              {!d.evaluado && <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">provisional</span>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">{d.area}</span></td>
                        <td className="p-4 text-center text-gray-500 font-mono text-xs">{totalIncidencias === 0 ? <span className="text-emerald-500 font-bold">Sin faltas</span> : `${totalIncidencias} reg.`}</td>
                        <td className="p-4">{d.observaciones && d.observaciones !== "Seleccionar una observación..." ? <p className="text-[11px] leading-tight text-gray-500 italic line-clamp-2" title={d.observaciones}>"{d.observaciones}"</p> : <span className="text-[11px] text-gray-300">—</span>}</td>
                        <td className="p-4"><div className={`flex flex-col items-center justify-center border rounded-xl py-1.5 px-2 ${clasif.bgClase}`}><span className={`text-sm font-black ${clasif.colorClase}`}>{visible} pts</span><span className={`text-[9px] uppercase tracking-widest font-bold ${clasif.colorClase} opacity-80`}>{clasif.texto}</span></div></td>
                        <td className="p-4 pr-8 text-right"><button onClick={() => abrirModalEvaluacion(d)} className="text-[11px] font-bold text-[#185FA5] uppercase tracking-widest hover:underline">{d.evaluado ? 'Editar' : 'Evaluar'}</button></td>
                      </tr>
                    );
                  })
                ) : (
                  locadores.map(loc => {
                    const ev = evaluaciones.find(e => e.empleado_id === loc.id && e.tipo_persona === 'complementario');
                    const visible = ev ? puntajeVisible(ev.punt_final) : null;
                    const clasif = visible !== null ? getClasificacion(visible) : null;
                    return (
                      <tr key={loc.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="p-4 pl-8"><div className="flex items-center gap-3">{loc.foto_url ? <img src={loc.foto_url} className="w-9 h-9 rounded-xl object-cover shadow-sm border border-white" /> : <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-[#185FA5] flex items-center justify-center text-xs font-bold shadow-inner">{getInitials(loc.nombre, loc.apellido)}</div>}<div><div className="font-bold text-gray-800 text-xs">{loc.nombre} {loc.apellido}</div></div></div></td>
                        <td className="p-4"><span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">{loc.modalidad}</span></td>
                        <td className="p-4 text-right font-bold text-gray-700 text-xs">S/ {Number(loc.sueldo_base || 0).toLocaleString('es-PE')}</td>
                        <td className="p-4">
                          {visible !== null && clasif ? (
                            <div className={`flex flex-col items-center justify-center border rounded-xl py-1.5 px-2 ${clasif.bgClase}`}>
                              <span className={`text-sm font-black ${clasif.colorClase}`}>{visible} pts</span>
                              <span className={`text-[9px] uppercase tracking-widest font-bold ${clasif.colorClase} opacity-80`}>{clasif.texto}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-4 pr-8 text-right">
                          <button
                            onClick={() => abrirModalEvaluacion({ ...loc, area: 'Complementario', tipo_persona: 'complementario', puntaje_visible: visible, observaciones: ev?.observaciones || '', asist_perfecta: ev?.asist_perfecta || false, detalle_extra: ev?.detalle_extra || '' })}
                            className="text-[11px] font-bold text-[#185FA5] uppercase tracking-widest hover:underline"
                          >
                            {ev ? 'Editar' : 'Evaluar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA COMPETENCIAS */}
      {vista === 'competencias' && (
        <div className="bg-white/80 backdrop-blur-sm border border-blue-50 rounded-3xl shadow-xl shadow-blue-100/20 overflow-hidden p-6">
          <h3 className="text-lg font-black text-[#0B1527] mb-6">Evaluación por Competencias</h3>
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Tipo de personal</label>
            <div className="flex gap-2">
              <button onClick={() => { setTipoPersonalComp('planilla'); setEmpleadoCompSeleccionado(null); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tipoPersonalComp === 'planilla' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🧑‍💼 Planilla</button>
              <button onClick={() => { setTipoPersonalComp('complementario'); setEmpleadoCompSeleccionado(null); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tipoPersonalComp === 'complementario' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📋 Complementarios</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div><label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Colaborador</label><select value={empleadoCompSeleccionado?.id || ''} onChange={(e) => setEmpleadoCompSeleccionado(personasComp.find(p => p.id === e.target.value))} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"><option value="">Seleccionar...</option>{personasComp.map(p => (<option key={p.id} value={p.id}>{p.apellido} {p.nombre} {p.cargo ? `— ${p.cargo}` : ''}</option>))}</select></div>
            <div><label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Periodo</label><input type="month" value={periodoComp} onChange={(e) => setPeriodoComp(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" /></div>
          </div>
          {empleadoCompSeleccionado ? (
            <>
              <div className="space-y-6">
                <div><h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">🧠 Competencias Generales</h4><div className="space-y-3">{Object.entries(puntajesCompetencias).filter(([_, data]) => data.tipo === 'general').map(([id, data]) => (<div key={id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl"><span className="w-48 text-sm font-medium text-gray-700">{data.nombre}</span><input type="number" min="0" max="100" value={data.puntaje} onChange={(e) => handlePuntajeChange(id, e.target.value)} className="w-20 border-2 border-gray-100 rounded-lg px-3 py-2 text-sm text-center font-bold focus:border-blue-500 outline-none bg-white" placeholder="0-100" /><input type="text" value={data.observacion} onChange={(e) => handleObservacionChange(id, e.target.value)} className="flex-1 border-2 border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 bg-white" placeholder="Observación (opcional)" /></div>))}</div></div>
                <div><h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">💼 Competencias del Puesto: {empleadoCompSeleccionado.cargo || empleadoCompSeleccionado.modalidad || 'General'}</h4><div className="space-y-3">{Object.entries(puntajesCompetencias).filter(([_, data]) => data.tipo === 'especifica').map(([id, data]) => (<div key={id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl"><span className="w-48 text-sm font-medium text-gray-700">{data.nombre}</span><input type="number" min="0" max="100" value={data.puntaje} onChange={(e) => handlePuntajeChange(id, e.target.value)} className="w-20 border-2 border-gray-100 rounded-lg px-3 py-2 text-sm text-center font-bold focus:border-blue-500 outline-none bg-white" placeholder="0-100" /><input type="text" value={data.observacion} onChange={(e) => handleObservacionChange(id, e.target.value)} className="flex-1 border-2 border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 bg-white" placeholder="Observación (opcional)" /></div>))}</div></div>
              </div>
              <div className="mt-8 flex justify-end"><button onClick={guardarCompetencias} disabled={cargandoCompetencias} className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-8 py-3.5 rounded-xl font-bold hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-[0.98]">{cargandoCompetencias ? 'Guardando...' : 'Guardar Competencias'}</button></div>
            </>
          ) : (<div className="text-center py-12 text-gray-400">Seleccione un colaborador para evaluar sus competencias.</div>)}
        </div>
      )}

      {/* VISTA: AUTOEVALUACIÓN 360° */}
      {vista === 'autoevaluacion' && (
        <div className="bg-white/80 backdrop-blur-sm border border-blue-50 rounded-3xl shadow-xl shadow-blue-100/20 overflow-hidden p-6">
          <h3 className="text-lg font-black text-[#0B1527] mb-6">Autoevaluación 360° (Link para colaborador)</h3>
          <p className="text-sm text-gray-500 mb-6">Genere un enlace único para que el colaborador complete su autoevaluación de competencias. El enlace es personal e intransferible.</p>
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Tipo de personal</label>
            <div className="flex gap-2">
              <button onClick={() => { setTipoPersonalAuto('planilla'); setPersonaAutoSeleccionada(null); setTokenGenerado(null); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tipoPersonalAuto === 'planilla' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🧑‍💼 Planilla</button>
              <button onClick={() => { setTipoPersonalAuto('complementario'); setPersonaAutoSeleccionada(null); setTokenGenerado(null); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tipoPersonalAuto === 'complementario' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📋 Complementarios</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div><label className="block text-xs font-bold text-gray-500 mb-2 uppercase">{tipoPersonalAuto === 'planilla' ? 'Colaborador (Planilla)' : 'Complementario'}</label><select value={personaAutoSeleccionada?.id || ''} onChange={(e) => { const persona = personasAuto.find(p => p.id === e.target.value); setPersonaAutoSeleccionada(persona); setTokenGenerado(null); }} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"><option value="">Seleccionar...</option>{personasAuto.map(p => (<option key={p.id} value={p.id}>{p.apellido} {p.nombre} {p.cargo ? `— ${p.cargo}` : ''}</option>))}</select></div>
            <div><label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Periodo</label><input type="month" value={periodoAuto} onChange={(e) => setPeriodoAuto(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" /></div>
          </div>
          <button onClick={generarLinkAutoevaluacion} disabled={cargandoAuto || !personaAutoSeleccionada} className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-6 py-3.5 rounded-xl font-bold hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-[0.98] mb-6">{cargandoAuto ? 'Generando...' : 'Generar Link de Autoevaluación'}</button>
          {tokenGenerado && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <p className="text-sm font-bold text-emerald-800 mb-2">✅ Link generado exitosamente</p>
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-emerald-100">
                <input type="text" readOnly value={`${window.location.origin}/#/evaluacion/${tokenGenerado}`} className="flex-1 text-sm text-gray-700 bg-transparent outline-none" />
                <button onClick={copiarLink} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors">{linkCopiado ? '¡Copiado!' : 'Copiar enlace'}</button>
              </div>
              <p className="text-xs text-emerald-700 mt-3">Comparta este enlace con el colaborador. Una vez completada la evaluación, los resultados se reflejarán automáticamente en su Perfil 360°.</p>
            </div>
          )}
        </div>
      )}

      {/* VISTA RANKING */}
      {vista === 'ranking' && (
        <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border border-blue-50 rounded-3xl shadow-xl shadow-blue-100/20 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100 text-center">
            <h3 className="text-lg font-black text-[#11284e]">Boletín de Resultados - {mesSelec}</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">Reconocimiento y métricas de desempeño del equipo</p>
          </div>
          <div className="divide-y divide-gray-50">
            {ranking.map((e, i) => {
              const visible = e.puntaje_visible;
              const clasif = visible !== null ? getClasificacion(visible) : null;
              return (
                <div key={e.id} className="flex items-center gap-5 p-5 hover:bg-blue-50/30 transition-colors">
                  <div className="w-8 text-center font-black text-gray-300 text-xl">#{i + 1}</div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-500 overflow-hidden shadow-inner">
                    {e.foto_url ? <img src={e.foto_url} className="w-full h-full object-cover" /> : getInitials(e.nombre, e.apellido)}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-sm">{e.nombre} {e.apellido}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{e.area}</div>
                  </div>
                  <div className={`text-xl font-black ${clasif ? clasif.colorClase : 'text-gray-400'}`}>
                    {visible !== null ? <>{visible} <span className="text-[10px] text-gray-400 font-normal">pts</span></> : '—'}
                  </div>
                </div>
              );
            })}
            {ranking.length === 0 && <div className="p-10 text-center text-gray-400">Aún no hay evaluaciones registradas en este periodo.</div>}
          </div>
        </div>
      )}

      {/* VISTA HISTÓRICO */}
      {vista === 'historico' && (
        <div className="bg-white/80 backdrop-blur-sm border border-blue-50 rounded-3xl shadow-xl shadow-blue-100/20 overflow-x-auto p-4">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="p-4">Colaborador</th>
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(m => (<th key={m} className="p-3 text-center">{m}</th>))}
                <th className="p-4 text-center text-[#185FA5] font-bold bg-gray-50 rounded-tr-xl">Prom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {empleados.map(e => {
                const scoresNeto = ['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => historico[e.id]?.[m] || null);
                const scoresVisible = scoresNeto.map(n => n !== null ? puntajeVisible(n) : null);
                const valid = scoresVisible.filter(s => s !== null);
                const prom = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                const clasifProm = prom !== null ? getClasificacion(prom) : null;
                return (
                  <tr key={e.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-700 text-xs">{e.nombre} {e.apellido?.split(' ')[0]}</td>
                    {scoresVisible.map((s, idx) => (<td key={idx} className="p-3 text-center">{s !== null ? <span className={`text-xs font-bold ${getClasificacion(s).colorClase}`}>{s}</span> : <span className="text-gray-200">—</span>}</td>))}
                    <td className="p-4 text-center font-black bg-gray-50">{prom !== null ? <span className={clasifProm.colorClase}>{prom}</span> : <span className="text-gray-300">—</span>}</td>
                  </tr>
                );
              })}
              {locadores.map(loc => {
                const scoresNeto = ['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => historico[loc.id]?.[m] || null);
                const scoresVisible = scoresNeto.map(n => n !== null ? puntajeVisible(n) : null);
                const valid = scoresVisible.filter(s => s !== null);
                const prom = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                const clasifProm = prom !== null ? getClasificacion(prom) : null;
                return (
                  <tr key={loc.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-700 text-xs">{loc.nombre} {loc.apellido?.split(' ')[0]} <span className="text-[9px] text-purple-500 ml-1">(Compl.)</span></td>
                    {scoresVisible.map((s, idx) => (<td key={idx} className="p-3 text-center">{s !== null ? <span className={`text-xs font-bold ${getClasificacion(s).colorClase}`}>{s}</span> : <span className="text-gray-200">—</span>}</td>))}
                    <td className="p-4 text-center font-black bg-gray-50">{prom !== null ? <span className={clasifProm.colorClase}>{prom}</span> : <span className="text-gray-300">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VISTA REGLAS */}
      {vista === 'reglas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm border border-blue-50 rounded-3xl shadow-xl shadow-blue-100/20 p-8">
            <h3 className="text-lg font-black text-[#0B1527] mb-6">Sistema de Puntaje</h3>
            <div className="divide-y divide-gray-100">
              {REGLAS.map(r => (
                <div key={r.concepto} className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-600 font-medium">{r.concepto}</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${r.tipo === 'bono' ? 'bg-emerald-50 text-emerald-700' : r.tipo === 'base' ? 'bg-gray-100 text-gray-600' : 'bg-rose-50 text-rose-700'}`}>
                    {r.puntos > 0 ? '+' : ''}{r.puntos} pts
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 italic">El puntaje base es 100. Se aplican descuentos y bonos para obtener el resultado final.</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm border border-blue-50 rounded-3xl shadow-xl shadow-blue-100/20 p-8">
            <h3 className="text-lg font-black text-[#0B1527] mb-6">Clasificación de Desempeño</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="flex justify-between items-center mb-1"><span className="font-bold text-emerald-800">Excelente</span><span className="text-xs font-black text-emerald-600">95 pts o más</span></div>
                <p className="text-xs text-emerald-700/80">Prioridad en premiaciones, bonos y asignación de vacaciones.</p>
              </div>
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                <div className="flex justify-between items-center mb-1"><span className="font-bold text-amber-800">Regular</span><span className="text-xs font-black text-amber-600">80 a 94 pts</span></div>
                <p className="text-xs text-amber-700/80">Desempeño estándar. Requiere seguimiento en áreas de mejora.</p>
              </div>
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50">
                <div className="flex justify-between items-center mb-1"><span className="font-bold text-rose-800">Bajo Desempeño</span><span className="text-xs font-black text-rose-600">Menos de 80 pts</span></div>
                <p className="text-xs text-rose-700/80">Requiere intervención de RRHH y planes de acción inmediatos.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EVALUACIÓN MENSUAL */}
      {modalEv && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-[#11284e] text-lg">Evaluación de Desempeño</h3>
                <p className="text-xs text-gray-500 mt-1 font-medium">{modalEv.nombre} {modalEv.apellido} • {modalEv.area}</p>
              </div>
              <button onClick={() => setModalEv(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#11284e] mb-4 border-b border-gray-100 pb-2">Incidencias del mes</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between bg-gray-50 p-2 rounded-lg"><span>Tardanzas leves (≤15 min):</span><span className="font-bold">{form.tard_leve}</span></div>
                    <div className="flex justify-between bg-gray-50 p-2 rounded-lg"><span>Tardanzas graves ({'>'} 15 min):</span><span className="font-bold">{form.tard_grave}</span></div>
                    <div className="flex justify-between bg-gray-50 p-2 rounded-lg"><span>Faltas injustificadas:</span><span className="font-bold">{form.falta_inj}</span></div>
                    <div className="flex justify-between bg-gray-50 p-2 rounded-lg"><span>Permisos sin justificar:</span><span className="font-bold">{form.permiso_sj}</span></div>
                    <div className="flex justify-between bg-gray-50 p-2 rounded-lg"><span>Ausencia post-feriado:</span><span className="font-bold">{form.falta_feriado}</span></div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Estos valores se calculan automáticamente desde las novedades registradas.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#11284e] mb-4 border-b border-gray-100 pb-2">Evaluación Cualitativa</h4>
                    <select value={form.observaciones} onChange={e => setForm(f => ({...f, observaciones: e.target.value}))} className="w-full border-2 border-gray-100 rounded-xl p-3 text-xs font-medium text-gray-700 bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all mb-3">
                      {OBSERVACIONES_CUALITATIVAS.map(obs => <option key={obs} value={obs}>{obs}</option>)}
                    </select>
                    <textarea rows={3} placeholder="Detalles adicionales (opcional)..." value={form.detalle_extra} onChange={e => setForm(f => ({...f, detalle_extra: e.target.value}))} className="w-full border-2 border-gray-100 rounded-xl p-3 text-xs bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none" />
                  </div>
                  <div className="flex items-center gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <input type="checkbox" checked={form.asist_perfecta} onChange={e => setForm(f => ({...f, asist_perfecta: e.target.checked}))} className="w-5 h-5 rounded text-emerald-600 border-gray-300" />
                    <div><span className="text-xs font-bold text-emerald-800 block">Asistencia Perfecta</span><span className="text-[10px] font-bold text-emerald-600">+5 pts al total</span></div>
                  </div>
                  <div className={`mt-auto p-6 rounded-2xl border text-center transition-colors ${getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).bgClase}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Resultado del Mes</span>
                    <div className={`text-4xl font-black mb-1 ${getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).colorClase}`}>{puntajeVisible(calcularPuntajeNeto(form))} <span className="text-lg font-bold opacity-60">pts</span></div>
                    <span className={`inline-block px-3 py-1 bg-white/50 rounded-lg text-xs font-black uppercase tracking-widest ${getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).colorClase}`}>{getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).texto}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 rounded-b-3xl">
              <button onClick={() => setModalEv(null)} className="px-6 py-4 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-800 border-2 border-gray-200 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={guardarEvaluacion} className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-4 rounded-xl font-bold hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">Guardar Evaluación Mensual</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}