import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Package, 
  Edit2, 
  Trash2, 
  Layers,
  Tag,
  Settings,
  Scale
} from 'lucide-react';

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
  const [almacenes, setAlmacenes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  // Estados para modales de creación rápida
  const [modalMarca, setModalMarca] = useState(false);
  const [modalFamilia, setModalFamilia] = useState(false);
  const [modalUnidad, setModalUnidad] = useState(false);
  
  const [nuevaMarca, setNuevaMarca] = useState({ nombre: '', laboratorio: '' });
  const [nuevaFamilia, setNuevaFamilia] = useState({ nombre: '', padre_id: '' });
  const [nuevaUnidad, setNuevaUnidad] = useState({ nombre: '', abreviatura: '' });

  const [form, setForm] = useState({
    sku: '', codigo_sunat: '', nombre_comercial: '', nombre_tecnico: '',
    marca_id: '', familia_id: '', subfamilia_id: '', unidad_medida_id: '',
    presentacion: '', concentracion: '', tipo: 'Medicamento',
    requiere_lote: true, requiere_vencimiento: true, requiere_serie: false,
    stock_minimo: 0, stock_maximo: 0, punto_reposicion: 0, lead_time_proveedor: 0,
    ubicacion_almacen: '', centro_costo: '', costo_promedio: 0,
    ultimo_costo_compra: 0, precio_referencial: 0, activo: true
  });

  const cargarDatos = async () => {
    setLoading(true);
    const [prodRes, famRes, marRes, uniRes, almRes] = await Promise.all([
      supabase.from('productos').select('*, marcas(nombre), familias(nombre)').order('nombre_comercial'),
      supabase.from('familias').select('*').eq('activo', true),
      supabase.from('marcas').select('*').eq('activo', true),
      supabase.from('unidades_medida').select('*'),
      supabase.from('almacenes').select('id, nombre').eq('activo', true)
    ]);
    setProductos(prodRes.data || []);
    setFamilias(famRes.data || []);
    setMarcas(marRes.data || []);
    setUnidades(uniRes.data || []);
    setAlmacenes(almRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  // --- Funciones de Guardado Rápido con Alertas de Depuración ---

  const guardarMarca = async () => {
    if (!nuevaMarca.nombre) {
      alert('El nombre de la marca es obligatorio');
      return;
    }
    const { data, error } = await supabase
      .from('marcas')
      .insert([{ nombre: nuevaMarca.nombre, laboratorio: nuevaMarca.laboratorio }])
      .select();

    if (error) {
      alert('Error al guardar marca: ' + error.message);
      return;
    }
    
    setMarcas(prev => [...prev, data[0]]);
    setForm(prev => ({ ...prev, marca_id: data[0].id }));
    setModalMarca(false);
    setNuevaMarca({ nombre: '', laboratorio: '' });
    alert('Marca guardada correctamente');
  };

  const guardarFamilia = async () => {
    if (!nuevaFamilia.nombre) {
      alert('El nombre de la familia es obligatorio');
      return;
    }
    const { data, error } = await supabase
      .from('familias')
      .insert([{ nombre: nuevaFamilia.nombre, padre_id: nuevaFamilia.padre_id || null, activo: true }])
      .select();

    if (error) {
      alert('Error al guardar familia: ' + error.message);
      return;
    }

    setFamilias(prev => [...prev, data[0]]);
    setForm(prev => ({ ...prev, familia_id: data[0].id }));
    setModalFamilia(false);
    setNuevaFamilia({ nombre: '', padre_id: '' });
    alert('Familia guardada correctamente');
  };

  const guardarUnidad = async () => {
    if (!nuevaUnidad.nombre || !nuevaUnidad.abreviatura) {
      alert('El nombre y la abreviatura son obligatorios');
      return;
    }
    const { data, error } = await supabase
      .from('unidades_medida')
      .insert([{ nombre: nuevaUnidad.nombre, abreviatura: nuevaUnidad.abreviatura }])
      .select();

    if (error) {
      alert('Error al guardar unidad: ' + error.message);
      return;
    }

    setUnidades(prev => [...prev, data[0]]);
    setForm(prev => ({ ...prev, unidad_medida_id: data[0].id }));
    setModalUnidad(false);
    setNuevaUnidad({ nombre: '', abreviatura: '' });
    alert('Unidad de medida guardada correctamente');
  };

  const guardarProducto = async () => {
    if (!form.nombre_comercial) return alert('Nombre comercial es obligatorio');
    setLoading(true);
    const datosEnvio = { ...form };
    
    if (!editando && !datosEnvio.sku) {
      datosEnvio.sku = generarSKU(datosEnvio.nombre_comercial);
    }
    
    delete datosEnvio.marcas;
    delete datosEnvio.familias;
    delete datosEnvio.id;

    let res = editando 
      ? await supabase.from('productos').update(datosEnvio).eq('id', editando)
      : await supabase.from('productos').insert([datosEnvio]);

    if (res.error) {
      alert('Error al procesar producto: ' + res.error.message);
    } else {
      alert(editando ? 'Producto actualizado' : 'Producto registrado con éxito');
      setModal(false);
      cargarDatos();
    }
    setLoading(false);
  };

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = !busqueda || p.sku?.toLowerCase().includes(busqueda.toLowerCase()) || p.nombre_comercial?.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = !filtroTipo || p.tipo === filtroTipo;
    const matchActivo = filtroActivo === 'todos' || (filtroActivo === 'activo' ? p.activo : !p.activo);
    return matchBusqueda && matchTipo && matchActivo;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#11284e]">Maestro de Productos</h1>
          <p className="text-gray-500 text-sm">Gestión de inventario y catálogo médico</p>
        </div>
        <button onClick={() => { setEditando(null); setModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="erp-card mb-6 flex gap-3 p-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar por SKU o nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="erp-input w-full pl-10" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="erp-input w-48">
          <option value="">Todos los tipos</option>
          <option value="Medicamento">Medicamento</option>
          <option value="Equipo">Equipo</option>
          <option value="Insumo">Insumo</option>
        </select>
        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)} className="erp-input w-40">
          <option value="todos">Todos (Estado)</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      <div className="erp-card overflow-hidden">
        <table className="erp-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Marca</th>
              <th>Familia</th>
              <th className="text-center">Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map(p => (
              <tr key={p.id}>
                <td className="font-mono text-[11px] text-[#185FA5] font-bold">{p.sku}</td>
                <td className="font-medium text-gray-700">{p.nombre_comercial}</td>
                <td className="text-gray-500 text-xs">{p.marcas?.nombre || '—'}</td>
                <td className="text-gray-500 text-xs">{p.familias?.nombre || '—'}</td>
                <td className="text-center">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => { setEditando(p.id); setForm(p); setModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button onClick={async () => { if(confirm('¿Desea eliminar permanentemente este producto?')) { await supabase.from('productos').delete().eq('id', p.id); cargarDatos(); } }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Principal de Producto */}
      {modal && (
        <div className="fixed inset-0 bg-[#11284e]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="text-xl font-bold text-[#11284e] flex items-center gap-2">
                <Package className="text-[#185FA5]" size={20} />
                {editando ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-[#fbfcfd]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Columna 1: General */}
                <div className="space-y-4">
                  <div className="text-[#185FA5] font-bold text-sm border-b pb-2 flex items-center gap-2 uppercase tracking-wider text-[11px]">General</div>
                  <div>
                    <label className="erp-label">Nombre comercial *</label>
                    <input placeholder="Ej. Paracetamol 500mg" value={form.nombre_comercial} onChange={e => setForm({...form, nombre_comercial: e.target.value})} className="erp-input w-full" />
                  </div>
                  <div>
                    <label className="erp-label">Nombre técnico / Genérico</label>
                    <input placeholder="Ej. Acetaminofén" value={form.nombre_tecnico} onChange={e => setForm({...form, nombre_tecnico: e.target.value})} className="erp-input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="erp-label">SKU</label>
                      <input placeholder="Auto-generado" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="erp-input w-full font-mono text-xs" />
                    </div>
                    <div>
                      <label className="erp-label">Cód. SUNAT</label>
                      <input placeholder="Opcional" value={form.codigo_sunat} onChange={e => setForm({...form, codigo_sunat: e.target.value})} className="erp-input w-full text-xs" />
                    </div>
                  </div>
                </div>

                {/* Columna 2: Clasificación */}
                <div className="space-y-4">
                  <div className="text-[#185FA5] font-bold text-sm border-b pb-2 flex items-center gap-2 uppercase tracking-wider text-[11px]">Clasificación</div>
                  <div>
                    <label className="erp-label flex justify-between">
                      Marca 
                      <button onClick={() => setModalMarca(true)} className="text-blue-600 text-[10px] font-bold uppercase hover:underline">+ Nueva</button>
                    </label>
                    <select value={form.marca_id} onChange={e => setForm({...form, marca_id: e.target.value})} className="erp-input w-full">
                      <option value="">Seleccionar marca</option>
                      {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="erp-label flex justify-between">
                      Familia 
                      <button onClick={() => setModalFamilia(true)} className="text-blue-600 text-[10px] font-bold uppercase hover:underline">+ Nueva</button>
                    </label>
                    <select value={form.familia_id} onChange={e => setForm({...form, familia_id: e.target.value})} className="erp-input w-full">
                      <option value="">Seleccionar familia</option>
                      {familias.filter(f => !f.padre_id).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="erp-label flex justify-between">
                      U. Medida
                      <button onClick={() => setModalUnidad(true)} className="text-blue-600 text-[10px] font-bold uppercase hover:underline">+ Nueva</button>
                    </label>
                    <select value={form.unidad_medida_id} onChange={e => setForm({...form, unidad_medida_id: e.target.value})} className="erp-input w-full">
                      <option value="">Seleccionar unidad</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="erp-label text-[11px]">Tipo de Producto</label>
                    <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="erp-input w-full">
                      <option value="Medicamento">Medicamento</option>
                      <option value="Equipo">Equipo / Dispositivo</option>
                      <option value="Insumo">Insumo Médico</option>
                    </select>
                  </div>
                </div>

                {/* Columna 3: Inventario */}
                <div className="space-y-4">
                  <div className="text-[#185FA5] font-bold text-sm border-b pb-2 flex items-center gap-2 uppercase tracking-wider text-[11px]">Control de Stock</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="erp-label">Mínimo</label>
                      <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: e.target.value})} className="erp-input w-full text-center" />
                    </div>
                    <div>
                      <label className="erp-label">Máximo</label>
                      <input type="number" value={form.stock_maximo} onChange={e => setForm({...form, stock_maximo: e.target.value})} className="erp-input w-full text-center" />
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                    <label className="flex items-center gap-3 text-xs cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded text-[#185FA5]" checked={form.requiere_lote} onChange={e => setForm({...form, requiere_lote: e.target.checked})} /> 
                      <span className="text-gray-600 group-hover:text-[#11284e] font-medium transition-colors italic">Control de Lote / Vencimiento</span>
                    </label>
                    <label className="flex items-center gap-3 text-xs cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded text-[#185FA5]" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} /> 
                      <span className="text-gray-600 group-hover:text-[#11284e] font-medium transition-colors italic">Producto disponible para uso</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3 bg-white">
              <button onClick={guardarProducto} disabled={loading} className="btn-primary flex-1 py-3 text-sm">
                {loading ? 'Procesando...' : editando ? 'Actualizar Ficha de Producto' : 'Registrar Producto'}
              </button>
              <button onClick={() => setModal(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 font-bold text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modales de Creación Rápida --- */}

      {modalMarca && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[24px] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-[#11284e] mb-6 flex items-center gap-2"><Tag className="text-[#185FA5]" /> Nueva Marca</h3>
            <div className="space-y-4">
              <input placeholder="Nombre de Marca *" value={nuevaMarca.nombre} onChange={e => setNuevaMarca({...nuevaMarca, nombre: e.target.value})} className="erp-input w-full" />
              <input placeholder="Laboratorio (Opcional)" value={nuevaMarca.laboratorio} onChange={e => setNuevaMarca({...nuevaMarca, laboratorio: e.target.value})} className="erp-input w-full" />
              <div className="flex gap-3 pt-4">
                <button onClick={guardarMarca} className="btn-primary flex-1">Guardar</button>
                <button onClick={() => setModalMarca(false)} className="px-4 py-2 text-gray-400 font-bold text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalFamilia && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[24px] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-[#11284e] mb-6 flex items-center gap-2"><Layers className="text-[#185FA5]" /> Nueva Familia</h3>
            <div className="space-y-4">
              <input placeholder="Nombre de Familia *" value={nuevaFamilia.nombre} onChange={e => setNuevaFamilia({...nuevaFamilia, nombre: e.target.value})} className="erp-input w-full" />
              <select value={nuevaFamilia.padre_id} onChange={e => setNuevaFamilia({...nuevaFamilia, padre_id: e.target.value})} className="erp-input w-full">
                <option value="">Familia raíz (Sin categoría padre)</option>
                {familias.filter(f => !f.padre_id).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
              <div className="flex gap-3 pt-4">
                <button onClick={guardarFamilia} className="btn-primary flex-1">Guardar</button>
                <button onClick={() => setModalFamilia(false)} className="px-4 py-2 text-gray-400 font-bold text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalUnidad && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[24px] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-[#11284e] mb-6 flex items-center gap-2"><Scale className="text-[#185FA5]" /> Nueva Unidad</h3>
            <div className="space-y-4">
              <input placeholder="Nombre (Ej. Kilogramo) *" value={nuevaUnidad.nombre} onChange={e => setNuevaUnidad({...nuevaUnidad, nombre: e.target.value})} className="erp-input w-full" />
              <input placeholder="Abreviatura (Ej. KG) *" value={nuevaUnidad.abreviatura} onChange={e => setNuevaUnidad({...nuevaUnidad, abreviatura: e.target.value})} className="erp-input w-full" />
              <div className="flex gap-3 pt-4">
                <button onClick={guardarUnidad} className="btn-primary flex-1">Guardar</button>
                <button onClick={() => setModalUnidad(false)} className="px-4 py-2 text-gray-400 font-bold text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}