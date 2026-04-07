import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import CalculoLiquidacion from './CalculoLiquidacion';

export default function TabCeses() {
  const [ceses, setCeses] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculoLiquidacion, setCalculoLiquidacion] = useState(null);
  
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
    sistema_pensionario: '',
    motivo: '',
    fecha_cese: '',
    ultimo_dia_trabajado: '',
    beneficios_pagados: false,
    monto_liquidacion: '',
    observaciones: ''
  });

  const cargarCeses = async () => {
    const { data } = await supabase
      .from('ceses')
      .select('*, empleados(nombre, apellido, cargo, area, sueldo_total, sueldo_bruto, comodato, asignacion_familiar, tiene_hijos, fecha_inicio, sistema_pensionario)')
      .order('fecha_cese', { ascending: false });
    setCeses(data || []);
  };

  // CORREGIDO: Ya no filtra por estado 'activo', carga todos los empleados
  const cargarEmpleados = async () => {
    const { data } = await supabase
      .from('empleados')
      .select('id, nombre, apellido, cargo, area, sueldo_total, sueldo_bruto, comodato, asignacion_familiar, tiene_hijos, fecha_inicio, sistema_pensionario, estado');
    setEmpleados(data || []);
  };

  // CORREGIDO: useEffect actualizado
  useEffect(() => {
    cargarCeses();
    cargarEmpleados();
  }, []);

  const handleCalculo = (calculo) => {
    setCalculoLiquidacion(calculo);
    setForm(prev => ({ ...prev, monto_liquidacion: calculo.totalFinal }));
  };

  const guardarCese = async () => {
    if (!form.empleado_id) {
      alert('Debes seleccionar un empleado');
      return;
    }
    if (!form.fecha_cese) {
      alert('Debes seleccionar la fecha de cese');
      return;
    }
    if (!form.motivo) {
      alert('Debes seleccionar el motivo de cese');
      return;
    }

    setLoading(true);
    
    const emp = empleados.find(e => e.id === form.empleado_id);
    if (!emp) {
      alert('Empleado no encontrado');
      setLoading(false);
      return;
    }

    const registro = {
      empleado_id: form.empleado_id,
      empleado_nombre: `${emp.nombre} ${emp.apellido}`,
      cargo: emp.cargo,
      area: emp.area,
      motivo: form.motivo,
      fecha_cese: form.fecha_cese,
      ultimo_dia_trabajado: form.ultimo_dia_trabajado || null,
      beneficios_pagados: form.beneficios_pagados,
      monto_liquidacion: form.monto_liquidacion || calculoLiquidacion?.totalFinal,
      detalle_liquidacion: calculoLiquidacion,
      observaciones: form.observaciones || null
    };

    let error;
    if (modoEdicion && editandoId) {
      // Edición: solo actualizar el registro de cese, NO cambiar estado del empleado
      const result = await supabase.from('ceses').update(registro).eq('id', editandoId);
      error = result.error;
      if (!error) alert('Cese actualizado correctamente');
    } else {
      // Nuevo registro: insertar cese y marcar empleado como inactivo
      const result = await supabase.from('ceses').insert([registro]);
      error = result.error;
      if (!error) {
        await supabase.from('empleados').update({ estado: 'inactivo' }).eq('id', form.empleado_id);
        alert('Cese registrado correctamente');
      }
    }
    
    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setModal(null);
      setModoEdicion(false);
      setEditandoId(null);
      resetForm();
      setCalculoLiquidacion(null);
      cargarCeses();
      cargarEmpleados();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
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
      sistema_pensionario: '',
      motivo: '',
      fecha_cese: '',
      ultimo_dia_trabajado: '',
      beneficios_pagados: false,
      monto_liquidacion: '',
      observaciones: ''
    });
  };

  const editarCese = (cese) => {
    setModoEdicion(true);
    setEditandoId(cese.id);
    
    const empleadoData = cese.empleados || {};
    
    setForm({
      empleado_id: cese.empleado_id || '',
      empleado_nombre: cese.empleado_nombre || '',
      cargo: cese.cargo || '',
      area: cese.area || '',
      sueldo_total: empleadoData.sueldo_total || 0,
      sueldo_bruto: empleadoData.sueldo_bruto || 0,
      comodato: empleadoData.comodato || 0,
      asignacion_familiar: empleadoData.asignacion_familiar || 0,
      tiene_hijos: empleadoData.tiene_hijos || false,
      fecha_inicio: empleadoData.fecha_inicio || '',
      sistema_pensionario: empleadoData.sistema_pensionario || '',
      motivo: cese.motivo || '',
      fecha_cese: cese.fecha_cese || '',
      ultimo_dia_trabajado: cese.ultimo_dia_trabajado || '',
      beneficios_pagados: cese.beneficios_pagados || false,
      monto_liquidacion: cese.monto_liquidacion || '',
      observaciones: cese.observaciones || ''
    });
    
    if (cese.detalle_liquidacion) {
      setCalculoLiquidacion(cese.detalle_liquidacion);
    }
    
    setModal(true);
  };

  const eliminarCese = async (id) => {
    if (confirm('¿Eliminar este registro de cese permanentemente?')) {
      const { error } = await supabase.from('ceses').delete().eq('id', id);
      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        cargarCeses();
      }
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
        sistema_pensionario: emp.sistema_pensionario || ''
      });
    } else {
      resetForm();
    }
    setCalculoLiquidacion(null);
  };

  const getMotivoLabel = (motivo) => {
    const motivos = {
      renuncia_voluntaria: 'Renuncia voluntaria',
      despido: 'Despido',
      jubilacion: 'Jubilación',
      fin_contrato: 'Fin de contrato',
      fallecimiento: 'Fallecimiento',
      otros: 'Otros'
    };
    return motivos[motivo] || motivo;
  };

  const getMotivoColor = (motivo) => {
    switch(motivo) {
      case 'renuncia_voluntaria': return 'bg-blue-100 text-blue-800';
      case 'despido': return 'bg-red-100 text-red-800';
      case 'jubilacion': return 'bg-green-100 text-green-800';
      case 'fin_contrato': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const empleadoSeleccionado = {
    id: form.empleado_id,
    nombre: form.empleado_nombre.split(' ')[0] || '',
    apellido: form.empleado_nombre.split(' ')[1] || '',
    cargo: form.cargo,
    area: form.area,
    sueldo_total: form.sueldo_total,
    sueldo_bruto: form.sueldo_bruto,
    comodato: form.comodato,
    asignacion_familiar: form.asignacion_familiar,
    tiene_hijos: form.tiene_hijos,
    fecha_inicio: form.fecha_inicio,
    sistema_pensionario: form.sistema_pensionario
  };

  const abrirModalNuevo = () => {
    setModoEdicion(false);
    setEditandoId(null);
    resetForm();
    setCalculoLiquidacion(null);
    setModal(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirModalNuevo}
          className="btn-nuevo-registro bg-[#185FA5] text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Registrar Cese
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Empleado</th>
              <th className="p-3 text-left">Cargo</th>
              <th className="p-3 text-left">Área</th>
              <th className="p-3 text-left">Motivo</th>
              <th className="p-3 text-left">Fecha cese</th>
              <th className="p-3 text-left">Liquidación</th>
              <th className="p-3 text-left">Beneficios</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ceses.map(cese => (
              <tr key={cese.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{cese.empleado_nombre}</td>
                <td className="p-3">{cese.cargo}</td>
                <td className="p-3">{cese.area}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getMotivoColor(cese.motivo)}`}>
                    {getMotivoLabel(cese.motivo)}
                  </span>
                </td>
                <td className="p-3">{cese.fecha_cese}</td>
                <td className="p-3">{cese.monto_liquidacion ? `S/ ${cese.monto_liquidacion.toLocaleString()}` : '—'}</td>
                <td className="p-3">
                  {cese.beneficios_pagados ? (
                    <span className="text-green-600">✓ Pagados</span>
                  ) : (
                    <span className="text-red-400">Pendiente</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => editarCese(cese)}
                    className="text-blue-500 text-xs border border-blue-500 px-2 py-1 rounded hover:bg-blue-50 mr-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarCese(cese.id)}
                    className="text-red-500 text-xs border border-red-500 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {ceses.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-gray-400">No hay registros de ceses</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para registrar/editar cese */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {modoEdicion ? 'Editar Cese y Liquidación' : 'Registrar Cese y Liquidación'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna izquierda - Datos del cese */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empleado *</label>
                  {modoEdicion ? (
                    <div className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-700">
                      {form.empleado_nombre}
                    </div>
                  ) : (
                    <select
                      value={form.empleado_id}
                      onChange={(e) => handleEmpleadoChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                    >
                      <option value="">Seleccionar empleado activo</option>
                      {empleados.filter(emp => emp.estado === 'activo').map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre} {emp.apellido} - {emp.cargo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de cese *</label>
                  <select
                    value={form.motivo}
                    onChange={(e) => setForm({...form, motivo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5"
                  >
                    <option value="">Seleccionar motivo</option>
                    <option value="renuncia_voluntaria">Renuncia voluntaria</option>
                    <option value="despido">Despido</option>
                    <option value="jubilacion">Jubilación</option>
                    <option value="fin_contrato">Fin de contrato</option>
                    <option value="fallecimiento">Fallecimiento</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de cese *</label>
                  <input
                    type="date"
                    value={form.fecha_cese}
                    onChange={(e) => {
                      setForm({...form, fecha_cese: e.target.value});
                      if (!modoEdicion) setCalculoLiquidacion(null);
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Último día trabajado</label>
                  <input
                    type="date"
                    value={form.ultimo_dia_trabajado}
                    onChange={(e) => {
                      setForm({...form, ultimo_dia_trabajado: e.target.value});
                      if (!modoEdicion) setCalculoLiquidacion(null);
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5"
                  />
                  <p className="text-xs text-gray-400 mt-1">Si es diferente a la fecha de cese (ej: vacaciones pendientes)</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="beneficios_pagados"
                    checked={form.beneficios_pagados}
                    onChange={(e) => setForm({...form, beneficios_pagados: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="beneficios_pagados" className="text-sm text-gray-700">Beneficios ya pagados</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    rows="3"
                    value={form.observaciones}
                    onChange={(e) => setForm({...form, observaciones: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 resize-none"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              {/* Columna derecha - Cálculo de liquidación */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-700 mb-3">📊 Cálculo de Liquidación</h4>
                {form.empleado_id && form.fecha_cese ? (
                  <CalculoLiquidacion
                    empleado={empleadoSeleccionado}
                    fechaCese={form.fecha_cese}
                    ultimoDiaTrabajado={form.ultimo_dia_trabajado}
                    motivo={form.motivo}
                    onCalculo={handleCalculo}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Selecciona empleado y fecha de cese<br/>para calcular la liquidación
                  </div>
                )}

                <div className="mt-4 pt-3 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto final (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto_liquidacion}
                    onChange={(e) => setForm({...form, monto_liquidacion: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 font-bold text-lg text-green-700 bg-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">Puedes ajustar el monto manualmente</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={guardarCese} 
                disabled={loading}
                className="bg-[#185FA5] text-white px-4 py-2.5 rounded-lg flex-1 font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : (modoEdicion ? 'Actualizar Cese' : 'Registrar Cese y Liquidación')}
              </button>
              <button 
                onClick={() => {
                  setModal(null);
                  setModoEdicion(false);
                  setEditandoId(null);
                  resetForm();
                  setCalculoLiquidacion(null);
                }} 
                className="border border-gray-300 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}