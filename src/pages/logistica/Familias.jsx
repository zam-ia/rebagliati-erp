import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Colores predefinidos para las familias
const COLORES = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6',
  '#1ABC9C', '#E67E22', '#95A5A6', '#34495E', '#16A085'
];

export default function Familias() {
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    padre_id: '',
    nivel: 0,
    color: COLORES[0],
    activo: true
  });

  const cargarFamilias = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('familias')
      .select('*')
      .order('nivel')
      .order('nombre');
    setFamilias(data || []);
    setLoading(false);
  };

  useEffect(() => { cargarFamilias(); }, []);

  const guardarFamilia = async () => {
    if (!form.nombre) return alert('El nombre es obligatorio');
    const datosEnvio = { ...form };
    delete datosEnvio.id;
    setLoading(true);
    let error;
    if (editando) {
      const res = await supabase.from('familias').update(datosEnvio).eq('id', editando);
      error = res.error;
    } else {
      const res = await supabase.from('familias').insert([datosEnvio]);
      error = res.error;
    }
    if (error) alert('Error: ' + error.message);
    else {
      setModal(false);
      cargarFamilias();
    }
    setLoading(false);
  };

  const eliminarFamilia = async (id) => {
    if (confirm('¿Eliminar esta familia? También se eliminarán sus subfamilias.')) {
      const { error } = await supabase.from('familias').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargarFamilias();
    }
  };

  // Construir árbol jerárquico para mostrar (simple indentación)
  const renderFamilias = (padreId = null, nivel = 0) => {
    return familias
      .filter(f => (padreId === null ? !f.padre_id : f.padre_id === padreId))
      .map(f => (
        <div key={f.id} className="ml-4">
          <div className="flex items-center justify-between p-2 border-b hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: f.color }}></div>
              <span className="font-medium">{f.nombre}</span>
              {!f.activo && <span className="text-xs text-gray-400">(inactivo)</span>}
            </div>
            <div>
              <button onClick={() => { setEditando(f.id); setForm(f); setModal(true); }} className="text-blue-500 mr-2">Editar</button>
              <button onClick={() => eliminarFamilia(f.id)} className="text-red-500">Eliminar</button>
            </div>
          </div>
          {renderFamilias(f.id, nivel + 1)}
        </div>
      ));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Familias / Categorías</h1>
        <button
          onClick={() => { setEditando(null); setForm({ nombre: '', padre_id: '', nivel: 0, color: COLORES[0], activo: true }); setModal(true); }}
          className="bg-[#185FA5] text-white px-4 py-2 rounded-lg"
        >
          + Nueva Familia
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Estructura jerárquica</h3>
          {familias.filter(f => !f.padre_id).length === 0 ? (
            <div className="text-center text-gray-400 py-6">No hay familias registradas</div>
          ) : (
            renderFamilias()
          )}
        </div>
      )}

      {/* Modal CRUD */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editando ? 'Editar Familia' : 'Nueva Familia'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Familia padre (opcional)</label>
                <select
                  value={form.padre_id || ''}
                  onChange={e => setForm({...form, padre_id: e.target.value || null})}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Ninguna (raíz)</option>
                  {familias.filter(f => f.id !== editando).map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({...form, color})}
                      className={`w-8 h-8 rounded-full border-2 ${form.color === color ? 'border-black' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} />
                Activo
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardarFamilia} className="bg-[#185FA5] text-white px-6 py-2 rounded-lg flex-1">Guardar</button>
              <button onClick={() => setModal(false)} className="border px-6 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}