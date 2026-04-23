// src/pages/rrhh/TabHorarios.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIONES FINALES:
// - Vista "Fin de Semana" ahora muestra correctamente todas las asignaciones
// - Modal de edición de día: muestra el horario habitual y permite cambiarlo
// - CORREGIDO: La rotación de fines de semana ahora usa semanas del mes (1-5)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Clock, Users, Calendar, Edit, Trash2, Plus,
  ChevronLeft, ChevronRight, Copy, Layers, X,
  Sun, CalendarDays, CalendarRange
} from 'lucide-react';

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const DIAS_CORTO = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TIPOS_JORNADA = [
  { value: 'fijo_semanal', label: 'Full‑time fijo (L‑V) + rotación fin de semana' },
  { value: 'fijo_variable', label: 'Full‑time con días variables' },
  { value: 'personalizado', label: 'Part‑time / Personalizado' },
];
const COLOR_TURNO = {
  'Mañana': { bg:'bg-amber-50', text:'text-amber-800', border:'border-amber-200', dot:'bg-amber-400' },
  'Tarde': { bg:'bg-blue-50', text:'text-blue-800', border:'border-blue-200', dot:'bg-blue-500' },
  'Sábado AM': { bg:'bg-violet-50', text:'text-violet-800', border:'border-violet-200', dot:'bg-violet-500' },
  'Sábado PM': { bg:'bg-purple-50', text:'text-purple-800', border:'border-purple-200', dot:'bg-purple-500' },
  'Domingo AM': { bg:'bg-rose-50', text:'text-rose-800', border:'border-rose-200', dot:'bg-rose-500' },
  'Domingo PM': { bg:'bg-pink-50', text:'text-pink-800', border:'border-pink-200', dot:'bg-pink-500' },
  default: { bg:'bg-slate-50', text:'text-slate-700', border:'border-slate-200', dot:'bg-slate-400' },
};
const col = (tipo = '') => COLOR_TURNO[tipo] || COLOR_TURNO.default;
function toISO(d) { return d.toISOString().slice(0, 10); }

// NUEVA FUNCIÓN: Obtiene la semana del mes (1-5) basada en el día del mes
function getSemanaDelMes(fecha) {
  const dia = fecha.getDate();
  return Math.ceil(dia / 7);
}

// Función para obtener el lunes de la semana (para navegación semanal)
function getMondayOfWeek(ref) {
  const d = new Date(ref);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}
function NavFecha({ label, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-slate-900 text-lg tracking-tight">{label}</h3>
      <div className="flex gap-1">
        <button onClick={onPrev} className="p-2.5 hover:bg-[#e8eef7] text-[#15305a] hover:text-[#112a4f] rounded-2xl transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#15305a]/10"><ChevronLeft size={18} /></button>
        <button onClick={onNext} className="p-2.5 hover:bg-[#e8eef7] text-[#15305a] hover:text-[#112a4f] rounded-2xl transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#15305a]/10"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
function SubTabs({ options, active, onChange }) {
  return (
    <div className="flex gap-1 bg-white border border-slate-100 p-1 rounded-3xl w-fit shadow-sm">
      {options.map(({ id, label, icon }) => (
        <button key={id} onClick={() => onChange(id)}
          className={`px-4 py-2 rounded-2xl text-sm font-semibold flex items-center gap-1.5 transition-all duration-200
            ${active === id 
              ? 'bg-[#15305a] text-white shadow' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-[#f0f4fa]'}`}>
          {icon}{label}
        </button>
      ))}
    </div>
  );
}

export default function TabHorarios() {
  const [vistaActiva, setVistaActiva] = useState('calendario');
  const [subCalendario, setSubCalendario] = useState('mes');
  const [subAreas, setSubAreas] = useState('semana');
  const [horarios, setHorarios] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [asignacionesDiarias, setAsignacionesDiarias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [areaExpandida, setAreaExpandida] = useState(null);
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [semanaRef, setSemanaRef] = useState(getMondayOfWeek(hoy));

  // Modales
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalHorario, setModalHorario] = useState(false);
  const [modalEditarDia, setModalEditarDia] = useState(false);
  const [diaEditando, setDiaEditando] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [formHorario, setFormHorario] = useState({
    nombre: '', tipo: 'Mañana', hora_entrada: '', hora_salida: '',
    dias_trabajo: [], descansos: [], activo: true, tipo_jornada: 'fijo_semanal',
  });
  const [formAsignacion, setFormAsignacion] = useState({
    empleado_id: '', tipo_jornada: 'fijo_semanal', turno_base: 'Mañana',
    dias_trabajo: [], rotacion_finde: [], personalizado: {},
  });

  // ── Carga de datos ──────────────────────────────────────────────────────
  const cargarDatos = async () => {
    setCargando(true);
    const [horariosRes, empleadosRes, diariasRes] = await Promise.all([
      supabase.from('horarios').select('*').order('tipo'),
      supabase.from('empleados').select('id, nombre, apellido, area').eq('estado','activo'),
      supabase.from('asignaciones_diarias').select('*, horarios(*)').order('fecha'),
    ]);
    setHorarios(horariosRes.data || []);
    setEmpleados(empleadosRes.data || []);
    setAsignacionesDiarias(diariasRes.data || []);
    setCargando(false);
  };
  useEffect(() => { cargarDatos(); }, []);

  // ── Navegación ──────────────────────────────────────────────────────────
  const cambiarMes = (d) => {
    let m = mes + d, a = anio;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setMes(m); setAnio(a);
  };
  const cambiarSemana = (d) => {
    const s = new Date(semanaRef);
    s.setDate(s.getDate() + d * 7);
    setSemanaRef(s);
  };

  // ── Derivados de calendario ─────────────────────────────────────────────
  const primerDiaMes = new Date(anio, mes, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const diaInicioSemana = primerDiaMes.getDay();
  const diasDeSemana = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(semanaRef); d.setDate(d.getDate() + i); return d; }),
    [semanaRef]
  );
  const rangoMes = { ini: toISO(new Date(anio, mes, 1)), fin: toISO(new Date(anio, mes + 1, 0)) };

  // ── Lookup ──────────────────────────────────────────────────────────────
  const getAsignacionDia = (empId, fechaStr) => {
    const a = asignacionesDiarias.find(a => a.empleado_id === empId && a.fecha === fechaStr);
    return a ? a.horarios : null;
  };
  const areasUnicas = useMemo(
    () => [...new Set(empleados.map(e => e.area).filter(Boolean))].sort(),
    [empleados]
  );
  const empleadosPorAreaYTurno = (ini, fin) => {
    const res = {};
    areasUnicas.forEach(a => { res[a] = { Mañana: [], Tarde: [], FinDeSemana: [] }; });
    const asigsMes = asignacionesDiarias.filter(a => a.fecha >= ini && a.fecha <= fin);
    empleados.forEach(emp => {
      if (!emp.area) return;
      const asigs = asigsMes.filter(a => a.empleado_id === emp.id);
      if (!asigs.length) return;
      const turnos = new Set();
      asigs.forEach(a => {
        const t = a.horarios?.tipo || '';
        if (t === 'Mañana') turnos.add('Mañana');
        else if (t === 'Tarde') turnos.add('Tarde');
        else if (t.includes('Sábado') || t.includes('Domingo')) turnos.add('FinDeSemana');
      });
      if (turnos.has('Mañana')) res[emp.area].Mañana.push(emp);
      if (turnos.has('Tarde')) res[emp.area].Tarde.push(emp);
      if (turnos.has('FinDeSemana')) res[emp.area].FinDeSemana.push(emp);
    });
    return res;
  };

  // ─── CRUD Horarios base ─────────────────────────────────────────────────
  const guardarHorario = async () => {
    if (!formHorario.nombre) return alert('Nombre del horario es obligatorio');
    const datos = { ...formHorario }; delete datos.id;
    const res = modoEdicion && editandoId
      ? await supabase.from('horarios').update(datos).eq('id', editandoId)
      : await supabase.from('horarios').insert([datos]);
    if (res.error) alert('Error: ' + res.error.message);
    else { setModalHorario(false); cargarDatos(); }
  };
  const editarHorario = (h) => { setModoEdicion(true); setEditandoId(h.id); setFormHorario(h); setModalHorario(true); };
  const eliminarHorario = async (id) => {
    if (confirm('¿Eliminar este horario?')) { await supabase.from('horarios').delete().eq('id', id); cargarDatos(); }
  };
  const toggleCheck = (arr, val) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  // ─── Copiar asignación del mes anterior ─────────────────────────────────
  const copiarAsignacionMesAnterior = () => {
    if (!formAsignacion.empleado_id) { alert('Primero selecciona un empleado'); return; }
    const mA = mes === 0 ? 11 : mes - 1, aA = mes === 0 ? anio - 1 : anio;
    const ini = toISO(new Date(aA, mA, 1)), fin = toISO(new Date(aA, mA + 1, 0));
    const prev = asignacionesDiarias.filter(a => a.empleado_id === formAsignacion.empleado_id && a.fecha >= ini && a.fecha <= fin);
    if (!prev.length) { alert('No hay asignaciones para el mes anterior'); return; }
    const personalizado = {};
    prev.forEach(a => { personalizado[a.fecha] = a.horario_id; });
    setFormAsignacion(p => ({ ...p, tipo_jornada: 'personalizado', personalizado }));
    alert(`Se copiaron ${prev.length} días del mes anterior.`);
  };

  // ─── Generar + guardar asignaciones (CORREGIDO: usa semana del mes) ─────
  const generarAsignaciones = () => {
    const { empleado_id, tipo_jornada, turno_base, dias_trabajo, rotacion_finde, personalizado } = formAsignacion;
    if (!empleado_id) { alert('Selecciona un empleado'); return null; }
    const asigs = [];
    if (tipo_jornada === 'fijo_semanal') {
      const base = horarios.find(h => h.tipo === turno_base && h.tipo_jornada === 'fijo_semanal');
      if (!base) { alert(`No se encontró horario base ${turno_base}`); return null; }
      const horariosFinDeSemana = Object.fromEntries(
        ['Sábado AM','Sábado PM','Domingo AM','Domingo PM'].map(t => [t, horarios.find(h => h.tipo === t)])
      );
      for (let d = new Date(anio, mes, 1); d <= new Date(anio, mes + 1, 0); d.setDate(d.getDate() + 1)) {
        const wd = d.getDay();
        if (wd >= 1 && wd <= 5) {
          asigs.push({ empleado_id, fecha: toISO(d), horario_id: base.id });
        } else {
          // CORRECCIÓN: usar semana del mes en lugar de semana del año
          const semanaMes = getSemanaDelMes(d);
          const rot = rotacion_finde.find(r => r.semana === semanaMes);
          if (rot && rot.turno) {
            const horarioFin = horariosFinDeSemana[rot.turno];
            if (horarioFin) asigs.push({ empleado_id, fecha: toISO(d), horario_id: horarioFin.id });
          }
        }
      }
    } else if (tipo_jornada === 'fijo_variable') {
      const horVar = horarios.find(h => h.tipo === turno_base);
      if (!horVar) { alert('No se encontró horario'); return null; }
      for (let d = new Date(anio, mes, 1); d <= new Date(anio, mes + 1, 0); d.setDate(d.getDate() + 1)) {
        const nombre = DIAS[d.getDay() === 0 ? 6 : d.getDay() - 1];
        if (dias_trabajo.includes(nombre)) asigs.push({ empleado_id, fecha: toISO(d), horario_id: horVar.id });
      }
    } else {
      Object.entries(personalizado).forEach(([fecha, horario_id]) => { if (horario_id) asigs.push({ empleado_id, fecha, horario_id }); });
    }
    return asigs;
  };
  const guardarAsignacion = async () => {
    const asigs = generarAsignaciones();
    if (!asigs || !asigs.length) return;
    setCargando(true);
    await supabase.from('asignaciones_diarias').delete()
      .eq('empleado_id', formAsignacion.empleado_id)
      .gte('fecha', rangoMes.ini).lte('fecha', rangoMes.fin);
    const { error } = await supabase.from('asignaciones_diarias').insert(asigs);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Asignaciones guardadas');
      setModalAsignar(false);
      setFormAsignacion({ empleado_id: '', tipo_jornada: 'fijo_semanal', turno_base: 'Mañana', dias_trabajo: [], rotacion_finde: [], personalizado: {} });
      cargarDatos();
    }
    setCargando(false);
  };

  // ─── Edición de día específico (mejorada) ──────────────────────────────
  const guardarEdicionDia = async () => {
    if (!diaEditando) return;
    const { empleado_id, fecha, horario_id } = diaEditando;
    if (!horario_id) await supabase.from('asignaciones_diarias').delete().eq('empleado_id', empleado_id).eq('fecha', fecha);
    else await supabase.from('asignaciones_diarias').upsert({ empleado_id, fecha, horario_id }, { onConflict: 'empleado_id,fecha' });
    cargarDatos(); setModalEditarDia(false); setDiaEditando(null);
  };

  // Función para obtener el horario habitual de un empleado en una fecha (según su tipo de jornada)
  const getHorarioHabitual = (emp, fechaStr) => {
    const existente = getAsignacionDia(emp.id, fechaStr);
    if (existente) return existente;

    const d = new Date(fechaStr + 'T00:00:00');
    const wd = d.getDay();
    const diaNombre = DIAS[wd === 0 ? 6 : wd - 1];
    
    const asigsMes = asignacionesDiarias.filter(a => a.empleado_id === emp.id && a.fecha >= rangoMes.ini && a.fecha <= rangoMes.fin);
    const mismoDia = asigsMes.find(a => {
      const ad = new Date(a.fecha + 'T00:00:00');
      return ad.getDay() === wd;
    });
    if (mismoDia) return mismoDia.horarios;
    return null;
  };

  const abrirEditarDia = (emp, fechaStr) => {
    const horarioActual = getAsignacionDia(emp.id, fechaStr);
    const horarioHabitual = getHorarioHabitual(emp, fechaStr);
    setDiaEditando({
      empleado_id: emp.id,
      fecha: fechaStr,
      horario_id: horarioActual?.id || '',
      horario_habitual_id: horarioHabitual?.id || null,
      empleadoNombre: `${emp.nombre} ${emp.apellido}`,
      horarioHabitualNombre: horarioHabitual?.nombre || 'Sin horario habitual'
    });
    setModalEditarDia(true);
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* KPIs + Acciones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow transition-shadow">
          <div className="p-3 bg-[#f0f4fa] text-[#15305a] rounded-2xl"><Clock size={22} /></div>
          <div>
            <p className="text-[10px] tracking-widest text-slate-500 uppercase">Turnos activos</p>
            <p className="text-2xl font-semibold text-slate-900">{horarios.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow transition-shadow">
          <div className="p-3 bg-[#f0f4fa] text-[#15305a] rounded-2xl"><Users size={22} /></div>
          <div>
            <p className="text-[10px] tracking-widest text-slate-500 uppercase">Personal asignado</p>
            <p className="text-2xl font-semibold text-slate-900">
              {new Set(asignacionesDiarias.map(a => a.empleado_id)).size}
            </p>
          </div>
        </div>
        <button onClick={() => setModalAsignar(true)}
          className="bg-[#15305a] hover:bg-[#112a4f] text-white rounded-3xl flex items-center justify-center gap-2 font-semibold py-4 text-sm shadow-sm hover:shadow transition-all">
          <Calendar size={17} /> Nueva Asignación Mensual
        </button>
        <button onClick={() => { setModoEdicion(false); setFormHorario({ nombre:'', tipo:'Mañana', hora_entrada:'', hora_salida:'', dias_trabajo:[], descansos:[], activo:true, tipo_jornada:'fijo_semanal' }); setModalHorario(true); }}
          className="border border-slate-200 hover:bg-[#f0f4fa] text-slate-700 rounded-3xl flex items-center justify-center gap-2 font-semibold py-4 text-sm transition-all">
          <Plus size={17} /> Nuevo Horario Base
        </button>
      </div>

      {/* Tabs principales */}
      <div className="flex gap-2 bg-white p-1.5 rounded-3xl border border-slate-100 w-fit shadow-sm">
        <button onClick={() => setVistaActiva('calendario')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 transition-all ${vistaActiva==='calendario' ? 'bg-[#15305a] text-white shadow-sm' : 'text-slate-500 hover:bg-[#f0f4fa] hover:text-slate-700'}`}>
          <Calendar size={15} /> Calendario
        </button>
        <button onClick={() => setVistaActiva('areas')}
          className={`px-5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 transition-all ${vistaActiva==='areas' ? 'bg-[#15305a] text-white shadow-sm' : 'text-slate-500 hover:bg-[#f0f4fa] hover:text-slate-700'}`}>
          <Layers size={15} /> Por Áreas
        </button>
      </div>

      {/* ═══════════════════════ CALENDARIO GENERAL ════════════════════════ */}
      {vistaActiva === 'calendario' && (
        <div className="space-y-6">
          <SubTabs
            active={subCalendario}
            onChange={setSubCalendario}
            options={[
              { id:'semana', label:'Semana', icon:<CalendarDays size={12}/> },
              { id:'mes', label:'Mes', icon:<CalendarRange size={12}/> },
            ]}
          />
          {subCalendario === 'semana' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <NavFecha
                label={`Semana del ${diasDeSemana[0].getDate()} al ${diasDeSemana[6].getDate()} de ${MESES[diasDeSemana[3].getMonth()]} ${diasDeSemana[3].getFullYear()}`}
                onPrev={() => cambiarSemana(-1)} onNext={() => cambiarSemana(1)}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 pr-4 text-slate-400 font-medium text-[10px] uppercase w-36">Colaborador</th>
                      {diasDeSemana.map((d, i) => {
                        const esFin = d.getDay()===0||d.getDay()===6;
                        return (
                          <th key={i} className={`text-center py-3 px-2 text-[10px] font-medium uppercase ${esFin?'text-violet-500':'text-slate-400'}`}>
                            <div>{DIAS_CORTO[i]}</div>
                            <div className={`text-sm font-bold mt-0.5 ${esFin?'text-violet-700':'text-slate-700'}`}>{d.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {empleados.map(emp => {
                      const row = diasDeSemana.map(d => getAsignacionDia(emp.id, toISO(d)));
                      if (!row.some(Boolean)) return null;
                      return (
                        <tr key={emp.id} className="hover:bg-[#f0f4fa]/60">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-slate-800 truncate max-w-[130px]">{emp.apellido}, {emp.nombre.split(' ')[0]}</div>
                            <div className="text-[9px] text-slate-400">{emp.area}</div>
                          </td>
                          {row.map((h, i) => {
                            const c = col(h?.tipo);
                            return (
                              <td key={i} className="py-3 px-1 text-center">
                                {h ? (
                                  <button onClick={() => abrirEditarDia(emp, toISO(diasDeSemana[i]))} title={h.nombre}
                                    className={`inline-block px-2 py-1 rounded-2xl text-[9px] font-bold border shadow-sm ${c.bg} ${c.text} ${c.border} hover:opacity-80 transition-all`}>
                                    {h.tipo==='Mañana'?'M':h.tipo==='Tarde'?'T':h.tipo.slice(0,3)}
                                  </button>
                                ) : <span className="text-slate-200">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-100">
                {Object.entries(COLOR_TURNO).filter(([k])=>k!=='default').map(([tipo, c]) => (
                  <div key={tipo} className="flex items-center gap-1 text-[10px] text-slate-500">
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} /> {tipo}
                  </div>
                ))}
              </div>
            </div>
          )}
          {subCalendario === 'mes' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <NavFecha label={`${MESES[mes]} ${anio}`} onPrev={() => cambiarMes(-1)} onNext={() => cambiarMes(1)} />
              <div className="grid grid-cols-7 gap-2">
                {DIAS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-2 border-b border-slate-100">
                    {d.slice(0,3)}
                  </div>
                ))}
                {Array.from({ length: diaInicioSemana }).map((_, i) => (
                  <div key={`e${i}`} className="h-20 bg-slate-50/60 border border-slate-100 rounded-2xl" />
                ))}
                {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(dia => {
                  const d = new Date(anio, mes, dia);
                  const fs = toISO(d);
                  const esFin = d.getDay()===0||d.getDay()===6;
                  const esHoy = fs === toISO(hoy);
                  const asigs = asignacionesDiarias.filter(a => a.fecha === fs);
                  return (
                    <div key={dia} className={`h-20 border rounded-2xl p-2 overflow-y-auto transition-all text-[10px]
                      ${esHoy?'border-[#15305a] ring-1 ring-[#15305a]/10':esFin?'bg-violet-50/40 border-violet-100':'bg-white border-slate-100 hover:border-slate-200'}`}>
                      <div className={`font-bold mb-1 ${esHoy?'text-[#15305a]':esFin?'text-violet-600':'text-slate-400'}`}>{dia}</div>
                      {asigs.slice(0,3).map(a => {
                        const emp = empleados.find(e => e.id === a.empleado_id);
                        const c = col(a.horarios?.tipo);
                        if (!emp) return null;
                        return (
                          <div key={a.id} className={`rounded px-1.5 py-px mb-px truncate font-medium ${c.bg} ${c.text}`}>
                            {emp.nombre.split(' ')[0]}
                          </div>
                        );
                      })}
                      {asigs.length > 3 && <div className="text-slate-400">+{asigs.length-3}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════ POR ÁREAS ═══════════════════════════════ */}
      {vistaActiva === 'areas' && (
        <div className="space-y-6">
          <SubTabs
            active={subAreas}
            onChange={setSubAreas}
            options={[
              { id:'semana', label:'Semana', icon:<CalendarDays size={12}/> },
              { id:'mes', label:'Mes', icon:<CalendarRange size={12}/> },
              { id:'finde', label:'Fin de Semana',icon:<Sun size={12}/> },
            ]}
          />
          {subAreas === 'semana' && (
            <div className="space-y-4">
              <NavFecha
                label={`Semana del ${diasDeSemana[0].getDate()} al ${diasDeSemana[6].getDate()} de ${MESES[diasDeSemana[3].getMonth()]}`}
                onPrev={() => cambiarSemana(-1)} onNext={() => cambiarSemana(1)}
              />
              {areasUnicas.map(area => {
                const empArea = empleados.filter(e => e.area === area);
                const tieneAsigs = empArea.some(e => diasDeSemana.some(d => getAsignacionDia(e.id, toISO(d))));
                if (!tieneAsigs) return null;
                const key = area + '_sw';
                return (
                  <div key={area} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <button onClick={() => setAreaExpandida(areaExpandida === key ? null : key)}
                      className="w-full px-5 py-4 flex items-center justify-between bg-[#f0f4fa] hover:bg-[#e8eef7] transition-colors">
                      <span className="font-semibold text-slate-900">{area}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          ({empArea.filter(e => diasDeSemana.some(d => getAsignacionDia(e.id, toISO(d)))).length} activos esta semana)
                        </span>
                      </span>
                      <ChevronRight size={18} className={`text-[#15305a] transition-transform ${areaExpandida===key?'rotate-90':''}`} />
                    </button>
                    {areaExpandida === key && (
                      <div className="p-5 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left py-3 pr-4 text-slate-400 font-medium text-[10px] uppercase w-36">Colaborador</th>
                              {diasDeSemana.map((d, i) => {
                                const esFin = d.getDay()===0||d.getDay()===6;
                                return (
                                  <th key={i} className={`text-center py-3 px-2 text-[10px] font-medium ${esFin?'text-violet-500':'text-slate-400'}`}>
                                    <div>{DIAS_CORTO[i]}</div>
                                    <div className="font-bold text-slate-700">{d.getDate()}</div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {empArea.map(emp => {
                              const row = diasDeSemana.map(d => getAsignacionDia(emp.id, toISO(d)));
                              if (!row.some(Boolean)) return null;
                              return (
                                <tr key={emp.id} className="hover:bg-[#f0f4fa]/60">
                                  <td className="py-3 pr-4">
                                    <div className="font-medium text-slate-800">{emp.apellido}, {emp.nombre.split(' ')[0]}</div>
                                  </td>
                                  {row.map((h, i) => {
                                    const c = col(h?.tipo);
                                    return (
                                      <td key={i} className="py-3 px-1 text-center">
                                        {h ? (
                                          <button onClick={() => abrirEditarDia(emp, toISO(diasDeSemana[i]))} title={h.nombre}
                                            className={`inline-flex items-center px-2 py-1 rounded-2xl text-[9px] font-semibold border shadow-sm ${c.bg} ${c.text} ${c.border} hover:opacity-80`}>
                                            {h.hora_entrada?.slice(0,5)}–{h.hora_salida?.slice(0,5)}
                                          </button>
                                        ) : <span className="text-slate-200">—</span>}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                          {[['Mañana',COLOR_TURNO.Mañana],['Tarde',COLOR_TURNO.Tarde],['F.Semana',COLOR_TURNO['Sábado AM']]].map(([lbl, c]) => {
                            const n = empArea.filter(e => diasDeSemana.some(d => {
                              const h = getAsignacionDia(e.id, toISO(d));
                              if (!h) return false;
                              if (lbl==='Mañana') return h.tipo==='Mañana';
                              if (lbl==='Tarde') return h.tipo==='Tarde';
                              return h.tipo?.includes('Sábado')||h.tipo?.includes('Domingo');
                            })).length;
                            return (
                              <div key={lbl} className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl ${c.bg}`}>
                                <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                                <span className={c.text}>{lbl}: <strong>{n}</strong></span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {subAreas === 'mes' && (
            <div className="space-y-4">
              <NavFecha label={`${MESES[mes]} ${anio}`} onPrev={() => cambiarMes(-1)} onNext={() => cambiarMes(1)} />
              {areasUnicas.map(area => {
                const data = empleadosPorAreaYTurno(rangoMes.ini, rangoMes.fin)[area] || { Mañana:[], Tarde:[], FinDeSemana:[] };
                const total = data.Mañana.length + data.Tarde.length + data.FinDeSemana.length;
                if (!total) return null;
                return (
                  <div key={area} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <button onClick={() => setAreaExpandida(areaExpandida===area?null:area)}
                      className="w-full px-5 py-4 flex items-center justify-between bg-[#f0f4fa] hover:bg-[#e8eef7] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">{area}</span>
                        <span className="text-xs text-slate-400">({total} colaboradores)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {[['Mañana',data.Mañana.length,COLOR_TURNO.Mañana],['Tarde',data.Tarde.length,COLOR_TURNO.Tarde],['F.Sem',data.FinDeSemana.length,COLOR_TURNO['Sábado AM']]].map(([lbl,n,c]) =>
                          n > 0 && <span key={lbl} className={`text-[10px] font-semibold px-2 py-1 rounded-2xl ${c.bg} ${c.text}`}>{lbl}: {n}</span>
                        )}
                        <ChevronRight size={16} className={`text-[#15305a] transition-transform ml-1 ${areaExpandida===area?'rotate-90':''}`} />
                      </div>
                    </button>
                    {areaExpandida === area && (
                      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { key:'Mañana', label:'Turno Mañana', c:COLOR_TURNO.Mañana },
                          { key:'Tarde', label:'Turno Tarde', c:COLOR_TURNO.Tarde },
                          { key:'FinDeSemana',label:'Fin de Semana', c:COLOR_TURNO['Sábado AM'] },
                        ].map(({ key, label, c }) => (
                          <div key={key}>
                            <h4 className={`font-semibold text-sm mb-3 ${c.text}`}>{label}</h4>
                            <div className="space-y-2">
                              {data[key].map(emp => (
                                <div key={emp.id} className={`flex items-center justify-between rounded-2xl px-4 py-2.5 border ${c.bg} ${c.border}`}>
                                  <span className={`font-medium text-sm ${c.text}`}>{emp.nombre} {emp.apellido}</span>
                                  <button onClick={() => abrirEditarDia(emp, rangoMes.ini)}
                                    className="text-slate-400 hover:text-[#15305a] p-1 rounded hover:bg-white/50 transition-all">
                                    <Edit size={13} />
                                  </button>
                                </div>
                              ))}
                              {!data[key].length && <p className="text-xs text-slate-400 italic py-2">Sin personal asignado</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {subAreas === 'finde' && (() => {
            // Construir fines de semana correctamente
            const finesDeSemana = [];
            const current = new Date(anio, mes, 1);
            while (current.getMonth() === mes) {
              const day = current.getDay();
              if (day === 6) { // Sábado
                const sab = new Date(current);
                const dom = new Date(current);
                dom.setDate(dom.getDate() + 1);
                finesDeSemana.push({
                  sab: sab.getMonth() === mes ? sab : null,
                  dom: dom.getMonth() === mes ? dom : null
                });
                current.setDate(current.getDate() + 2);
              } else if (day === 0) { // Domingo solo (primer día del mes)
                finesDeSemana.push({ sab: null, dom: new Date(current) });
                current.setDate(current.getDate() + 1);
              } else {
                current.setDate(current.getDate() + 1);
              }
            }

            return (
              <div className="space-y-5">
                <NavFecha
                  label={`Fin de Semana — ${MESES[mes]} ${anio}`}
                  onPrev={() => cambiarMes(-1)} onNext={() => cambiarMes(1)}
                />
                {finesDeSemana.map((fin, si) => {
                  const fechasFin = [fin.sab, fin.dom].filter(Boolean).map(toISO);
                  const totalAsigs = asignacionesDiarias.filter(a => fechasFin.includes(a.fecha)).length;
                  return (
                    <div key={si} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-[#15305a] to-[#112a4f] px-5 py-3 flex items-center justify-between">
                        <span className="text-white font-semibold text-sm">
                          Fin de Semana {si+1}
                          {fin.sab && ` · Sáb ${fin.sab.getDate()}/${mes+1}`}
                          {fin.dom && ` · Dom ${fin.dom.getDate()}/${mes+1}`}
                        </span>
                        <span className="text-white/80 text-xs">{totalAsigs} asignaciones</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {[{ dia:fin.sab, label:'Sábado' }, { dia:fin.dom, label:'Domingo' }].map(({ dia, label }) => {
                          if (!dia) return (
                            <div key={label} className="p-4 text-center text-slate-300 text-xs italic py-8">{label} fuera del mes</div>
                          );
                          const fs = toISO(dia);
                          const asigsDia = asignacionesDiarias.filter(a => a.fecha === fs);
                          const tiposOrden = label==='Sábado' ? ['Sábado AM','Sábado PM'] : ['Domingo AM','Domingo PM'];
                          return (
                            <div key={label} className="p-4">
                              <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${label==='Sábado'?'text-violet-600':'text-rose-600'}`}>
                                {label} {dia.getDate()}/{mes+1}
                                <span className="ml-2 font-normal text-slate-400">({asigsDia.length} asignados)</span>
                              </div>
                              {!asigsDia.length
                                ? <p className="text-xs text-slate-300 italic">Sin asignaciones</p>
                                : (
                                  <div className="space-y-2">
                                    {tiposOrden.map(tipoTurno => {
                                      const empsTurno = asigsDia.filter(a => a.horarios?.tipo === tipoTurno);
                                      if (!empsTurno.length) return null;
                                      const c = col(tipoTurno);
                                      const h0 = empsTurno[0]?.horarios;
                                      return (
                                        <div key={tipoTurno} className={`rounded-2xl p-3 border ${c.bg} ${c.border}`}>
                                          <div className={`text-[10px] font-bold uppercase mb-1.5 ${c.text}`}>
                                            {tipoTurno} · {h0?.hora_entrada?.slice(0,5)} – {h0?.hora_salida?.slice(0,5)}
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {empsTurno.map(a => {
                                              const emp = empleados.find(e => e.id === a.empleado_id);
                                              if (!emp) return null;
                                              return (
                                                <button key={a.id} onClick={() => abrirEditarDia(emp, fs)} title="Clic para editar"
                                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-2xl bg-white/80 border ${c.border} ${c.text} hover:opacity-75 transition-all`}>
                                                  {emp.nombre.split(' ')[0]} {emp.apellido.split(' ')[0]}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {asigsDia.filter(a => !tiposOrden.includes(a.horarios?.tipo)).length > 0 && (
                                      <div className="rounded-2xl p-3 border bg-slate-50 border-slate-200">
                                        <div className="text-[10px] font-bold uppercase mb-1 text-slate-500">Otros</div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {asigsDia.filter(a => !tiposOrden.includes(a.horarios?.tipo)).map(a => {
                                            const emp = empleados.find(e => e.id === a.empleado_id);
                                            const c = col(a.horarios?.tipo);
                                            if (!emp) return null;
                                            return (
                                              <button key={a.id} onClick={() => abrirEditarDia(emp, fs)}
                                                className={`text-[10px] font-medium px-2 py-0.5 rounded-2xl bg-white border ${c.border} ${c.text} hover:opacity-75`}>
                                                {emp.nombre.split(' ')[0]} — {a.horarios?.tipo}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                            </div>
                          );
                        })}
                      </div>
                      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
                        {areasUnicas.map(area => {
                          const empsArea = asignacionesDiarias.filter(a =>
                            fechasFin.includes(a.fecha) &&
                            empleados.find(e => e.id === a.empleado_id)?.area === area
                          );
                          if (!empsArea.length) return null;
                          return (
                            <span key={area} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-2xl">
                              {area}: <strong>{new Set(empsArea.map(a => a.empleado_id)).size}</strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════ HORARIOS BASE ═════════════════════════════ */}
      <div className="pt-2">
        <h3 className="font-semibold text-xl text-slate-900 mb-4">Horarios Base Configurados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {horarios.map(h => {
            const c = col(h.tipo);
            return (
              <div key={h.id} className={`bg-white p-5 rounded-3xl border shadow-sm hover:shadow transition-shadow ${c.border}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot} mb-2`} />
                    <h4 className="font-semibold text-lg text-slate-900">{h.nombre}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{h.hora_entrada?.slice(0,5)} — {h.hora_salida?.slice(0,5)}</p>
                    <div className="flex gap-2 mt-3">
                      <span className={`text-xs px-2 py-0.5 rounded-2xl font-medium ${c.bg} ${c.text}`}>{h.tipo}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-2xl">
                        {TIPOS_JORNADA.find(t=>t.value===h.tipo_jornada)?.label.split(' ')[0]||h.tipo_jornada}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => editarHorario(h)} className="p-1.5 text-slate-400 hover:text-[#15305a] hover:bg-[#f0f4fa] rounded-2xl transition-colors"><Edit size={15}/></button>
                    <button onClick={() => eliminarHorario(h.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={15}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═════════════════ MODAL ASIGNAR HORARIO MENSUAL ═══════════════════ */}
      {modalAsignar && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Asignar Horario Mensual</h3>
                <p className="text-slate-500 text-sm mt-0.5">{MESES[mes]} {anio}</p>
              </div>
              <button onClick={() => setModalAsignar(false)} className="p-2 hover:bg-slate-100 rounded-2xl"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <select value={formAsignacion.empleado_id} onChange={e => setFormAsignacion({...formAsignacion, empleado_id: e.target.value})}
                className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]">
                <option value="">Seleccione un empleado</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>)}
              </select>
              <button type="button" onClick={copiarAsignacionMesAnterior}
                className="w-full bg-[#f0f4fa] hover:bg-[#e8eef7] text-[#15305a] py-3 rounded-3xl text-sm font-medium flex items-center justify-center gap-2">
                <Copy size={16}/> Copiar asignación del mes anterior
              </button>
              <select value={formAsignacion.tipo_jornada} onChange={e => setFormAsignacion({...formAsignacion, tipo_jornada: e.target.value})}
                className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]">
                {TIPOS_JORNADA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {formAsignacion.tipo_jornada === 'fijo_semanal' && (
                <>
                  <select value={formAsignacion.turno_base} onChange={e => setFormAsignacion({...formAsignacion, turno_base: e.target.value})}
                    className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]">
                    <option value="Mañana">Turno Mañana (8am-5pm L-V)</option>
                    <option value="Tarde">Turno Tarde (12pm-9pm L-V)</option>
                  </select>
                  <div className="border rounded-3xl p-4">
                    <label className="block text-sm font-medium mb-3 text-slate-700">Rotación de fines de semana</label>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {[1,2,3,4,5].map(semana => (
                        <div key={semana} className="flex items-center gap-3">
                          <span className="w-24 text-sm text-slate-600">Semana {semana}</span>
                          <select
                            className="flex-1 border border-slate-200 rounded-3xl p-2 text-sm focus:outline-none focus:border-[#15305a]"
                            value={formAsignacion.rotacion_finde.find(r => r.semana === semana)?.turno || ''}
                            onChange={e => {
                              const nuevas = formAsignacion.rotacion_finde.filter(r => r.semana !== semana);
                              if (e.target.value) nuevas.push({ semana, turno: e.target.value });
                              setFormAsignacion({...formAsignacion, rotacion_finde: nuevas});
                            }}
                          >
                            <option value="">Descanso</option>
                            <option value="Sábado AM">Sábado AM</option>
                            <option value="Sábado PM">Sábado PM</option>
                            <option value="Domingo AM">Domingo AM</option>
                            <option value="Domingo PM">Domingo PM</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {formAsignacion.tipo_jornada === 'fijo_variable' && (
                <>
                  <select value={formAsignacion.turno_base} onChange={e => setFormAsignacion({...formAsignacion,turno_base:e.target.value})}
                    className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]">
                    <option value="Mañana">Horario Mañana</option>
                    <option value="Tarde">Horario Tarde</option>
                  </select>
                  <div className="border rounded-3xl p-4">
                    <label className="block text-sm font-medium mb-3 text-slate-700">Días de trabajo</label>
                    <div className="flex flex-wrap gap-3">
                      {DIAS.map(dia => (
                        <label key={dia} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formAsignacion.dias_trabajo.includes(dia)}
                            onChange={() => setFormAsignacion({...formAsignacion,dias_trabajo:toggleCheck(formAsignacion.dias_trabajo,dia)})}
                            className="rounded text-[#15305a]"/>
                          <span className="text-sm">{dia}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {formAsignacion.tipo_jornada === 'personalizado' && (
                <div className="border rounded-3xl p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium mb-3 text-slate-700">Asignar día por día</p>
                  {Array.from({length:diasEnMes},(_,i)=>i+1).map(dia => {
                    const fecha = toISO(new Date(anio,mes,dia));
                    const wd = new Date(anio,mes,dia).getDay();
                    const esFin = wd===0||wd===6;
                    return (
                      <div key={dia} className="flex items-center gap-3 mb-2">
                        <span className={`w-24 text-sm ${esFin?'text-violet-600 font-medium':'text-slate-600'}`}>
                          {dia} {DIAS_CORTO[wd===0?6:wd-1]}
                        </span>
                        <select className="flex-1 border border-slate-200 rounded-3xl p-2 text-sm focus:outline-none focus:border-[#15305a]"
                          value={formAsignacion.personalizado[fecha]||''}
                          onChange={e => setFormAsignacion({...formAsignacion,personalizado:{...formAsignacion.personalizado,[fecha]:e.target.value}})}>
                          <option value="">Descanso</option>
                          {horarios.map(h=><option key={h.id} value={h.id}>{h.nombre}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-5 bg-slate-50 border-t flex gap-4">
              <button onClick={guardarAsignacion} className="flex-1 bg-[#15305a] hover:bg-[#112a4f] text-white py-4 rounded-3xl font-semibold transition-all">Guardar Asignaciones</button>
              <button onClick={() => setModalAsignar(false)} className="flex-1 border border-slate-200 hover:bg-slate-100 py-4 rounded-3xl font-medium text-slate-700 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL EDITAR DÍA (MEJORADO) ═════════════════════ */}
      {modalEditarDia && diaEditando && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Editar Asignación</h3>
                <p className="text-slate-500 mt-0.5 text-sm">{diaEditando.empleadoNombre}</p>
                <p className="text-slate-400 text-xs">{diaEditando.fecha}</p>
              </div>
              <button onClick={()=>{setModalEditarDia(false);setDiaEditando(null);}} className="p-2 hover:bg-slate-100 rounded-2xl"><X size={20}/></button>
            </div>
            <div className="p-6">
              {diaEditando.horario_habitual_id && (
                <div className="mb-4 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-sm font-medium text-blue-800">Horario habitual para este día:</p>
                  <p className="text-lg font-bold text-blue-900">{diaEditando.horarioHabitualNombre}</p>
                </div>
              )}
              <label className="block text-sm font-medium mb-2 text-slate-700">Cambiar a:</label>
              <select
                className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]"
                value={diaEditando.horario_id}
                onChange={e => setDiaEditando({...diaEditando, horario_id: e.target.value})}
              >
                <option value="">Descanso / Sin asignar</option>
                {horarios.map(h => (
                  <option key={h.id} value={h.id}>{h.nombre} ({h.hora_entrada?.slice(0,5)}-{h.hora_salida?.slice(0,5)})</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-3">
                Esta asignación sobrescribirá el horario habitual para este día específico.
              </p>
            </div>
            <div className="p-5 bg-slate-50 border-t flex gap-4">
              <button onClick={guardarEdicionDia} className="flex-1 bg-[#15305a] hover:bg-[#112a4f] text-white py-4 rounded-3xl font-semibold">Guardar Cambios</button>
              <button onClick={()=>{setModalEditarDia(false);setDiaEditando(null);}} className="flex-1 border border-slate-200 hover:bg-slate-100 py-4 rounded-3xl font-medium text-slate-700">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ MODAL CRUD HORARIO BASE ══════════════════════ */}
      {modalHorario && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-slate-900">{modoEdicion?'Editar Horario':'Nuevo Horario Base'}</h3>
              <button onClick={()=>setModalHorario(false)} className="p-2 hover:bg-slate-100 rounded-2xl"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <input placeholder="Nombre del horario" value={formHorario.nombre}
                onChange={e=>setFormHorario({...formHorario,nombre:e.target.value})}
                className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]"/>
              <select value={formHorario.tipo_jornada} onChange={e=>setFormHorario({...formHorario,tipo_jornada:e.target.value})}
                className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]">
                {TIPOS_JORNADA.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={formHorario.tipo} onChange={e=>setFormHorario({...formHorario,tipo:e.target.value})}
                className="w-full border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]">
                {['Mañana','Tarde','Sábado AM','Sábado PM','Domingo AM','Domingo PM','Rotativo','Personalizado'].map(t=>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={formHorario.hora_entrada}
                  onChange={e=>setFormHorario({...formHorario,hora_entrada:e.target.value})}
                  className="border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]"/>
                <input type="time" value={formHorario.hora_salida}
                  onChange={e=>setFormHorario({...formHorario,hora_salida:e.target.value})}
                  className="border border-slate-200 rounded-3xl p-4 text-sm focus:outline-none focus:border-[#15305a]"/>
              </div>
              {['dias_trabajo','descansos'].map(campo=>(
                <div key={campo} className="border rounded-3xl p-4">
                  <label className="block text-sm font-medium mb-3 text-slate-700">
                    {campo==='dias_trabajo'?'Días de trabajo':'Días de descanso'}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {DIAS.map(dia=>(
                      <label key={dia} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formHorario[campo]?.includes(dia)||false}
                          onChange={()=>setFormHorario({...formHorario,[campo]:toggleCheck(formHorario[campo]||[],dia)})}
                          className="rounded text-[#15305a]"/>
                        <span className="text-sm">{dia}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formHorario.activo}
                  onChange={e=>setFormHorario({...formHorario,activo:e.target.checked})}
                  className="rounded text-[#15305a]"/>
                <span className="text-sm font-medium text-slate-700">Activo</span>
              </label>
            </div>
            <div className="p-5 bg-slate-50 border-t flex gap-4">
              <button onClick={guardarHorario} className="flex-1 bg-[#15305a] hover:bg-[#112a4f] text-white py-4 rounded-3xl font-semibold transition-all">Guardar Horario</button>
              <button onClick={()=>setModalHorario(false)} className="flex-1 border border-slate-200 hover:bg-slate-100 py-4 rounded-3xl font-medium text-slate-700 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}