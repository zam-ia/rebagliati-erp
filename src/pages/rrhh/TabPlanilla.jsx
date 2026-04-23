// src/pages/rrhh/TabPlanilla.jsx
// Módulo de Novedades: Incidencias (planilla + locadores) + Horas Extras (planilla y locadores)
// Visualización de fotos, separación por tipo de persona, gestión documental.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Upload, FileText, Trash2, Eye, X, Plus, Clock, AlertTriangle,
  Users, Briefcase, Loader2, CheckCircle, XCircle
} from 'lucide-react';

// ─── CONFIGURACIÓN DE TIPOS ─────────────────────────────────────────────────
const TIPOS_INCIDENCIA = [
  { value: 'Tardanza', label: 'Tardanza', color: 'bg-red-100 text-red-800' },
  { value: 'Falta', label: 'Falta', color: 'bg-orange-100 text-orange-800' },
  { value: 'Suspension', label: 'Suspensión', color: 'bg-purple-100 text-purple-800' },
  { value: 'LlamadaAtencion', label: 'Llamada de atención', color: 'bg-blue-100 text-blue-800' },
];

const MODALIDADES_HE = [
  { value: 'sin_compensacion', label: 'Sin compensación (pago por horas)', desc: 'Pago basado en valor de horas', color: 'bg-gray-100 text-gray-800' },
  { value: 'pago_25', label: 'Pago 25% adicional', desc: 'Hasta 2 horas diarias', color: 'bg-amber-100 text-amber-800' },
  { value: 'pago_35', label: 'Pago 35% adicional', desc: 'Más de 2 horas diarias', color: 'bg-orange-100 text-orange-800' },
  { value: 'compensacion_horas', label: 'Compensar con horas libres', desc: 'Tiempo por tiempo', color: 'bg-teal-100 text-teal-800' },
  { value: 'compensacion_dias', label: 'Compensar con días libres', desc: 'Acumular días de descanso', color: 'bg-green-100 text-green-800' },
];

const badgeIncidencia = (tipo) => TIPOS_INCIDENCIA.find(t => t.value === tipo)?.color || 'bg-gray-100 text-gray-700';
const badgeModalidad = (modalidad) => MODALIDADES_HE.find(m => m.value === modalidad)?.color || 'bg-gray-100 text-gray-700';
const labelModalidad = (modalidad) => MODALIDADES_HE.find(m => m.value === modalidad)?.label || modalidad;

// Formularios vacíos
const FORM_INC_VACIO = {
  tipo_persona: 'planilla', // 'planilla' | 'locador'
  persona_id: '',
  persona_nombre: '',
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'Tardanza',
  minutos_tardanza: 0,
  justificada: false,
  justificacion: '',
  dias_suspension: 0,
  motivo: '',
  documentoSubido: null,
};

const FORM_HE_VACIO = {
  tipo_persona: 'planilla',
  empleado_id: '',
  empleado_nombre: '',
  locador_id: '',
  locador_nombre: '',
  fecha: new Date().toISOString().slice(0, 10),
  horas: 1,
  minutos: 0,
  modalidad: 'sin_compensacion',
  observaciones: '',
  aprobado_por: '',
  documentoSubido: null,
};

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export default function TabPlanilla() {
  // Estados globales
  const [pestana, setPestana] = useState('incidencias');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [empleados, setEmpleados] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Incidencias
  const [incidencias, setIncidencias] = useState([]);
  const [modalInc, setModalInc] = useState(false);
  const [editandoIncId, setEditandoIncId] = useState(null);
  const [formInc, setFormInc] = useState(FORM_INC_VACIO);

  // Horas extras
  const [horasExtras, setHorasExtras] = useState([]);
  const [modalHE, setModalHE] = useState(false);
  const [editandoHEId, setEditandoHEId] = useState(null);
  const [formHE, setFormHE] = useState(FORM_HE_VACIO);

  // Documentos
  const [modalDoc, setModalDoc] = useState(null);
  const [docsIncidencia, setDocsInc] = useState([]);
  const [subiendoDoc, setSubiendoDoc] = useState(false);

  // Feedback
  const [toast, setToast] = useState(null);

  // ─── HELPERS ───────────────────────────────────────────────────────────────
  const mostrarToast = (mensaje, tipo = 'info') => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const getInitials = (nombre, apellido) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  };

  // ─── CARGA DE DATOS ────────────────────────────────────────────────────────
  const cargarDatosBase = useCallback(async () => {
    try {
      const [empRes, locRes] = await Promise.all([
        supabase.from('empleados').select('id, nombre, apellido, sueldo_bruto, foto_url').eq('estado', 'activo'),
        supabase.from('locadores').select('id, nombre, apellido, sueldo_base, banco, numero_cuenta').eq('estado', 'activo')
      ]);
      if (empRes.error) throw empRes.error;
      if (locRes.error) throw locRes.error;
      setEmpleados(empRes.data || []);
      setLocadores(locRes.data || []);
    } catch (err) {
      console.error('Error cargando datos base:', err);
      mostrarToast('Error al cargar colaboradores', 'error');
    }
  }, []);

  const cargarIncidencias = useCallback(async () => {
    try {
      const inicio = `${mes}-01`;
      const fin = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('asistencia')
        .select('*')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setIncidencias(data || []);
    } catch (err) {
      mostrarToast('Error al cargar incidencias', 'error');
    }
  }, [mes]);

  const cargarHorasExtras = useCallback(async () => {
    try {
      const inicio = `${mes}-01`;
      const fin = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('horas_extras')
        .select('*')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setHorasExtras(data || []);
    } catch (err) {
      mostrarToast('Error al cargar horas extras', 'error');
    }
  }, [mes]);

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    await cargarDatosBase();
    await Promise.all([cargarIncidencias(), cargarHorasExtras()]);
    setCargando(false);
  }, [cargarDatosBase, cargarIncidencias, cargarHorasExtras]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // ─── GUARDAR INCIDENCIA (ahora soporta planilla y locador) ─────────────────
  const guardarIncidencia = async () => {
    if (!formInc.persona_id || !formInc.fecha) {
      mostrarToast('Selecciona colaborador/locador y fecha', 'error');
      return;
    }

    const esTardanza = formInc.tipo === 'Tardanza';
    const esFalta = formInc.tipo === 'Falta';
    const esSuspension = formInc.tipo === 'Suspension';
    const esLlamada = formInc.tipo === 'LlamadaAtencion';
    const mins = parseInt(formInc.minutos_tardanza) || 0;

    const registro = {
      tipo_persona: formInc.tipo_persona,
      empleado_id: formInc.tipo_persona === 'planilla' ? formInc.persona_id : null,
      locador_id: formInc.tipo_persona === 'locador' ? formInc.persona_id : null,
      empleado_nombre: formInc.persona_nombre,
      fecha: formInc.fecha,
      tardanza: esTardanza,
      falta: esFalta,
      minutos: esTardanza ? mins : 0,
      tardanza_supera_10min: esTardanza ? mins > 10 : false,
      justificacion: (esTardanza || esFalta) && formInc.justificada ? (formInc.justificacion || 'Justificado') : null,
      tipo_incidencia: formInc.tipo,
      dias_suspension: esSuspension ? parseInt(formInc.dias_suspension) || 0 : 0,
      motivo: (esSuspension || esLlamada) ? formInc.motivo : null,
      descanso_medico: false,
    };

    try {
      let incidenciaId = editandoIncId;
      if (editandoIncId) {
        const { error } = await supabase.from('asistencia').update(registro).eq('id', editandoIncId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('asistencia').insert([registro]).select();
        if (error) throw error;
        incidenciaId = data?.[0]?.id;
      }

      if (formInc.documentoSubido && incidenciaId) {
        await subirDocAutomatic(formInc.documentoSubido, formInc.persona_id, incidenciaId, formInc.tipo);
      }

      mostrarToast(editandoIncId ? 'Incidencia actualizada' : 'Incidencia registrada', 'success');
      setModalInc(false);
      setEditandoIncId(null);
      setFormInc(FORM_INC_VACIO);
      await cargarIncidencias();
    } catch (err) {
      mostrarToast(`Error: ${err.message}`, 'error');
    }
  };

  // ─── GUARDAR HORA EXTRA (sin cambios, ya soporta locadores) ─────────────────
  const guardarHoraExtra = async () => {
    if (!formHE.fecha) {
      mostrarToast('Selecciona una fecha', 'error');
      return;
    }

    const horas = parseFloat(formHE.horas) || 0;
    const minutos = parseInt(formHE.minutos) || 0;
    const horasDecimal = parseFloat((horas + (minutos / 60)).toFixed(2));

    let empleado_id = null, locador_id = null, personaNombre = '';
    let valorHora = 0;

    if (formHE.tipo_persona === 'planilla') {
      if (!formHE.empleado_id) {
        mostrarToast('Selecciona un colaborador de planilla', 'error');
        return;
      }
      const emp = empleados.find(e => e.id === formHE.empleado_id);
      if (!emp) return;
      personaNombre = `${emp.nombre} ${emp.apellido}`;
      empleado_id = formHE.empleado_id;
      valorHora = (emp.sueldo_bruto || 0) / 240;
    } else {
      if (!formHE.locador_id) {
        mostrarToast('Selecciona un locador', 'error');
        return;
      }
      const loc = locadores.find(l => l.id === formHE.locador_id);
      if (!loc) return;
      personaNombre = `${loc.nombre} ${loc.apellido}`;
      locador_id = formHE.locador_id;
      valorHora = (loc.sueldo_base || 0) / 240;
    }

    const registro = {
      tipo_persona: formHE.tipo_persona,
      empleado_id,
      locador_id,
      empleado_nombre: formHE.tipo_persona === 'planilla' ? personaNombre : null,
      fecha: formHE.fecha,
      horas,
      minutos,
      horas_decimal: horasDecimal,
      modalidad: formHE.modalidad,
      observaciones: formHE.observaciones || null,
      aprobado_por: formHE.aprobado_por || null,
      estado: 'Pendiente',
      valor_hora: valorHora,
    };

    try {
      if (editandoHEId) {
        const { error } = await supabase.from('horas_extras').update(registro).eq('id', editandoHEId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('horas_extras').insert([registro]);
        if (error) throw error;
      }

      mostrarToast(editandoHEId ? 'Horas extras actualizadas' : 'Horas extras registradas', 'success');
      setModalHE(false);
      setEditandoHEId(null);
      setFormHE(FORM_HE_VACIO);
      await cargarHorasExtras();
    } catch (err) {
      mostrarToast(`Error: ${err.message}`, 'error');
    }
  };

  // ─── ACCIONES ──────────────────────────────────────────────────────────────
  const eliminarIncidencia = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await supabase.from('asistencia').delete().eq('id', id);
      mostrarToast('Incidencia eliminada', 'success');
      await cargarIncidencias();
    } catch (err) {
      mostrarToast('Error al eliminar', 'error');
    }
  };

  const eliminarHE = async (id) => {
    if (!confirm('¿Eliminar este registro de horas extras?')) return;
    try {
      await supabase.from('horas_extras').delete().eq('id', id);
      mostrarToast('Horas extras eliminadas', 'success');
      await cargarHorasExtras();
    } catch (err) {
      mostrarToast('Error al eliminar', 'error');
    }
  };

  const aprobarHE = async (id) => {
    try {
      await supabase.from('horas_extras').update({ estado: 'Aprobado' }).eq('id', id);
      mostrarToast('Horas aprobadas', 'success');
      await cargarHorasExtras();
    } catch (err) {
      mostrarToast('Error al aprobar', 'error');
    }
  };

  // ─── DOCUMENTOS ────────────────────────────────────────────────────────────
  const subirDocAutomatic = async (file, personaId, incidenciaId, tipo) => {
    const ext = file.name.split('.').pop();
    const path = `documentos_incidencias/${incidenciaId}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('documentos-empleados').upload(path, file);
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from('documentos-empleados').getPublicUrl(path);
    const { data: doc } = await supabase.from('documentos_empleados').insert({
      empleado_id: personaId,
      tipo_documento: 'incidencia_planilla',
      titulo: `${tipo} - documento adjunto`,
      archivo_url: publicUrl,
    }).select().single();
    if (doc) {
      await supabase.from('incidencia_documentos').insert({ incidencia_id: incidenciaId, documento_id: doc.id });
    }
  };

  const abrirDocs = async (inc) => {
    const { data } = await supabase
      .from('incidencia_documentos')
      .select('documento_id, documentos_empleados(*)')
      .eq('incidencia_id', inc.id);
    setDocsInc((data || []).map(d => d.documentos_empleados).filter(Boolean));
    setModalDoc({ incidenciaId: inc.id, incidencia: inc });
  };

  const eliminarDoc = async (doc) => {
    if (!confirm('¿Eliminar documento?')) return;
    try {
      const path = doc.archivo_url.split('/public/')[1];
      if (path) await supabase.storage.from('documentos-empleados').remove([path]);
      await supabase.from('incidencia_documentos').delete().eq('documento_id', doc.id);
      await supabase.from('documentos_empleados').delete().eq('id', doc.id);
      const { data } = await supabase
        .from('incidencia_documentos')
        .select('documento_id, documentos_empleados(*)')
        .eq('incidencia_id', modalDoc.incidenciaId);
      setDocsInc((data || []).map(d => d.documentos_empleados).filter(Boolean));
      mostrarToast('Documento eliminado', 'success');
    } catch (err) {
      mostrarToast('Error al eliminar documento', 'error');
    }
  };

  // ─── EDICIÓN ───────────────────────────────────────────────────────────────
  const editarInc = (inc) => {
    setEditandoIncId(inc.id);
    setFormInc({
      tipo_persona: inc.tipo_persona || 'planilla',
      persona_id: inc.tipo_persona === 'locador' ? inc.locador_id : inc.empleado_id,
      persona_nombre: inc.empleado_nombre,
      fecha: inc.fecha,
      tipo: inc.tipo_incidencia || (inc.tardanza ? 'Tardanza' : inc.falta ? 'Falta' : 'Tardanza'),
      minutos_tardanza: inc.minutos || 0,
      justificada: !!inc.justificacion,
      justificacion: inc.justificacion || '',
      dias_suspension: inc.dias_suspension || 0,
      motivo: inc.motivo || '',
      documentoSubido: null,
    });
    setModalInc(true);
  };

  const editarHE = (he) => {
    setEditandoHEId(he.id);
    setFormHE({
      tipo_persona: he.tipo_persona || 'planilla',
      empleado_id: he.empleado_id || '',
      empleado_nombre: he.empleado_nombre || '',
      locador_id: he.locador_id || '',
      locador_nombre: '',
      fecha: he.fecha,
      horas: he.horas || 1,
      minutos: he.minutos || 0,
      modalidad: he.modalidad || 'sin_compensacion',
      observaciones: he.observaciones || '',
      aprobado_por: he.aprobado_por || '',
      documentoSubido: null,
    });
    setModalHE(true);
  };

  // ─── CÁLCULOS PARA KPIs ────────────────────────────────────────────────────
  const resumenIncidencias = useMemo(() => {
    return incidencias.reduce((acc, n) => {
      const tipo = n.tipo_incidencia || (n.tardanza ? 'Tardanza' : n.falta ? 'Falta' : 'Otro');
      if (tipo === 'Tardanza') acc.tardanzas++;
      else if (tipo === 'Falta') acc.faltas++;
      else if (tipo === 'Suspension') acc.suspensiones++;
      else if (tipo === 'LlamadaAtencion') acc.llamadas++;
      return acc;
    }, { tardanzas: 0, faltas: 0, suspensiones: 0, llamadas: 0 });
  }, [incidencias]);

  const totalHorasExtras = useMemo(() => {
    return horasExtras.reduce((sum, h) => sum + (h.horas_decimal || 0), 0);
  }, [horasExtras]);

  const heAprobadas = useMemo(() => {
    return horasExtras.filter(h => h.estado === 'Aprobado').length;
  }, [horasExtras]);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#185FA5] animate-spin" />
        <span className="ml-3 text-gray-500">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="p-4 relative">
      {/* Toast de notificaciones */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-slide-in
          ${toast.tipo === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            toast.tipo === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          {toast.tipo === 'success' && <CheckCircle size={16} />}
          {toast.tipo === 'error' && <XCircle size={16} />}
          {toast.mensaje}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div className="bg-white border p-2 rounded-xl flex items-center gap-3 shadow-sm">
          <span className="text-[10px] font-black text-gray-400 uppercase ml-2">Periodo</span>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="outline-none font-bold text-gray-700 text-sm"
          />
        </div>

        <button
          onClick={() => {
            if (pestana === 'incidencias') {
              setEditandoIncId(null);
              setFormInc(FORM_INC_VACIO);
              setModalInc(true);
            } else {
              setEditandoHEId(null);
              setFormHE(FORM_HE_VACIO);
              setModalHE(true);
            }
          }}
          className="bg-[#185FA5] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-[#11284e] transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          {pestana === 'incidencias' ? 'Registrar incidencia' : 'Registrar horas extras'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Tardanzas', val: resumenIncidencias.tardanzas, bg: 'bg-red-50', txt: 'text-red-700' },
          { label: 'Faltas', val: resumenIncidencias.faltas, bg: 'bg-orange-50', txt: 'text-orange-700' },
          { label: 'Suspensiones', val: resumenIncidencias.suspensiones, bg: 'bg-purple-50', txt: 'text-purple-700' },
          { label: 'Llamadas atención', val: resumenIncidencias.llamadas, bg: 'bg-blue-50', txt: 'text-blue-700' },
          { label: 'Hrs extras (mes)', val: `${totalHorasExtras.toFixed(1)}h`, bg: 'bg-amber-50', txt: 'text-amber-700' },
          { label: 'HE aprobadas', val: heAprobadas, bg: 'bg-green-50', txt: 'text-green-700' },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} border border-gray-100 p-3 rounded-2xl`}>
            <div className={`text-2xl font-black ${k.txt}`}>{k.val}</div>
            <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${k.txt} opacity-70`}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Pestañas */}
      <div className="border-b border-gray-200 mb-4 flex gap-0">
        {[
          { id: 'incidencias', icon: <AlertTriangle size={14} />, label: 'Incidencias' },
          { id: 'horas_extras', icon: <Clock size={14} />, label: 'Horas extras' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPestana(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              pestana === tab.id
                ? 'border-[#185FA5] text-[#185FA5]'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'incidencias' && incidencias.length > 0 && (
              <span className="ml-1 bg-red-100 text-red-800 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                {incidencias.length}
              </span>
            )}
            {tab.id === 'horas_extras' && horasExtras.length > 0 && (
              <span className="ml-1 bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                {horasExtras.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TABLA INCIDENCIAS (con soporte para planilla y locadores) ────────── */}
      {pestana === 'incidencias' && (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-wide">
                  <th className="p-4">Persona</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Tipo Inc.</th>
                  <th className="p-4">Detalle</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Docs</th>
                  <th className="p-4 text-center">Acciones</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incidencias.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 italic text-sm">
                      Sin incidencias en este periodo
                    </td>
                  </tr>
                ) : (
                  incidencias.map((n) => {
                    const esPlanilla = n.tipo_persona !== 'locador';
                    let fotoUrl = null;
                    let iniciales = '';
                    let nombre = n.empleado_nombre || '';

                    if (esPlanilla) {
                      const emp = empleados.find(e => e.id === n.empleado_id);
                      fotoUrl = emp?.foto_url;
                      iniciales = getInitials(emp?.nombre, emp?.apellido);
                    } else {
                      const loc = locadores.find(l => l.id === n.locador_id);
                      iniciales = getInitials(loc?.nombre, loc?.apellido);
                    }

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
                            {fotoUrl ? (
                              <img src={fotoUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="foto" />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                esPlanilla ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {iniciales || (esPlanilla ? <Users size={14} /> : <Briefcase size={14} />)}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-gray-800 text-[11px]">{nombre}</span>
                              <span className={`ml-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                esPlanilla ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {esPlanilla ? 'Planilla' : 'Locador'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 text-xs font-mono">{n.fecha}</td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${badgeIncidencia(tipo)}`}>
                            {tipo}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500 max-w-[180px] truncate">{detalle}</td>
                        <td className="p-4">
                          {n.justificacion ? (
                            <span className="text-[9px] bg-green-100 text-green-800 px-2 py-1 rounded-full font-black uppercase">
                              Justificada
                            </span>
                          ) : (
                            <span className="text-[9px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-black uppercase">
                              Registrada
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => abrirDocs(n)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Documentos adjuntos"
                          >
                            <Upload size={14} />
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => editarInc(n)}
                              className="text-blue-500 text-[10px] border border-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 font-bold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarIncidencia(n.id)}
                              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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

      {/* ─── TABLA HORAS EXTRAS (sin cambios) ──────────────────────────────────── */}
      {pestana === 'horas_extras' && (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          {/* Resumen por modalidad */}
          <div className="p-4 border-b bg-amber-50/40">
            <div className="flex flex-wrap gap-4 text-[10px]">
              {MODALIDADES_HE.map((m) => {
                const cant = horasExtras.filter((h) => h.modalidad === m.value);
                const total = cant.reduce((s, h) => s + (h.horas_decimal || 0), 0);
                return total > 0 ? (
                  <div key={m.value} className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full font-black ${m.color}`}>{m.label}</span>
                    <span className="text-gray-500 font-mono">{total.toFixed(1)}h</span>
                  </div>
                ) : null;
              })}
              {horasExtras.length === 0 && (
                <span className="text-gray-400 italic">Sin registros este mes</span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-wide">
                  <th className="p-4">Persona</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-center">Horas</th>
                  <th className="p-4">Modalidad</th>
                  <th className="p-4">Aprobado por</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {horasExtras.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 italic text-sm">
                      Sin horas extras registradas en este periodo
                    </td>
                  </tr>
                ) : (
                  horasExtras.map((h) => {
                    const esPlanilla = h.tipo_persona === 'planilla';
                    let nombre = '';
                    let fotoUrl = null;
                    let iniciales = '';

                    if (esPlanilla) {
                      const emp = empleados.find((e) => e.id === h.empleado_id);
                      nombre = h.empleado_nombre || (emp ? `${emp.nombre} ${emp.apellido}` : '');
                      fotoUrl = emp?.foto_url;
                      iniciales = getInitials(emp?.nombre, emp?.apellido);
                    } else {
                      const loc = locadores.find((l) => l.id === h.locador_id);
                      nombre = loc ? `${loc.nombre} ${loc.apellido}` : '';
                      iniciales = getInitials(loc?.nombre, loc?.apellido);
                    }

                    return (
                      <tr key={h.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {esPlanilla ? (
                              fotoUrl ? (
                                <img src={fotoUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="foto" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 flex-shrink-0">
                                  {iniciales || <Users size={14} />}
                                </div>
                              )
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-black text-purple-700 flex-shrink-0">
                                {iniciales || <Briefcase size={14} />}
                              </div>
                            )}
                            <span className="font-bold text-gray-800 text-[11px]">{nombre}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                            esPlanilla ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {esPlanilla ? 'Planilla' : 'Locador'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500 text-xs font-mono">{h.fecha}</td>
                        <td className="p-4 text-center">
                          <span className="font-black text-amber-700 text-sm">{h.horas}h</span>
                          {h.minutos > 0 && <span className="text-gray-400 text-xs"> {h.minutos}m</span>}
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${badgeModalidad(h.modalidad)}`}>
                            {labelModalidad(h.modalidad)}
                          </span>
                          {h.observaciones && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">
                              {h.observaciones}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-xs text-gray-500">{h.aprobado_por || '—'}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                            h.estado === 'Aprobado'
                              ? 'bg-green-100 text-green-800'
                              : h.estado === 'Rechazado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {h.estado}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                            {h.estado === 'Pendiente' && (
                              <button
                                onClick={() => aprobarHE(h.id)}
                                className="text-green-600 text-[9px] border border-green-300 px-2 py-1 rounded-lg hover:bg-green-50 font-black"
                              >
                                Aprobar
                              </button>
                            )}
                            <button
                              onClick={() => editarHE(h)}
                              className="text-blue-500 text-[10px] border border-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 font-bold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarHE(h.id)}
                              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {horasExtras.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-black text-[11px]">
                  <tr>
                    <td colSpan={3} className="p-3 text-right text-gray-500 uppercase">Total del mes:</td>
                    <td className="p-3 text-center text-amber-700">{totalHorasExtras.toFixed(1)}h</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL INCIDENCIA (con selector de tipo persona y listado combinado) ─── */}
      {modalInc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-black text-[#185FA5]">
                  {editandoIncId ? 'Editar incidencia' : 'Registrar incidencia'}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Tardanzas, faltas, suspensiones y llamadas de atención
                </p>
              </div>
              <button
                onClick={() => setModalInc(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de persona (Planilla / Locador) */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tipo de persona</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="planilla"
                      checked={formInc.tipo_persona === 'planilla'}
                      onChange={() => setFormInc({ ...formInc, tipo_persona: 'planilla', persona_id: '', persona_nombre: '' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">Planilla</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="locador"
                      checked={formInc.tipo_persona === 'locador'}
                      onChange={() => setFormInc({ ...formInc, tipo_persona: 'locador', persona_id: '', persona_nombre: '' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">Locador</span>
                  </label>
                </div>
              </div>

              {/* Selector de persona según tipo */}
              {formInc.tipo_persona === 'planilla' ? (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Colaborador</label>
                  <select
                    value={formInc.persona_id}
                    onChange={(e) => {
                      const emp = empleados.find(em => em.id === e.target.value);
                      setFormInc({
                        ...formInc,
                        persona_id: e.target.value,
                        persona_nombre: emp ? `${emp.nombre} ${emp.apellido}` : '',
                      });
                    }}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">Seleccionar colaborador...</option>
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} {e.apellido}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Locador</label>
                  <select
                    value={formInc.persona_id}
                    onChange={(e) => {
                      const loc = locadores.find(l => l.id === e.target.value);
                      setFormInc({
                        ...formInc,
                        persona_id: e.target.value,
                        persona_nombre: loc ? `${loc.nombre} ${loc.apellido}` : '',
                      });
                    }}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">Seleccionar locador...</option>
                    {locadores.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre} {l.apellido}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fecha y tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formInc.fecha}
                    onChange={(e) => setFormInc({ ...formInc, fecha: e.target.value })}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tipo de incidencia</label>
                  <select
                    value={formInc.tipo}
                    onChange={(e) => setFormInc({ ...formInc, tipo: e.target.value })}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                  >
                    {TIPOS_INCIDENCIA.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campos condicionales */}
              {formInc.tipo === 'Tardanza' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Minutos de tardanza</label>
                  <input
                    type="number"
                    min="0"
                    value={formInc.minutos_tardanza}
                    onChange={(e) => setFormInc({ ...formInc, minutos_tardanza: e.target.value })}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {(formInc.tipo === 'Tardanza' || formInc.tipo === 'Falta') && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formInc.justificada}
                      onChange={(e) => setFormInc({ ...formInc, justificada: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    ¿Incidencia justificada?
                  </label>
                  {formInc.justificada && (
                    <textarea
                      value={formInc.justificacion}
                      onChange={(e) => setFormInc({ ...formInc, justificacion: e.target.value })}
                      placeholder="Motivo de la justificación..."
                      className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 h-24"
                    />
                  )}
                </div>
              )}

              {(formInc.tipo === 'Suspension' || formInc.tipo === 'LlamadaAtencion') && (
                <div className="space-y-3">
                  {formInc.tipo === 'Suspension' && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Días de suspensión</label>
                      <input
                        type="number"
                        min="1"
                        value={formInc.dias_suspension}
                        onChange={(e) => setFormInc({ ...formInc, dias_suspension: e.target.value })}
                        className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Motivo detallado</label>
                    <textarea
                      value={formInc.motivo}
                      onChange={(e) => setFormInc({ ...formInc, motivo: e.target.value })}
                      placeholder="Describe el motivo de la acción..."
                      className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 h-24"
                    />
                  </div>
                </div>
              )}

              {/* Adjuntar documento */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Documento adjunto (opcional)</label>
                <input
                  type="file"
                  onChange={(e) => setFormInc({ ...formInc, documentoSubido: e.target.files?.[0] || null })}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <button
                onClick={guardarIncidencia}
                className="w-full bg-[#185FA5] hover:bg-[#11284e] text-white p-4 rounded-xl font-black text-sm shadow-lg transition-colors mt-4"
              >
                Guardar registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL HORAS EXTRAS (sin cambios) ──────────────────────────────────── */}
      {modalHE && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-black text-[#185FA5]">
                  {editandoHEId ? 'Editar horas extras' : 'Registrar horas extras'}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Gestión de sobretiempo y compensaciones</p>
              </div>
              <button onClick={() => setModalHE(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de persona */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tipo de persona</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="planilla"
                      checked={formHE.tipo_persona === 'planilla'}
                      onChange={() => setFormHE({ ...formHE, tipo_persona: 'planilla', empleado_id: '', locador_id: '' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">Planilla</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="locador"
                      checked={formHE.tipo_persona === 'locador'}
                      onChange={() => setFormHE({ ...formHE, tipo_persona: 'locador', empleado_id: '', locador_id: '' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">Locador</span>
                  </label>
                </div>
              </div>

              {formHE.tipo_persona === 'planilla' ? (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Colaborador</label>
                  <select
                    value={formHE.empleado_id}
                    onChange={(e) => setFormHE({ ...formHE, empleado_id: e.target.value })}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">Seleccionar colaborador...</option>
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Locador</label>
                  <select
                    value={formHE.locador_id}
                    onChange={(e) => setFormHE({ ...formHE, locador_id: e.target.value })}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">Seleccionar locador...</option>
                    {locadores.map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre} {l.apellido}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Fecha de ejecución</label>
                <input
                  type="date"
                  value={formHE.fecha}
                  onChange={(e) => setFormHE({ ...formHE, fecha: e.target.value })}
                  className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Horas</label>
                  <input
                    type="number"
                    min="0"
                    value={formHE.horas}
                    onChange={(e) => setFormHE({ ...formHE, horas: e.target.value })}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Minutos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={formHE.minutos}
                    onChange={(e) => setFormHE({ ...formHE, minutos: e.target.value })}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Modalidad de compensación</label>
                <div className="space-y-2">
                  {MODALIDADES_HE.map((m) => (
                    <label key={m.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formHE.modalidad === m.value ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="modalidad_he"
                        value={m.value}
                        checked={formHE.modalidad === m.value}
                        onChange={(e) => setFormHE({ ...formHE, modalidad: e.target.value })}
                        className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
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
                <textarea
                  value={formHE.observaciones}
                  onChange={(e) => setFormHE({ ...formHE, observaciones: e.target.value })}
                  placeholder="Detalle la labor realizada..."
                  className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 h-24"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Aprobado por</label>
                <input
                  type="text"
                  value={formHE.aprobado_por}
                  onChange={(e) => setFormHE({ ...formHE, aprobado_por: e.target.value })}
                  placeholder="Nombre del supervisor..."
                  className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={guardarHoraExtra}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-xl font-black text-sm shadow-lg transition-colors mt-4"
              >
                Guardar registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE DOCUMENTOS (sin cambios) ──────────────────────────────────── */}
      {modalDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">Documentos de la incidencia</h3>
              <button onClick={() => setModalDoc(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {docsIncidencia.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No hay documentos adjuntos</p>
              ) : (
                docsIncidencia.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      <span className="text-xs font-medium truncate max-w-[180px]">{doc.titulo}</span>
                    </div>
                    <div className="flex gap-1">
                      <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                        <Eye size={14} />
                      </a>
                      <button onClick={() => eliminarDoc(doc)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Subir nuevo documento */}
            <div className="border-t pt-4">
              <p className="text-xs font-black text-gray-400 uppercase mb-2">Adjuntar nuevo documento</p>
              <input
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSubiendoDoc(true);
                    try {
                      await subirDocAutomatic(
                        file,
                        modalDoc.incidencia.empleado_id || modalDoc.incidencia.locador_id,
                        modalDoc.incidenciaId,
                        'Documento adicional'
                      );
                      const { data } = await supabase
                        .from('incidencia_documentos')
                        .select('documento_id, documentos_empleados(*)')
                        .eq('incidencia_id', modalDoc.incidenciaId);
                      setDocsInc((data || []).map((d) => d.documentos_empleados).filter(Boolean));
                      mostrarToast('Documento subido', 'success');
                    } catch (err) {
                      mostrarToast('Error al subir documento', 'error');
                    } finally {
                      setSubiendoDoc(false);
                    }
                  }
                }}
                disabled={subiendoDoc}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
              />
              {subiendoDoc && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                  <Loader2 size={14} className="animate-spin" /> Subiendo...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}