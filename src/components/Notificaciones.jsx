// src/components/Notificaciones.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Bell, Plus, Check, Trash2, Calendar, Clock, Flag, X } from 'lucide-react';

export default function Notificaciones() {
  const [tareas, setTareas] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState({ 
    titulo: '', 
    descripcion: '', 
    fecha_recordatorio: '', 
    hora_recordatorio: '',
    prioridad: 'media'
  });
  const [loading, setLoading] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);

  // Obtener usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUsuarioId(data.user.id);
    });
  }, []);

  // Función para obtener las fechas de la semana actual (lunes a domingo)
  const obtenerRangoSemanaActual = () => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0 domingo, 1 lunes...
    // Calcular lunes (si hoy es domingo, resto 6 días)
    const lunes = new Date(hoy);
    const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    lunes.setDate(hoy.getDate() - diasHastaLunes);
    lunes.setHours(0, 0, 0, 0);
    
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    return { inicio: formatDate(lunes), fin: formatDate(domingo) };
  };

  // Cargar tareas pendientes de la semana actual
  const cargarTareas = async () => {
    if (!usuarioId) return;
    const { inicio, fin } = obtenerRangoSemanaActual();
    
    const { data, error } = await supabase
      .from('tareas_usuario')
      .select('*')
      .eq('user_id', usuarioId)
      .eq('completada', false)
      .gte('fecha_recordatorio', inicio)
      .lte('fecha_recordatorio', fin)
      .order('prioridad', { ascending: false }) // alta, media, baja (por orden alfabético inverso?)
      .order('fecha_recordatorio', { ascending: true })
      .order('hora_recordatorio', { ascending: true });

    // Orden personalizado por prioridad: alta > media > baja
    const prioridadOrden = { alta: 0, media: 1, baja: 2 };
    const tareasOrdenadas = (data || []).sort((a, b) => {
      if (prioridadOrden[a.prioridad] !== prioridadOrden[b.prioridad]) {
        return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];
      }
      if (a.fecha_recordatorio !== b.fecha_recordatorio) {
        return new Date(a.fecha_recordatorio) - new Date(b.fecha_recordatorio);
      }
      if (a.hora_recordatorio !== b.hora_recordatorio) {
        return (a.hora_recordatorio || '00:00').localeCompare(b.hora_recordatorio || '00:00');
      }
      return 0;
    });
    
    if (!error) setTareas(tareasOrdenadas);
  };

  useEffect(() => {
    cargarTareas();
    const interval = setInterval(cargarTareas, 300000); // cada 5 min
    return () => clearInterval(interval);
  }, [usuarioId]);

  const crearTarea = async () => {
    if (!nuevaTarea.titulo || !nuevaTarea.fecha_recordatorio) {
      alert('Título y fecha son obligatorios');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('tareas_usuario').insert({
      user_id: usuarioId,
      titulo: nuevaTarea.titulo,
      descripcion: nuevaTarea.descripcion,
      fecha_recordatorio: nuevaTarea.fecha_recordatorio,
      hora_recordatorio: nuevaTarea.hora_recordatorio || null,
      prioridad: nuevaTarea.prioridad,
    });
    if (error) alert('Error: ' + error.message);
    else {
      setNuevaTarea({ titulo: '', descripcion: '', fecha_recordatorio: '', hora_recordatorio: '', prioridad: 'media' });
      setMostrarModalNueva(false);
      cargarTareas();
    }
    setLoading(false);
  };

  const completarTarea = async (id) => {
    const { error } = await supabase
      .from('tareas_usuario')
      .update({ completada: true })
      .eq('id', id);
    if (!error) cargarTareas();
  };

  const eliminarTarea = async (id) => {
    if (confirm('¿Eliminar esta tarea?')) {
      const { error } = await supabase.from('tareas_usuario').delete().eq('id', id);
      if (!error) cargarTareas();
    }
  };

  const contarNotificaciones = tareas.length;
  const hoy = new Date().toISOString().split('T')[0];

  // Función para obtener el color y etiqueta de prioridad
  const getPrioridadInfo = (prioridad) => {
    switch (prioridad) {
      case 'alta': return { color: 'text-red-600 bg-red-50', icon: '🔴', label: 'Alta' };
      case 'media': return { color: 'text-amber-600 bg-amber-50', icon: '🟡', label: 'Media' };
      default: return { color: 'text-blue-600 bg-blue-50', icon: '🔵', label: 'Baja' };
    }
  };

  return (
    <div className="relative">
      {/* Botón campana */}
      <button
        onClick={() => setMostrarLista(!mostrarLista)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell size={20} className="text-slate-500" />
        {contarNotificaciones > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {contarNotificaciones}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {mostrarLista && (
        <div className="absolute right-0 mt-3 w-[360px] md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-[#0B1527] text-[14px]">Esta semana</h3>
            <button
              onClick={() => {
                setMostrarLista(false);
                setMostrarModalNueva(true);
              }}
              className="text-[#185FA5] hover:bg-[#185FA5]/10 p-1.5 rounded-full transition-colors"
              title="Nueva tarea"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {tareas.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Check size={20} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-[13px] font-medium">No hay tareas pendientes esta semana</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {tareas.map(tarea => {
                  const prioridadInfo = getPrioridadInfo(tarea.prioridad);
                  return (
                    <li key={tarea.id} className="p-4 hover:bg-slate-50 transition group">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${prioridadInfo.color}`}>
                              {prioridadInfo.icon} {prioridadInfo.label}
                            </span>
                            {tarea.fecha_recordatorio === hoy && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Hoy</span>
                            )}
                          </div>
                          <p className="font-semibold text-[13px] text-[#0B1527] truncate">{tarea.titulo}</p>
                          {tarea.descripcion && (
                            <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-1">{tarea.descripcion}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} /> {new Date(tarea.fecha_recordatorio).toLocaleDateString('es-PE')}
                            </span>
                            {tarea.hora_recordatorio && (
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> {tarea.hora_recordatorio.slice(0, 5)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => completarTarea(tarea.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Marcar completada">
                            <Check size={14} />
                          </button>
                          <button onClick={() => eliminarTarea(tarea.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal para nueva tarea con createPortal */}
      {mostrarModalNueva && createPortal(
        <div className="fixed inset-0 bg-[#0B1527]/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#185FA5]/10 rounded-xl flex items-center justify-center">
                  <Bell size={18} className="text-[#185FA5]" />
                </div>
                <h3 className="text-[16px] font-bold text-[#0B1527]">Nuevo recordatorio</h3>
              </div>
              <button onClick={() => setMostrarModalNueva(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#0B1527] mb-1.5">Título *</label>
                <input
                  type="text"
                  placeholder="Ej. Revisar cotizaciones..."
                  value={nuevaTarea.titulo}
                  onChange={e => setNuevaTarea({...nuevaTarea, titulo: e.target.value})}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-[14px] text-[#0B1527] focus:bg-white focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-semibold text-[#0B1527] mb-1.5">Descripción</label>
                <textarea
                  placeholder="Detalles adicionales..."
                  rows={2}
                  value={nuevaTarea.descripcion}
                  onChange={e => setNuevaTarea({...nuevaTarea, descripcion: e.target.value})}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-[14px] text-[#0B1527] focus:bg-white focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] outline-none transition-all resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#0B1527] mb-1.5">Prioridad</label>
                  <select
                    value={nuevaTarea.prioridad}
                    onChange={e => setNuevaTarea({...nuevaTarea, prioridad: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-[13px] text-[#0B1527] focus:bg-white focus:ring-2 focus:ring-[#185FA5]/20 outline-none"
                  >
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Media</option>
                    <option value="baja">🔵 Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#0B1527] mb-1.5">Fecha *</label>
                  <input
                    type="date"
                    value={nuevaTarea.fecha_recordatorio}
                    onChange={e => setNuevaTarea({...nuevaTarea, fecha_recordatorio: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-[13px] text-[#0B1527] focus:bg-white focus:ring-2 focus:ring-[#185FA5]/20 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[12px] font-semibold text-[#0B1527] mb-1.5">Hora (opcional)</label>
                <input
                  type="time"
                  value={nuevaTarea.hora_recordatorio}
                  onChange={e => setNuevaTarea({...nuevaTarea, hora_recordatorio: e.target.value})}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-[14px] text-[#0B1527] focus:bg-white focus:ring-2 focus:ring-[#185FA5]/20 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Ej. 14:30 para recordarte en ese momento exacto</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setMostrarModalNueva(false)} 
                className="px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={crearTarea} 
                disabled={loading} 
                className="bg-[#185FA5] hover:bg-[#144b82] text-white px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-md shadow-[#185FA5]/20 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}