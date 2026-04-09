import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Almacenes() {
  const [almacenes, setAlmacenes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    ubicacion: '',
    responsable: '',
    tipo: 'Principal',
    activo: true
  });

  const tiposAlmacen = ['Principal', 'Farmacia', 'Emergencia', 'UCI', 'Piso hospitalario', 'Laboratorio', 'Satélite'];

  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase.from('almacenes').select('*').order('nombre');
    setAlmacenes(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.nombre) return alert('El nombre es obligatorio');
    const datos = { ...form };
    delete datos.id;
    setLoading(true);
    let error;
    if (editando) {
      const res = await supabase.from('almacenes').update(datos).eq('id', editando);
      error = res.error;
    } else {
      const res = await supabase.from('almacenes').insert([datos]);
      error = res.error;
    }
    if (error) alert('Error: ' + error.message);
    else {
      setModal(false);
      cargar();
    }
    setLoading(false);
  };

  const eliminar = async (id) => {
    if (confirm('¿Eliminar este almacén? Se perderá el stock asociado.')) {
      const { error } = await supabase.from('almacenes').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargar();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Almacenes</h1>
        <button
          onClick={() => { setEditando(null); setForm({ nombre: '', ubicacion: '', responsable: '', tipo: 'Principal', activo: true }); setModal(true); }}
          className="bg-[#185FA5] text-white px-4 py-2 rounded-lg"
        >
          + Nuevo Almacén
        </button>
      </div>

      {loading && <div className="text-center py-10">Cargando...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {almacenes.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{a.nombre}</h3>
                <p className="text-sm text-gray-500">{a.tipo}</p>
                {a.ubicacion && <p className="text-xs text-gray-400 mt-1">📍 {a.ubicacion}</p>}
                {a.responsable && <p className="text-xs text-gray-400">👤 {a.responsable}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditando(a.id); setForm(a); setModal(true); }} className="text-blue-500">Editar</button>
                <button onClick={() => eliminar(a.id)} className="text-red-500">Eliminar</button>
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-xs px-2 py-1 rounded-full ${a.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                {a.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        ))}
        {almacenes.length === 0 && !loading && (
          <div className="col-span-full text-center py-10 text-gray-400">No hay almacenes registrados</div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editando ? 'Editar Almacén' : 'Nuevo Almacén'}</h3>
            <div className="space-y-4">
              <input placeholder="Nombre *" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full border rounded-lg p-2" />
              <input placeholder="Ubicación" value={form.ubicacion} onChange={e => setForm({...form, ubicacion: e.target.value})} className="w-full border rounded-lg p-2" />
              <input placeholder="Responsable" value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})} className="w-full border rounded-lg p-2" />
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full border rounded-lg p-2">
                {tiposAlmacen.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} />
                Activo
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardar} className="bg-[#185FA5] text-white px-6 py-2 rounded-lg flex-1">Guardar</button>
              <button onClick={() => setModal(false)} className="border px-6 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}