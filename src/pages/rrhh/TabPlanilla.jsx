// src/pages/rrhh/TabPlanilla.jsx
// Módulo de Novedades: Incidencias (tardanza/falta/suspensión/llamada) + Horas Extras
// Las horas extras NO son incidencias — tienen su propio flujo, tipo de pago y compensación.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Trash2, Eye, X, Plus, Clock, AlertTriangle, ChevronDown } from 'lucide-react';

// ── Configuración de tipos ────────────────────────────────────────────────────
const TIPOS_INCIDENCIA = [
  { value: 'Tardanza',        label: 'Tardanza',          color: 'bg-red-100 text-red-800',    dot: '#A32D2D' },
  { value: 'Falta',           label: 'Falta',             color: 'bg-orange-100 text-orange-800', dot: '#854F0B' },
  { value: 'Suspension',      label: 'Suspensión',        color: 'bg-purple-100 text-purple-800', dot: '#534AB7' },
  { value: 'LlamadaAtencion', label: 'Llamada de atención', color: 'bg-blue-100 text-blue-800', dot: '#185FA5' },
];

const MODALIDADES_HE = [
  { value: 'sin_compensacion', label: 'Sin compensación (pago por horas)', desc: 'Pago basado en valor de horas', color: 'bg-gray-100 text-gray-800' },
  { value: 'pago_25',        label: 'Pago 25% adicional',   desc: 'Hasta 2 horas diarias',   color: 'bg-amber-100 text-amber-800' },
  { value: 'pago_35',        label: 'Pago 35% adicional',   desc: 'Más de 2 horas diarias',  color: 'bg-orange-100 text-orange-800' },
  { value: 'compensacion_horas', label: 'Compensar con horas libres', desc: 'Tiempo por tiempo',     color: 'bg-teal-100 text-teal-800' },
  { value: 'compensacion_dias',  label: 'Compensar con días libres', desc: 'Acumular días de descanso', color: 'bg-green-100 text-green-800' },
];

const badge = (tipo) => {
  const t = TIPOS_INCIDENCIA.find(t => t.value === tipo);
  return t ? t.color : 'bg-gray-100 text-gray-700';
};

const badgeHE = (modalidad) => {
  const m = MODALIDADES_HE.find(m => m.value === modalidad);
  return m ? m.color : 'bg-gray-100 text-gray-700';
};

const labelHE = (modalidad) => MODALIDADES_HE.find(m => m.value === modalidad)?.label || modalidad;

// ── Formulario vacío para incidencias ─────────────────────────────────────────
const FORM_INC_VACIO = {
  empleado_id: '', empleado_nombre: '',
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'Tardanza',
  minutos_tardanza: 0,
  justificada: false, justificacion: '',
  dias_suspension: 0, motivo: '',
  documentoSubido: null,
  tardanza_supera_10min: false,
};

// ── Formulario vacío para horas extras ───────────────────────────────────────
const FORM_HE_VACIO = {
  empleado_id: '', empleado_nombre: '',
  fecha: new Date().toISOString().slice(0, 10),
  horas: 1,
  minutos: 0,
  modalidad: 'sin_compensacion', // Ahora es la opción por defecto
  observaciones: '',
  aprobado_por: '',
  documentoSubido: null,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function TabPlanilla() {
  const [pestana, setPestana]         = useState('incidencias'); // 'incidencias' | 'horas_extras'
  const [mes, setMes]                 = useState(new Date().toISOString().slice(0, 7));
  const [empleados, setEmpleados]     = useState([]);
  const [cargando, setCargando]       = useState(false);

  // Incidencias
  const [incidencias, setIncidencias] = useState([]);
  const [modalInc, setModalInc]       = useState(false);
  const [editandoId, setEditandoId]   = useState(null);
  const [formInc, setFormInc]         = useState(FORM_INC_VACIO);

  // Horas extras
  const [horasExtras, setHorasExtras] = useState([]);
  const [modalHE, setModalHE]         = useState(false);
  const [editandoHEId, setEditandoHEId] = useState(null);
  const [formHE, setFormHE]           = useState(FORM_HE_VACIO);

  // Documentos
  const [modalDoc, setModalDoc]       = useState(null);
  const [docsIncidencia, setDocsInc]  = useState([]);
  const [subiendoDoc, setSubiendoDoc] = useState(false);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const cargarEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('id, nombre, apellido, foto_url').eq('estado', 'activo');
    setEmpleados(data || []);
  };

  const cargarIncidencias = useCallback(async () => {
    setCargando(true);
    const p1 = `${mes}-01`;
    const p2 = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);
    const { data } = await supabase.from('asistencia').select('*').gte('fecha', p1).lte('fecha', p2).order('fecha', { ascending: false });
    setIncidencias(data || []);
    setCargando(false);
  }, [mes]);

  const cargarHorasExtras = useCallback(async () => {
    const p1 = `${mes}-01`;
    const p2 = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);
    const { data } = await supabase.from('horas_extras').select('*').gte('fecha', p1).lte('fecha', p2).order('fecha', { ascending: false });
    setHorasExtras(data || []);
  }, [mes]);

  useEffect(() => {
    cargarEmpleados();
    cargarIncidencias();
    cargarHorasExtras();
  }, [cargarIncidencias, cargarHorasExtras]);

  // ── Guardar incidencia ─────────────────────────────────────────────────────
  const guardarIncidencia = async () => {
    if (!formInc.empleado_id || !formInc.fecha) { alert('Selecciona colaborador y fecha'); return; }
    const esTardanza   = formInc.tipo === 'Tardanza';
    const esFalta      = formInc.tipo === 'Falta';
    const esSuspension = formInc.tipo === 'Suspension';
    const esLlamada    = formInc.tipo === 'LlamadaAtencion';
    const mins = parseInt(formInc.minutos_tardanza) || 0;

    const registro = {
      empleado_id:         formInc.empleado_id,
      empleado_nombre:     formInc.empleado_nombre,
      fecha:               formInc.fecha,
      tardanza:            esTardanza,
      falta:               esFalta,
      minutos:             esTardanza ? mins : 0,
      tardanza_supera_10min: esTardanza ? mins > 10 : false,
      justificacion:       (esTardanza || esFalta) && formInc.justificada ? (formInc.justificacion || 'Justificado') : null,
      tipo_incidencia:     formInc.tipo,
      dias_suspension:     esSuspension ? parseInt(formInc.dias_suspension) : 0,
      motivo:              (esSuspension || esLlamada) ? formInc.motivo : null,
      descanso_medico:     false,
    };

    let error, incidenciaId = editandoId;
    if (editandoId) {
      const { error: e } = await supabase.from('asistencia').update(registro).eq('id', editandoId);
      error = e;
    } else {
      const { data, error: e } = await supabase.from('asistencia').insert([registro]).select();
      error = e;
      if (!error && data?.length) incidenciaId = data[0].id;
    }

    if (error) { alert('Error: ' + error.message); return; }

    if (formInc.documentoSubido && incidenciaId) {
      await subirDocAutomatic(formInc.documentoSubido, formInc.empleado_id, incidenciaId, formInc.tipo);
    }

    setModalInc(false);
    setEditandoId(null);
    setFormInc(FORM_INC_VACIO);
    await cargarIncidencias();
  };

  // ── Guardar hora extra ─────────────────────────────────────────────────────
  const guardarHoraExtra = async () => {
    if (!formHE.empleado_id || !formHE.fecha) { alert('Selecciona colaborador y fecha'); return; }
    const horas = parseFloat(formHE.horas) || 0;
    const minutos = parseInt(formHE.minutos) || 0;
    const horasDecimal = horas + (minutos / 60);

    const registro = {
      empleado_id:      formHE.empleado_id,
      empleado_nombre:  formHE.empleado_nombre,
      fecha:            formHE.fecha,
      horas:            horas,
      minutos:          minutos,
      horas_decimal:    parseFloat(horasDecimal.toFixed(2)),
      modalidad:        formHE.modalidad,
      observaciones:    formHE.observaciones || null,
      aprobado_por:     formHE.aprobado_por || null,
      estado:           'Pendiente',
    };

    let error;
    if (editandoHEId) {
      const { error: e } = await supabase.from('horas_extras').update(registro).eq('id', editandoHEId);
      error = e;
    } else {
      const { error: e } = await supabase.from('horas_extras').insert([registro]);
      error = e;
    }

    if (error) { alert('Error: ' + error.message); return; }

    setModalHE(false);
    setEditandoHEId(null);
    setFormHE(FORM_HE_VACIO);
    await cargarHorasExtras();
  };

  // ── Eliminar registros ─────────────────────────────────────────────────────
  const eliminarIncidencia = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await supabase.from('asistencia').delete().eq('id', id);
    await cargarIncidencias();
  };

  const eliminarHE = async (id) => {
    if (!confirm('¿Eliminar este registro de horas extras?')) return;
    await supabase.from('horas_extras').delete().eq('id', id);
    await cargarHorasExtras();
  };

  // ── Aprobar hora extra ─────────────────────────────────────────────────────
  const aprobarHE = async (id) => {
    await supabase.from('horas_extras').update({ estado: 'Aprobado' }).eq('id', id);
    await cargarHorasExtras();
  };

  // ── Documentos ─────────────────────────────────────────────────────────────
  const subirDocAutomatic = async (file, empleadoId, incidenciaId, tipo) => {
    const ext = file.name.split('.').pop();
    const path = `documentos_incidencias/${incidenciaId}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('documentos-empleados').upload(path, file);
    if (upErr) return;
    const { data: { publicUrl } } = supabase.storage.from('documentos-empleados').getPublicUrl(path);
    const { data: doc } = await supabase.from('documentos_empleados').insert({
      empleado_id: empleadoId,
      tipo_documento: 'incidencia_planilla',
      titulo: `${tipo} - documento adjunto`,
      archivo_url: publicUrl,
    }).select().single();
    if (doc) await supabase.from('incidencia_documentos').insert({ incidencia_id: incidenciaId, documento_id: doc.id });
  };

  const abrirDocs = async (inc) => {
    const { data } = await supabase.from('incidencia_documentos').select('documento_id, documentos_empleados(*)').eq('incidencia_id', inc.id);
    setDocsInc((data || []).map(d => d.documentos_empleados));
    setModalDoc({ incidenciaId: inc.id, incidencia: inc });
  };

  const subirDocModal = async (file, titulo, desc) => {
    if (!file) return;
    setSubiendoDoc(true);
    await subirDocAutomatic(file, modalDoc.incidencia.empleado_id, modalDoc.incidenciaId, titulo || 'Documento');
    const { data } = await supabase.from('incidencia_documentos').select('documento_id, documentos_empleados(*)').eq('incidencia_id', modalDoc.incidenciaId);
    setDocsInc((data || []).map(d => d.documentos_empleados));
    setSubiendoDoc(false);
  };

  const eliminarDoc = async (doc) => {
    if (!confirm('¿Eliminar?')) return;
    const path = doc.archivo_url.split('/public/')[1];
    if (path) await supabase.storage.from('documentos-empleados').remove([path]);
    await supabase.from('incidencia_documentos').delete().eq('documento_id', doc.id);
    await supabase.from('documentos_empleados').delete().eq('id', doc.id);
    const { data } = await supabase.from('incidencia_documentos').select('documento_id, documentos_empleados(*)').eq('incidencia_id', modalDoc.incidenciaId);
    setDocsInc((data || []).map(d => d.documentos_empleados));
  };

  // ── Editar registros ───────────────────────────────────────────────────────
  const editarInc = (n) => {
    setEditandoId(n.id);
    setFormInc({
      empleado_id: n.empleado_id, empleado_nombre: n.empleado_nombre,
      fecha: n.fecha, tipo: n.tipo_incidencia || (n.tardanza ? 'Tardanza' : n.falta ? 'Falta' : 'Tardanza'),
      minutos_tardanza: n.minutos || 0, justificada: !!n.justificacion,
      justificacion: n.justificacion || '', dias_suspension: n.dias_suspension || 0,
      motivo: n.motivo || '', documentoSubido: null, tardanza_supera_10min: n.tardanza_supera_10min || false,
    });
    setModalInc(true);
  };

  const editarHE = (h) => {
    setEditandoHEId(h.id);
    setFormHE({
      empleado_id: h.empleado_id, empleado_nombre: h.empleado_nombre,
      fecha: h.fecha, horas: h.horas || 1, minutos: h.minutos || 0,
      modalidad: h.modalidad || 'sin_compensacion',
      observaciones: h.observaciones || '', aprobado_por: h.aprobado_por || '',
      documentoSubido: null,
    });
    setModalHE(true);
  };

  // ── Resumen KPIs ───────────────────────────────────────────────────────────
  const resumen = incidencias.reduce((acc, n) => {
    const t = n.tipo_incidencia || (n.tardanza ? 'Tardanza' : n.falta ? 'Falta' : 'Otro');
    if (t === 'Tardanza')        acc.tardanzas++;
    else if (t === 'Falta')      acc.faltas++;
    else if (t === 'Suspension') acc.suspensiones++;
    else if (t === 'LlamadaAtencion') acc.llamadas++;
    return acc;
  }, { tardanzas: 0, faltas: 0, suspensiones: 0, llamadas: 0 });

  const totalHE = horasExtras.reduce((s, h) => s + (h.horas_decimal || 0), 0);
  const heAprobadas = horasExtras.filter(h => h.estado === 'Aprobado').length;

  const getInit = (n, a) => `${n?.charAt(0)||''}${a?.charAt(0)||''}`.toUpperCase();

  return (
    <div className="p-4">

      {/* ── Header principal ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="bg-white border p-2 rounded-xl flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black text-gray-400 uppercase ml-2">Periodo</span>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="outline-none font-bold text-gray-700 text-sm"/>
        </div>

        <button
          onClick={() => {
            if (pestana === 'incidencias') { setEditandoId(null); setFormInc(FORM_INC_VACIO); setModalInc(true); }
            else { setEditandoHEId(null); setFormHE(FORM_HE_VACIO); setModalHE(true); }
          }}
          className="bg-[#185FA5] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-[#11284e] transition-colors flex items-center gap-2">
          <Plus size={16}/>
          {pestana === 'incidencias' ? 'Registrar incidencia' : 'Registrar horas extras'}
        </button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label:'Tardanzas',         val:resumen.tardanzas,    bg:'bg-red-50',    txt:'text-red-700',    border:'border-red-100' },
          { label:'Faltas',            val:resumen.faltas,       bg:'bg-orange-50', txt:'text-orange-700', border:'border-orange-100' },
          { label:'Suspensiones',      val:resumen.suspensiones, bg:'bg-purple-50', txt:'text-purple-700', border:'border-purple-100' },
          { label:'Llamadas atención', val:resumen.llamadas,     bg:'bg-blue-50',   txt:'text-blue-700',   border:'border-blue-100' },
          { label:'Hrs extras (mes)',  val:`${totalHE.toFixed(1)}h`, bg:'bg-amber-50',  txt:'text-amber-700',  border:'border-amber-100' },
          { label:'HE aprobadas',      val:heAprobadas,          bg:'bg-green-50',  txt:'text-green-700',  border:'border-green-100' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} p-3 rounded-2xl`}>
            <div className={`text-2xl font-black ${k.txt}`}>{k.val}</div>
            <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${k.txt} opacity-70`}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Pestañas ─────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 mb-4 flex gap-0">
        {[
          { id:'incidencias',   icon:<AlertTriangle size={14}/>, label:'Incidencias' },
          { id:'horas_extras',  icon:<Clock size={14}/>,         label:'Horas extras' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setPestana(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              pestana === tab.id
                ? 'border-[#185FA5] text-[#185FA5]'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
            }`}>
            {tab.icon}{tab.label}
            {tab.id === 'incidencias' && incidencias.length > 0 && (
              <span className="ml-1 bg-red-100 text-red-800 text-[8px] font-black px-1.5 py-0.5 rounded-full">{incidencias.length}</span>
            )}
            {tab.id === 'horas_extras' && horasExtras.length > 0 && (
              <span className="ml-1 bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-full">{horasExtras.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TABLA INCIDENCIAS
      ══════════════════════════════════════════════════════════════════ */}
      {pestana === 'incidencias' && (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-wide">
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Detalle</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Docs</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cargando ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400 text-sm">Cargando...</td></tr>
                ) : incidencias.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic text-sm">Sin incidencias en este periodo</td></tr>
                ) : incidencias.map(n => {
                  const emp = empleados.find(e => e.id === n.empleado_id);
                  const tipo = n.tipo_incidencia || (n.tardanza ? 'Tardanza' : n.falta ? 'Falta' : 'Otro');
                  let detalle = '';
                  if (tipo === 'Tardanza') detalle = `${n.minutos || 0} min${n.tardanza_supera_10min ? ' (descuenta)' : ' (sin descuento)'}`;
                  else if (tipo === 'Falta') detalle = n.justificacion ? 'Justificada' : 'Injustificada';
                  else if (tipo === 'Suspension') detalle = `${n.dias_suspension || 0} día(s) — ${n.motivo || ''}`;
                  else if (tipo === 'LlamadaAtencion') detalle = n.motivo || '—';

                  return (
                    <tr key={n.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {emp?.foto_url ? (
                            <img src={emp.foto_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 flex-shrink-0">
                              {getInit(emp?.nombre, emp?.apellido)}
                            </div>
                          )}
                          <span className="font-bold text-gray-800 text-[11px]">{n.empleado_nombre}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs font-mono">{n.fecha}</td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${badge(tipo)}`}>{tipo}</span>
                      </td>
                      <td className="p-4 text-xs text-gray-500 max-w-[180px] truncate">{detalle}</td>
                      <td className="p-4">
                        {n.justificacion
                          ? <span className="text-[9px] bg-green-100 text-green-800 px-2 py-1 rounded-full font-black uppercase">Justificada</span>
                          : <span className="text-[9px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-black uppercase">Registrada</span>
                        }
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => abrirDocs(n)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Documentos adjuntos">
                          <Upload size={14}/>
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => editarInc(n)}
                            className="text-blue-500 text-[10px] border border-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 font-bold">
                            Editar
                          </button>
                          <button onClick={() => eliminarIncidencia(n.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TABLA HORAS EXTRAS
      ══════════════════════════════════════════════════════════════════ */}
      {pestana === 'horas_extras' && (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          {/* Resumen rápido por modalidad */}
          <div className="p-4 border-b bg-amber-50/40">
            <div className="flex flex-wrap gap-4 text-[10px]">
              {MODALIDADES_HE.map(m => {
                const cant = horasExtras.filter(h => h.modalidad === m.value);
                const total = cant.reduce((s, h) => s + (h.horas_decimal || 0), 0);
                return total > 0 ? (
                  <div key={m.value} className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full font-black ${m.color}`}>{m.label}</span>
                    <span className="text-gray-500 font-mono">{total.toFixed(1)}h</span>
                  </div>
                ) : null;
              })}
              {horasExtras.length === 0 && <span className="text-gray-400 italic">Sin registros este mes</span>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-wide">
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-center">Horas</th>
                  <th className="p-4">Modalidad de compensación</th>
                  <th className="p-4">Aprobado por</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {horasExtras.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic text-sm">Sin horas extras registradas en este periodo</td></tr>
                ) : horasExtras.map(h => {
                  const emp = empleados.find(e => e.id === h.empleado_id);
                  return (
                    <tr key={h.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {emp?.foto_url ? (
                            <img src={emp.foto_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-black text-amber-700 flex-shrink-0">
                              {getInit(emp?.nombre, emp?.apellido)}
                            </div>
                          )}
                          <span className="font-bold text-gray-800 text-[11px]">{h.empleado_nombre}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs font-mono">{h.fecha}</td>
                      <td className="p-4 text-center">
                        <span className="font-black text-amber-700 text-sm">{h.horas}h</span>
                        {h.minutos > 0 && <span className="text-gray-400 text-xs"> {h.minutos}m</span>}
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${badgeHE(h.modalidad)}`}>
                          {labelHE(h.modalidad)}
                        </span>
                        {h.observaciones && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">{h.observaciones}</p>
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-500">{h.aprobado_por || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                          h.estado === 'Aprobado'  ? 'bg-green-100 text-green-800' :
                          h.estado === 'Rechazado' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{h.estado}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          {h.estado === 'Pendiente' && (
                            <button onClick={() => aprobarHE(h.id)}
                              className="text-green-600 text-[9px] border border-green-300 px-2 py-1 rounded-lg hover:bg-green-50 font-black">
                              Aprobar
                            </button>
                          )}
                          <button onClick={() => editarHE(h)}
                            className="text-blue-500 text-[10px] border border-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 font-bold">
                            Editar
                          </button>
                          <button onClick={() => eliminarHE(h.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {horasExtras.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-black text-[11px]">
                  <tr>
                    <td colSpan={2} className="p-3 text-right text-gray-500 uppercase">Total del mes:</td>
                    <td className="p-3 text-center text-amber-700">{totalHE.toFixed(1)}h</td>
                    <td colSpan={4}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL INCIDENCIA (Recortado para mostrar la estructura base)
      ══════════════════════════════════════════════════════════════════ */}
      {modalInc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-black text-[#185FA5]">{editandoId ? 'Editar incidencia' : 'Registrar incidencia'}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Tardanzas, faltas, suspensiones y llamadas de atención</p>
              </div>
              <button onClick={() => setModalInc(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Colaborador */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Colaborador</label>
                <select value={formInc.empleado_id}
                  onChange={e => {
                    const emp = empleados.find(em => em.id === e.target.value);
                    setFormInc({...formInc, empleado_id: e.target.value, empleado_nombre: emp ? `${emp.nombre} ${emp.apellido}` : ''});
                  }}
                  className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 text-sm">
                  <option value="">Seleccionar colaborador...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>

              {/* Fecha y tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Fecha</label>
                  <input type="date" value={formInc.fecha} onChange={e => setFormInc({...formInc, fecha: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tipo de incidencia</label>
                  <select value={formInc.tipo} onChange={e => setFormInc({...formInc, tipo: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500">
                    {TIPOS_INCIDENCIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Lógica condicional según el tipo (manteniendo tu código) */}
              {formInc.tipo === 'Tardanza' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Minutos de tardanza</label>
                  <input type="number" min="0" value={formInc.minutos_tardanza} onChange={e => setFormInc({...formInc, minutos_tardanza: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
                </div>
              )}

              {/* Justificación (Tardanza/Falta) */}
              {(formInc.tipo === 'Tardanza' || formInc.tipo === 'Falta') && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="checkbox" checked={formInc.justificada} onChange={e => setFormInc({...formInc, justificada: e.target.checked})}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"/>
                    ¿Incidencia justificada?
                  </label>
                  {formInc.justificada && (
                    <textarea value={formInc.justificacion} onChange={e => setFormInc({...formInc, justificacion: e.target.value})} placeholder="Motivo de la justificación..."
                      className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 h-24"/>
                  )}
                </div>
              )}

              {/* Suspensión / Llamada */}
              {(formInc.tipo === 'Suspension' || formInc.tipo === 'LlamadaAtencion') && (
                <div className="space-y-3">
                  {formInc.tipo === 'Suspension' && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Días de suspensión</label>
                      <input type="number" min="1" value={formInc.dias_suspension} onChange={e => setFormInc({...formInc, dias_suspension: e.target.value})}
                        className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Motivo detallado</label>
                    <textarea value={formInc.motivo} onChange={e => setFormInc({...formInc, motivo: e.target.value})} placeholder="Describe el motivo de la acción..."
                      className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 h-24"/>
                  </div>
                </div>
              )}

              <button onClick={guardarIncidencia} className="w-full bg-[#185FA5] hover:bg-[#11284e] text-white p-4 rounded-xl font-black text-sm shadow-lg transition-colors mt-4">
                Guardar registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL HORAS EXTRAS
      ══════════════════════════════════════════════════════════════════ */}
      {modalHE && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-black text-[#185FA5]">{editandoHEId ? 'Editar horas extras' : 'Registrar horas extras'}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Gestión de sobretiempo y compensaciones</p>
              </div>
              <button onClick={() => setModalHE(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Colaborador</label>
                <select value={formHE.empleado_id}
                  onChange={e => {
                    const emp = empleados.find(em => em.id === e.target.value);
                    setFormHE({...formHE, empleado_id: e.target.value, empleado_nombre: emp ? `${emp.nombre} ${emp.apellido}` : ''});
                  }}
                  className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 text-sm">
                  <option value="">Seleccionar colaborador...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Fecha de ejecución</label>
                <input type="date" value={formHE.fecha} onChange={e => setFormHE({...formHE, fecha: e.target.value})}
                  className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Horas</label>
                  <input type="number" min="0" value={formHE.horas} onChange={e => setFormHE({...formHE, horas: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Minutos</label>
                  <input type="number" min="0" max="59" value={formHE.minutos} onChange={e => setFormHE({...formHE, minutos: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Modalidad de compensación</label>
                <div className="space-y-2">
                  {MODALIDADES_HE.map(m => (
                    <label key={m.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formHE.modalidad === m.value ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input type="radio" name="modalidad_he" value={m.value} checked={formHE.modalidad === m.value} onChange={e => setFormHE({...formHE, modalidad: e.target.value})}
                        className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"/>
                      <div>
                        <div className="font-bold text-sm text-gray-800">{m.label}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{m.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Observaciones</label>
                <textarea value={formHE.observaciones} onChange={e => setFormHE({...formHE, observaciones: e.target.value})} placeholder="Detalle la labor realizada..."
                  className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 h-24"/>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Aprobado por</label>
                <input type="text" value={formHE.aprobado_por} onChange={e => setFormHE({...formHE, aprobado_por: e.target.value})} placeholder="Nombre del supervisor..."
                  className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
              </div>

              <button onClick={guardarHoraExtra} className="w-full bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-xl font-black text-sm shadow-lg transition-colors mt-4">
                Guardar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}