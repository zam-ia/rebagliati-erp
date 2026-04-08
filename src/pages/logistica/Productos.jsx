import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Generador simple de SKU (nombre comercial + timestamp)
const generarSKU = (nombre) => {
  const base = nombre.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const timestamp = Date.now().toString().slice(-6);
  return `${base}${timestamp}`;
};

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  const [form, setForm] = useState({
    sku: '',
    codigo_sunat: '',
    nombre_comercial: '',
    nombre_tecnico: '',
    marca_id: '',
    familia_id: '',
    subfamilia_id: '',
    unidad_medida_id: '',
    presentacion: '',
    concentracion: '',
    tipo: 'Medicamento',
    requiere_lote: true,
    requiere_vencimiento: true,
    requiere_serie: false,
    stock_minimo: 0,
    stock_maximo: 0,
    punto_reposicion: 0,
    lead_time_proveedor: 0,
    ubicacion_almacen: '',
    centro_costo: '',
    costo_promedio: 0,
    ultimo_costo_compra: 0,
    precio_referencial: 0,
    activo: true
  });

  const cargarDatos = async () => {
    setLoading(true);
    const [prodRes, famRes, marRes, uniRes] = await Promise.all([
      supabase.from('productos').select('*, marcas(nombre), familias(nombre)').order('nombre_comercial'),
      supabase.from('familias').select('*').eq('activo', true),
      supabase.from('marcas').select('*').eq('activo', true),
      supabase.from('unidades_medida').select('*')
    ]);
    setProductos(prodRes.data || []);
    setFamilias(famRes.data || []);
    setMarcas(marRes.data || []);
    setUnidades(uniRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleSubmit = async () => {
    if (!form.nombre_comercial) return alert('Nombre comercial es obligatorio');
    const datosEnvio = { ...form };
    if (!editando && !datosEnvio.sku) {
      datosEnvio.sku = generarSKU(datosEnvio.nombre_comercial);
    }
    delete datosEnvio.id;
    let error;
    if (editando) {
      const res = await supabase.from('productos').update(datosEnvio).eq('id', editando);
      error = res.error;
    } else {
      const res = await supabase.from('productos').insert([datosEnvio]);
      error = res.error;
    }
    if (error) alert('Error: ' + error.message);
    else {
      setModal(false);
      cargarDatos();
    }
  };

  const eliminar = async (id) => {
    if (confirm('¿Eliminar producto? Se eliminarán también sus lotes y movimientos asociados.')) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargarDatos();
    }
  };

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = !busqueda || 
      p.sku?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.nombre_comercial?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.marcas?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = !filtroTipo || p.tipo === filtroTipo;
    const matchActivo = filtroActivo === 'todos' || (filtroActivo === 'activo' ? p.activo : !p.activo);
    return matchBusqueda && matchTipo && matchActivo;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maestro de Productos</h1>
        <button
          onClick={() => { setEditando(null); setForm({ ...form, sku: '', nombre_comercial: '', activo: true }); setModal(true); }}
          className="bg-[#185FA5] text-white px-4 py-2 rounded-lg"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por SKU, nombre o marca"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border rounded-lg px-3 py-2 w-64"
        />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">Todos los tipos</option>
          <option value="Medicamento">Medicamento</option>
          <option value="Insumo médico">Insumo médico</option>
          <option value="Material descartable">Material descartable</option>
          <option value="Equipo">Equipo</option>
          <option value="Reactivo">Reactivo</option>
          <option value="Limpieza">Limpieza</option>
          <option value="Oficina">Oficina</option>
          <option value="Activo fijo">Activo fijo</option>
        </select>
        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">Nombre comercial</th>
              <th className="p-3 text-left">Marca</th>
              <th className="p-3 text-left">Familia</th>
              <th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-right">Stock mínimo</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-mono">{p.sku}</td>
                <td className="p-3 font-medium">{p.nombre_comercial}</td>
                <td className="p-3">{p.marcas?.nombre}</td>
                <td className="p-3">{p.familias?.nombre}</td>
                <td className="p-3">{p.tipo}</td>
                <td className="p-3 text-right">{p.stock_minimo}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => { setEditando(p.id); setForm(p); setModal(true); }} className="text-blue-500 mr-2">Editar</button>
                  <button onClick={() => eliminar(p.id)} className="text-red-500">Eliminar</button>
                </td>
              </tr>
            ))}
            {productosFiltrados.length === 0 && (
              <td colSpan="8" className="p-8 text-center text-gray-400">No hay productos</td>              
            )}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editando ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500">SKU</label><input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full border rounded-lg p-2" placeholder="Automático si se deja vacío" /></div>
              <div><label className="block text-xs text-gray-500">Código SUNAT</label><input value={form.codigo_sunat} onChange={e => setForm({...form, codigo_sunat: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Nombre comercial *</label><input value={form.nombre_comercial} onChange={e => setForm({...form, nombre_comercial: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Nombre técnico</label><input value={form.nombre_tecnico} onChange={e => setForm({...form, nombre_tecnico: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Marca</label><select value={form.marca_id} onChange={e => setForm({...form, marca_id: e.target.value})} className="w-full border rounded-lg p-2"><option value="">Seleccionar</option>{marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
              <div><label className="block text-xs text-gray-500">Familia</label><select value={form.familia_id} onChange={e => setForm({...form, familia_id: e.target.value})} className="w-full border rounded-lg p-2"><option value="">Seleccionar</option>{familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
              <div><label className="block text-xs text-gray-500">Subfamilia</label><select value={form.subfamilia_id} onChange={e => setForm({...form, subfamilia_id: e.target.value})} className="w-full border rounded-lg p-2"><option value="">Seleccionar</option>{familias.filter(f => f.padre_id === form.familia_id).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
              <div><label className="block text-xs text-gray-500">Unidad de medida</label><select value={form.unidad_medida_id} onChange={e => setForm({...form, unidad_medida_id: e.target.value})} className="w-full border rounded-lg p-2"><option value="">Seleccionar</option>{unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>
              <div><label className="block text-xs text-gray-500">Presentación</label><input value={form.presentacion} onChange={e => setForm({...form, presentacion: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Concentración</label><input value={form.concentracion} onChange={e => setForm({...form, concentracion: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Tipo</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full border rounded-lg p-2"><option value="Medicamento">Medicamento</option><option value="Insumo médico">Insumo médico</option><option value="Material descartable">Material descartable</option><option value="Equipo">Equipo</option><option value="Reactivo">Reactivo</option><option value="Limpieza">Limpieza</option><option value="Oficina">Oficina</option><option value="Activo fijo">Activo fijo</option></select></div>
              <div><label className="block text-xs text-gray-500">Stock mínimo</label><input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Stock máximo</label><input type="number" value={form.stock_maximo} onChange={e => setForm({...form, stock_maximo: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Punto de reposición</label><input type="number" value={form.punto_reposicion} onChange={e => setForm({...form, punto_reposicion: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Lead time proveedor (días)</label><input type="number" value={form.lead_time_proveedor} onChange={e => setForm({...form, lead_time_proveedor: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Ubicación almacén</label><input value={form.ubicacion_almacen} onChange={e => setForm({...form, ubicacion_almacen: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Centro de costo</label><input value={form.centro_costo} onChange={e => setForm({...form, centro_costo: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Costo promedio</label><input type="number" step="0.01" value={form.costo_promedio} onChange={e => setForm({...form, costo_promedio: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Último costo compra</label><input type="number" step="0.01" value={form.ultimo_costo_compra} onChange={e => setForm({...form, ultimo_costo_compra: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-xs text-gray-500">Precio referencial</label><input type="number" step="0.01" value={form.precio_referencial} onChange={e => setForm({...form, precio_referencial: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div className="col-span-2 flex items-center gap-4"><label><input type="checkbox" checked={form.requiere_lote} onChange={e => setForm({...form, requiere_lote: e.target.checked})} /> Requiere lote</label><label><input type="checkbox" checked={form.requiere_vencimiento} onChange={e => setForm({...form, requiere_vencimiento: e.target.checked})} /> Requiere vencimiento</label><label><input type="checkbox" checked={form.requiere_serie} onChange={e => setForm({...form, requiere_serie: e.target.checked})} /> Requiere serie</label><label><input type="checkbox" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} /> Activo</label></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="bg-[#185FA5] text-white px-6 py-2 rounded-lg flex-1">Guardar</button>
              <button onClick={() => setModal(false)} className="border px-6 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}