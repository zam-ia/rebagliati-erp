import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabPlanilla() {
  const [novedades, setNovedades] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [form, setForm] = useState({
    empleado_id: '',
    empleado_nombre: '',
    fecha: new Date().toISOString().slice(0, 10),
    tipo: 'Tardanza',
    minutos_tardanza: 0,
    justificada: false,
    justificacion: ''
  });

  const cargarEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('id, nombre, apellido, foto_url').eq('estado', 'activo');
    setEmpleados(data || []);
  };

  const cargarNovedades = useCallback(async () => {
    setCargando(true);
    const primerDia = `${mes}-01`;
    const ultimoDia = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('asistencia')
      .select('*')
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)
      .order('fecha', { ascending: false });

    if (!error) setNovedades(data || []);
    setCargando(false);
  }, [mes]);

  useEffect(() => {
    cargarNovedades();
    cargarEmpleados();
  }, [cargarNovedades]);

  const guardarNovedad = async () => {
    if (!form.empleado_id || !form.fecha) {
      alert('Selecciona un empleado y fecha');
      return;
    }

    const esTardanza = form.tipo === 'Tardanza';
    const esFalta = form.tipo === 'Falta';
    const justificacion = form.justificada ? (form.justificacion || 'Justificado') : null;

    const registro = {
      empleado_id: form.empleado_id,
      empleado_nombre: form.empleado_nombre,
      fecha: form.fecha,
      tardanza: esTardanza,
      falta: esFalta,
      minutos: esTardanza ? parseInt(form.minutos_tardanza) : 0,
      justificacion
    };

    let error;
    if (editandoId) {
      // Actualizar
      const { error: updateError } = await supabase
        .from('asistencia')
        .update(registro)
        .eq('id', editandoId);
      error = updateError;
      if (!error) alert('Registro actualizado correctamente');
    } else {
      // Insertar nuevo
      const { error: insertError } = await supabase.from('asistencia').insert([registro]);
      error = insertError;
      if (!error) alert('Registro guardado correctamente');
    }

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setModal(null);
      setEditandoId(null);
      setForm({
        empleado_id: '',
        empleado_nombre: '',
        fecha: new Date().toISOString().slice(0, 10),
        tipo: 'Tardanza',
        minutos_tardanza: 0,
        justificada: false,
        justificacion: ''
      });
      await cargarNovedades();
    }
  };

  const editarRegistro = (registro) => {
    const esTardanza = registro.tardanza;
    const esFalta = registro.falta;
    const tipo = esTardanza ? 'Tardanza' : (esFalta ? 'Falta' : 'Tardanza');
    setEditandoId(registro.id);
    setForm({
      empleado_id: registro.empleado_id,
      empleado_nombre: registro.empleado_nombre,
      fecha: registro.fecha,
      tipo,
      minutos_tardanza: registro.minutos || 0,
      justificada: !!registro.justificacion,
      justificacion: registro.justificacion || ''
    });
    setModal(true);
  };

  const getInitials = (nombre, apellido) => `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

  // Nuevos KPIs
  const resumen = novedades.reduce((acc, n) => {
    const tieneJustificacion = !!n.justificacion;
    if (n.tardanza) {
      acc.tardanzas++;
    } else if (n.falta) {
      if (tieneJustificacion) acc.faltasJustificadas++;
      else acc.faltasInjustificadas++;
    }
    return acc;
  }, { tardanzas: 0, faltasJustificadas: 0, faltasInjustificadas: 0 });

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="bg-white border p-2 rounded-lg flex items-center gap-3 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase ml-2">Periodo</span>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="outline-none font-bold text-gray-700" />
        </div>
        <button
          onClick={() => {
            setEditandoId(null);
            setForm({
              empleado_id: '',
              empleado_nombre: '',
              fecha: new Date().toISOString().slice(0, 10),
              tipo: 'Tardanza',
              minutos_tardanza: 0,
              justificada: false,
              justificacion: ''
            });
            setModal(true);
          }}
          className="bg-[#185FA5] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-all"
        >
          + Añadir Registro
        </button>
      </div>

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl">
          <div className="text-4xl font-black text-red-700">{resumen.tardanzas}</div>
          <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">Tardanzas</div>
          <div className="text-xs text-red-500 mt-1">(Tolerancia cero)</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
          <div className="text-4xl font-black text-amber-700">{resumen.faltasJustificadas}</div>
          <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Faltas Justificadas</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
          <div className="text-4xl font-black text-gray-700">{resumen.faltasInjustificadas}</div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faltas Injustificadas</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr className="text-[10px] font-black text-gray-400 uppercase">
              <th className="p-4">Colaborador</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Minutos</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {novedades.map((n, idx) => {
              const emp = empleados.find(e => e.id === n.empleado_id);
              return (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 flex items-center gap-3 font-bold text-gray-700">
                    {emp?.foto_url ? (
                      <img src={emp.foto_url} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600">
                        {emp ? getInitials(emp.nombre, emp.apellido) : '?'}
                      </div>
                    )}
                    {n.empleado_nombre}
                  </td>
                  <td className="p-4 text-gray-500">{n.fecha}</td>
                  <td className="p-4 font-bold text-xs uppercase">{n.tardanza ? 'Tardanza' : (n.falta ? 'Falta' : '—')}</td>
                  <td className="p-4 font-mono text-gray-600">{n.tardanza ? `${n.minutos || 0} min` : '—'}</td>
                  <td className="p-4">
                    {n.justificacion ? (
                      <span className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded font-black uppercase">Justificada</span>
                    ) : (
                      <span className="text-[9px] bg-red-100 text-red-600 px-2 py-1 rounded font-black uppercase">Pendiente</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => editarRegistro(n)}
                      className="text-blue-500 text-xs border border-blue-500 px-2 py-1 rounded hover:bg-blue-50 mr-2"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
            {novedades.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">No hay registros en este periodo</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold mb-6 italic text-[#185FA5]">
              {editandoId ? 'Editar Incidencia' : 'Registrar Incidencia'}
            </h2>
            <div className="space-y-4">
              <select
                value={form.empleado_id}
                onChange={e => {
                  const emp = empleados.find(emp => emp.id === e.target.value);
                  setForm({...form, empleado_id: e.target.value, empleado_nombre: emp ? `${emp.nombre} ${emp.apellido}` : ''});
                }}
                className="w-full border-2 p-3 rounded-xl outline-none focus:border-blue-500 font-medium"
              >
                <option value="">Seleccionar colaborador...</option>
                {empleados.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="border-2 p-3 rounded-xl" />
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="border-2 p-3 rounded-xl font-bold">
                  <option value="Tardanza">Tardanza</option>
                  <option value="Falta">Falta</option>
                </select>
              </div>

              {form.tipo === 'Tardanza' && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-500 uppercase">Minutos de retraso</label>
                  <input
                    type="number"
                    value={form.minutos_tardanza}
                    onChange={e => setForm({...form, minutos_tardanza: e.target.value})}
                    className="w-full bg-transparent text-xl font-bold outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={form.justificada}
                  onChange={e => setForm({...form, justificada: e.target.checked})}
                  className="w-5 h-5"
                  id="checkModal"
                />
                <label htmlFor="checkModal" className="font-bold text-gray-600">¿Justificada?</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={guardarNovedad} className="flex-1 bg-[#185FA5] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200">
                  {editandoId ? 'Actualizar' : 'Guardar'}
                </button>
                <button onClick={() => setModal(null)} className="flex-1 bg-gray-100 py-4 rounded-2xl font-bold text-gray-400">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}