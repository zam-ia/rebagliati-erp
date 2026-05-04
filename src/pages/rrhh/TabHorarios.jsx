// src/pages/rrhh/TabHorarios.jsx
// ─────────────────────────────────────────────────────────────────────────────
// VERSIÓN COMPACTA CON ROLES, FERIADOS Y SEPARACIÓN POR TIPO DE ÁREA
// (Estilo VIP optimizado – espacios reducidos, colores corporativos unificados)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Clock, Users, Calendar, Edit, Trash2, Plus,
  ChevronLeft, ChevronRight, Copy, Layers, X,
  Sun, CalendarDays, CalendarRange, Flag
} from 'lucide-react';

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const DIAS_CORTO = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const TIPOS_JORNADA = [
  { value: 'fijo_semanal', label: 'Full‑time fijo' },
  { value: 'fijo_variable', label: 'Full‑time variable' },
  { value: 'personalizado', label: 'Part‑time / Personalizado' },
];

const COLOR_TURNO = {
  'Mañana':     { bg:'bg-amber-50',  text:'text-amber-700',  border:'border-amber-200',  dot:'bg-amber-400' },
  'Tarde':      { bg:'bg-blue-50',   text:'text-blue-700',   border:'border-blue-200',   dot:'bg-blue-500' },
  'Sábado AM':  { bg:'bg-violet-50', text:'text-violet-700', border:'border-violet-200', dot:'bg-violet-500' },
  'Sábado PM':  { bg:'bg-purple-50', text:'text-purple-700', border:'border-purple-200', dot:'bg-purple-500' },
  'Domingo AM': { bg:'bg-rose-50',   text:'text-rose-700',   border:'border-rose-200',   dot:'bg-rose-500' },
  'Domingo PM': { bg:'bg-pink-50',   text:'text-pink-700',   border:'border-pink-200',   dot:'bg-pink-500' },
  default:      { bg:'bg-slate-50',  text:'text-slate-600',  border:'border-slate-200',  dot:'bg-slate-400' },
};

const ROLES_VENTAS = [
  { value: 'R1', label: 'R1' },
  { value: 'R2', label: 'R2' },
  { value: 'RS', label: 'Redes' },
  { value: 'E.Piso', label: 'E. Piso' },
];

const AREAS_APOYO = ['Marketing', 'Audiovisuales', 'Community', 'Sistemas'];
const AREAS_GESTION = ['Gerencia', 'RRHH', 'Logística', 'Coordinación Académica'];

const col = (tipo = '') => COLOR_TURNO[tipo] || COLOR_TURNO.default;
const toISO = (d) => d.toISOString().slice(0, 10);

function getSemanaDelMes(fecha) {
  const dia = fecha.getDate();
  return Math.ceil(dia / 7);
}

function getMondayOfWeek(ref) {
  const d = new Date(ref);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function NavFecha({ label, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-gray-800 text-sm">{label}</h3>
      <div className="flex gap-1">
        <button onClick={onPrev} className="p-1.5 hover:bg-blue-50 text-[#185FA5] rounded-lg transition-colors"><ChevronLeft size={16} /></button>
        <button onClick={onNext} className="p-1.5 hover:bg-blue-50 text-[#185FA5] rounded-lg transition-colors"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

function SubTabs({ options, active, onChange }) {
  return (
    <div className="flex gap-1 bg-white/80 border border-blue-50 p-1 rounded-xl shadow-sm">
      {options.map(({ id, label, icon }) => (
        <button key={id} onClick={() => onChange(id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-200
            ${active === id 
              ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md shadow-blue-500/20' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
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
  const [feriados, setFeriados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [areaExpandida, setAreaExpandida] = useState(null);
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [semanaRef, setSemanaRef] = useState(getMondayOfWeek(hoy));

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
    dias_trabajo: [], rotacion_finde: [], personalizado: {}, rol: ''
  });

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [horariosRes, empleadosRes, diariasRes, feriadosRes] = await Promise.all([
        supabase.from('horarios').select('*').order('tipo'),
        supabase.from('empleados').select('id, nombre, apellido, area').neq('estado', 'inactivo'),
        supabase.from('asignaciones_diarias').select('*, horarios(*)').order('fecha'),
        supabase.from('feriados').select('*'),
      ]);
      setHorarios(horariosRes.data || []);
      setEmpleados(empleadosRes.data || []);
      setAsignacionesDiarias(diariasRes.data || []);
      setFeriados((feriadosRes.data || []).map(f => f.fecha));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargarDatos(); }, []);

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

  const primerDiaMes = useMemo(() => new Date(anio, mes, 1), [anio, mes]);
  const diasEnMes = useMemo(() => new Date(anio, mes + 1, 0).getDate(), [anio, mes]);
  const diaInicioSemana = primerDiaMes.getDay();
  const diasDeSemana = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semanaRef);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [semanaRef]
  );
  const rangoMes = useMemo(() => ({
    ini: toISO(new Date(anio, mes, 1)),
    fin: toISO(new Date(anio, mes + 1, 0))
  }), [anio, mes]);

  const esFeriado = (fechaStr) => feriados.includes(fechaStr);

  const toggleFeriado = async (fechaStr) => {
    const existe = feriados.includes(fechaStr);
    if (existe) {
      await supabase.from('feriados').delete().eq('fecha', fechaStr);
      setFeriados(prev => prev.filter(f => f !== fechaStr));
    } else {
      await supabase.from('feriados').insert({ fecha: fechaStr, descripcion: '' });
      setFeriados(prev => [...prev, fechaStr]);
    }
  };

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

  const guardarHorario = async () => {
    if (!formHorario.nombre) return alert('Nombre del horario es obligatorio');
    const datos = { ...formHorario };
    delete datos.id;
    const res = modoEdicion && editandoId
      ? await supabase.from('horarios').update(datos).eq('id', editandoId)
      : await supabase.from('horarios').insert([datos]);
    if (res.error) alert('Error: ' + res.error.message);
    else { setModalHorario(false); cargarDatos(); }
  };

  const editarHorario = (h) => {
    setModoEdicion(true);
    setEditandoId(h.id);
    setFormHorario(h);
    setModalHorario(true);
  };

  const eliminarHorario = async (id) => {
    if (confirm('¿Eliminar este horario?')) {
      await supabase.from('horarios').delete().eq('id', id);
      cargarDatos();
    }
  };

  const toggleCheck = (arr, val) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const copiarAsignacionMesAnterior = () => {
    if (!formAsignacion.empleado_id) { alert('Primero selecciona un empleado'); return; }
    const mA = mes === 0 ? 11 : mes - 1, aA = mes === 0 ? anio - 1 : anio;
    const ini = toISO(new Date(aA, mA, 1)), fin = toISO(new Date(aA, mA + 1, 0));
    const prev = asignacionesDiarias.filter(a => a.empleado_id === formAsignacion.empleado_id && a.fecha >= ini && a.fecha <= fin);
    if (!prev.length) { alert('No hay asignaciones para el mes anterior'); return; }
    const personalizado = {};
    prev.forEach(a => { personalizado[a.fecha] = a.horario_id; });
    setFormAsignacion(p => ({ ...p, tipo_jornada: 'personalizado', personalizado, rol: '' }));
    alert(`Se copiaron ${prev.length} días del mes anterior.`);
  };

  const generarAsignaciones = () => {
    const { empleado_id, tipo_jornada, turno_base, dias_trabajo, rotacion_finde, personalizado, rol } = formAsignacion;
    if (!empleado_id) { alert('Selecciona un empleado'); return null; }
    const asigs = [];
    if (tipo_jornada === 'fijo_semanal') {
      const base = horarios.find(h => h.tipo === turno_base && h.tipo_jornada === 'fijo_semanal');
      if (!base) { alert(`No se encontró horario base ${turno_base}`); return null; }
      const horariosFinDeSemana = Object.fromEntries(
        ['Sábado AM','Sábado PM','Domingo AM','Domingo PM'].map(t => [t, horarios.find(h => h.tipo === t)])
      );
      for (let d = new Date(anio, mes, 1); d <= new Date(anio, mes + 1, 0); d.setDate(d.getDate() + 1)) {
        const fechaStr = toISO(d);
        if (esFeriado(fechaStr)) continue;
        const wd = d.getDay();
        const obj = { empleado_id, fecha: fechaStr, horario_id: base.id };
        if (rol) obj.rol = rol;
        if (wd >= 1 && wd <= 5) {
          asigs.push(obj);
        } else {
          const semanaMes = getSemanaDelMes(d);
          const rot = rotacion_finde.find(r => r.semana === semanaMes);
          if (rot && rot.turno) {
            const horarioFin = horariosFinDeSemana[rot.turno];
            if (horarioFin) asigs.push({ ...obj, horario_id: horarioFin.id });
          }
        }
      }
    } else if (tipo_jornada === 'fijo_variable') {
      const horVar = horarios.find(h => h.tipo === turno_base);
      if (!horVar) { alert('No se encontró horario'); return null; }
      for (let d = new Date(anio, mes, 1); d <= new Date(anio, mes + 1, 0); d.setDate(d.getDate() + 1)) {
        const fechaStr = toISO(d);
        if (esFeriado(fechaStr)) continue;
        const nombre = DIAS[d.getDay() === 0 ? 6 : d.getDay() - 1];
        if (dias_trabajo.includes(nombre)) {
          const obj = { empleado_id, fecha: fechaStr, horario_id: horVar.id };
          if (rol) obj.rol = rol;
          asigs.push(obj);
        }
      }
    } else {
      Object.entries(personalizado).forEach(([fecha, horario_id]) => {
        if (esFeriado(fecha)) return;
        if (horario_id) {
          const obj = { empleado_id, fecha, horario_id };
          if (rol) obj.rol = rol;
          asigs.push(obj);
        }
      });
    }
    return asigs;
  };

  const guardarAsignacion = async () => {
    const asigs = generarAsignaciones();
    if (!asigs || !asigs.length) {
      alert('No se generaron asignaciones (puede ser por feriados).');
      return;
    }
    setCargando(true);
    await supabase.from('asignaciones_diarias').delete()
      .eq('empleado_id', formAsignacion.empleado_id)
      .gte('fecha', rangoMes.ini).lte('fecha', rangoMes.fin);
    const { error } = await supabase.from('asignaciones_diarias').insert(asigs);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Asignaciones guardadas');
      setModalAsignar(false);
      setFormAsignacion({
        empleado_id: '', tipo_jornada: 'fijo_semanal', turno_base: 'Mañana',
        dias_trabajo: [], rotacion_finde: [], personalizado: {}, rol: ''
      });
      cargarDatos();
    }
    setCargando(false);
  };

  const guardarEdicionDia = async () => {
    if (!diaEditando) return;
    const { empleado_id, fecha, horario_id, rol } = diaEditando;
    if (!horario_id) {
      await supabase.from('asignaciones_diarias').delete().eq('empleado_id', empleado_id).eq('fecha', fecha);
    } else {
      await supabase.from('asignaciones_diarias').upsert(
        { empleado_id, fecha, horario_id, rol: rol || null },
        { onConflict: 'empleado_id,fecha' }
      );
    }
    cargarDatos();
    setModalEditarDia(false);
    setDiaEditando(null);
  };

  const getHorarioHabitual = (emp, fechaStr) => {
    const existente = getAsignacionDia(emp.id, fechaStr);
    if (existente) return existente;
    const d = new Date(fechaStr + 'T00:00:00');
    const wd = d.getDay();
    const asigsMes = asignacionesDiarias.filter(a => a.empleado_id === emp.id && a.fecha >= rangoMes.ini && a.fecha <= rangoMes.fin);
    const mismoDia = asigsMes.find(a => new Date(a.fecha + 'T00:00:00').getDay() === wd);
    return mismoDia ? mismoDia.horarios : null;
  };

  const abrirEditarDia = (emp, fechaStr) => {
    const a = asignacionesDiarias.find(a => a.empleado_id === emp.id && a.fecha === fechaStr);
    const horarioActual = a ? a.horarios : null;
    const horarioHabitual = getHorarioHabitual(emp, fechaStr);
    setDiaEditando({
      empleado_id: emp.id,
      fecha: fechaStr,
      horario_id: horarioActual?.id || '',
      rol: a?.rol || '',
      horario_habitual_id: horarioHabitual?.id || null,
      empleadoNombre: `${emp.nombre} ${emp.apellido}`,
      horarioHabitualNombre: horarioHabitual?.nombre || 'Sin horario habitual'
    });
    setModalEditarDia(true);
  };

  return (
    <div className="space-y-4">
      {/* KPIs + Acciones rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-blue-50 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-[#185FA5] rounded-xl"><Clock size={20} /></div>
          <div>
            <p className="text-[9px] tracking-widest text-gray-400 uppercase font-bold">Turnos activos</p>
            <p className="text-xl font-black text-gray-800">{horarios.length}</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-blue-50 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-[#185FA5] rounded-xl"><Users size={20} /></div>
          <div>
            <p className="text-[9px] tracking-widest text-gray-400 uppercase font-bold">Asignados</p>
            <p className="text-xl font-black text-gray-800">{new Set(asignacionesDiarias.map(a => a.empleado_id)).size}</p>
          </div>
        </div>
        <button onClick={() => setModalAsignar(true)}
          className="bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white rounded-2xl flex items-center justify-center gap-2 font-bold py-2.5 text-xs shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all">
          <Calendar size={15} /> Nueva Asignación
        </button>
        <button onClick={() => {
          setModoEdicion(false);
          setFormHorario({ nombre:'', tipo:'Mañana', hora_entrada:'', hora_salida:'', dias_trabajo:[], descansos:[], activo:true, tipo_jornada:'fijo_semanal' });
          setModalHorario(true);
        }}
          className="border-2 border-gray-200 hover:bg-gray-100 text-gray-700 rounded-2xl flex items-center justify-center gap-2 font-bold py-2.5 text-xs transition-all">
          <Plus size={15} /> Nuevo Horario Base
        </button>
      </div>

      {/* Tabs principales */}
      <div className="flex gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-blue-50 shadow-sm">
        <button onClick={() => setVistaActiva('calendario')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${vistaActiva==='calendario' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Calendar size={14} /> Calendario
        </button>
        <button onClick={() => setVistaActiva('areas')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${vistaActiva==='areas' ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Layers size={14} /> Por Áreas
        </button>
      </div>

      {/* ═══════════════════════ CALENDARIO GENERAL ════════════════════════ */}
      {vistaActiva === 'calendario' && (
        <div className="space-y-4">
          <SubTabs active={subCalendario} onChange={setSubCalendario}
            options={[
              { id:'semana', label:'Semana', icon:<CalendarDays size={12}/> },
              { id:'mes', label:'Mes', icon:<CalendarRange size={12}/> },
            ]}
          />
          {subCalendario === 'semana' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-50 p-4 shadow-xl shadow-blue-100/20">
              <NavFecha
                label={`Semana del ${diasDeSemana[0].getDate()} al ${diasDeSemana[6].getDate()} de ${MESES[diasDeSemana[3].getMonth()]} ${diasDeSemana[3].getFullYear()}`}
                onPrev={() => cambiarSemana(-1)} onNext={() => cambiarSemana(1)}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-3 text-gray-400 font-bold text-[9px] uppercase w-36">Colaborador</th>
                      {diasDeSemana.map((d, i) => {
                        const fecha = toISO(d);
                        const feriado = esFeriado(fecha);
                        const esFin = d.getDay()===0||d.getDay()===6;
                        return (
                          <th key={i} className={`text-center py-2 px-1.5 text-[9px] font-bold uppercase ${feriado ? 'text-red-500' : esFin?'text-violet-500':'text-gray-400'}`}>
                            <div>{DIAS_CORTO[i]}</div>
                            <div className={`text-xs font-bold mt-0.5 ${feriado ? 'text-red-600 bg-red-50 rounded-full mx-auto w-5 h-5 flex items-center justify-center' : esFin?'text-violet-600':'text-gray-700'}`}>
                              {d.getDate()}
                              {feriado && <Flag size={8} className="ml-0.5 inline" />}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {empleados.map(emp => {
                      const row = diasDeSemana.map(d => {
                        const fecha = toISO(d);
                        if (esFeriado(fecha)) return null;
                        return getAsignacionDia(emp.id, fecha);
                      });
                      if (!row.some(Boolean)) return null;
                      return (
                        <tr key={emp.id} className="hover:bg-blue-50/30">
                          <td className="py-2 pr-3">
                            <div className="font-semibold text-gray-800 truncate max-w-[120px] text-[11px]">{emp.apellido}, {emp.nombre.split(' ')[0]}</div>
                            <div className="text-[8px] text-gray-400">{emp.area}</div>
                          </td>
                          {row.map((h, i) => {
                            const fecha = toISO(diasDeSemana[i]);
                            const feriado = esFeriado(fecha);
                            if (feriado) return <td key={i} className="py-2 px-0.5 text-center"><span className="text-red-300 text-[10px]">—</span></td>;
                            const c = col(h?.tipo);
                            const a = asignacionesDiarias.find(a => a.empleado_id === emp.id && a.fecha === fecha);
                            const rol = a?.rol;
                            return (
                              <td key={i} className="py-2 px-0.5 text-center">
                                {h ? (
                                  <button onClick={() => abrirEditarDia(emp, fecha)} title={h.nombre}
                                    className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold border shadow-sm ${c.bg} ${c.text} ${c.border} hover:opacity-80 transition-all`}>
                                    {h.tipo==='Mañana'?'M':h.tipo==='Tarde'?'T':h.tipo.slice(0,3)}
                                    {rol ? ` (${rol})` : ''}
                                  </button>
                                ) : (
                                  <button onClick={() => abrirEditarDia(emp, fecha)} className="text-gray-300 hover:text-gray-500 text-[10px]">+</button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
                {Object.entries(COLOR_TURNO).filter(([k])=>k!=='default').map(([tipo, c]) => (
                  <div key={tipo} className="flex items-center gap-1 text-[9px] text-gray-500">
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} /> {tipo}
                  </div>
                ))}
              </div>
            </div>
          )}

          {subCalendario === 'mes' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-50 p-4 shadow-xl shadow-blue-100/20">
              <NavFecha label={`${MESES[mes]} ${anio}`} onPrev={() => cambiarMes(-1)} onNext={() => cambiarMes(1)} />
              <div className="grid grid-cols-7 gap-1.5">
                {DIAS.map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-gray-400 py-2 border-b border-gray-100">
                    {d.slice(0,3)}
                  </div>
                ))}
                {Array.from({ length: diaInicioSemana }).map((_, i) => (
                  <div key={`e${i}`} className="h-16 bg-gray-100/50 border border-gray-100 rounded-xl" />
                ))}
                {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(dia => {
                  const d = new Date(anio, mes, dia);
                  const fs = toISO(d);
                  const esFin = d.getDay()===0||d.getDay()===6;
                  const esHoy = fs === toISO(hoy);
                  const feriado = esFeriado(fs);
                  const asigs = feriado ? [] : asignacionesDiarias.filter(a => a.fecha === fs);
                  return (
                    <div key={dia}
                      onClick={() => toggleFeriado(fs)}
                      className={`h-16 border rounded-xl p-1.5 overflow-y-auto transition-all text-[9px] cursor-pointer group
                        ${feriado ? 'bg-red-50 border-red-200' : ''}
                        ${esHoy && !feriado ? 'border-[#185FA5] ring-1 ring-[#185FA5]/10' : ''}
                        ${esFin && !feriado ? 'bg-violet-50/40 border-violet-100' : ''}
                        ${!feriado && !esHoy && !esFin ? 'bg-white border-gray-100 hover:border-gray-200' : ''}`}>
                      <div className={`font-bold mb-0.5 flex justify-between items-center
                        ${feriado ? 'text-red-600' : esHoy?'text-[#185FA5]':esFin?'text-violet-600':'text-gray-400'}`}>
                        <span className="text-[10px]">{dia}</span>
                        {feriado && <Flag size={10} className="text-red-500" />}
                      </div>
                      {feriado ? (
                        <p className="text-red-400 italic text-[7px]">Feriado</p>
                      ) : (
                        <>
                          {asigs.slice(0,3).map(a => {
                            const emp = empleados.find(e => e.id === a.empleado_id);
                            const c = col(a.horarios?.tipo);
                            if (!emp) return null;
                            return (
                              <div key={a.id} className={`rounded px-1 py-px mb-px truncate font-medium text-[8px] ${c.bg} ${c.text}`}>
                                {emp.nombre.split(' ')[0]}
                                {a.rol ? ` (${a.rol})` : ''}
                              </div>
                            );
                          })}
                          {asigs.length > 3 && <div className="text-gray-400 text-[8px]">+{asigs.length-3}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Clic en un día para marcarlo/desmarcarlo como feriado</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ POR ÁREAS ═══════════════════════════════ */}
      {vistaActiva === 'areas' && (
        <div className="space-y-4">
          <SubTabs active={subAreas} onChange={setSubAreas}
            options={[
              { id:'semana', label:'Semana', icon:<CalendarDays size={12}/> },
              { id:'mes', label:'Mes', icon:<CalendarRange size={12}/> },
              { id:'finde', label:'Fin de Semana',icon:<Sun size={12}/> },
            ]}
          />

          {subAreas === 'semana' && (
            <div className="space-y-6">
              <NavFecha
                label={`Semana del ${diasDeSemana[0].getDate()} al ${diasDeSemana[6].getDate()} de ${MESES[diasDeSemana[3].getMonth()]}`}
                onPrev={() => cambiarSemana(-1)} onNext={() => cambiarSemana(1)}
              />
              {['Ventas','Apoyo','Gestión'].map(tipo => {
                const areasFiltradas = areasUnicas.filter(area => {
                  if (tipo === 'Ventas') return !AREAS_APOYO.includes(area) && !AREAS_GESTION.includes(area);
                  if (tipo === 'Apoyo') return AREAS_APOYO.includes(area);
                  return AREAS_GESTION.includes(area);
                });
                if (!areasFiltradas.length) return null;
                return (
                  <div key={tipo}>
                    <h3 className={`text-sm font-bold mb-3 ${
                      tipo==='Ventas' ? 'text-gray-800' :
                      tipo==='Apoyo' ? 'text-emerald-800' : 'text-violet-800'
                    }`}>{tipo}</h3>
                    {areasFiltradas.map(area => {
                      const empArea = empleados.filter(e => e.area === area);
                      const tieneAsigs = empArea.some(e => diasDeSemana.some(d => !esFeriado(toISO(d)) && getAsignacionDia(e.id, toISO(d))));
                      if (!tieneAsigs) return null;
                      const key = area + '_' + tipo + '_sw';
                      const colorExtra = tipo === 'Apoyo' ? 'border-emerald-200 bg-emerald-50/30' :
                                         tipo === 'Gestión' ? 'border-purple-200 bg-purple-50/30' : '';
                      return (
                        <div key={area} className={`bg-white/80 backdrop-blur-sm rounded-2xl border overflow-hidden shadow-sm mb-3 ${colorExtra}`}>
                          <button onClick={() => setAreaExpandida(areaExpandida === key ? null : key)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors">
                            <span className="font-bold text-gray-800 text-xs">{area}
                              <span className="ml-2 text-[10px] font-normal text-gray-400">
                                ({empArea.filter(e => diasDeSemana.some(d => !esFeriado(toISO(d)) && getAsignacionDia(e.id, toISO(d)))).length} activos)
                              </span>
                            </span>
                            <ChevronRight size={16} className={`text-[#185FA5] transition-transform ${areaExpandida===key?'rotate-90':''}`} />
                          </button>
                          {areaExpandida === key && (
                            <div className="p-3 overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 pr-3 text-gray-400 font-bold text-[9px] uppercase w-36">Colaborador</th>
                                    {diasDeSemana.map((d, i) => {
                                      const fecha = toISO(d);
                                      const feriado = esFeriado(fecha);
                                      return (
                                        <th key={i} className={`text-center py-2 px-1.5 text-[9px] font-bold ${feriado?'text-red-500':d.getDay()===0||d.getDay()===6?'text-violet-500':'text-gray-400'}`}>
                                          <div>{DIAS_CORTO[i]}</div>
                                          <div className="font-bold text-gray-700 text-[10px]">{d.getDate()}</div>
                                        </th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {empArea.map(emp => {
                                    const row = diasDeSemana.map(d => esFeriado(toISO(d)) ? null : getAsignacionDia(emp.id, toISO(d)));
                                    if (!row.some(Boolean)) return null;
                                    return (
                                      <tr key={emp.id} className="hover:bg-blue-50/30">
                                        <td className="py-2 pr-3">
                                          <div className="font-medium text-gray-800 text-[11px]">{emp.apellido}, {emp.nombre.split(' ')[0]}</div>
                                        </td>
                                        {row.map((h, i) => {
                                          const fecha = toISO(diasDeSemana[i]);
                                          if (esFeriado(fecha)) return <td key={i} className="py-2 px-0.5 text-center"><span className="text-red-300">—</span></td>;
                                          const c = col(h?.tipo);
                                          const a = asignacionesDiarias.find(a => a.empleado_id === emp.id && a.fecha === fecha);
                                          const rol = a?.rol;
                                          return (
                                            <td key={i} className="py-2 px-0.5 text-center">
                                              {h ? (
                                                <button onClick={() => abrirEditarDia(emp, fecha)} title={h.nombre}
                                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-semibold border shadow-sm ${c.bg} ${c.text} ${c.border} hover:opacity-80`}>
                                                  {h.hora_entrada?.slice(0,5)}–{h.hora_salida?.slice(0,5)}
                                                  {rol ? ` (${rol})` : ''}
                                                </button>
                                              ) : <button onClick={() => abrirEditarDia(emp, fecha)} className="text-gray-300 hover:text-gray-500">+</button>}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {subAreas === 'mes' && (
            <div className="space-y-6">
              <NavFecha label={`${MESES[mes]} ${anio}`} onPrev={() => cambiarMes(-1)} onNext={() => cambiarMes(1)} />
              {['Ventas','Apoyo','Gestión'].map(tipo => {
                const areasFiltradas = areasUnicas.filter(area => {
                  if (tipo === 'Ventas') return !AREAS_APOYO.includes(area) && !AREAS_GESTION.includes(area);
                  if (tipo === 'Apoyo') return AREAS_APOYO.includes(area);
                  return AREAS_GESTION.includes(area);
                });
                if (!areasFiltradas.length) return null;
                return (
                  <div key={tipo}>
                    <h3 className={`text-sm font-bold mb-3 ${
                      tipo==='Ventas' ? 'text-gray-800' :
                      tipo==='Apoyo' ? 'text-emerald-800' : 'text-violet-800'
                    }`}>{tipo}</h3>
                    {areasFiltradas.map(area => {
                      const data = empleadosPorAreaYTurno(rangoMes.ini, rangoMes.fin)[area] || { Mañana:[], Tarde:[], FinDeSemana:[] };
                      const total = data.Mañana.length + data.Tarde.length + data.FinDeSemana.length;
                      if (!total) return null;
                      const colorExtra = tipo === 'Apoyo' ? 'border-emerald-200 bg-emerald-50/30' :
                                         tipo === 'Gestión' ? 'border-purple-200 bg-purple-50/30' : '';
                      return (
                        <div key={area} className={`bg-white/80 backdrop-blur-sm rounded-2xl border overflow-hidden shadow-sm mb-3 ${colorExtra}`}>
                          <button onClick={() => setAreaExpandida(areaExpandida === area ? null : area)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800 text-xs">{area}</span>
                              <span className="text-[10px] text-gray-400">({total} colaboradores)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[['Mañana', data.Mañana.length, COLOR_TURNO.Mañana],
                                ['Tarde', data.Tarde.length, COLOR_TURNO.Tarde],
                                ['F.Sem', data.FinDeSemana.length, COLOR_TURNO['Sábado AM']]].map(([lbl, n, c]) =>
                                n > 0 && <span key={lbl} className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${c.bg} ${c.text}`}>{lbl}: {n}</span>
                              )}
                              <ChevronRight size={14} className={`text-[#185FA5] transition-transform ml-1 ${areaExpandida===area?'rotate-90':''}`} />
                            </div>
                          </button>
                          {areaExpandida === area && (
                            <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[
                                { key:'Mañana', label:'Turno Mañana', c:COLOR_TURNO.Mañana },
                                { key:'Tarde', label:'Turno Tarde', c:COLOR_TURNO.Tarde },
                                { key:'FinDeSemana', label:'Fin de Semana', c:COLOR_TURNO['Sábado AM'] },
                              ].map(({ key, label, c }) => (
                                <div key={key}>
                                  <h4 className={`font-bold text-xs mb-2 ${c.text}`}>{label}</h4>
                                  <div className="space-y-1.5">
                                    {data[key].map(emp => {
                                      const a = asignacionesDiarias.find(a => a.empleado_id === emp.id && a.fecha >= rangoMes.ini && a.fecha <= rangoMes.fin);
                                      const rol = a?.rol;
                                      return (
                                        <div key={emp.id} className={`flex items-center justify-between rounded-xl px-3 py-1.5 border ${c.bg} ${c.border}`}>
                                          <span className={`font-medium text-[11px] ${c.text}`}>
                                            {emp.nombre} {emp.apellido}
                                            {rol ? ` (${rol})` : ''}
                                          </span>
                                          <button onClick={() => abrirEditarDia(emp, rangoMes.ini)}
                                            className="text-gray-400 hover:text-[#185FA5] p-0.5 rounded hover:bg-white/50 transition-all">
                                            <Edit size={12} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                    {!data[key].length && <p className="text-[10px] text-gray-400 italic py-1">Sin personal asignado</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {subAreas === 'finde' && (() => {
            const finesDeSemana = [];
            const current = new Date(anio, mes, 1);
            while (current.getMonth() === mes) {
              const day = current.getDay();
              if (day === 6) {
                const sab = new Date(current);
                const dom = new Date(current);
                dom.setDate(dom.getDate() + 1);
                finesDeSemana.push({
                  sab: sab.getMonth() === mes ? sab : null,
                  dom: dom.getMonth() === mes ? dom : null
                });
                current.setDate(current.getDate() + 2);
              } else if (day === 0) {
                finesDeSemana.push({ sab: null, dom: new Date(current) });
                current.setDate(current.getDate() + 1);
              } else {
                current.setDate(current.getDate() + 1);
              }
            }
            return (
              <div className="space-y-3">
                <NavFecha label={`Fin de Semana — ${MESES[mes]} ${anio}`} onPrev={() => cambiarMes(-1)} onNext={() => cambiarMes(1)} />
                {finesDeSemana.map((fin, si) => {
                  const fechasFin = [fin.sab, fin.dom].filter(Boolean).map(toISO);
                  const totalAsigs = asignacionesDiarias.filter(a => fechasFin.includes(a.fecha) && !esFeriado(a.fecha)).length;
                  return (
                    <div key={si} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-50 overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-[#11284e] to-[#185FA5] px-4 py-2.5 flex items-center justify-between">
                        <span className="text-white font-bold text-xs">
                          Fin de Semana {si+1}
                          {fin.sab && ` · Sáb ${fin.sab.getDate()}/${mes+1}`}
                          {fin.dom && ` · Dom ${fin.dom.getDate()}/${mes+1}`}
                        </span>
                        <span className="text-white/70 text-[10px]">{totalAsigs} asignaciones</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                        {[{ dia:fin.sab, label:'Sábado' }, { dia:fin.dom, label:'Domingo' }].map(({ dia, label }) => {
                          if (!dia) return (
                            <div key={label} className="p-3 text-center text-gray-300 text-[10px] italic py-6">{label} fuera del mes</div>
                          );
                          const fs = toISO(dia);
                          const feriado = esFeriado(fs);
                          if (feriado) return (
                            <div key={label} className="p-3 text-center">
                              <p className="text-red-500 font-bold text-xs">Feriado</p>
                            </div>
                          );
                          const asigsDia = asignacionesDiarias.filter(a => a.fecha === fs);
                          const tiposOrden = label==='Sábado' ? ['Sábado AM','Sábado PM'] : ['Domingo AM','Domingo PM'];
                          return (
                            <div key={label} className="p-3">
                              <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${label==='Sábado'?'text-violet-600':'text-rose-600'}`}>
                                {label} {dia.getDate()}/{mes+1}
                                <span className="ml-1.5 font-normal text-gray-400">({asigsDia.length} asignados)</span>
                              </div>
                              {!asigsDia.length ? (
                                <p className="text-[10px] text-gray-300 italic">Sin asignaciones</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {tiposOrden.map(tipoTurno => {
                                    const empsTurno = asigsDia.filter(a => a.horarios?.tipo === tipoTurno);
                                    if (!empsTurno.length) return null;
                                    const c = col(tipoTurno);
                                    const h0 = empsTurno[0]?.horarios;
                                    return (
                                      <div key={tipoTurno} className={`rounded-xl p-2.5 border ${c.bg} ${c.border}`}>
                                        <div className={`text-[9px] font-bold uppercase mb-1 ${c.text}`}>
                                          {tipoTurno} · {h0?.hora_entrada?.slice(0,5)} – {h0?.hora_salida?.slice(0,5)}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {empsTurno.map(a => {
                                            const emp = empleados.find(e => e.id === a.empleado_id);
                                            if (!emp) return null;
                                            return (
                                              <button key={a.id} onClick={() => abrirEditarDia(emp, fs)} title="Clic para editar"
                                                className={`text-[9px] font-medium px-2 py-0.5 rounded-lg bg-white/80 border ${c.border} ${c.text} hover:opacity-75 transition-all`}>
                                                {emp.nombre.split(' ')[0]} {emp.apellido.split(' ')[0]}
                                                {a.rol ? ` (${a.rol})` : ''}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
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
      <div className="pt-1">
        <h3 className="font-bold text-lg text-gray-800 mb-3">Horarios Base Configurados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {horarios.map(h => {
            const c = col(h.tipo);
            return (
              <div key={h.id} className={`bg-white/80 backdrop-blur-sm p-4 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${c.border}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`w-2 h-2 rounded-full ${c.dot} mb-1.5`} />
                    <h4 className="font-bold text-gray-800 text-sm">{h.nombre}</h4>
                    <p className="text-xs text-gray-500">{h.hora_entrada?.slice(0,5)} — {h.hora_salida?.slice(0,5)}</p>
                    <div className="flex gap-1.5 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${c.bg} ${c.text}`}>{h.tipo}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                        {TIPOS_JORNADA.find(t=>t.value===h.tipo_jornada)?.label.split(' ')[0]||h.tipo_jornada}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editarHorario(h)} className="p-1.5 text-gray-400 hover:text-[#185FA5] hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14}/></button>
                    <button onClick={() => eliminarHorario(h.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═════════════════ MODAL ASIGNAR HORARIO MENSUAL ═══════════════════ */}
      {modalAsignar && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-start justify-center overflow-y-auto z-[100] p-4 pt-[8vh] pb-[8vh]">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-[#11284e]">Asignar Horario Mensual</h3>
                <p className="text-gray-500 text-xs mt-0.5">{MESES[mes]} {anio}</p>
              </div>
              <button onClick={() => setModalAsignar(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <select value={formAsignacion.empleado_id} onChange={e => setFormAsignacion({...formAsignacion, empleado_id: e.target.value, rol: ''})}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                <option value="">Seleccione un empleado</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.apellido}, {e.nombre} ({e.area})</option>)}
              </select>

              {formAsignacion.empleado_id && (() => {
                const emp = empleados.find(e => e.id === formAsignacion.empleado_id);
                if (emp && !AREAS_APOYO.includes(emp.area) && !AREAS_GESTION.includes(emp.area)) {
                  return (
                    <select value={formAsignacion.rol} onChange={e => setFormAsignacion({...formAsignacion, rol: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                      <option value="">Sin rol</option>
                      {ROLES_VENTAS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  );
                }
                return null;
              })()}

              <button type="button" onClick={copiarAsignacionMesAnterior}
                className="w-full bg-gray-100 hover:bg-gray-200 text-[#185FA5] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                <Copy size={14}/> Copiar asignación del mes anterior
              </button>

              <select value={formAsignacion.tipo_jornada} onChange={e => setFormAsignacion({...formAsignacion, tipo_jornada: e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                {TIPOS_JORNADA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              {formAsignacion.tipo_jornada === 'fijo_semanal' && (
                <>
                  <select value={formAsignacion.turno_base} onChange={e => setFormAsignacion({...formAsignacion, turno_base: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                    <option value="Mañana">Turno Mañana</option>
                    <option value="Tarde">Turno Tarde</option>
                  </select>
                  <div className="border border-gray-100 rounded-xl p-3">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Rotación fines de semana</label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {[1,2,3,4,5].map(semana => (
                        <div key={semana} className="flex items-center gap-2">
                          <span className="w-20 text-xs text-gray-600">Semana {semana}</span>
                          <select
                            className="flex-1 border-2 border-gray-100 rounded-lg px-3 py-1.5 text-xs bg-white focus:border-blue-500 outline-none"
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
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                    <option value="Mañana">Horario Mañana</option>
                    <option value="Tarde">Horario Tarde</option>
                  </select>
                  <div className="border border-gray-100 rounded-xl p-3">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Días de trabajo</label>
                    <div className="flex flex-wrap gap-2">
                      {DIAS.map(dia => (
                        <label key={dia} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={formAsignacion.dias_trabajo.includes(dia)}
                            onChange={() => setFormAsignacion({...formAsignacion,dias_trabajo:toggleCheck(formAsignacion.dias_trabajo,dia)})}
                            className="rounded text-[#185FA5] w-4 h-4"/>
                          <span className="text-xs text-gray-600">{dia}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {formAsignacion.tipo_jornada === 'personalizado' && (
                <div className="border border-gray-100 rounded-xl p-3 max-h-56 overflow-y-auto">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Asignar día por día</p>
                  {Array.from({length:diasEnMes},(_,i)=>i+1).map(dia => {
                    const fecha = toISO(new Date(anio,mes,dia));
                    const wd = new Date(anio,mes,dia).getDay();
                    const esFin = wd===0||wd===6;
                    const feriado = esFeriado(fecha);
                    return (
                      <div key={dia} className="flex items-center gap-2 mb-1.5">
                        <span className={`w-20 text-xs ${feriado ? 'text-red-500' : esFin?'text-violet-600 font-bold':'text-gray-600'}`}>
                          {dia} {DIAS_CORTO[wd===0?6:wd-1]} {feriado?'(F)':''}
                        </span>
                        {feriado ? (
                          <span className="flex-1 text-[10px] text-red-400">Feriado</span>
                        ) : (
                          <select className="flex-1 border-2 border-gray-100 rounded-lg px-3 py-1.5 text-xs bg-white focus:border-blue-500 outline-none"
                            value={formAsignacion.personalizado[fecha]||''}
                            onChange={e => setFormAsignacion({...formAsignacion,personalizado:{...formAsignacion.personalizado,[fecha]:e.target.value}})}>
                            <option value="">Descanso</option>
                            {horarios.map(h=><option key={h.id} value={h.id}>{h.nombre}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 rounded-b-3xl p-4 flex gap-3">
              <button onClick={guardarAsignacion} className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] hover:from-[#185FA5] hover:to-[#1a6ab8] text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">Guardar Asignaciones</button>
              <button onClick={() => setModalAsignar(false)} className="flex-1 border-2 border-gray-200 hover:bg-gray-100 py-3 rounded-xl font-bold text-xs text-gray-600 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL EDITAR DÍA ═══════════════════ */}
      {modalEditarDia && diaEditando && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-start justify-center overflow-y-auto z-[100] p-4 pt-[8vh] pb-[8vh]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-[#11284e]">Editar Asignación</h3>
                <p className="text-gray-500 text-xs mt-0.5">{diaEditando.empleadoNombre}</p>
                <p className="text-gray-400 text-[10px]">{diaEditando.fecha}</p>
              </div>
              <button onClick={()=>{setModalEditarDia(false);setDiaEditando(null);}} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {diaEditando.horario_habitual_id && (
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-800">Horario habitual:</p>
                  <p className="text-sm font-black text-blue-900">{diaEditando.horarioHabitualNombre}</p>
                </div>
              )}
              
              {!esFeriado(diaEditando.fecha) ? (
                <>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Cambiar horario:</label>
                  <select
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                    value={diaEditando.horario_id}
                    onChange={e => setDiaEditando({...diaEditando, horario_id: e.target.value})}
                  >
                    <option value="">Descanso / Sin asignar</option>
                    {horarios.map(h => (
                      <option key={h.id} value={h.id}>{h.nombre} ({h.hora_entrada?.slice(0,5)}-{h.hora_salida?.slice(0,5)})</option>
                    ))}
                  </select>
                  
                  {(() => {
                    const emp = empleados.find(e => e.id === diaEditando.empleado_id);
                    if (emp && !AREAS_APOYO.includes(emp.area) && !AREAS_GESTION.includes(emp.area)) {
                      return (
                        <>
                          <label className="block text-xs font-bold text-gray-500 uppercase mt-3">Rol en ventas:</label>
                          <select
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                            value={diaEditando.rol || ''}
                            onChange={e => setDiaEditando({...diaEditando, rol: e.target.value})}
                          >
                            <option value="">Sin rol</option>
                            {ROLES_VENTAS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </>
                      );
                    }
                    return null;
                  })()}
                </>
              ) : (
                <div className="bg-red-50 p-3 rounded-2xl text-red-700 text-sm font-medium">
                  Este día está marcado como feriado. No se pueden asignar horarios.
                </div>
              )}
              <p className="text-[10px] text-gray-400">
                Esta asignación sobrescribirá el horario habitual para este día específico.
              </p>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 rounded-b-3xl p-4 flex gap-3">
              <button onClick={guardarEdicionDia} disabled={esFeriado(diaEditando.fecha) && diaEditando.horario_id}
                className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-[0.98]">
                Guardar Cambios
              </button>
              <button onClick={()=>{setModalEditarDia(false);setDiaEditando(null);}} className="flex-1 border-2 border-gray-200 hover:bg-gray-100 py-3 rounded-xl font-bold text-xs text-gray-600 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ MODAL CRUD HORARIO BASE ══════════════════════ */}
      {modalHorario && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-start justify-center overflow-y-auto z-[100] p-4 pt-[8vh] pb-[8vh]">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-[#11284e]">{modoEdicion?'Editar Horario':'Nuevo Horario Base'}</h3>
              <button onClick={()=>setModalHorario(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <input placeholder="Nombre del horario" value={formHorario.nombre}
                onChange={e=>setFormHorario({...formHorario,nombre:e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"/>
              <select value={formHorario.tipo_jornada} onChange={e=>setFormHorario({...formHorario,tipo_jornada:e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                {TIPOS_JORNADA.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={formHorario.tipo} onChange={e=>setFormHorario({...formHorario,tipo:e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
                {['Mañana','Tarde','Sábado AM','Sábado PM','Domingo AM','Domingo PM','Rotativo','Personalizado'].map(t=>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={formHorario.hora_entrada}
                  onChange={e=>setFormHorario({...formHorario,hora_entrada:e.target.value})}
                  className="border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"/>
                <input type="time" value={formHorario.hora_salida}
                  onChange={e=>setFormHorario({...formHorario,hora_salida:e.target.value})}
                  className="border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"/>
              </div>
              {['dias_trabajo','descansos'].map(campo=>(
                <div key={campo} className="border border-gray-100 rounded-xl p-3">
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                    {campo==='dias_trabajo'?'Días de trabajo':'Días de descanso'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DIAS.map(dia=>(
                      <label key={dia} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={formHorario[campo]?.includes(dia)||false}
                          onChange={()=>setFormHorario({...formHorario,[campo]:toggleCheck(formHorario[campo]||[],dia)})}
                          className="rounded text-[#185FA5] w-4 h-4"/>
                        <span className="text-xs text-gray-600">{dia}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formHorario.activo}
                  onChange={e=>setFormHorario({...formHorario,activo:e.target.checked})}
                  className="rounded text-[#185FA5] w-4 h-4"/>
                <span className="text-xs font-bold text-gray-700">Activo</span>
              </label>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 rounded-b-3xl p-4 flex gap-3">
              <button onClick={guardarHorario} className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] hover:from-[#185FA5] hover:to-[#1a6ab8] text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">Guardar Horario</button>
              <button onClick={()=>setModalHorario(false)} className="flex-1 border-2 border-gray-200 hover:bg-gray-100 py-3 rounded-xl font-bold text-xs text-gray-600 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}