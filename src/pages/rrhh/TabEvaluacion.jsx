import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

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

  // Cargar empleados y evaluaciones
  const cargarDatosBase = async () => {
    setCargando(true);
    const [empRes, evRes] = await Promise.all([
      supabase.from('empleados').select('*'),
      supabase.from('evaluaciones').select('*').eq('mes', mesSelec)
    ]);
    setEmpleados(empRes.data || []);
    setEvaluaciones(evRes.data || []);
    setCargando(false);
  };

  useEffect(() => { cargarDatosBase(); }, [mesSelec]);

  // Cargar histórico (puntajes guardados por mes)
  const cargarHistorico = async () => {
    const { data } = await supabase.from('evaluaciones').select('empleado_id, mes, punt_final');
    const agrupado = {};
    data?.forEach(ev => {
      if (!agrupado[ev.empleado_id]) agrupado[ev.empleado_id] = {};
      agrupado[ev.empleado_id][ev.mes.slice(5)] = ev.punt_final;
    });
    setHistorico(agrupado);
  };
  useEffect(() => { cargarHistorico(); }, []);

  // Calcular incidencias reales desde asistencia (con caché)
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

  // Construir datos para la tabla (puntaje en tiempo real)
  const construirDatos = useCallback(async () => {
    const nuevosDatos = [];
    for (const emp of empleados) {
      const incidencias = await calcularIncidenciasDesdeAsistencia(emp.id);
      const ev = evaluaciones.find(e => e.empleado_id === emp.id);
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
        detalle_extra: ev?.detalle_extra || ''
      });
    }
    setDatos(nuevosDatos);
  }, [empleados, evaluaciones, calcularIncidenciasDesdeAsistencia]);

  useEffect(() => {
    if (empleados.length) construirDatos();
  }, [empleados, evaluaciones, construirDatos]);

  // Refrescar manualmente (forzar recálculo de incidencias)
  const refrescarDatos = () => {
    setIncidenciasCache({});
    construirDatos();
  };

  const guardarEvaluacion = async () => {
    if (!modalEv) return;
    const incidencias = await calcularIncidenciasDesdeAsistencia(modalEv.id);
    const puntajeNeto = calcularPuntajeNeto({ ...incidencias, asist_perfecta: form.asist_perfecta });
    const registro = {
      empleado_id: modalEv.id,
      empleado_nombre: `${modalEv.nombre} ${modalEv.apellido || ''}`.trim(),
      mes: mesSelec,
      area: modalEv.area,
      ...incidencias,
      asist_perfecta: form.asist_perfecta,
      observaciones: form.observaciones,
      detalle_extra: form.detalle_extra,
      punt_final: puntajeNeto,
    };
    const { error } = await supabase.from('evaluaciones').upsert(registro, { onConflict: 'empleado_id,mes' });
    if (error) {
      alert('Error al guardar: ' + error.message);
      return;
    }
    setModalEv(null);
    setForm({
      tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0, falta_feriado: 0,
      asist_perfecta: false, observaciones: '', detalle_extra: ''
    });
    await cargarDatosBase();
    await cargarHistorico();
    setIncidenciasCache({});
    construirDatos();
    alert('Evaluación guardada correctamente');
  };

  const abrirModalEvaluacion = async (empleadoData) => {
    const incidencias = await calcularIncidenciasDesdeAsistencia(empleadoData.id);
    setForm({
      tard_leve: incidencias.tard_leve,
      tard_grave: incidencias.tard_grave,
      falta_inj: incidencias.falta_inj,
      permiso_sj: incidencias.permiso_sj,
      falta_feriado: incidencias.falta_feriado,
      asist_perfecta: empleadoData.asist_perfecta || false,
      observaciones: empleadoData.observaciones || '',
      detalle_extra: empleadoData.detalle_extra || ''
    });
    setModalEv(empleadoData);
  };

  const ranking = [...datos].filter(d => d.evaluado).sort((a, b) => b.puntaje_visible - a.puntaje_visible);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-sans text-slate-800">
      {/* HEADER CORPORATIVO */}
      <div className="bg-[#11284e] rounded-[2rem] p-8 md:p-10 mb-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight">
              Gestión de <span className="font-bold">Desempeño</span>
            </h2>
            <p className="text-[#8ba3c7] mt-2 max-w-xl text-sm md:text-base leading-relaxed">
              Auditoría mensual de asistencia, puntualidad y evaluación cualitativa de colaboradores.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={refrescarDatos}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
              title="Actualizar datos desde Novedades Planilla"
            >
              🔄 Actualizar
            </button>
            <div className="bg-white/10 p-1 rounded-xl backdrop-blur-md">
              <input
                type="month"
                value={mesSelec}
                onChange={e => setMesSelec(e.target.value)}
                className="bg-transparent border-none text-white px-4 py-2 outline-none cursor-pointer font-medium tracking-wider"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-px">
        {[
          ['mensual', 'Auditoría Mensual'],
          ['ranking', 'Boletín de Resultados'],
          ['historico', 'Histórico Anual'],
          ['reglas', 'Métricas Oficiales']
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={`text-sm px-6 py-3 font-semibold transition-all uppercase tracking-wider text-[11px] ${
              vista === id
                ? 'border-b-2 border-[#11284e] text-[#11284e]'
                : 'border-b-2 border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* VISTA MENSUAL */}
      {vista === 'mensual' && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="p-5 pl-8">Colaborador</th>
                  <th className="p-5">Área</th>
                  <th className="p-5 text-center">Incidencias</th>
                  <th className="p-5 w-1/4">Evaluación Cualitativa</th>
                  <th className="p-5 text-center w-32">Rendimiento</th>
                  <th className="p-5 pr-8 text-right">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {datos.map(d => {
                  const visible = d.puntaje_visible;
                  const clasif = getClasificacion(visible);
                  const totalIncidencias = (d.incidencias_reales?.tard_leve||0)+(d.incidencias_reales?.tard_grave||0)+(d.incidencias_reales?.falta_inj||0)+(d.incidencias_reales?.falta_feriado||0)+(d.incidencias_reales?.permiso_sj||0);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-5 pl-8">
                        <div className="flex items-center gap-3">
                          {d.foto_url ? (
                            <img src={d.foto_url} className="w-9 h-9 rounded-full object-cover shadow-sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-[#11284e] flex items-center justify-center text-xs font-bold shadow-inner border border-slate-200">
                              {getInitials(d.nombre, d.apellido)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-800">{d.nombre} {d.apellido}</div>
                            {!d.evaluado && (
                              <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded-full">provisional</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">{d.area}</span>
                      </td>
                      <td className="p-5 text-center text-slate-500 font-mono text-xs">
                        {totalIncidencias === 0 ? <span className="text-emerald-500 font-bold">Sin faltas</span> : `${totalIncidencias} reg.`}
                      </td>
                      <td className="p-5">
                        {d.observaciones && d.observaciones !== "Seleccionar una observación..." ? (
                          <p className="text-[11px] leading-tight text-slate-500 italic line-clamp-2" title={d.observaciones}>"{d.observaciones}"</p>
                        ) : <span className="text-[11px] text-slate-300">—</span>}
                      </td>
                      <td className="p-5">
                        <div className={`flex flex-col items-center justify-center border rounded-xl py-1.5 ${clasif.bgClase}`}>
                          <span className={`text-sm font-black ${clasif.colorClase}`}>{visible} pts</span>
                          <span className={`text-[9px] uppercase tracking-widest font-bold ${clasif.colorClase} opacity-80`}>{clasif.texto}</span>
                        </div>
                      </td>
                      <td className="p-5 pr-8 text-right">
                        <button
                          onClick={() => abrirModalEvaluacion(d)}
                          className="text-[11px] font-bold text-[#11284e] uppercase tracking-widest hover:underline"
                        >
                          {d.evaluado ? 'Editar' : 'Evaluar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA RANKING */}
      {vista === 'ranking' && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 p-6 border-b border-slate-100 text-center">
            <h3 className="text-lg font-bold text-[#11284e]">Boletín de Resultados - {mesSelec}</h3>
            <p className="text-xs text-slate-500 mt-1">Reconocimiento y métricas de desempeño del equipo</p>
          </div>
          <div className="divide-y divide-slate-50">
            {ranking.map((e, i) => {
              const visible = e.puntaje_visible;
              const clasif = getClasificacion(visible);
              return (
                <div key={e.id} className="flex items-center gap-5 p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="w-8 text-center font-black text-slate-300 text-xl">#{i + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                    {e.foto_url ? (
                      <img src={e.foto_url} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(e.nombre, e.apellido)
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">{e.nombre} {e.apellido}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{e.area}</div>
                  </div>
                  <div className={`text-xl font-black ${clasif.colorClase}`}>
                    {visible} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </div>
                </div>
              );
            })}
            {ranking.length === 0 && <div className="p-10 text-center text-slate-400">Aún no hay evaluaciones registradas en este periodo.</div>}
          </div>
        </div>
      )}

      {/* VISTA HISTÓRICO - CORREGIDA */}
      {vista === 'historico' && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-x-auto p-4">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-4 font-semibold">Colaborador</th>
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(m => (
                  <th key={m} className="p-3 text-center">{m}</th>
                ))}
                <th className="p-4 text-center text-[#11284e] font-bold bg-slate-50 rounded-tr-xl">Prom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {empleados.map(e => {
                const scoresNeto = ['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => historico[e.id]?.[m] || null);
                const scoresVisible = scoresNeto.map(n => n !== null ? puntajeVisible(n) : null);
                const valid = scoresVisible.filter(s => s !== null);
                const prom = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                const clasifProm = prom !== null ? getClasificacion(prom) : null;
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-700 text-xs">{e.nombre} {e.apellido?.split(' ')[0]}</td>
                    {scoresVisible.map((s, idx) => (
                      <td key={idx} className="p-3 text-center">
                        {s !== null ? (
                          <span className={`text-xs font-bold ${getClasificacion(s).colorClase}`}>{s}</span>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    ))}
                    <td className="p-4 text-center font-black bg-slate-50">
                      {prom !== null ? <span className={clasifProm.colorClase}>{prom}</span> : <span className="text-slate-300">—</span>}
                    </td>
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
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8">
            <h3 className="text-lg font-bold text-[#11284e] mb-6">Sistema de Puntaje</h3>
            <div className="divide-y divide-slate-100">
              {REGLAS.map(r => (
                <div key={r.concepto} className="flex justify-between items-center py-3">
                  <span className="text-sm text-slate-600 font-medium">{r.concepto}</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${r.tipo === 'bono' ? 'bg-emerald-50 text-emerald-700' : r.tipo === 'base' ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700'}`}>
                    {r.puntos > 0 ? '+' : ''}{r.puntos} pts
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">El puntaje base es 100. Se aplican descuentos y bonos para obtener el resultado final.</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8">
            <h3 className="text-lg font-bold text-[#11284e] mb-6">Clasificación de Desempeño</h3>
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

      {/* MODAL DE EVALUACIÓN */}
      {modalEv && (
        <div className="fixed inset-0 bg-[#11284e]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#11284e] text-lg">Evaluación de Desempeño</h3>
                <p className="text-xs text-slate-500 mt-1">{modalEv.nombre} {modalEv.apellido} • {modalEv.area}</p>
              </div>
              <button onClick={() => setModalEv(null)} className="text-slate-400 hover:text-slate-800 text-xl font-bold">✕</button>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#11284e] mb-4 border-b pb-2">Incidencias del mes</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between bg-slate-50 p-2 rounded-lg"><span>Tardanzas leves (≤15 min):</span><span className="font-bold">{form.tard_leve}</span></div>
                    <div className="flex justify-between bg-slate-50 p-2 rounded-lg"><span>Tardanzas graves ({'>'}15 min):</span><span className="font-bold">{form.tard_grave}</span></div>
                    <div className="flex justify-between bg-slate-50 p-2 rounded-lg"><span>Faltas injustificadas:</span><span className="font-bold">{form.falta_inj}</span></div>
                    <div className="flex justify-between bg-slate-50 p-2 rounded-lg"><span>Permisos sin justificar:</span><span className="font-bold">{form.permiso_sj}</span></div>
                    <div className="flex justify-between bg-slate-50 p-2 rounded-lg"><span>Ausencia post-feriado:</span><span className="font-bold">{form.falta_feriado}</span></div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Estos valores se calculan automáticamente desde las novedades registradas.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#11284e] mb-4 border-b pb-2">Evaluación Cualitativa</h4>
                    <select
                      value={form.observaciones}
                      onChange={e => setForm(f => ({...f, observaciones: e.target.value}))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 outline-none focus:border-[#11284e] mb-3"
                    >
                      {OBSERVACIONES_CUALITATIVAS.map(obs => <option key={obs} value={obs}>{obs}</option>)}
                    </select>
                    <textarea
                      rows={3}
                      placeholder="Detalles adicionales (opcional)..."
                      value={form.detalle_extra}
                      onChange={e => setForm(f => ({...f, detalle_extra: e.target.value}))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-[#11284e] resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <input
                      type="checkbox"
                      checked={form.asist_perfecta}
                      onChange={e => setForm(f => ({...f, asist_perfecta: e.target.checked}))}
                      className="w-5 h-5 rounded text-emerald-600 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-800 block">Asistencia Perfecta</span>
                      <span className="text-[10px] font-bold text-emerald-600">+5 pts al total</span>
                    </div>
                  </div>

                  <div className={`mt-auto p-6 rounded-2xl border text-center transition-colors ${getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).bgClase}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Resultado del Mes</span>
                    <div className={`text-4xl font-black mb-1 ${getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).colorClase}`}>
                      {puntajeVisible(calcularPuntajeNeto(form))} <span className="text-lg font-bold opacity-60">pts</span>
                    </div>
                    <span className={`inline-block px-3 py-1 bg-white/50 rounded-lg text-xs font-black uppercase tracking-widest ${getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).colorClase}`}>
                      {getClasificacion(puntajeVisible(calcularPuntajeNeto(form))).texto}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setModalEv(null)} className="px-6 py-4 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800">Cancelar</button>
              <button onClick={guardarEvaluacion} className="flex-1 bg-[#11284e] text-white py-4 rounded-xl font-bold hover:bg-[#0c1d38] transition-colors shadow-lg shadow-[#11284e]/20">
                Guardar Evaluación Mensual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}