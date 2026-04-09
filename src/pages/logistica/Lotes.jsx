import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  AlertCircle, 
  Package, 
  Search, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  Info,
  ChevronRight
} from 'lucide-react';

export default function Lotes() {
  const [lotes, setLotes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  
  const [form, setForm] = useState({
    producto_id: '',
    almacen_id: '',
    lote: '',
    fecha_vencimiento: '',
    serie: '',
    registro_sanitario: '',
    proveedor_origen: '',
    stock_actual: 0,
    costo_unitario: 0
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [lotesRes, prodRes, almRes] = await Promise.all([
        supabase.from('inventario_lotes').select('*, productos(nombre_comercial, sku), almacenes(nombre)').order('fecha_vencimiento', { ascending: true }),
        supabase.from('productos').select('id, nombre_comercial, sku').eq('activo', true).order('nombre_comercial'),
        supabase.from('almacenes').select('id, nombre').eq('activo', true).order('nombre')
      ]);
      setLotes(lotesRes.data || []);
      setProductos(prodRes.data || []);
      setAlmacenes(almRes.data || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // Lógica de filtrado y alertas memorizada para rendimiento
  const { lotesFiltrados, proximosAVencer, vencidos } = useMemo(() => {
    const hoy = new Date();
    const dentro30Dias = new Date(hoy);
    dentro30Dias.setDate(hoy.getDate() + 30);

    const filtrados = lotes.filter(l => {
      const matchProducto = !filtroProducto || l.producto_id === filtroProducto;
      const matchAlmacen = !filtroAlmacen || l.almacen_id === filtroAlmacen;
      return matchProducto && matchAlmacen;
    });

    const proximos = lotes.filter(l => {
      if (!l.fecha_vencimiento || l.stock_actual <= 0) return false;
      const venc = new Date(l.fecha_vencimiento);
      return venc >= hoy && venc <= dentro30Dias;
    });

    const venci = lotes.filter(l => {
      if (!l.fecha_vencimiento || l.stock_actual <= 0) return false;
      return new Date(l.fecha_vencimiento) < hoy;
    });

    return { lotesFiltrados: filtrados, proximosAVencer: proximos, vencidos: venci };
  }, [lotes, filtroProducto, filtroAlmacen]);

  const guardarLote = async () => {
    if (!form.producto_id || !form.almacen_id || !form.lote) {
      alert('Producto, almacén y número de lote son campos obligatorios.');
      return;
    }

    setLoading(true);
    const payload = { 
      ...form, 
      fecha_vencimiento: form.fecha_vencimiento || null,
      stock_actual: parseInt(form.stock_actual) || 0,
      costo_unitario: parseFloat(form.costo_unitario) || 0
    };
    
    // Si estamos editando, eliminamos campos de relación para el update
    const idParaUpdate = editando;
    delete payload.productos;
    delete payload.almacenes;
    delete payload.id;

    const { error } = editando 
      ? await supabase.from('inventario_lotes').update(payload).eq('id', idParaUpdate)
      : await supabase.from('inventario_lotes').insert([payload]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setModal(false);
      cargarDatos();
    }
    setLoading(false);
  };

  const eliminarLote = async (id) => {
    if (confirm('¿Está seguro de eliminar este lote? Esta acción no se puede deshacer.')) {
      const { error } = await supabase.from('inventario_lotes').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargarDatos();
    }
  };

  const resetForm = () => {
    setEditando(null);
    setForm({
      producto_id: '', almacen_id: '', lote: '', fecha_vencimiento: '',
      serie: '', registro_sanitario: '', proveedor_origen: '',
      stock_actual: 0, costo_unitario: 0
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Lotes y Vencimientos</h1>
          <p className="text-sm text-slate-500">Control de inventario por trazabilidad y fechas</p>
        </div>
        <button
          onClick={() => { resetForm(); setModal(true); }}
          className="flex items-center justify-center gap-2 bg-[#11284e] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#1e4280] transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} /> Nuevo Lote
        </button>
      </div>

      {/* Panel de Alertas */}
      {(proximosAVencer.length > 0 || vencidos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proximosAVencer.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
                <Calendar size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-800">Próximos a vencer</div>
                <div className="text-xs text-amber-700">{proximosAVencer.length} lotes expiran en menos de 30 días</div>
              </div>
            </div>
          )}
          {vencidos.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-rose-800">Lotes Vencidos</div>
                <div className="text-xs text-rose-700">{vencidos.length} lotes con stock fuera de fecha</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={filtroProducto} 
            onChange={e => setFiltroProducto(e.target.value)} 
            className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
          >
            <option value="">Filtrar por producto...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial}</option>)}
          </select>
        </div>
        <select 
          value={filtroAlmacen} 
          onChange={e => setFiltroAlmacen(e.target.value)} 
          className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
        >
          <option value="">Todos los almacenes</option>
          {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">Producto</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">Ubicación</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">Identificación</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600">Vencimiento</th>
                <th className="px-6 py-4 text-right font-semibold text-slate-600">Stock</th>
                <th className="px-6 py-4 text-center font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-4 text-center font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lotesFiltrados.map(l => {
                const hoy = new Date();
                const vencido = l.fecha_vencimiento && new Date(l.fecha_vencimiento) < hoy;
                const proximo = !vencido && l.fecha_vencimiento && new Date(l.fecha_vencimiento) <= new Date(hoy.getTime() + 30*24*60*60*1000);
                
                return (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{l.productos?.nombre_comercial}</div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{l.productos?.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{l.almacenes?.nombre}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-mono border border-slate-200">
                        {l.lote}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 font-medium ${vencido ? 'text-rose-600' : proximo ? 'text-amber-600' : 'text-slate-600'}`}>
                        {l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString() : 'Indefinido'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800 text-base">{l.stock_actual}</td>
                    <td className="px-6 py-4 text-center">
                      {l.stock_actual <= 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">AGOTADO</span>
                      ) : vencido ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">VENCIDO</span>
                      ) : proximo ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">PRÓXIMO</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">VIGENTE</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditando(l.id); setForm(l); setModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => eliminarLote(l.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lotesFiltrados.length === 0 && !loading && (
          <div className="py-20 text-center text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-20" />
            <p>No se encontraron lotes con los filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Modal CRUD Mejorado */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">{editando ? 'Editar Detalle de Lote' : 'Registro de Nuevo Lote'}</h3>
              <p className="text-xs text-slate-500 mt-1">Complete la información técnica para el control de trazabilidad</p>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Producto Vinculado *</label>
                  <select 
                    value={form.producto_id} 
                    onChange={e => setForm({...form, producto_id: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#185FA5] outline-none"
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial} ({p.sku})</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Almacén de Destino *</label>
                  <select 
                    value={form.almacen_id} 
                    onChange={e => setForm({...form, almacen_id: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#185FA5] outline-none"
                  >
                    <option value="">Seleccionar almacén...</option>
                    {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Código de Lote *</label>
                  <input 
                    placeholder="Ej: LT-2024-001" 
                    value={form.lote} 
                    onChange={e => setForm({...form, lote: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#185FA5] outline-none" 
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Fecha Vencimiento</label>
                  <input 
                    type="date" 
                    value={form.fecha_vencimiento} 
                    onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#185FA5] outline-none" 
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Serie / Serial</label>
                  <input 
                    placeholder="Opcional" 
                    value={form.serie} 
                    onChange={e => setForm({...form, serie: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#185FA5] outline-none" 
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Reg. Sanitario</label>
                  <input 
                    placeholder="Cód. DIGEMID/DIGESA" 
                    value={form.registro_sanitario} 
                    onChange={e => setForm({...form, registro_sanitario: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#185FA5] outline-none" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Proveedor de Origen</label>
                  <input 
                    placeholder="Razón social del proveedor" 
                    value={form.proveedor_origen} 
                    onChange={e => setForm({...form, proveedor_origen: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#185FA5] outline-none" 
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Stock Inicial</label>
                  <input 
                    type="number" 
                    value={form.stock_actual} 
                    onChange={e => setForm({...form, stock_actual: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-[#185FA5] outline-none" 
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Costo Unitario (S/)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={form.costo_unitario} 
                    onChange={e => setForm({...form, costo_unitario: e.target.value})} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-[#185FA5] outline-none" 
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={guardarLote} 
                disabled={loading} 
                className="bg-[#185FA5] text-white px-6 py-3 rounded-2xl flex-1 font-bold hover:bg-[#11284e] transition-all disabled:opacity-50"
              >
                {loading ? 'Procesando...' : editando ? 'Actualizar Lote' : 'Registrar Lote'}
              </button>
              <button 
                onClick={() => setModal(false)} 
                className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
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