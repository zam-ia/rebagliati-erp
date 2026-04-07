import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabBase() {
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', cargo: '', area: '', dni: '', correo: '', telefono: '', fecha_inicio: '', fecha_vence_contrato: '', sueldo: '' });

  const cargar = async () => {
    const { data } = await supabase.from('empleados').select('*').order('apellido');
    setEmpleados(data || []);
  };
  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (modal) {
      await supabase.from('empleados').update(form).eq('id', modal.id);
    } else {
      await supabase.from('empleados').insert([form]);
    }
    setModal(null);
    setForm({ nombre: '', apellido: '', cargo: '', area: '', dni: '', correo: '', telefono: '', fecha_inicio: '', fecha_vence_contrato: '', sueldo: '' });
    cargar();
  };

  return (
    <div>
      <button onClick={() => setModal({})} className="mb-4 bg-[#185FA5] text-white px-3 py-1.5 rounded-lg text-sm">+ Nuevo empleado</button>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr><th className="p-3 text-left">Nombre</th><th className="p-3 text-left">Cargo</th><th className="p-3 text-left">Área</th><th className="p-3 text-left">DNI</th><th className="p-3 text-left">Correo</th><th className="p-3 text-left">Acciones</th></tr>
          </thead>
          <tbody>
            {empleados.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.nombre} {e.apellido}</td><td className="p-3">{e.cargo}</td><td className="p-3">{e.area}</td><td className="p-3">{e.dni}</td><td className="p-3">{e.correo}</td>
                <td className="p-3"><button onClick={() => { setModal(e); setForm(e); }} className="text-blue-500">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-xl w-96">
            <h3 className="font-semibold mb-3">{modal.id ? 'Editar' : 'Nuevo'} empleado</h3>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Apellido" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Cargo" value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Área" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="border p-2 rounded" />
              <input placeholder="DNI" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Correo" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="border p-2 rounded" />
              <input type="date" placeholder="Fecha inicio" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className="border p-2 rounded" />
              <input type="date" placeholder="Vence contrato" value={form.fecha_vence_contrato} onChange={e => setForm({...form, fecha_vence_contrato: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Sueldo" value={form.sueldo} onChange={e => setForm({...form, sueldo: e.target.value})} className="border p-2 rounded" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={guardar} className="bg-[#185FA5] text-white px-4 py-1 rounded">Guardar</button>
              <button onClick={() => setModal(null)} className="border px-4 py-1 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}