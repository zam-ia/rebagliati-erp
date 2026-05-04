// src/pages/rrhh/TabVacaciones.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Eye, Download, FileText, AlertCircle, Check, Edit } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────
const formatFecha = (fecha) => {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
};

const calcularEstadoReal = (fechaInicio, fechaFin, estadoManual) => {
  if (estadoManual === 'Terminado' || estadoManual === 'Cancelado') return estadoManual;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T23:59:59');
  if (hoy < inicio) {
    const diff = Math.ceil((inicio - hoy) / (1000 * 60 * 60 * 24));
    return diff <= 3 ? 'Por salir' : 'Pendiente';
  } else if (hoy >= inicio && hoy <= fin) {
    return 'Disfrutando';
  } else {
    return 'Terminado';
  }
};

const getInitials = (nombre, apellido) =>
  `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

const ESTADOS_MANUALES = ['Pendiente', 'Por salir', 'Disfrutando', 'Terminado', 'Cancelado'];

export default function TabVacaciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [solicitudEditando, setSolicitudEditando] = useState(null);
  const [form, setForm] = useState({
    empleado_id: '', fecha_inicio: '', fecha_fin: '', dias_usados: 0, observaciones: ''
  });
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [documentos, setDocumentos] = useState({});

  const cargar = async () => {
    const [solRes, empRes, docRes] = await Promise.all([
      supabase.from('vacaciones').select('*').order('fecha_inicio', { ascending: false }),
      supabase.from('empleados').select('id, nombre, apellido, foto_url'),
      supabase.from('vacaciones_documentos').select('*')
    ]);
    setSolicitudes(solRes.data || []);
    setEmpleados(empRes.data || []);
    const docsMap = {};
    (docRes.data || []).forEach(doc => {
      if (!docsMap[doc.vacacion_id]) docsMap[doc.vacacion_id] = [];
      docsMap[doc.vacacion_id].push(doc);
    });
    setDocumentos(docsMap);
  };

  useEffect(() => { cargar(); }, []);

  // Calcular días automáticamente
  useEffect(() => {
    if (form.fecha_inicio && form.fecha_fin) {
      const inicio = new Date(form.fecha_inicio);
      const fin = new Date(form.fecha_fin);
      const diff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 3600 * 24)) + 1;
      setForm(prev => ({ ...prev, dias_usados: diff > 0 ? diff : 0 }));
    }
  }, [form.fecha_inicio, form.fecha_fin]);

  // ── Modal Crear ──────────────────────────────────────────────────────────
  const abrirModalNuevo = () => {
    setForm({ empleado_id: '', fecha_inicio: '', fecha_fin: '', dias_usados: 0, observaciones: '' });
    setArchivos([]);
    setModal(true);
  };

  const manejarArchivos = (e) => {
    const files = Array.from(e.target.files);
    const nuevos = files.map(f => ({ file: f, nombre: f.name }));
    setArchivos(prev => [...prev, ...nuevos]);
  };

  const eliminarArchivo = (index) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const subirArchivos = async (vacacionId) => {
    for (const archivo of archivos) {
      const fileExt = archivo.file.name.split('.').pop();
      const filePath = `vacaciones/${vacacionId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('vacaciones-docs')
        .upload(filePath, archivo.file);
      if (uploadError) throw new Error(`Error al subir ${archivo.nombre}: ${uploadError.message}`);
      const { data: { publicUrl } } = supabase.storage.from('vacaciones-docs').getPublicUrl(filePath);
      await supabase.from('vacaciones_documentos').insert({
        vacacion_id: vacacionId, archivo_url: publicUrl, nombre: archivo.nombre
      });
    }
  };

  const guardar = async () => {
    if (!form.empleado_id || !form.fecha_inicio || !form.fecha_fin) return alert('Completa todos los campos');
    if (form.dias_usados <= 0) return alert('La fecha de fin debe ser posterior a la de inicio');
    const empleado = empleados.find(e => e.id === form.empleado_id);
    setSubiendo(true);
    try {
      const { data, error } = await supabase.from('vacaciones').insert([{
        empleado_id: form.empleado_id,
        empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        dias_usados: form.dias_usados,
        estado: 'Pendiente',
        observaciones: form.observaciones
      }]).select('id').single();
      if (error) throw error;
      if (archivos.length > 0) await subirArchivos(data.id);
      setModal(false);
      setArchivos([]);
      cargar();
      alert('Vacaciones registradas correctamente');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubiendo(false); }
  };

  // ── Modal Editar ──────────────────────────────────────────────────────────
  const abrirModalEditar = (solicitud) => {
    setSolicitudEditando(solicitud);
    setForm({
      empleado_id: solicitud.empleado_id,
      fecha_inicio: solicitud.fecha_inicio,
      fecha_fin: solicitud.fecha_fin,
      dias_usados: solicitud.dias_usados,
      observaciones: solicitud.observaciones || ''
    });
    setArchivos([]); // Para nuevos archivos a subir
    setModalEditar(true);
  };

  const guardarEdicion = async () => {
    if (!solicitudEditando) return;
    setSubiendo(true);
    try {
      // Actualizar datos básicos
      const { error } = await supabase.from('vacaciones').update({
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        dias_usados: form.dias_usados,
        observaciones: form.observaciones
      }).eq('id', solicitudEditando.id);
      if (error) throw error;

      // Subir nuevos archivos si hay
      if (archivos.length > 0) {
        await subirArchivos(solicitudEditando.id);
      }

      setModalEditar(false);
      setSolicitudEditando(null);
      setArchivos([]);
      cargar();
      alert('Solicitud actualizada correctamente');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubiendo(false); }
  };

  const eliminarDocumento = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    const doc = documentos[solicitudEditando?.id]?.find(d => d.id === docId);
    if (doc?.archivo_url) {
      const path = doc.archivo_url.split('/public/')[1];
      if (path) await supabase.storage.from('vacaciones-docs').remove([path]);
    }
    await supabase.from('vacaciones_documentos').delete().eq('id', docId);
    cargar();
  };

  // Actualizar estado y observaciones
  const actualizarEstado = async (vacacionId, nuevoEstado) => {
    const { error } = await supabase.from('vacaciones').update({ estado: nuevoEstado }).eq('id', vacacionId);
    if (!error) setSolicitudes(prev => prev.map(s => s.id === vacacionId ? { ...s, estado: nuevoEstado } : s));
    else alert('Error al actualizar: ' + error.message);
  };

  const actualizarObservaciones = async (vacacionId, observaciones) => {
    const { error } = await supabase.from('vacaciones').update({ observaciones }).eq('id', vacacionId);
    if (!error) setSolicitudes(prev => prev.map(s => s.id === vacacionId ? { ...s, observaciones } : s));
  };

  const obtenerEmpleado = (nombre) => empleados.find(e => `${e.nombre} ${e.apellido}` === nombre);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0B1527] tracking-tight">Control de Vacaciones</h2>
          <p className="text-slate-400 text-sm mt-1">Gestiona solicitudes, documentos y estados de vacaciones</p>
        </div>
        <button onClick={abrirModalNuevo} className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95">
          <Upload size={16} /> Nueva Solicitud
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Colaborador</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Periodo</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Días</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Observaciones</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Documentos</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {solicitudes.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400 italic">No hay solicitudes registradas.</td></tr>
              ) : (
                solicitudes.map(s => {
                  const emp = obtenerEmpleado(s.empleado_nombre);
                  const estadoReal = calcularEstadoReal(s.fecha_inicio, s.fecha_fin, s.estado);
                  const docs = documentos[s.id] || [];
                  return (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {emp?.foto_url ? (
                            <img src={emp.foto_url} className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-md" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-[#185FA5] flex items-center justify-center text-xs font-bold shadow-inner">
                              {emp ? getInitials(emp.nombre, emp.apellido) : '?'}
                            </div>
                          )}
                          <span className="font-bold text-gray-800 text-xs">{s.empleado_nombre}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-600">{formatFecha(s.fecha_inicio)} → {formatFecha(s.fecha_fin)}</td>
                      <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">{s.dias_usados} días</span></td>
                      <td className="p-4 text-center">
                        <select value={s.estado} onChange={(e) => actualizarEstado(s.id, e.target.value)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${
                            estadoReal === 'Disfrutando' ? 'bg-emerald-100 text-emerald-700' :
                            estadoReal === 'Por salir' ? 'bg-amber-100 text-amber-700' :
                            estadoReal === 'Terminado' ? 'bg-gray-100 text-gray-600' :
                            estadoReal === 'Cancelado' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'}`}>
                          {ESTADOS_MANUALES.map(est => <option key={est} value={est}>{est}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <input type="text" value={s.observaciones || ''} onChange={(e) => actualizarObservaciones(s.id, e.target.value)}
                          placeholder="Añadir observación..." className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-transparent" />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {docs.length > 0 ? docs.map((doc, i) => (
                            <a key={i} href={doc.archivo_url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors" title={doc.nombre}>
                              <FileText size={14} />
                            </a>
                          )) : <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => abrirModalEditar(s)}
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition-colors" title="Editar solicitud y adjuntar documentos">
                          <Edit size={14} />
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

      {/* ═══ MODAL CREAR ═══ */}
      {modal && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#11284e] to-[#185FA5] p-5 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-lg font-black text-white">Nueva Solicitud de Vacaciones</h3>
              <button onClick={() => setModal(false)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Colaborador</label>
                <select value={form.empleado_id} onChange={e => setForm({...form, empleado_id: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all">
                  <option value="">Seleccionar colaborador...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha fin</label>
                  <input type="date" min={form.fecha_inicio} value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-blue-800">Días totales</span>
                <span className="text-2xl font-black text-[#185FA5]">{form.dias_usados} <span className="text-sm font-semibold">días</span></span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Observaciones</label>
                <textarea rows={3} value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})}
                  placeholder="Motivo o notas adicionales..." className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Documentos adjuntos</label>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-blue-300 transition cursor-pointer bg-gray-50">
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={manejarArchivos}
                    className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" />
                </div>
                {archivos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {archivos.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs">
                        <span className="text-gray-700 truncate">{f.nombre}</span>
                        <button onClick={() => eliminarArchivo(i)} className="text-red-500 hover:text-red-700 p-1"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-3xl">
              <button onClick={() => setModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={subiendo || !form.empleado_id || !form.fecha_inicio || !form.fecha_fin}
                className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all disabled:opacity-50 active:scale-95">
                {subiendo ? 'Subiendo...' : 'Registrar Vacaciones'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EDITAR ═══ */}
      {modalEditar && solicitudEditando && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-5 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-lg font-black text-white">Editar Solicitud</h3>
              <button onClick={() => setModalEditar(false)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Colaborador (solo lectura) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Colaborador</label>
                <input type="text" value={solicitudEditando.empleado_nombre} disabled
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha fin</label>
                  <input type="date" min={form.fecha_inicio} value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-blue-800">Días totales</span>
                <span className="text-2xl font-black text-[#185FA5]">{form.dias_usados} <span className="text-sm font-semibold">días</span></span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Observaciones</label>
                <textarea rows={3} value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})}
                  placeholder="Motivo o notas adicionales..." className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none" />
              </div>

              {/* Documentos existentes */}
              {(documentos[solicitudEditando.id] || []).length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Documentos actuales</label>
                  <div className="space-y-2">
                    {(documentos[solicitudEditando.id] || []).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs">
                        <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          <FileText size={12} /> {doc.nombre}
                        </a>
                        <button onClick={() => eliminarDocumento(doc.id)} className="text-red-500 hover:text-red-700 p-1"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nuevos archivos */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Añadir más documentos</label>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-blue-300 transition cursor-pointer bg-gray-50">
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={manejarArchivos}
                    className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all" />
                </div>
                {archivos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {archivos.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs">
                        <span className="text-gray-700 truncate">{f.nombre}</span>
                        <button onClick={() => eliminarArchivo(i)} className="text-red-500 hover:text-red-700 p-1"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-3xl">
              <button onClick={() => setModalEditar(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={guardarEdicion} disabled={subiendo}
                className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-700 hover:to-amber-800 transition-all disabled:opacity-50 active:scale-95">
                {subiendo ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}