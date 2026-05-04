// src/pages/rrhh/TabDescansos.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, FileText, Edit, AlertTriangle, Calendar } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────
const formatFecha = (fecha) => {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
};

const getInitials = (nombre, apellido) =>
  `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

export default function TabDescansos() {
  const [descansos, setDescansos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(false); // modal crear
  const [modalEditar, setModalEditar] = useState(false);
  const [descansoEditando, setDescansoEditando] = useState(null);
  const [form, setForm] = useState({
    empleado_id: '', fecha: '', fecha_fin: '', dias: '', diagnostico: '', observaciones: ''
  });
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [documentos, setDocumentos] = useState({});
  const [alertaCruce, setAlertaCruce] = useState(null); // Mensaje de alerta por cruce con vacaciones
  const [mostrarAlerta, setMostrarAlerta] = useState(false);

  const cargar = async () => {
    const [desRes, empRes, docRes] = await Promise.all([
      supabase.from('descansos_medicos').select('*').order('fecha', { ascending: false }),
      supabase.from('empleados').select('id, nombre, apellido, foto_url').order('apellido'),
      supabase.from('descansos_documentos').select('*')
    ]);
    setDescansos(desRes.data || []);
    setEmpleados(empRes.data || []);
    const docsMap = {};
    (docRes.data || []).forEach(doc => {
      if (!docsMap[doc.descanso_id]) docsMap[doc.descanso_id] = [];
      docsMap[doc.descanso_id].push(doc);
    });
    setDocumentos(docsMap);
  };

  useEffect(() => { cargar(); }, []);

  // Calcula automáticamente los días entre fechas
  useEffect(() => {
    if (form.fecha && form.fecha_fin) {
      const inicio = new Date(form.fecha);
      const fin = new Date(form.fecha_fin);
      const diff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 3600 * 24)) + 1;
      setForm(prev => ({ ...prev, dias: diff > 0 ? diff : '' }));
    }
  }, [form.fecha, form.fecha_fin]);

  // Verificar cruce con vacaciones del empleado
  const verificarCruceVacaciones = async (empleadoId, fechaInicio, fechaFin) => {
    if (!empleadoId || !fechaInicio) return false;
    const { data: vacaciones } = await supabase
      .from('vacaciones')
      .select('*')
      .eq('empleado_id', empleadoId)
      .neq('estado', 'Cancelado')
      .or(`fecha_inicio.lte.${fechaFin},fecha_fin.gte.${fechaInicio}`)
      .or(`fecha_inicio.gte.${fechaInicio},fecha_inicio.lte.${fechaFin}`);

    if (vacaciones && vacaciones.length > 0) {
      const detalles = vacaciones.map(v =>
        `${formatFecha(v.fecha_inicio)} → ${formatFecha(v.fecha_fin)} (${v.dias_usados} días)`
      ).join(', ');
      setAlertaCruce(`⚠️ Conflicto detectado: El colaborador tiene vacaciones programadas en ese rango: ${detalles}`);
      setMostrarAlerta(true);
      return true;
    }
    setAlertaCruce(null);
    setMostrarAlerta(false);
    return false;
  };

  // ── Modal Crear ──────────────────────────────────────────────────────────
  const abrirModalNuevo = () => {
    setForm({ empleado_id: '', fecha: '', fecha_fin: '', dias: '', diagnostico: '', observaciones: '' });
    setArchivos([]);
    setAlertaCruce(null);
    setMostrarAlerta(false);
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

  const subirArchivos = async (descansoId) => {
    for (const archivo of archivos) {
      const fileExt = archivo.file.name.split('.').pop();
      const filePath = `descansos/${descansoId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('descansos-docs')
        .upload(filePath, archivo.file);
      if (uploadError) throw new Error(`Error al subir ${archivo.nombre}: ${uploadError.message}`);
      const { data: { publicUrl } } = supabase.storage.from('descansos-docs').getPublicUrl(filePath);
      await supabase.from('descansos_documentos').insert({
        descanso_id: descansoId, archivo_url: publicUrl, nombre: archivo.nombre
      });
    }
  };

  const guardar = async () => {
    if (!form.empleado_id || !form.fecha) return alert('Completa los campos obligatorios');
    // Verificar cruce antes de guardar
    const cruce = await verificarCruceVacaciones(form.empleado_id, form.fecha, form.fecha_fin || form.fecha);
    if (cruce) {
      if (!confirm('Hay un conflicto con vacaciones programadas. ¿Desea continuar de todas formas?')) return;
    }
    const empleado = empleados.find(e => e.id === form.empleado_id);
    setSubiendo(true);
    try {
      const { data, error } = await supabase.from('descansos_medicos').insert([{
        empleado_id: form.empleado_id,
        empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
        fecha: form.fecha,
        fecha_fin: form.fecha_fin || form.fecha,
        dias: parseInt(form.dias) || 1,
        diagnostico: form.diagnostico,
        observaciones: form.observaciones,
        estado: 'Pendiente'
      }]).select('id').single();
      if (error) throw error;
      if (archivos.length > 0) await subirArchivos(data.id);
      setModal(false);
      setArchivos([]);
      cargar();
      alert('Descanso médico registrado correctamente');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubiendo(false); }
  };

  // ── Modal Editar ──────────────────────────────────────────────────────────
  const abrirModalEditar = (descanso) => {
    setDescansoEditando(descanso);
    setForm({
      empleado_id: descanso.empleado_id,
      fecha: descanso.fecha,
      fecha_fin: descanso.fecha_fin || descanso.fecha,
      dias: descanso.dias,
      diagnostico: descanso.diagnostico || '',
      observaciones: descanso.observaciones || ''
    });
    setArchivos([]);
    setAlertaCruce(null);
    setMostrarAlerta(false);
    setModalEditar(true);
  };

  const guardarEdicion = async () => {
    if (!descansoEditando) return;
    setSubiendo(true);
    try {
      // Verificar cruce antes de actualizar
      await verificarCruceVacaciones(form.empleado_id, form.fecha, form.fecha_fin || form.fecha);
      const { error } = await supabase.from('descansos_medicos').update({
        fecha: form.fecha,
        fecha_fin: form.fecha_fin || form.fecha,
        dias: parseInt(form.dias) || 1,
        diagnostico: form.diagnostico,
        observaciones: form.observaciones
      }).eq('id', descansoEditando.id);
      if (error) throw error;
      if (archivos.length > 0) {
        await subirArchivos(descansoEditando.id);
      }
      setModalEditar(false);
      setDescansoEditando(null);
      setArchivos([]);
      cargar();
      alert('Descanso médico actualizado correctamente');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubiendo(false); }
  };

  const eliminarDocumento = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    const doc = documentos[descansoEditando?.id]?.find(d => d.id === docId);
    if (doc?.archivo_url) {
      const path = doc.archivo_url.split('/public/')[1];
      if (path) await supabase.storage.from('descansos-docs').remove([path]);
    }
    await supabase.from('descansos_documentos').delete().eq('id', docId);
    cargar();
  };

  const obtenerEmpleado = (nombre) => empleados.find(e => `${e.nombre} ${e.apellido}` === nombre);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0B1527] tracking-tight">Descansos Médicos</h2>
          <p className="text-slate-400 text-sm mt-1">Registro de descansos médicos, certificados y su impacto en planilla</p>
        </div>
        <button onClick={abrirModalNuevo} className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95">
          <Upload size={16} /> + Registrar Descanso
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
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Diagnóstico</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Documentos</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {descansos.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400 italic">No hay descansos médicos registrados.</td></tr>
              ) : (
                descansos.map(d => {
                  const emp = obtenerEmpleado(d.empleado_nombre);
                  const docs = documentos[d.id] || [];
                  return (
                    <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {emp?.foto_url ? (
                            <img src={emp.foto_url} className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-md" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-[#185FA5] flex items-center justify-center text-xs font-bold shadow-inner">
                              {emp ? getInitials(emp.nombre, emp.apellido) : '?'}
                            </div>
                          )}
                          <span className="font-bold text-gray-800 text-xs">{d.empleado_nombre}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-600">
                        {formatFecha(d.fecha)} {d.fecha_fin && d.fecha_fin !== d.fecha ? `→ ${formatFecha(d.fecha_fin)}` : ''}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-bold">{d.dias} días</span>
                      </td>
                      <td className="p-4 text-xs text-gray-600 max-w-[200px] truncate">{d.diagnostico || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          d.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                          d.estado === 'Rechazado' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{d.estado || 'Pendiente'}</span>
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
                        <button onClick={() => abrirModalEditar(d)}
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition-colors" title="Editar descanso y adjuntar documentos">
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
              <h3 className="text-lg font-black text-white">Nuevo Descanso Médico</h3>
              <button onClick={() => setModal(false)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Alerta de cruce */}
              {mostrarAlerta && alertaCruce && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">{alertaCruce}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Colaborador</label>
                <select value={form.empleado_id} onChange={e => { setForm({ ...form, empleado_id: e.target.value }); verificarCruceVacaciones(e.target.value, form.fecha, form.fecha_fin || form.fecha); }}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all">
                  <option value="">Seleccionar colaborador...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha inicio</label>
                  <input type="date" value={form.fecha} onChange={e => { setForm({ ...form, fecha: e.target.value }); verificarCruceVacaciones(form.empleado_id, e.target.value, form.fecha_fin || e.target.value); }}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha fin</label>
                  <input type="date" min={form.fecha} value={form.fecha_fin} onChange={e => { setForm({ ...form, fecha_fin: e.target.value }); verificarCruceVacaciones(form.empleado_id, form.fecha, e.target.value); }}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-red-800">Días totales</span>
                <span className="text-2xl font-black text-red-600">{form.dias || 0} <span className="text-sm font-semibold">días</span></span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Diagnóstico</label>
                <textarea rows={3} value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })}
                  placeholder="Descripción del diagnóstico médico..." className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Observaciones</label>
                <textarea rows={2} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Notas adicionales..." className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Documentos adjuntos (certificados)</label>
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
              <button onClick={guardar} disabled={subiendo || !form.empleado_id || !form.fecha}
                className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all disabled:opacity-50 active:scale-95">
                {subiendo ? 'Subiendo...' : 'Registrar Descanso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EDITAR ═══ */}
      {modalEditar && descansoEditando && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-5 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-lg font-black text-white">Editar Descanso Médico</h3>
              <button onClick={() => setModalEditar(false)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              {mostrarAlerta && alertaCruce && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">{alertaCruce}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Colaborador</label>
                <input type="text" value={descansoEditando.empleado_nombre} disabled
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha inicio</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Fecha fin</label>
                  <input type="date" min={form.fecha} value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-red-800">Días totales</span>
                <span className="text-2xl font-black text-red-600">{form.dias || 0} <span className="text-sm font-semibold">días</span></span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Diagnóstico</label>
                <textarea rows={3} value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })}
                  placeholder="Descripción del diagnóstico médico..." className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Observaciones</label>
                <textarea rows={2} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Notas adicionales..." className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none" />
              </div>
              {/* Documentos existentes */}
              {(documentos[descansoEditando.id] || []).length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Documentos actuales</label>
                  <div className="space-y-2">
                    {(documentos[descansoEditando.id] || []).map(doc => (
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