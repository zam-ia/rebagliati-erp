// src/pages/rrhh/TabCeses.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useCalculoLiquidacion from './CalculoLiquidacion';
import LiquidacionParaEntrega from '../../components/LiquidacionParaEntrega';
import { X, Eye, FileText, CalendarDays, DollarSign, AlertCircle, Printer } from 'lucide-react';

export default function TabCeses() {
  const [ceses, setCeses] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalLiquidacion, setModalLiquidacion] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    empleado_id: '',
    empleado_nombre: '',
    cargo: '',
    area: '',
    sueldo_total: 0,
    sueldo_bruto: 0,
    comodato: 0,
    asignacion_familiar: 0,
    tiene_hijos: false,
    fecha_inicio: '',
    fecha_inicio_planilla: '',
    sistema_pensionario: '',
    motivo: '',
    fecha_cese: '',
    ultimo_dia_trabajado: '',
    beneficios_pagados: false,
    monto_liquidacion: '',
    observaciones: '',
    remuneracion_pagada: false,
    condicion_trabajo: 0,
    remuneracion_pendiente: 0,
    ultima_gratificacion: ''
  });

  // Beneficios sociales desde hook
  const calculo = useCalculoLiquidacion({
    empleado: {
      sueldo_bruto: form.sueldo_bruto,
      sueldo_total: form.sueldo_total,
      asignacion_familiar: form.asignacion_familiar,
      fecha_inicio: form.fecha_inicio,
      sistema_pensionario: form.sistema_pensionario
    },
    fechaCese: form.fecha_cese,
    fechaInicioPlanilla: form.fecha_inicio_planilla ? form.fecha_inicio_planilla : undefined,
    ultimaGratificacion: form.ultima_gratificacion !== '' ? Number(form.ultima_gratificacion) : undefined
  });

  // Actualizar monto liquidación (sin función externa para evitar bucle)
  useEffect(() => {
    if (calculo && !modoEdicion) {
      const netoMes = (() => {
        if (!form.fecha_cese || !form.sueldo_bruto) return 0;
        const brutoMes = form.sueldo_bruto;
        const descuento =
          form.sistema_pensionario === 'ONP'
            ? brutoMes * 0.13
            : form.sistema_pensionario && form.sistema_pensionario !== ''
            ? brutoMes * 0.1137
            : 0;
        return brutoMes + (form.asignacion_familiar || 0) + (form.condicion_trabajo || 0) - descuento;
      })();
      const total =
        Number(calculo.totalFinal) +
        (form.remuneracion_pagada ? 0 : netoMes);
      setForm(prev => ({
        ...prev,
        monto_liquidacion: total.toFixed(2),
        remuneracion_pendiente: netoMes
      }));
    }
  }, [calculo, form.remuneracion_pagada, form.condicion_trabajo, form.sueldo_bruto, form.asignacion_familiar, form.sistema_pensionario, form.fecha_cese, modoEdicion]);

  const cargarCeses = async () => {
    const { data } = await supabase.from('ceses').select('*').order('fecha_cese', { ascending: false });
    setCeses(data || []);
  };

  const cargarEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('*');
    setEmpleados(data || []);
  };

  useEffect(() => {
    cargarCeses();
    cargarEmpleados();
  }, []);

  const guardarCese = async () => {
    if (!form.empleado_id || !form.fecha_cese || !form.motivo) {
      alert('Completa empleado, fecha y motivo');
      return;
    }
    setLoading(true);
    const emp = empleados.find(e => e.id === form.empleado_id);
    if (!emp) { alert('Empleado no encontrado'); setLoading(false); return; }

    const registro = {
      empleado_id: form.empleado_id,
      empleado_nombre: `${emp.nombre} ${emp.apellido}`,
      cargo: emp.cargo,
      area: emp.area,
      motivo: form.motivo,
      fecha_cese: form.fecha_cese,
      ultimo_dia_trabajado: form.ultimo_dia_trabajado || null,
      beneficios_pagados: form.beneficios_pagados,
      monto_liquidacion: form.monto_liquidacion || 0,
      detalle_liquidacion: calculo,
      observaciones: form.observaciones,
      remuneracion_pagada: form.remuneracion_pagada,
      condicion_trabajo: form.condicion_trabajo,
      remuneracion_pendiente: form.remuneracion_pendiente,
      fecha_inicio_planilla: form.fecha_inicio_planilla || null,
      ultima_gratificacion: form.ultima_gratificacion !== '' ? Number(form.ultima_gratificacion) : null
    };

    let error;
    if (modoEdicion && editandoId) {
      const result = await supabase.from('ceses').update(registro).eq('id', editandoId);
      error = result.error;
      if (!error) alert('Cese actualizado correctamente');
    } else {
      const result = await supabase.from('ceses').insert([registro]);
      error = result.error;
      if (!error) {
        await supabase.from('empleados').update({ estado: 'inactivo' }).eq('id', form.empleado_id);
        alert('Cese registrado y empleado marcado como inactivo');
      }
    }

    if (error) alert('Error al guardar: ' + error.message);
    else {
      setModal(false);
      setModoEdicion(false);
      setEditandoId(null);
      resetForm();
      cargarCeses();
      cargarEmpleados();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      empleado_id: '', empleado_nombre: '', cargo: '', area: '',
      sueldo_total: 0, sueldo_bruto: 0, comodato: 0, asignacion_familiar: 0,
      tiene_hijos: false, fecha_inicio: '', fecha_inicio_planilla: '',
      sistema_pensionario: '', motivo: '', fecha_cese: '', ultimo_dia_trabajado: '',
      beneficios_pagados: false, monto_liquidacion: '', observaciones: '',
      remuneracion_pagada: false, condicion_trabajo: 0, remuneracion_pendiente: 0,
      ultima_gratificacion: ''
    });
  };

  const abrirModalNuevo = () => { resetForm(); setModal(true); };

  const editarCese = (cese) => {
    setModoEdicion(true);
    setEditandoId(cese.id);
    const emp = empleados.find(e => e.id === cese.empleado_id) || {};
    setForm({
      empleado_id: cese.empleado_id || '',
      empleado_nombre: cese.empleado_nombre || '',
      cargo: cese.cargo || '',
      area: cese.area || '',
      sueldo_total: emp.sueldo_total || 0,
      sueldo_bruto: emp.sueldo_bruto || 0,
      comodato: emp.comodato || 0,
      asignacion_familiar: emp.asignacion_familiar || 0,
      tiene_hijos: emp.tiene_hijos || false,
      fecha_inicio: emp.fecha_inicio || '',
      fecha_inicio_planilla: cese.fecha_inicio_planilla || emp.fecha_inicio || '',
      sistema_pensionario: emp.sistema_pensionario || '',
      motivo: cese.motivo || '',
      fecha_cese: cese.fecha_cese || '',
      ultimo_dia_trabajado: cese.ultimo_dia_trabajado || '',
      beneficios_pagados: cese.beneficios_pagados || false,
      monto_liquidacion: cese.monto_liquidacion || '',
      observaciones: cese.observaciones || '',
      remuneracion_pagada: cese.remuneracion_pagada || false,
      condicion_trabajo: cese.condicion_trabajo || 0,
      remuneracion_pendiente: cese.remuneracion_pendiente || 0,
      ultima_gratificacion: cese.ultima_gratificacion != null ? cese.ultima_gratificacion : ''
    });
    setModal(true);
  };

  const eliminarCese = async (id) => {
    if (confirm('¿Eliminar este registro de cese?')) {
      const { error } = await supabase.from('ceses').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargarCeses();
    }
  };

  const handleEmpleadoChange = (empleadoId) => {
    const emp = empleados.find(e => e.id === empleadoId);
    if (emp) {
      setForm({
        ...form,
        empleado_id: emp.id,
        empleado_nombre: `${emp.nombre} ${emp.apellido}`,
        cargo: emp.cargo || '',
        area: emp.area || '',
        sueldo_total: emp.sueldo_total || 0,
        sueldo_bruto: emp.sueldo_bruto || 0,
        comodato: emp.comodato || 0,
        asignacion_familiar: emp.asignacion_familiar || 0,
        tiene_hijos: emp.tiene_hijos || false,
        fecha_inicio: emp.fecha_inicio || '',
        fecha_inicio_planilla: emp.fecha_inicio || '',
        sistema_pensionario: emp.sistema_pensionario || ''
      });
    } else resetForm();
  };

  const getMotivoLabel = (motivo) => {
    const labels = { renuncia_voluntaria: 'Renuncia voluntaria', despido: 'Despido', jubilacion: 'Jubilación', fin_contrato: 'Fin de contrato', fallecimiento: 'Fallecimiento', otros: 'Otros' };
    return labels[motivo] || motivo;
  };

  const getMotivoColor = (motivo) => {
    switch (motivo) {
      case 'renuncia_voluntaria': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'despido': return 'bg-red-100 text-red-700 border-red-200';
      case 'fin_contrato': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const abrirLiquidacion = (cese) => {
    const emp = empleados.find(e => e.id === cese.empleado_id);
    setModalLiquidacion({ cese, empleado: emp });
  };

  const construirEmpleadoTemporal = () => ({
    nombre: form.empleado_nombre.split(' ')[0] || '',
    apellido: form.empleado_nombre.split(' ').slice(1).join(' ') || '',
    dni: empleados.find(e => e.id === form.empleado_id)?.dni || '',
    cargo: form.cargo,
    fecha_inicio: form.fecha_inicio_planilla || form.fecha_inicio,
    comodato: form.comodato,
    sueldo_bruto: form.sueldo_bruto,
    sueldo_total: form.sueldo_total,
    asignacion_familiar: form.asignacion_familiar,
    tiene_hijos: form.tiene_hijos,
    sistema_pensionario: form.sistema_pensionario
  });

  const abrirVistaPrevia = () => {
    if (!form.empleado_id || !form.fecha_cese) {
      alert('Selecciona un empleado y la fecha de cese');
      return;
    }
    setShowPreview(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
              <FileText className="w-6 h-6 text-[#185FA5]" />
            </div>
            <h2 className="text-3xl font-black text-[#0B1527] tracking-tight">Ceses y Liquidaciones</h2>
          </div>
          <p className="text-gray-500 text-sm font-medium ml-12">Registro de ceses con cálculo automático de liquidación (MYPE)</p>
        </div>
        <button onClick={abrirModalNuevo} className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all">
          + Registrar Cese
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Empleado</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Cargo</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Motivo</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha cese</th>
                <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Liquidación</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Beneficios</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ceses.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400 font-medium">No hay registros de ceses</td></tr>
              ) : (
                ceses.map(cese => (
                  <tr key={cese.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-800 text-xs">{cese.empleado_nombre}</td>
                    <td className="p-4 text-gray-600 text-xs">{cese.cargo}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getMotivoColor(cese.motivo)}`}>
                        {getMotivoLabel(cese.motivo)}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-600">{cese.fecha_cese}</td>
                    <td className="p-4 text-right font-bold text-emerald-700 text-xs">
                      S/ {Number(cese.monto_liquidacion || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      {cese.beneficios_pagados ? (
                        <span className="text-emerald-600 font-bold text-xs">✓ Pagados</span>
                      ) : (
                        <span className="text-red-400 text-xs">Pendiente</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => editarCese(cese)} className="text-blue-600 text-[11px] border-2 border-blue-200 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 transition-colors font-bold">
                          Editar
                        </button>
                        <button onClick={() => eliminarCese(cese.id)} className="text-red-500 text-[11px] border-2 border-red-200 px-2.5 py-1.5 rounded-xl hover:bg-red-50 transition-colors font-bold">
                          Eliminar
                        </button>
                        <button onClick={() => abrirLiquidacion(cese)} className="text-emerald-600 text-[11px] border-2 border-emerald-200 px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors font-bold flex items-center gap-1">
                          <Eye size={12} /> Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ MODAL CREAR/EDITAR CESE ═══ */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#0a1930]/60 backdrop-blur-md p-4 pt-[8vh] pb-[8vh]">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 flex justify-between items-center p-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-black text-[#11284e]">{modoEdicion ? 'Editar Cese' : 'Registrar Cese'}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={abrirVistaPrevia}
                  className="bg-white border-2 border-blue-200 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                >
                  <Printer size={14} /> Vista previa
                </button>
                <button onClick={() => setModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Empleado *</label>
                    {modoEdicion ? (
                      <input type="text" value={form.empleado_nombre} disabled className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-sm font-medium" />
                    ) : (
                      <select value={form.empleado_id} onChange={(e) => handleEmpleadoChange(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all">
                        <option value="">Seleccionar empleado activo</option>
                        {empleados.filter(emp => emp.estado === 'activo').map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido} - {emp.cargo}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Motivo de cese *</label>
                    <select value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all">
                      <option value="">Seleccionar motivo</option>
                      <option value="renuncia_voluntaria">Renuncia voluntaria</option>
                      <option value="despido">Despido</option>
                      <option value="jubilacion">Jubilación</option>
                      <option value="fin_contrato">Fin de contrato</option>
                      <option value="fallecimiento">Fallecimiento</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                  {/* ⬅️ Nuevo orden: Fecha Ingreso Planilla primero */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Fecha Ingreso Planilla</label>
                    <input
                      type="date"
                      value={form.fecha_inicio_planilla}
                      onChange={e => setForm({...form, fecha_inicio_planilla: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                      placeholder="Dejar vacío para usar fecha de ingreso original"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Fecha de cese *</label>
                    <input type="date" value={form.fecha_cese} onChange={e => setForm({...form, fecha_cese: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Último día trabajado</label>
                    <input type="date" value={form.ultimo_dia_trabajado} onChange={e => setForm({...form, ultimo_dia_trabajado: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Última gratificación recibida (1/6)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.ultima_gratificacion}
                      onChange={e => setForm({...form, ultima_gratificacion: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                      placeholder="Dejar vacío para cálculo automático"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                    <input type="checkbox" id="remuneracion_pagada" checked={form.remuneracion_pagada} onChange={e => setForm({...form, remuneracion_pagada: e.target.checked})} className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="remuneracion_pagada" className="text-sm font-bold text-gray-700">Remuneración del mes ya pagada (fin de mes)</label>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                    <input type="checkbox" id="beneficios_pagados" checked={form.beneficios_pagados} onChange={e => setForm({...form, beneficios_pagados: e.target.checked})} className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="beneficios_pagados" className="text-sm font-bold text-gray-700">Beneficios ya pagados</label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Observaciones</label>
                    <textarea rows={3} value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-y" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <div className="p-1.5 bg-emerald-100 rounded-lg"><DollarSign size={16} className="text-emerald-700" /></div>
                    Liquidación automática (MYPE)
                  </h4>
                  {calculo ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between bg-white p-2.5 rounded-xl"><span className="text-gray-600">CTS Trunca ({calculo.mesesCTS} meses)</span><span className="font-bold text-gray-800">S/ {calculo.ctsTrunca}</span></div>
                      <div className="flex justify-between bg-white p-2.5 rounded-xl"><span className="text-gray-600">Vacaciones Bruto ({calculo.mesesVac} meses)</span><span className="font-bold text-gray-800">S/ {calculo.vacacionesBruto}</span></div>
                      <div className="flex justify-between bg-red-50 p-2.5 rounded-xl"><span className="text-gray-600">Retención AFP/ONP</span><span className="font-bold text-red-600">- S/ {calculo.retencionVac}</span></div>
                      <div className="flex justify-between bg-white p-2.5 rounded-xl"><span className="text-gray-600">Vacaciones Neto</span><span className="font-bold text-emerald-600">S/ {calculo.vacacionesNeto}</span></div>
                      <div className="flex justify-between bg-white p-2.5 rounded-xl"><span className="text-gray-600">Gratificación ({calculo.mesesGrat} meses)</span><span className="font-bold text-gray-800">S/ {calculo.gratificacionPrincipal}</span></div>
                      <div className="flex justify-between bg-white p-2.5 rounded-xl"><span className="text-gray-600">Bonif. Extra 9%</span><span className="font-bold text-gray-800">S/ {calculo.bonificacionExtra}</span></div>
                      {!form.remuneracion_pagada && (
                        <div className="flex justify-between bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                          <span className="text-gray-600">Remuneración mes</span>
                          <span className="font-bold text-blue-700">
                            S/ {form.remuneracion_pendiente?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-gray-500">Condición de trabajo</label>
                        <input
                          type="number"
                          step="0.01"
                          value={form.condicion_trabajo}
                          onChange={e => setForm({...form, condicion_trabajo: Number(e.target.value)})}
                          className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-medium"
                        />
                      </div>
                      <hr className="border-emerald-200" />
                      <div className="flex justify-between text-lg font-black text-[#0B1527] bg-emerald-50 p-2.5 rounded-xl">
                        <span>Total Final</span>
                        <span className="text-emerald-700">
                          S/ {Number(form.monto_liquidacion).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Monto final (ajustable)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={form.monto_liquidacion}
                          onChange={e => setForm({...form, monto_liquidacion: e.target.value})}
                          className="w-full border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-700 bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle size={32} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-400 font-medium">Selecciona empleado y fecha para calcular</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 rounded-b-3xl p-5 flex gap-3">
              <button onClick={guardarCese} disabled={loading} className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] hover:from-[#185FA5] hover:to-[#1a6ab8] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-[0.98]">
                {loading ? 'Guardando...' : (modoEdicion ? 'Actualizar Cese' : 'Registrar Cese y Liquidación')}
              </button>
              <button onClick={() => setModal(false)} className="px-6 py-3.5 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL VISTA PREVIA ═══ */}
      {showPreview && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-[#0a1930]/70 backdrop-blur-md p-4 pt-[6vh] pb-[6vh]">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 flex justify-between items-center p-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-black text-[#11284e]">Vista previa de la Liquidación</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-6">
              <LiquidacionParaEntrega
                empleado={construirEmpleadoTemporal()}
                calculo={calculo}
                motivo={form.motivo}
                fechaCese={form.fecha_cese}
              />
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 rounded-b-3xl p-5 flex justify-end gap-3">
              <button onClick={() => window.print()} className="bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-[#1a6ab8] transition-all">
                Imprimir
              </button>
              <button onClick={() => setShowPreview(false)} className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL LIQUIDACIÓN HISTÓRICO ═══ */}
      {modalLiquidacion && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#0a1930]/60 backdrop-blur-md p-4 pt-[8vh] pb-[8vh]">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 relative">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10 flex justify-between items-center p-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-black text-[#11284e]">Documento de Liquidación</h3>
              <button onClick={() => setModalLiquidacion(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <LiquidacionParaEntrega
                empleado={modalLiquidacion.empleado}
                calculo={modalLiquidacion.cese.detalle_liquidacion || {}}
                motivo={modalLiquidacion.cese.motivo}
                fechaCese={modalLiquidacion.cese.fecha_cese}
              />
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 rounded-b-3xl p-5 flex justify-end gap-3">
              <button onClick={() => window.print()} className="bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-[#1a6ab8] transition-all">
                Imprimir
              </button>
              <button onClick={() => setModalLiquidacion(null)} className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 20px; }
      `}} />
    </div>
  );
}