// src/pages/logistica/Compras.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Search, Eye, Edit2, Trash2, ShoppingCart, 
  CheckCircle, Clock, X, FileText, DollarSign, 
  Calendar, Truck, ChevronRight, AlertCircle, Loader2
} from 'lucide-react';

export default function Compras() {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalleModal, setDetalleModal] = useState(false);
  const [ordenActual, setOrdenActual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    numero: '',
    proveedor_id: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_requerida: '',
    estado: 'Pendiente',
    total: 0,
    observaciones: ''
  });
  const [detallesTemp, setDetallesTemp] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);
  const [precioSeleccionado, setPrecioSeleccionado] = useState(0);

  const cargarDatos = async () => {
    setLoading(true);
    const [ordRes, provRes, prodRes] = await Promise.all([
      supabase.from('ordenes_compra').select('*, proveedores(razon_social)').order('created_at', { ascending: false }),
      supabase.from('proveedores').select('id, razon_social').eq('activo', true),
      supabase.from('productos').select('id, nombre_comercial, sku, precio_referencial').eq('activo', true)
    ]);
    setOrdenes(ordRes.data || []);
    setProveedores(provRes.data || []);
    setProductos(prodRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const generarNumero = async () => {
    const anio = new Date().getFullYear();
    const { count } = await supabase.from('ordenes_compra').select('*', { count: 'exact', head: true });
    return `OC-${anio}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) return;
    const producto = productos.find(p => p.id === productoSeleccionado);
    const yaExiste = detallesTemp.find(d => d.producto_id === productoSeleccionado);
    if (yaExiste) return;
    const subtotal = cantidadSeleccionada * (precioSeleccionado || producto.precio_referencial || 0);
    setDetallesTemp([...detallesTemp, {
      producto_id: productoSeleccionado,
      producto_nombre: producto.nombre_comercial,
      cantidad: cantidadSeleccionada,
      precio_unitario: precioSeleccionado || producto.precio_referencial || 0,
      subtotal
    }]);
    setProductoSeleccionado('');
    setCantidadSeleccionada(1);
    setPrecioSeleccionado(0);
  };

  const eliminarDetalle = (idx) => {
    setDetallesTemp(detallesTemp.filter((_, i) => i !== idx));
  };

  const actualizarCantidad = (idx, nuevaCantidad) => {
    if (nuevaCantidad <= 0) return eliminarDetalle(idx);
    const nuevos = [...detallesTemp];
    nuevos[idx].cantidad = nuevaCantidad;
    nuevos[idx].subtotal = nuevos[idx].cantidad * nuevos[idx].precio_unitario;
    setDetallesTemp(nuevos);
  };

  const actualizarPrecio = (idx, nuevoPrecio) => {
    const nuevos = [...detallesTemp];
    nuevos[idx].precio_unitario = nuevoPrecio;
    nuevos[idx].subtotal = nuevos[idx].cantidad * nuevoPrecio;
    setDetallesTemp(nuevos);
  };

  const guardarOrden = async () => {
    if (!form.proveedor_id || detallesTemp.length === 0) return;
    setLoading(true);
    const total = detallesTemp.reduce((sum, d) => sum + d.subtotal, 0);
    const datosEnvio = { ...form, total };
    delete datosEnvio.id;
    if (!datosEnvio.numero) datosEnvio.numero = await generarNumero();
    
    let ordenId;
    if (editando) {
      await supabase.from('ordenes_compra').update(datosEnvio).eq('id', editando);
      ordenId = editando;
      await supabase.from('ordenes_compra_detalle').delete().eq('orden_id', editando);
    } else {
      const { data, error } = await supabase.from('ordenes_compra').insert([datosEnvio]).select();
      if (error) { setLoading(false); return; }
      ordenId = data[0].id;
    }
    const detallesInsert = detallesTemp.map(d => ({
      orden_id: ordenId,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.subtotal
    }));
    await supabase.from('ordenes_compra_detalle').insert(detallesInsert);
    setModal(false);
    cargarDatos();
    setLoading(false);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('ordenes_compra').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const verDetalle = async (orden) => {
    const { data: detalles } = await supabase
      .from('ordenes_compra_detalle')
      .select('*, productos(nombre_comercial, sku)')
      .eq('orden_id', orden.id);
    setOrdenActual({ ...orden, detalles: detalles || [] });
    setDetalleModal(true);
  };

  const ordenesFiltradas = ordenes.filter(o =>
    o.numero?.toLowerCase().includes(busqueda.toLowerCase()) ||
    o.proveedores?.razon_social?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'Pendiente': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Aprobada': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Enviada': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Completada': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Anulada': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#11284e] tracking-tight">Compras y Abastecimiento</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión estratégica de órdenes y relación con proveedores</p>
        </div>
        <button 
          onClick={() => { setEditando(null); setForm({ numero: '', proveedor_id: '', fecha_emision: new Date().toISOString().split('T')[0], fecha_requerida: '', estado: 'Pendiente', total: 0, observaciones: '' }); setDetallesTemp([]); setModal(true); }}
          className="bg-[#185FA5] hover:bg-[#11284e] text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-bold"
        >
          <Plus size={20} /> Generar Orden
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Órdenes Pendientes', val: ordenes.filter(o => o.estado === 'Pendiente').length, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Total del Mes', val: `S/ ${ordenes.reduce((acc, curr) => acc + (curr.total || 0), 0).toLocaleString()}`, color: 'text-[#185FA5]', bg: 'bg-blue-50' },
          { label: 'Aprobadas', val: ordenes.filter(o => o.estado === 'Aprobada').length, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Anuladas', val: ordenes.filter(o => o.estado === 'Anulada').length, color: 'text-rose-500', bg: 'bg-rose-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center font-black ${stat.color}`}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-[#11284e]">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por OC o Proveedor..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)} 
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#185FA5]" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">N° Orden</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Proveedor</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fechas</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto Total</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordenesFiltradas.map(o => (
                <tr key={o.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-black text-[#185FA5]">{o.numero}</span>
                      <span className="text-[10px] text-gray-400">ID: {o.id.split('-')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#11284e] uppercase text-xs">{o.proveedores?.razon_social}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Calendar size={12} className="text-blue-400"/> Emisión: {o.fecha_emision}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                        <Truck size={12} className="text-amber-400"/> Requerida: {o.fecha_requerida || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-black text-[#11284e]">S/ {o.total?.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-tighter ${getEstadoBadge(o.estado)}`}>
                      {o.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => verDetalle(o)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-xl transition-all"><Eye size={18} /></button>
                      <button onClick={() => { setEditando(o.id); setForm(o); setDetallesTemp([]); setModal(true); }} className="p-2 hover:bg-emerald-50 text-emerald-500 rounded-xl transition-all"><Edit2 size={18} /></button>
                      <select 
                        value={o.estado} 
                        onChange={e => cambiarEstado(o.id, e.target.value)} 
                        className="text-[10px] border-none bg-gray-50 font-bold rounded-lg px-2 focus:ring-1 focus:ring-blue-400"
                      >
                        <option>Pendiente</option>
                        <option>Aprobada</option>
                        <option>Enviada</option>
                        <option>Completada</option>
                        <option>Anulada</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario Orden */}
      {modal && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#185FA5] rounded-2xl flex items-center justify-center text-white"><ShoppingCart size={24}/></div>
                <div>
                  <h3 className="text-2xl font-black text-[#11284e]">{editando ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Registro oficial de adquisición</p>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="p-3 hover:bg-red-50 text-red-400 rounded-full transition-all"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Proveedor Titular</label>
                  <select 
                    value={form.proveedor_id} 
                    onChange={e => setForm({...form, proveedor_id: e.target.value})} 
                    className="w-full mt-2 bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-[#11284e] focus:ring-2 focus:ring-[#185FA5]"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Emisión</label>
                  <input type="date" disabled value={form.fecha_emision} className="w-full mt-2 bg-gray-100 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Requerida</label>
                  <input type="date" value={form.fecha_requerida} onChange={e => setForm({...form, fecha_requerida: e.target.value})} className="w-full mt-2 bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-[#11284e] focus:ring-2 focus:ring-[#185FA5]" />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Instrucciones / Observaciones</label>
                  <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} className="w-full mt-2 bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-medium" rows="2" placeholder="Ej. Entrega en almacén central, fragilidad, etc." />
                </div>
              </div>

              {/* Área de Producto */}
              <div className="bg-[#11284e] rounded-[2rem] p-8 text-white relative overflow-hidden mb-8">
                <div className="absolute right-0 top-0 opacity-10 rotate-12 transform translate-x-4 -translate-y-4"><ShoppingCart size={150}/></div>
                <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Plus size={16} className="text-[#185FA5]"/> Agregar Ítem a la Orden
                </h4>
                <div className="grid grid-cols-12 gap-4 items-end relative z-10">
                  <div className="col-span-5">
                    <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2 block">Producto / SKU</label>
                    <select 
                      value={productoSeleccionado} 
                      onChange={e => setProductoSeleccionado(e.target.value)} 
                      className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-white/30 backdrop-blur-md"
                    >
                      <option value="" className="text-gray-900">Seleccionar ítem...</option>
                      {productos.map(p => <option key={p.id} value={p.id} className="text-gray-900">{p.nombre_comercial} (S/ {p.precio_referencial || 0})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2 block">Cantidad</label>
                    <input type="number" value={cantidadSeleccionada} onChange={e => setCantidadSeleccionada(parseInt(e.target.value))} className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold text-white text-center" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2 block">Precio Negociado (S/)</label>
                    <input type="number" step="0.01" value={precioSeleccionado} onChange={e => setPrecioSeleccionado(parseFloat(e.target.value))} className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold text-white text-right" />
                  </div>
                  <div className="col-span-2">
                    <button onClick={agregarProducto} className="w-full bg-white text-[#11284e] py-3 rounded-xl font-black text-sm hover:bg-blue-50 transition-colors shadow-xl">
                      INSERTAR
                    </button>
                  </div>
                </div>
              </div>

              {/* Detalle Listado */}
              <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="px-6 py-4 text-left">Descripción del Producto</th>
                      <th className="px-6 py-4 text-center">Cantidad</th>
                      <th className="px-6 py-4 text-right">Unitario</th>
                      <th className="px-6 py-4 text-right">Subtotal</th>
                      <th className="px-6 py-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {detallesTemp.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-[#11284e]">{d.producto_nombre}</td>
                        <td className="px-6 py-4 text-center">
                          <input type="number" value={d.cantidad} onChange={e => actualizarCantidad(idx, parseInt(e.target.value))} className="w-20 bg-gray-50 border-none rounded-lg text-center font-bold text-sm" />
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-500">
                          S/ <input type="number" step="0.01" value={d.precio_unitario} onChange={e => actualizarPrecio(idx, parseFloat(e.target.value))} className="w-24 bg-transparent border-none text-right font-bold focus:ring-0" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-black text-[#11284e]">S/ {d.subtotal.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => eliminarDetalle(idx)} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {detallesTemp.length === 0 && (
                      <tr><td colSpan="5" className="py-12 text-center text-gray-300 italic font-medium">No se han añadido productos a la orden todavía</td>              </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-8 bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Resumen de Inversión</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-[#11284e]">S/ {detallesTemp.reduce((s, d) => s + d.subtotal, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-xs text-gray-400 font-bold uppercase">Inc. IGV (Simulado)</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setModal(false)} className="px-8 py-4 text-sm font-bold text-gray-500 hover:text-[#11284e] transition-colors">DESCARTAR</button>
                <button 
                  onClick={guardarOrden} 
                  disabled={loading || detallesTemp.length === 0}
                  className="bg-[#185FA5] hover:bg-[#11284e] text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-blue-100 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20}/>}
                  {editando ? 'ACTUALIZAR ORDEN' : 'CONFIRMAR Y GUARDAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {detalleModal && ordenActual && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#185FA5] text-white px-3 py-1 rounded-lg font-mono font-black text-sm">{ordenActual.numero}</span>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase ${getEstadoBadge(ordenActual.estado)}`}>{ordenActual.estado}</span>
                </div>
                <h3 className="text-xl font-black text-[#11284e] uppercase leading-tight">{ordenActual.proveedores?.razon_social}</h3>
                <p className="text-xs text-gray-400 mt-1 font-bold tracking-widest">FECHA REQUERIDA: {ordenActual.fecha_requerida || 'INMEDIATA'}</p>
              </div>
              <button onClick={() => setDetalleModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"><X size={24} /></button>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 mb-8">
              {ordenActual.detalles?.map(d => (
                <div key={d.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-[#11284e] text-sm uppercase leading-none">{d.productos?.nombre_comercial}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-tighter">CANTIDAD: {d.cantidad} UNID. x S/ {d.precio_unitario?.toFixed(2)}</p>
                  </div>
                  <span className="font-black text-[#11284e]">S/ {d.subtotal?.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#11284e] rounded-2xl p-6 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em]">Monto Total de Operación</p>
                <p className="text-3xl font-black leading-none mt-1">S/ {ordenActual.total?.toFixed(2)}</p>
              </div>
              <FileText size={40} className="opacity-20"/>
            </div>

            <button onClick={() => setDetalleModal(false)} className="mt-6 w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
              CERRAR VISTA PREVIA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}