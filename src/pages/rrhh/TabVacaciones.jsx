import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabVacaciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ empleado_id: '', fecha_inicio: '', fecha_fin: '', dias_usados: 0 });

  const cargar = async () => {
    const { data: sol } = await supabase.from('vacaciones').select('*').order('fecha_inicio', { ascending: false });
    setSolicitudes(sol || []);
    const { data: emp } = await supabase.from('empleados').select('id, nombre, apellido, foto_url');
    setEmpleados(emp || []);
  };

  useEffect(() => { cargar(); }, []);

  // Efecto para calcular los días automáticamente
  useEffect(() => {
    if (form.fecha_inicio && form.fecha_fin) {
      const inicio = new Date(form.fecha_inicio);
      const fin = new Date(form.fecha_fin);
      
      // Calculamos la diferencia en tiempo
      const diferenciaTiempo = fin.getTime() - inicio.getTime();
      
      // Convertimos a días (+1 para incluir tanto el día de inicio como el final)
      const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24)) + 1;
      
      if (diferenciaDias > 0) {
        setForm(prev => ({ ...prev, dias_usados: diferenciaDias }));
      } else {
        setForm(prev => ({ ...prev, dias_usados: 0 }));
      }
    } else {
      setForm(prev => ({ ...prev, dias_usados: 0 }));
    }
  }, [form.fecha_inicio, form.fecha_fin]);

  const guardar = async () => {
    if (!form.empleado_id || !form.fecha_inicio || !form.fecha_fin) return alert('Por favor completa todos los campos');
    if (form.dias_usados <= 0) return alert('La fecha de fin debe ser mayor o igual a la de inicio');

    const empleado = empleados.find(e => e.id === form.empleado_id);
    
    await supabase.from('vacaciones').insert([{
      empleado_id: form.empleado_id,
      empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      dias_usados: form.dias_usados,
      estado: 'pendiente'
    }]);
    
    setModal(false);
    setForm({ empleado_id: '', fecha_inicio: '', fecha_fin: '', dias_usados: 0 });
    cargar();
  };

  const getInitials = (nombre, apellido) => `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  const obtenerEmpleado = (nombre) => empleados.find(e => `${e.nombre} ${e.apellido}` === nombre);

  // Formateador de fechas para la tabla
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-2">
      {/* Botón Principal VIP */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Control de Vacaciones</h2>
          <p className="text-sm text-gray-500">Gestiona las solicitudes y descansos del equipo.</p>
        </div>
        <button 
          onClick={() => setModal(true)} 
          className="bg-gradient-to-r from-[#185FA5] to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Nueva Solicitud
        </button>
      </div>

      {/* Tabla Estilizada */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50/80 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4">Colaborador</th>
                <th className="p-4">Inicio</th>
                <th className="p-4">Fin</th>
                <th className="p-4 text-center">Días Totales</th>
                <th className="p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {solicitudes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    No hay solicitudes de vacaciones registradas.
                  </td>
                </tr>
              ) : (
                solicitudes.map(s => {
                  const emp = obtenerEmpleado(s.empleado_nombre);
                  return (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {emp?.foto_url ? (
                            <img src={emp.foto_url} className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm" alt="foto" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {emp ? getInitials(emp.nombre, emp.apellido) : '?'}
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{s.empleado_nombre}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{formatearFecha(s.fecha_inicio)}</td>
                      <td className="p-4 text-gray-600 font-medium">{formatearFecha(s.fecha_fin)}</td>
                      <td className="p-4 text-center">
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md font-semibold">
                          {s.dias_usados} días
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                          ${s.estado === 'aprobada' ? 'bg-green-100 text-green-700 border border-green-200' : 
                            s.estado === 'rechazada' ? 'bg-red-100 text-red-700 border border-red-200' : 
                            'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {s.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal VIP */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-[#185FA5] to-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white tracking-wide">Nueva Solicitud</h3>
              <button onClick={() => setModal(false)} className="text-blue-100 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 space-y-5">
              
              {/* Select Colaborador */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Colaborador en Planilla</label>
                <select 
                  value={form.empleado_id} 
                  onChange={e => setForm({...form, empleado_id: e.target.value})} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-[#185FA5] focus:border-[#185FA5] outline-none transition-all shadow-sm"
                >
                  <option value="" disabled>Selecciona un empleado...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>

              {/* Grid de Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    value={form.fecha_inicio} 
                    onChange={e => setForm({...form, fecha_inicio: e.target.value})} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-[#185FA5] focus:border-[#185FA5] outline-none transition-all shadow-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha de Fin</label>
                  <input 
                    type="date" 
                    min={form.fecha_inicio} // Evita que seleccionen una fecha anterior a la de inicio
                    value={form.fecha_fin} 
                    onChange={e => setForm({...form, fecha_fin: e.target.value})} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-[#185FA5] focus:border-[#185FA5] outline-none transition-all shadow-sm" 
                  />
                </div>
              </div>

              {/* Calculadora visual de días (Solo lectura) */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center mt-2">
                <div>
                  <span className="block text-sm font-medium text-blue-800">Días calculados</span>
                  <span className="block text-xs text-blue-600/70 mt-0.5">Incluye fines de semana</span>
                </div>
                <div className="text-2xl font-black text-[#185FA5]">
                  {form.dias_usados} <span className="text-sm font-semibold text-blue-600">días</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={guardar} 
                  disabled={!form.empleado_id || !form.fecha_inicio || !form.fecha_fin || form.dias_usados <= 0}
                  className="flex-1 bg-[#185FA5] hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Registrar Vacaciones
                </button>
                <button 
                  onClick={() => setModal(false)} 
                  className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-all"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}