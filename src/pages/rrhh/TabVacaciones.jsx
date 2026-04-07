import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabVacaciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ empleado_id: '', fecha_inicio: '', fecha_fin: '', dias_usados: 0 });

  const cargar = async () => {
    const { data: sol } = await supabase.from('vacaciones').select('*').order('fecha_inicio');
    setSolicitudes(sol || []);
    const { data: emp } = await supabase.from('empleados').select('id, nombre, apellido, foto_url');
    setEmpleados(emp || []);
  };
  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.empleado_id || !form.fecha_inicio) return alert('Faltan datos');
    const empleado = empleados.find(e => e.id === form.empleado_id);
    await supabase.from('vacaciones').insert([{
      empleado_id: form.empleado_id,
      empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      dias_usados: form.dias_usados,
      estado: 'pendiente'
    }]);
    setModal(null);
    setForm({ empleado_id: '', fecha_inicio: '', fecha_fin: '', dias_usados: 0 });
    cargar();
  };

  const getInitials = (nombre, apellido) => `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

  const obtenerEmpleado = (nombre) => empleados.find(e => `${e.nombre} ${e.apellido}` === nombre);

  return (
    <div>
      <button onClick={() => setModal({})} className="btn-nuevo-registro mb-4 bg-[#185FA5] text-white px-3 py-1.5 rounded-lg text-sm">+ Solicitar vacaciones</button>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr><th className="p-3">Foto</th><th>Empleado</th><th>Inicio</th><th>Fin</th><th>Días</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {solicitudes.map(s => {
              const emp = obtenerEmpleado(s.empleado_nombre);
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    {emp?.foto_url ? (
                      <img src={emp.foto_url} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {emp ? getInitials(emp.nombre, emp.apellido) : '?'}
                      </div>
                    )}
                  </td>
                  <td className="p-3">{s.empleado_nombre}</td>
                  <td className="p-3">{s.fecha_inicio}</td>
                  <td className="p-3">{s.fecha_fin}</td>
                  <td className="p-3">{s.dias_usados}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${s.estado==='aprobada'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>{s.estado}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-96">
            <h3 className="font-semibold mb-3">Nueva solicitud</h3>
            <select value={form.empleado_id} onChange={e => setForm({...form, empleado_id: e.target.value})} className="border p-2 w-full rounded mb-2">
              <option value="">Seleccionar empleado</option>
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
            </select>
            <input type="date" placeholder="Fecha inicio" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className="border p-2 w-full rounded mb-2" />
            <input type="date" placeholder="Fecha fin" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} className="border p-2 w-full rounded mb-2" />
            <input type="number" placeholder="Días a tomar" value={form.dias_usados} onChange={e => setForm({...form, dias_usados: e.target.value})} className="border p-2 w-full rounded mb-4" />
            <div className="flex gap-2"><button onClick={guardar} className="bg-[#185FA5] text-white px-4 py-1 rounded">Guardar</button><button onClick={() => setModal(null)} className="border px-4 py-1 rounded">Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}