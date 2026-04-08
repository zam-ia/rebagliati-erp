import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Users, Calendar, AlertCircle, Edit, Trash2, Plus } from 'lucide-react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function TabHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [filtroArea, setFiltroArea] = useState('Todas');
  const [cargando, setCargando] = useState(false);
  
  // Modales
  const [modalAsignar, setModalAsignar] = useState(false);
  const [seleccion, setSeleccion] = useState({ empleadoId: '', horarioId: '' });
  
  // Modal CRUD de horario
  const [modalHorario, setModalHorario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formHorario, setFormHorario] = useState({
    nombre: '',
    tipo: 'Mañana',
    hora_entrada: '',
    hora_salida: '',
    dias_trabajo: [],
    descansos: [],
    activo: true
  });

  const cargarDatos = async () => {
    setCargando(true);
    const [horariosRes, empleadosRes] = await Promise.all([
      supabase.from('horarios').select('*').order('tipo'),
      supabase.from('empleados').select('id, nombre, apellido, area, horario_id')
    ]);
    setHorarios(horariosRes.data || []);
    setEmpleados(empleadosRes.data || []);
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  // CRUD Horarios
  const guardarHorario = async () => {
    if (!formHorario.nombre) return alert('Nombre del horario es obligatorio');
    const datos = { ...formHorario };
    delete datos.id;
    setCargando(true);
    let error;
    if (modoEdicion && editandoId) {
      const res = await supabase.from('horarios').update(datos).eq('id', editandoId);
      error = res.error;
    } else {
      const res = await supabase.from('horarios').insert([datos]);
      error = res.error;
    }
    if (error) alert('Error: ' + error.message);
    else {
      setModalHorario(false);
      cargarDatos();
    }
    setCargando(false);
  };

  const editarHorario = (horario) => {
    setModoEdicion(true);
    setEditandoId(horario.id);
    setFormHorario(horario);
    setModalHorario(true);
  };

  const eliminarHorario = async (id) => {
    if (confirm('¿Eliminar este horario? Se desasignará de los empleados.')) {
      const { error } = await supabase.from('horarios').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargarDatos();
    }
  };

  const handleAsignar = async () => {
    if (!seleccion.empleadoId || !seleccion.horarioId) return;
    const { error } = await supabase
      .from('empleados')
      .update({ horario_id: seleccion.horarioId })
      .eq('id', seleccion.empleadoId);
    if (!error) {
      setModalAsignar(false);
      cargarDatos();
    }
  };

  const toggleCheckbox = (array, value) =>
    array.includes(value) ? array.filter(v => v !== value) : [...array, value];

  const areas = ['Todas', ...new Set(empleados.map(e => e.area).filter(Boolean))];
  const empleadosFiltrados = filtroArea === 'Todas' ? empleados : empleados.filter(e => e.area === filtroArea);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats rápidos + botón nuevo horario */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Clock size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Turnos Activos</p>
            <p className="text-2xl font-bold text-slate-800">{horarios.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Users size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Personal Asignado</p>
            <p className="text-2xl font-bold text-slate-800">{empleados.filter(e => e.horario_id).length}</p>
          </div>
        </div>
        <button
          onClick={() => setModalAsignar(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Calendar size={20} /> Asignar Horario
        </button>
        <button
          onClick={() => { setModoEdicion(false); setFormHorario({ nombre: '', tipo: 'Mañana', hora_entrada: '', hora_salida: '', dias_trabajo: [], descansos: [], activo: true }); setModalHorario(true); }}
          className="border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={20} /> Nuevo Horario
        </button>
      </div>

      {/* Filtro por área */}
      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
        <span className="text-sm font-medium text-slate-600 ml-2">Filtrar por Área:</span>
        <div className="flex gap-2 flex-wrap">
          {areas.map(area => (
            <button
              key={area}
              onClick={() => setFiltroArea(area)}
              className={`px-3 py-1 rounded-md text-sm transition-all ${
                filtroArea === area ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de turnos (vista 360) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {horarios.map(horario => {
          const asignados = empleadosFiltrados.filter(e => e.horario_id === horario.id);
          return (
            <div key={horario.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800">{horario.nombre}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> {horario.hora_entrada?.slice(0,5) || '--:--'} - {horario.hora_salida?.slice(0,5) || '--:--'}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                  horario.tipo.includes('Sábado') || horario.tipo.includes('Domingo') 
                  ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {horario.tipo}
                </span>
              </div>
              <div className="p-4 bg-slate-50/50 min-h-[120px]">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Personal ({asignados.length})</p>
                  <div className="flex gap-1">
                    <button onClick={() => editarHorario(horario)} className="p-1 text-slate-400 hover:text-blue-600"><Edit size={14} /></button>
                    <button onClick={() => eliminarHorario(horario.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  {asignados.length > 0 ? (
                    asignados.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-sm text-slate-700 font-medium">{emp.nombre} {emp.apellido}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{emp.area}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-slate-400 opacity-50">
                      <AlertCircle size={20} />
                      <span className="text-xs mt-1 italic">Sin personal asignado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Asignación de horario a empleado */}
      {modalAsignar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Vincular Horario</h3>
              <p className="text-sm text-slate-500">Asigna un turno específico al colaborador</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Colaborador</label>
                <select 
                  className="w-full border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  value={seleccion.empleadoId}
                  onChange={e => setSeleccion({...seleccion, empleadoId: e.target.value})}
                >
                  <option value="">Selecciona un empleado...</option>
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido} — {emp.area || 'Sin área'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Turno Disponible</label>
                <select 
                  className="w-full border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  value={seleccion.horarioId}
                  onChange={e => setSeleccion({...seleccion, horarioId: e.target.value})}
                >
                  <option value="">Selecciona el horario...</option>
                  {horarios.map(h => (
                    <option key={h.id} value={h.id}>{h.nombre} ({h.tipo})</option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start">
                <AlertCircle className="text-blue-500 shrink-0" size={18} />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  <strong>Regla de Rotación:</strong> El sistema validará automáticamente que los turnos de fin de semana no se traslapen para personal Full-Time.
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex gap-3">
              <button 
                onClick={handleAsignar}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200"
              >
                Confirmar Asignación
              </button>
              <button 
                onClick={() => setModalAsignar(false)}
                className="px-6 py-3 text-slate-500 font-medium hover:bg-slate-200 rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CRUD de horario (crear/editar) */}
      {modalHorario && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{modoEdicion ? 'Editar Horario' : 'Nuevo Horario'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <input
                placeholder="Nombre del horario"
                value={formHorario.nombre}
                onChange={e => setFormHorario({...formHorario, nombre: e.target.value})}
                className="w-full border-slate-200 rounded-xl p-3 text-sm"
              />
              <select
                value={formHorario.tipo}
                onChange={e => setFormHorario({...formHorario, tipo: e.target.value})}
                className="w-full border-slate-200 rounded-xl p-3 text-sm"
              >
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Sábado AM">Sábado AM</option>
                <option value="Sábado PM">Sábado PM</option>
                <option value="Domingo AM">Domingo AM</option>
                <option value="Domingo PM">Domingo PM</option>
                <option value="Rotativo">Rotativo</option>
                <option value="Personalizado">Personalizado</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="time" placeholder="Hora entrada" value={formHorario.hora_entrada} onChange={e => setFormHorario({...formHorario, hora_entrada: e.target.value})} className="border-slate-200 rounded-xl p-3 text-sm" />
                <input type="time" placeholder="Hora salida" value={formHorario.hora_salida} onChange={e => setFormHorario({...formHorario, hora_salida: e.target.value})} className="border-slate-200 rounded-xl p-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Días de trabajo</label>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(dia => (
                    <label key={dia} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={formHorario.dias_trabajo?.includes(dia)} onChange={() => setFormHorario({...formHorario, dias_trabajo: toggleCheckbox(formHorario.dias_trabajo || [], dia)})} />
                      {dia}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Días de descanso</label>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(dia => (
                    <label key={dia} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={formHorario.descansos?.includes(dia)} onChange={() => setFormHorario({...formHorario, descansos: toggleCheckbox(formHorario.descansos || [], dia)})} />
                      {dia}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formHorario.activo} onChange={e => setFormHorario({...formHorario, activo: e.target.checked})} />
                Activo
              </label>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex gap-3">
              <button onClick={guardarHorario} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">Guardar</button>
              <button onClick={() => setModalHorario(false)} className="px-6 py-3 text-slate-500 font-medium hover:bg-slate-200 rounded-xl">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}