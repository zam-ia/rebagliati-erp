import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabDescansos() {
  const [descansos, setDescansos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ empleado_id: '', fecha: '', dias: '', diagnostico: '' });

  const cargar = async () => {
    const { data: des } = await supabase.from('descansos_medicos').select('*').order('fecha', { ascending: false });
    setDescansos(des || []);
    const { data: emp } = await supabase.from('empleados').select('id, nombre, apellido, foto_url');
    setEmpleados(emp || []);
  };
  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.empleado_id || !form.fecha) return alert('Completa los datos');
    const empleado = empleados.find(e => e.id === form.empleado_id);
    await supabase.from('descansos_medicos').insert([{
      empleado_id: form.empleado_id,
      empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
      fecha: form.fecha,
      dias: form.dias,
      diagnostico: form.diagnostico
    }]);
    setModal(null);
    setForm({ empleado_id: '', fecha: '', dias: '', diagnostico: '' });
    cargar();
  };

  const getInitials = (nombre, apellido) => `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  const obtenerEmpleado = (nombre) => empleados.find(e => `${e.nombre} ${e.apellido}` === nombre);

  return (
    <div>
      <button onClick={() => setModal({})} className="btn-nuevo-registro mb-4 bg-[#185FA5] text-white px-3 py-1.5 rounded-lg text-sm">+ Registrar descanso</button>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr><th className="p-3">Foto</th><th>Empleado</th><th>Fecha</th><th>Días</th><th>Diagnóstico</th></tr>
          </thead>
          <tbody>
            {descansos.map(d => {
              const emp = obtenerEmpleado(d.empleado_nombre);
              return (
                <tr key={d.id} className="border-t">
                  <td className="p-3">
                    {emp?.foto_url ? (
                      <img src={emp.foto_url} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {emp ? getInitials(emp.nombre, emp.apellido) : '?'}
                      </div>
                    )}
                  </td>
                  <td className="p-3">{d.empleado_nombre}</td>
                  <td className="p-3">{d.fecha}</td>
                  <td className="p-3">{d.dias}</td>
                  <td className="p-3">{d.diagnostico}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-96">
            <h3 className="font-semibold mb-3">Nuevo descanso médico</h3>
            <select value={form.empleado_id} onChange={e => setForm({...form, empleado_id: e.target.value})} className="border p-2 w-full rounded mb-2">
              <option value="">Seleccionar empleado</option>
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
            </select>
            <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="border p-2 w-full rounded mb-2" />
            <input type="number" placeholder="Días" value={form.dias} onChange={e => setForm({...form, dias: e.target.value})} className="border p-2 w-full rounded mb-2" />
            <textarea placeholder="Diagnóstico" value={form.diagnostico} onChange={e => setForm({...form, diagnostico: e.target.value})} className="border p-2 w-full rounded mb-4" />
            <div className="flex gap-2"><button onClick={guardar} className="bg-[#185FA5] text-white px-4 py-1 rounded">Guardar</button><button onClick={() => setModal(null)} className="border px-4 py-1 rounded">Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}