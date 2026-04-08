import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Funciones de puntaje (igual que antes)
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
  if (visible >= 95) return { texto: 'Executive Premium', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  if (visible >= 80) return { texto: 'Standard Professional', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
  return { texto: 'Performance Review Required', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' };
}

function getInitials(nombre, apellido) {
  return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
}

export default function TabPerfilEmpleado() {
  const [activeTab, setActiveTab] = useState('Evaluaciones');
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [vacaciones, setVacaciones] = useState([]);
  const [descansos, setDescansos] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [incidenciasActuales, setIncidenciasActuales] = useState(null);
  const [puntajeVisibleActual, setPuntajeVisibleActual] = useState(null);
  const [datosGrafico, setDatosGrafico] = useState([]);

  // Cargar lista de empleados (orden alfabético por apellido)
  useEffect(() => {
    supabase
      .from('empleados')
      .select('*, horarios(id, nombre, tipo, hora_entrada, hora_salida, dias_trabajo, descansos)')
      .order('apellido', { ascending: true })
      .then(({ data }) => setEmpleados(data || []));
  }, []);

  // Calcular incidencias reales desde asistencia para un empleado y mes dado
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

  // Cargar todos los datos del empleado seleccionado (ahora con JOIN a horarios)
  const cargarDatosEmpleado = async (emp) => {
    if (!emp) return;
    setCargando(true);
    
    // Obtener los detalles del empleado incluyendo el horario (por si acaso)
    const { data: empData } = await supabase
      .from('empleados')
      .select('*, horarios(*)')
      .eq('id', emp.id)
      .single();
    
    const [vac, des, eva, asis] = await Promise.all([
      supabase.from('vacaciones').select('*').eq('empleado_id', emp.id).order('fecha_inicio', { ascending: false }),
      supabase.from('descansos_medicos').select('*').eq('empleado_id', emp.id).order('fecha', { ascending: false }),
      supabase.from('evaluaciones').select('*').eq('empleado_id', emp.id).order('mes', { ascending: false }),
      supabase.from('asistencia').select('*').eq('empleado_id', emp.id).order('fecha', { ascending: false })
    ]);
    
    setVacaciones(vac.data || []);
    setDescansos(des.data || []);
    setEvaluaciones(eva.data || []);
    setAsistencias(asis.data || []);
    
    // Actualizar el empleado seleccionado con los datos del horario (por si no venía en la lista inicial)
    if (empData && empData.horarios) {
      setEmpleadoSeleccionado(prev => ({ ...prev, horarios: empData.horarios }));
    }
    
    setCargando(false);
  };

  useEffect(() => {
    if (empleadoSeleccionado) {
      cargarDatosEmpleado(empleadoSeleccionado);
    }
  }, [empleadoSeleccionado]);

  // Calcular incidencias y puntaje actual (para el mes actual)
  const actualizarIncidenciasYPuntaje = useCallback(async () => {
    if (!empleadoSeleccionado) return;
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const incidencias = await calcularIncidenciasDesdeAsistencia(empleadoSeleccionado.id, mesActual);
    // Buscar si existe evaluación para este mes (para saber si tiene asistencia perfecta)
    const evaluacionMes = evaluaciones.find(e => e.mes === mesActual);
    const asistPerfecta = evaluacionMes?.asist_perfecta || false;
    const neto = calcularPuntajeNeto({ ...incidencias, asist_perfecta: asistPerfecta });
    const visible = puntajeVisible(neto);
    setIncidenciasActuales(incidencias);
    setPuntajeVisibleActual(visible);
  }, [empleadoSeleccionado, evaluaciones, calcularIncidenciasDesdeAsistencia]);

  useEffect(() => {
    actualizarIncidenciasYPuntaje();
  }, [actualizarIncidenciasYPuntaje]);

  // Preparar datos para el gráfico (últimos 6 meses)
  const prepararGrafico = useCallback(async () => {
    if (!empleadoSeleccionado) return;
    const meses = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const mesLabel = mes.slice(5);
      meses.push({ mes, label: mesLabel });
    }
    const puntos = [];
    for (const m of meses) {
      const ev = evaluaciones.find(e => e.mes === m.mes);
      if (ev) {
        puntos.push({ mes: m.label, puntaje: puntajeVisible(ev.punt_final) });
      } else {
        const inc = await calcularIncidenciasDesdeAsistencia(empleadoSeleccionado.id, m.mes);
        const neto = calcularPuntajeNeto({ ...inc, asist_perfecta: false });
        puntos.push({ mes: m.label, puntaje: puntajeVisible(neto) });
      }
    }
    setDatosGrafico(puntos);
  }, [empleadoSeleccionado, evaluaciones, calcularIncidenciasDesdeAsistencia]);

  useEffect(() => {
    prepararGrafico();
  }, [prepararGrafico]);

  const refrescarDatos = async () => {
    if (!empleadoSeleccionado) return;
    setCargando(true);
    await cargarDatosEmpleado(empleadoSeleccionado);
    await actualizarIncidenciasYPuntaje();
    await prepararGrafico();
    setCargando(false);
  };

  const clasifActual = puntajeVisibleActual ? getClasificacion(puntajeVisibleActual) : null;
  const horario = empleadoSeleccionado?.horarios;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SELECTOR VIP */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-light text-slate-800 italic">Expediente <span className="font-bold not-italic">Corporativo</span></h2>
          <p className="text-slate-400 text-sm">Visualización detallada de talento humano.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refrescarDatos}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            title="Actualizar datos desde Novedades Planilla"
          >
            🔄 Actualizar
          </button>
          <select
            value={empleadoSeleccionado?.id || ''}
            onChange={(e) => setEmpleadoSeleccionado(empleados.find(emp => emp.id === e.target.value))}
            className="w-full md:w-80 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#11284e] transition-all outline-none"
          >
            <option value="">Seleccionar Colaborador...</option>
            {empleados.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
            ))}
          </select>
        </div>
      </div>

      {empleadoSeleccionado ? (
        <>
          {/* PROFILE CARD & KEY STATS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-[#11284e] rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-full border-4 border-white/20 p-1 mb-4 shadow-2xl">
                        {empleadoSeleccionado.foto_url ? (
                            <img src={empleadoSeleccionado.foto_url} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-3xl font-light">
                                {getInitials(empleadoSeleccionado.nombre, empleadoSeleccionado.apellido)}
                            </div>
                        )}
                    </div>
                    <h3 className="text-2xl font-bold">{empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}</h3>
                    <p className="text-blue-200 uppercase tracking-widest text-[10px] font-bold mt-1">{empleadoSeleccionado.cargo}</p>
                    
                    {/* Horario asignado */}
                    {horario && (
                      <div className="mt-2 text-sm text-blue-200">
                        <span className="opacity-70">Horario:</span> {horario.nombre} ({horario.tipo})
                      </div>
                    )}
                    
                    <div className="mt-6 w-full grid grid-cols-2 gap-2">
                        <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                            <span className="block text-xl font-bold">{vacaciones.reduce((sum, v) => sum + v.dias_usados, 0)}</span>
                            <span className="text-[9px] uppercase opacity-60">Vacaciones</span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                            <span className="block text-xl font-bold">{asistencias.filter(a => a.tardanza).length}</span>
                            <span className="text-[9px] uppercase opacity-60">Tardanzas</span>
                        </div>
                    </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            {/* PERFORMANCE CHART */}
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-800">Evolución de Desempeño</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Métrica: Base 100</span>
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
                            <Tooltip 
                                contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                itemStyle={{ fontWeight: 'bold', color: '#11284e' }}
                            />
                            <Area type="monotone" dataKey="puntaje" stroke="#11284e" strokeWidth={3} fillOpacity={1} fill="url(#colorPuntaje)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* CURRENT PERFORMANCE CARD */}
          {puntajeVisibleActual !== null && (
            <div className={`rounded-2xl p-6 border-2 ${clasifActual.bg} ${clasifActual.border}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest opacity-70">Desempeño del mes actual</h4>
                  <div className={`text-4xl font-black ${clasifActual.color}`}>{puntajeVisibleActual} pts</div>
                  <div className="text-sm font-bold mt-1">{clasifActual.texto}</div>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div>Tardanzas leves: {incidenciasActuales?.tard_leve || 0}</div>
                  <div>Tardanzas graves: {incidenciasActuales?.tard_grave || 0}</div>
                  <div>Faltas injustificadas: {incidenciasActuales?.falta_inj || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* DETAILED TABS VIP */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-50 px-8 bg-slate-50/50">
              {['Evaluaciones', 'Vacaciones', 'Descansos', 'Asistencias'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
                    activeTab === tab ? 'border-[#11284e] text-[#11284e]' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="p-8">
              {cargando ? (
                <div className="flex flex-col items-center py-12 text-slate-400 animate-pulse">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-[#11284e] rounded-full animate-spin mb-4"></div>
                  <span className="text-xs font-bold uppercase tracking-widest">Sincronizando Data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {activeTab === 'Evaluaciones' && (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                          <th className="pb-4">Periodo</th>
                          <th className="pb-4">Puntaje</th>
                          <th className="pb-4">Estatus Corporativo</th>
                          <th className="pb-4">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {evaluaciones.map(ev => {
                          const visible = puntajeVisible(ev.punt_final);
                          const c = getClasificacion(visible);
                          return (
                            <tr key={ev.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 font-bold text-slate-700">{ev.mes}</td>
                              <td className="py-4 font-black text-[#11284e]">{visible} <span className="text-[10px] opacity-40">pts</span></td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${c.bg} ${c.color} ${c.border}`}>
                                  {c.texto}
                                </span>
                              </td>
                              <td className="py-4 text-xs text-slate-500 max-w-xs truncate">{ev.observaciones || 'Sin detalles'}</td>
                            </tr>
                          );
                        })}
                        {evaluaciones.length === 0 && (
                          <tr><td colSpan="4" className="py-8 text-center text-slate-300 italic">No hay evaluaciones guardadas.</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                  {activeTab === 'Vacaciones' && (
                    <table className="w-full text-left">
                      <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Inicio</th><th>Fin</th><th>Días</th><th>Estado</th></tr></thead>
                      <tbody>
                        {vacaciones.map(v => (
                          <tr key={v.id} className="border-t"><td className="py-3">{v.fecha_inicio}</td><td className="py-3">{v.fecha_fin}</td><td className="py-3">{v.dias_usados}</td><td className="py-3">{v.estado}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {activeTab === 'Descansos' && (
                    <table className="w-full text-left">
                      <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Fecha</th><th>Días</th><th>Diagnóstico</th></tr></thead>
                      <tbody>
                        {descansos.map(d => (
                          <tr key={d.id} className="border-t"><td className="py-3">{d.fecha}</td><td className="py-3">{d.dias}</td><td className="py-3">{d.diagnostico}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {activeTab === 'Asistencias' && (
                    <table className="w-full text-left">
                      <thead><tr className="text-[10px] uppercase text-slate-400 border-b"><th className="pb-4">Fecha</th><th>Tardanza</th><th>Justificación</th></tr></thead>
                      <tbody>
                        {asistencias.map((a, idx) => (
                          <tr key={idx} className="border-t"><td className="py-3">{a.fecha}</td><td className="py-3">{a.tardanza ? 'Sí' : 'No'}</td><td className="py-3">{a.justificacion || '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-4 text-slate-200">📁</div>
          <p className="text-slate-400 font-medium">Seleccione un colaborador para visualizar su perfil ejecutivo.</p>
        </div>
      )}
    </div>
  );
}