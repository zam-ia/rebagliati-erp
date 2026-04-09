import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Search, Eye, Truck, CheckCircle, Clock, 
  User, Calendar, ClipboardList, Trash2, 
  Package, X, Hash, AlertCircle, FileText
} from 'lucide-react';

export default function Despachos() {
  const [despachos, setDespachos] = useState([]);
  const [requerimientos, setRequerimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [modal, setModal] = useState(false);
  const [detalleModal, setDetalleModal] = useState(false);
  const [despachoActual, setDespachoActual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Modal rápido para nuevo requerimiento
  const [modalRequerimiento, setModalRequerimiento] = useState(false);
  const [nuevoRequerimiento, setNuevoRequerimiento] = useState({
    area_solicitante: '',
    prioridad: 'Media',
    justificacion: ''
  });
  
  const [form, setForm] = useState({
    numero: '',
    requerimiento_id: '',
    responsable_entrega: '',
    responsable_recibe: '',
    fecha_entrega: new Date().toISOString().split('T')[0],
    estado: 'Pendiente',
    observaciones: '',
    productos: []
  });

  const [detallesTemp, setDetallesTemp] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);
  const [loteSeleccionado, setLoteSeleccionado] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    const [despRes, reqRes, prodRes, almRes, lotesRes] = await Promise.all([
      supabase.from('despachos').select('*, requerimientos(numero, area_solicitante)').order('created_at', { ascending: false }),
      supabase.from('requerimientos').select('id, numero, area_solicitante').eq('estado', 'Aprobada'),
      supabase.from('productos').select('id, nombre_comercial, sku').eq('activo', true),
      supabase.from('almacenes').select('id, nombre').eq('activo', true),
      supabase.from('inventario_lotes').select('id, lote, producto_id, stock_actual').gt('stock_actual', 0)
    ]);
    setDespachos(despRes.data || []);
    setRequerimientos(reqRes.data || []);
    setProductos(prodRes.data || []);
    setAlmacenes(almRes.data || []);
    setLotes(lotesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const generarNumero = async () => {
    const anio = new Date().getFullYear();
    const { count } = await supabase.from('despachos').select('*', { count: 'exact', head: true });
    return `DES-${anio}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  // Crear requerimiento rápido
  const crearRequerimientoRapido = async () => {
    if (!nuevoRequerimiento.area_solicitante) {
      return alert('El área es obligatoria');
    }
    const { data, error } = await supabase.from('requerimientos').insert([{
      area_solicitante: nuevoRequerimiento.area_solicitante,
      prioridad: nuevoRequerimiento.prioridad,
      justificacion: nuevoRequerimiento.justificacion,
      estado: 'Aprobada',
      fecha_requerida: new Date().toISOString().split('T')[0],
      numero: `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    }]).select();
    if (error) alert('Error: ' + error.message);
    else {
      setRequerimientos(prev => [...prev, data[0]]);
      setForm(prev => ({ ...prev, requerimiento_id: data[0].id }));
      setModalRequerimiento(false);
      setNuevoRequerimiento({ area_solicitante: '', prioridad: 'Media', justificacion: '' });
    }
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      alert('Seleccione un producto');
      return;
    }
    const producto = productos.find(p => p.id === productoSeleccionado);
    let loteId = loteSeleccionado;
    let loteObj = null;
    
    if (!loteId) {
      // Buscar el lote con más stock (o el más próximo a vencer)
      const lotesDisponibles = lotes.filter(l => l.producto_id === productoSeleccionado && l.stock_actual >= cantidadSeleccionada);
      if (lotesDisponibles.length === 0) {
        alert(`Stock insuficiente para ${producto.nombre_comercial}. Solo hay ${lotes.filter(l => l.producto_id === productoSeleccionado).reduce((s, l) => s + l.stock_actual, 0)} unidades disponibles.`);
        return;
      }
      // Selecciona el lote con menor stock (FIFO) o el que tenga vencimiento más cercano
      loteObj = lotesDisponibles.sort((a, b) => a.fecha_vencimiento - b.fecha_vencimiento)[0];
      loteId = loteObj.id;
    } else {
      loteObj = lotes.find(l => l.id === loteId);
      if (loteObj.stock_actual < cantidadSeleccionada) {
        alert(`Stock insuficiente en el lote ${loteObj.lote}. Disponible: ${loteObj.stock_actual}`);
        return;
      }
    }
    
    const yaExiste = detallesTemp.find(d => d.producto_id === productoSeleccionado);
    if (yaExiste) {
      alert('El producto ya está en la lista. Puede editar la cantidad directamente en la tabla.');
      return;
    }

    setDetallesTemp([...detallesTemp, {
      producto_id: productoSeleccionado,
      producto_nombre: producto.nombre_comercial,
      cantidad: cantidadSeleccionada,
      lote_id: loteId,
      lote: loteObj.lote
    }]);
    setProductoSeleccionado('');
    setCantidadSeleccionada(1);
    setLoteSeleccionado('');
  };

  const actualizarCantidadProducto = (idx, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDetalle(idx);
      return;
    }
    const nuevos = [...detallesTemp];
    nuevos[idx].cantidad = nuevaCantidad;
    setDetallesTemp(nuevos);
  };

  const eliminarDetalle = (idx) => {
    const nuevos = [...detallesTemp];
    nuevos.splice(idx, 1);
    setDetallesTemp(nuevos);
  };

  const guardarDespacho = async () => {
    if (!form.responsable_entrega) {
      return alert('El responsable de entrega es obligatorio');
    }
    if (detallesTemp.length === 0) {
      return alert('Debe agregar al menos un producto');
    }
    setLoading(true);
    const datosEnvio = { ...form };
    delete datosEnvio.productos;
    if (!datosEnvio.numero) datosEnvio.numero = await generarNumero();
    delete datosEnvio.id;

    const { data, error } = await supabase.from('despachos').insert([datosEnvio]).select();
    if (error) { alert(error.message); setLoading(false); return; }
    const despachoId = data[0].id;

    // Registrar movimientos y descontar stock
    for (const d of detallesTemp) {
      await supabase.from('movimientos_inventario').insert([{
        tipo: 'Salida',
        producto_id: d.producto_id,
        lote_id: d.lote_id,
        cantidad: d.cantidad,
        motivo: `Despacho ${datosEnvio.numero}`,
        almacen_origen_id: null
      }]);
      const loteActual = lotes.find(l => l.id === d.lote_id);
      await supabase.from('inventario_lotes').update({ 
        stock_actual: loteActual.stock_actual - d.cantidad 
      }).eq('id', d.lote_id);
    }

    setModal(false);
    cargarDatos();
    setLoading(false);
    alert('Despacho registrado correctamente');
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('despachos').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const despachosFiltrados = despachos.filter(d => {
    const matchBusqueda = d.numero?.toLowerCase().includes(busqueda.toLowerCase()) || 
                          d.requerimientos?.area_solicitante?.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || d.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'Pendiente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Entregado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Parcial': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Verificar si el botón debe habilitarse
  const isFormValid = form.responsable_entrega && detallesTemp.length > 0;

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#11284e] tracking-tight">Despachos</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de vales de salida y movimientos de almacén</p>
        </div>
        <button 
          onClick={() => { 
            setForm({ numero: '', requerimiento_id: '', responsable_entrega: '', responsable_recibe: '', fecha_entrega: new Date().toISOString().split('T')[0], estado: 'Pendiente', observaciones: '', productos: [] }); 
            setDetallesTemp([]); 
            setModal(true); 
          }} 
          className="bg-[#185FA5] hover:bg-[#11284e] text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-bold"
        >
          <Plus size={20} /> Nuevo Despacho
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-3">
          <label className="erp-label flex items-center gap-2 mb-2 text-gray-400">
            <Search size={14} className="text-[#185FA5]" /> Buscar por correlativo o área
          </label>
          <input type="text" placeholder="Escriba aquí..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="erp-input w-full" />
        </div>
        <div>
          <label className="erp-label flex items-center gap-2 mb-2 text-gray-400">
            <Clock size={14} className="text-[#185FA5]" /> Filtrar Estado
          </label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full border-none focus:ring-0 bg-transparent py-3 px-4 text-sm font-medium text-gray-600 cursor-pointer">
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Entregado">Entregados</option>
            <option value="Parcial">Parciales</option>
          </select>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Documento</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Destino / Área</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Responsable</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Estado</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {despachosFiltrados.map(d => (
              <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#185FA5]"><Hash size={14} /></div>
                    <span className="font-bold text-[#11284e] text-sm">{d.numero}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{d.requerimientos?.area_solicitante || <span className="text-gray-400 italic font-light">Salida Directa</span>}</td>
                <td className="px-6 py-4"><div className="flex flex-col"><span className="text-sm font-medium text-gray-700">{d.responsable_entrega}</span><span className="text-[10px] text-gray-400">Envió</span></div></td>
                <td className="px-6 py-4 text-sm text-gray-500">{d.fecha_entrega}</td>
                <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border ${getEstadoBadge(d.estado)}`}>{d.estado}</span></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={async () => { const { data: detalles } = await supabase.from('movimientos_inventario').select('*, productos(nombre_comercial)').eq('motivo', `Despacho ${d.numero}`); setDespachoActual({ ...d, detalles }); setDetalleModal(true); }} className="p-2 text-[#185FA5] hover:bg-blue-100 rounded-xl transition-colors"><Eye size={18} /></button>
                    <select value={d.estado} onChange={e => cambiarEstado(d.id, e.target.value)} className="text-[10px] border border-gray-100 rounded-lg py-1 px-2 focus:ring-[#185FA5] font-bold text-gray-500 bg-white">
                      <option>Pendiente</option><option>Entregado</option><option>Parcial</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Despacho */}
      {modal && (
        <div className="fixed inset-0 bg-[#11284e]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
               <div><h3 className="text-xl font-bold text-[#11284e]">Nuevo Registro de Salida</h3><p className="text-xs text-gray-400">Gestión de stock de salida</p></div>
               <button onClick={() => setModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 bg-[#fbfcfd]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div><label className="erp-label flex items-center gap-2 mb-2 text-gray-500"><User size={14} className="text-[#185FA5]" /> Responsable Entrega (Almacén) *</label>
                  <input value={form.responsable_entrega} onChange={e => setForm({...form, responsable_entrega: e.target.value})} className="erp-input w-full px-4" placeholder="Nombre completo" /></div>
                  <div><label className="erp-label flex items-center gap-2 mb-2 text-gray-500"><Truck size={14} className="text-[#185FA5]" /> Responsable Recibe (Área)</label>
                  <input value={form.responsable_recibe} onChange={e => setForm({...form, responsable_recibe: e.target.value})} className="erp-input w-full px-4" placeholder="Nombre del solicitante" /></div>
                </div>
                <div className="space-y-6">
                  <div><label className="erp-label flex items-center gap-2 mb-2 text-gray-500"><Calendar size={14} className="text-[#185FA5]" /> Fecha de Despacho</label>
                  <input type="date" value={form.fecha_entrega} onChange={e => setForm({...form, fecha_entrega: e.target.value})} className="erp-input w-full px-4" /></div>
                  <div>
                    <label className="erp-label flex items-center gap-2 mb-2 text-gray-500"><ClipboardList size={14} className="text-[#185FA5]" /> Vincular a Requerimiento</label>
                    <div className="flex gap-2">
                      <select value={form.requerimiento_id} onChange={e => setForm({...form, requerimiento_id: e.target.value})} className="flex-1 erp-input px-4 bg-white cursor-pointer">
                        <option value="">Despacho sin requerimiento</option>
                        {requerimientos.map(r => <option key={r.id} value={r.id}>{r.numero} - {r.area_solicitante}</option>)}
                      </select>
                      <button onClick={() => setModalRequerimiento(true)} className="bg-gray-100 hover:bg-gray-200 px-3 rounded-xl text-[#185FA5]"><Plus size={18} /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div><label className="erp-label flex items-center gap-2 mb-2 text-gray-500"><FileText size={14} className="text-[#185FA5]" /> Observaciones</label>
              <textarea rows="2" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} className="erp-input w-full" placeholder="Motivo del despacho o notas adicionales"></textarea></div>

              {/* Selección de productos */}
              <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                <h4 className="text-sm font-bold text-[#11284e] mb-6 flex items-center gap-2 uppercase tracking-tighter"><Package size={18} className="text-[#185FA5]" /> Selección de Ítems</h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-5"><label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Producto</label>
                  <select value={productoSeleccionado} onChange={e => setProductoSeleccionado(e.target.value)} className="erp-input w-full bg-gray-50/50"><option value="">Seleccione ítem...</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial}</option>)}</select></div>
                  <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Cantidad</label>
                  <input type="number" min="1" value={cantidadSeleccionada} onChange={e => setCantidadSeleccionada(parseInt(e.target.value) || 1)} className="erp-input w-full bg-gray-50/50" /></div>
                  <div className="md:col-span-3"><label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Lote</label>
                  <select value={loteSeleccionado} onChange={e => setLoteSeleccionado(e.target.value)} className="erp-input w-full bg-gray-50/50"><option value="">Auto (primero en vencer)</option>
                  {lotes.filter(l => l.producto_id === productoSeleccionado).map(l => <option key={l.id} value={l.id}>{l.lote} (Stock: {l.stock_actual})</option>)}</select></div>
                  <div className="md:col-span-2"><button onClick={agregarProducto} className="w-full bg-[#11284e] text-white h-[42px] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#185FA5] transition-all"><Plus size={18} /> Añadir</button></div>
                </div>

                <div className="mt-6 border border-gray-50 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50/50"><tr className="text-gray-400"><th className="px-4 py-3 text-left font-bold uppercase tracking-widest">Producto</th><th className="px-4 py-3 text-center font-bold uppercase tracking-widest">Lote</th><th className="px-4 py-3 text-center font-bold uppercase tracking-widest">Cantidad</th><th className="px-4 py-3 text-right"></th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {detallesTemp.map((d, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/30">
                          <td className="px-4 py-3 font-semibold text-gray-700">{d.producto_nombre}</td>
                          <td className="px-4 py-3 text-center font-mono text-gray-400">{d.lote}</td>
                          <td className="px-4 py-3 text-center"><input type="number" min="1" value={d.cantidad} onChange={e => actualizarCantidadProducto(idx, parseInt(e.target.value) || 1)} className="w-20 text-center border rounded-lg py-1" /></td>
                          <td className="px-4 py-3 text-right"><button onClick={() => eliminarDetalle(idx)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-white sticky bottom-0 flex gap-3">
              <button onClick={guardarDespacho} disabled={loading || !isFormValid} className="bg-[#185FA5] hover:bg-[#11284e] text-white px-8 py-4 rounded-2xl flex-1 font-bold shadow-lg shadow-blue-50 transition-all disabled:opacity-100">
                {loading ? 'Procesando...' : 'Confirmar Registro de Despacho'}
              </button>
              <button onClick={() => setModal(false)} className="px-8 py-4 border border-gray-100 rounded-2xl text-gray-400 font-bold hover:bg-gray-60 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {detalleModal && despachoActual && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-2">{despachoActual.numero}</h3>
            <p><strong>Responsable entrega:</strong> {despachoActual.responsable_entrega}</p>
            <p><strong>Responsable recibe:</strong> {despachoActual.responsable_recibe || '—'}</p>
            <p><strong>Fecha:</strong> {despachoActual.fecha_entrega}</p>
            <p><strong>Estado:</strong> {despachoActual.estado}</p>
            <h4 className="font-bold mt-4 mb-2">Productos despachados</h4>
            <div className="bg-gray-50 rounded-lg p-3"><table className="w-full text-sm"><thead><tr><th>Producto</th><th className="text-center">Cantidad</th></tr></thead><tbody>{despachoActual.detalles?.map((d, i) => <tr key={i} className="border-t"><td>{d.productos?.nombre_comercial}</td><td className="text-center">{d.cantidad}</td></tr>)}</tbody></table></div>
            <button onClick={() => setDetalleModal(false)} className="mt-4 w-full border rounded-lg py-2">Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal rápido para nuevo requerimiento */}
      {modalRequerimiento && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Crear Requerimiento Rápido</h3>
            <input placeholder="Área solicitante *" value={nuevoRequerimiento.area_solicitante} onChange={e => setNuevoRequerimiento({...nuevoRequerimiento, area_solicitante: e.target.value})} className="w-full border rounded-lg p-2 mb-3" />
            <select value={nuevoRequerimiento.prioridad} onChange={e => setNuevoRequerimiento({...nuevoRequerimiento, prioridad: e.target.value})} className="w-full border rounded-lg p-2 mb-3">
              <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Urgente">Urgente</option>
            </select>
            <textarea placeholder="Justificación" value={nuevoRequerimiento.justificacion} onChange={e => setNuevoRequerimiento({...nuevoRequerimiento, justificacion: e.target.value})} className="w-full border rounded-lg p-2 mb-4" rows="2" />
            <div className="flex gap-3"><button onClick={crearRequerimientoRapido} className="bg-[#185FA5] text-white px-4 py-2 rounded-lg flex-1">Guardar</button><button onClick={() => setModalRequerimiento(false)} className="border px-4 py-2 rounded-lg">Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}