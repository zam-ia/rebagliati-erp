import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Edit2, 
  AlertCircle, 
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Package
} from 'lucide-react';

export default function Requerimientos() {
  const [requerimientos, setRequerimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalleModal, setDetalleModal] = useState(false);
  const [detalleActual, setDetalleActual] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  const [detallesTemp, setDetallesTemp] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadTemp, setCantidadTemp] = useState(1);

  const [form, setForm] = useState({
    numero: '',
    area_solicitante: '',
    prioridad: 'Media',
    justificacion: '',
    estado: 'Pendiente',
    solicitante_id: '',
    fecha_requerida: '',
  });
  const [loading, setLoading] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    const [reqRes, prodRes] = await Promise.all([
      supabase.from('requerimientos').select('*').order('created_at', { ascending: false }),
      supabase.from('productos').select('id, nombre_comercial, sku').eq('activo', true)
    ]);
    setRequerimientos(reqRes.data || []);
    setProductos(prodRes.data || []);
    
    const { data: empleados } = await supabase.from('empleados').select('area');
    const areasUnicas = [...new Set(empleados?.map(e => e.area).filter(Boolean))];
    setAreas(areasUnicas);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const agregarDetalle = () => {
    if (!productoSeleccionado) return;
    const prod = productos.find(p => p.id === productoSeleccionado);
    setDetallesTemp([...detallesTemp, {
      producto_id: prod.id,
      producto: prod,
      cantidad_solicitada: cantidadTemp
    }]);
    setProductoSeleccionado('');
    setCantidadTemp(1);
  };

  const eliminarDetalle = (index) => {
    setDetallesTemp(detallesTemp.filter((_, i) => i !== index));
  };

  const guardarRequerimiento = async () => {
    if (!form.area_solicitante || !form.fecha_requerida) {
      return alert('El área y la fecha requerida son obligatorios');
    }
    setLoading(true);
    
    let reqId = editando;
    const datosEnvio = { ...form };
    
    if (!editando) {
      const anio = new Date().getFullYear();
      const { count } = await supabase.from('requerimientos').select('*', { count: 'exact', head: true });
      datosEnvio.numero = `REQ-${anio}-${String((count || 0) + 1).padStart(4, '0')}`;
      
      const { data: nuevoReq, error: errReq } = await supabase.from('requerimientos').insert([datosEnvio]).select().single();
      if (errReq) return alert(errReq.message);
      reqId = nuevoReq.id;
    } else {
      await supabase.from('requerimientos').update(datosEnvio).eq('id', editando);
      await supabase.from('requerimientos_detalle').delete().eq('requerimiento_id', reqId);
    }

    if (detallesTemp.length > 0) {
      const detallesFinales = detallesTemp.map(d => ({
        requerimiento_id: reqId,
        producto_id: d.producto_id,
        cantidad_solicitada: d.cantidad_solicitada
      }));
      await supabase.from('requerimientos_detalle').insert(detallesFinales);
    }

    setModal(false);
    cargarDatos();
    setLoading(false);
  };

  const verDetalle = async (req) => {
    const { data: detalles } = await supabase
      .from('requerimientos_detalle')
      .select('*, productos(nombre_comercial, sku)')
      .eq('requerimiento_id', req.id);
    setDetalleActual({ ...req, detalles: detalles || [] });
    setDetalleModal(true);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('requerimientos').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const requerimientosFiltrados = requerimientos.filter(r => {
    const matchBusqueda = r.numero?.toLowerCase().includes(busqueda.toLowerCase()) || 
                          r.area_solicitante?.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const getPrioridadColor = (p) => {
    switch(p) {
      case 'Alta': case 'Urgente': return 'bg-red-50 text-red-600 border-red-100';
      case 'Media': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  const getEstadoBadge = (e) => {
    switch(e) {
      case 'Pendiente': return { color: 'bg-gray-100 text-gray-600' };
      case 'Aprobada': return { color: 'bg-green-100 text-green-700' };
      case 'Rechazada': return { color: 'bg-red-100 text-red-700' };
      case 'Atendida': return { color: 'bg-blue-100 text-blue-700' };
      default: return { color: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#11284e]">Requerimientos Internos</h1>
          <p className="text-gray-500 text-sm">Gestión de suministros y pedidos por departamento</p>
        </div>
        <button
          onClick={() => { 
            setEditando(null); 
            setForm({ numero: '', area_solicitante: '', prioridad: 'Media', justificacion: '', estado: 'Pendiente', solicitante_id: '', fecha_requerida: '' }); 
            setDetallesTemp([]);
            setModal(true); 
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Requerimiento
        </button>
      </div>

      <div className="erp-card mb-6 flex gap-3 p-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="erp-input w-full pl-10" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="erp-input w-48">
          <option value="todos">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Atendida">Atendida</option>
        </select>
      </div>

      <div className="erp-card overflow-hidden">
        <table className="erp-table">
          <thead>
            <tr>
              <th>N° SOLICITUD</th>
              <th>ÁREA</th>
              <th className="text-center">PRIORIDAD</th>
              <th>FECHA LÍMITE</th>
              <th className="text-center">ESTADO</th>
              <th className="text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {requerimientosFiltrados.map(r => (
              <tr key={r.id}>
                <td className="font-mono text-[#185FA5] font-bold text-xs">{r.numero}</td>
                <td className="font-medium text-gray-700">{r.area_solicitante}</td>
                <td className="text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getPrioridadColor(r.prioridad)}`}>
                    {r.prioridad.toUpperCase()}
                  </span>
                </td>
                <td className="text-gray-500 text-xs">{r.fecha_requerida}</td>
                <td className="text-center">
                   <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)} className={`text-[11px] font-bold border-none rounded-lg px-2 py-1 ${getEstadoBadge(r.estado).color}`}>
                      <option value="Pendiente">PENDIENTE</option>
                      <option value="Aprobada">APROBADA</option>
                      <option value="Rechazada">RECHAZADA</option>
                      <option value="Atendida">ATENDIDA</option>
                   </select>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => verDetalle(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={16} /></button>
                    <button onClick={async () => { 
                      setEditando(r.id); 
                      setForm(r);
                      const { data: d } = await supabase.from('requerimientos_detalle').select('*, producto:productos(*)').eq('requerimiento_id', r.id);
                      setDetallesTemp(d || []);
                      setModal(true); 
                    }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-[#11284e]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#11284e] flex items-center gap-2">
                <FileText className="text-[#185FA5]" size={20} />
                {editando ? 'Editar Requerimiento' : 'Nueva Solicitud'}
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6 bg-[#fbfcfd]">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="erp-label h-6 mb-1">Área Solicitante *</label>
                  <select value={form.area_solicitante} onChange={e => setForm({...form, area_solicitante: e.target.value})} className="erp-input">
                    <option value="">Seleccionar área</option>
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="erp-label flex items-center gap-1 h-6 mb-1">
                    <AlertCircle size={14} className="text-[#185FA5]"/> Prioridad
                  </label>
                  <select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})} className="erp-input">
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="erp-label flex items-center gap-1 mb-1"><Calendar size={14} className="text-[#185FA5]"/> Fecha Límite</label>
                <input type="date" value={form.fecha_requerida} onChange={e => setForm({...form, fecha_requerida: e.target.value})} className="erp-input w-full" />
              </div>

              {/* Sección de Selección de Productos Optimizada */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <label className="erp-label flex items-center gap-2 mb-3">
                  <Package size={16} className="text-[#185FA5]" /> Agregar Productos
                </label>
                
                {/* Contenedor de inputs con layout mejorado */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <select 
                      value={productoSeleccionado} 
                      onChange={e => setProductoSeleccionado(e.target.value)} 
                      className="erp-input flex-1"
                    >
                      <option value="">Buscar producto por descripción o SKU...</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial} ({p.sku})</option>)}
                    </select>
                    
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={cantidadTemp} 
                        onChange={e => setCantidadTemp(parseInt(e.target.value))} 
                        className="erp-input w-16 text-center px-1" 
                        min="1" 
                        placeholder="Cant."
                      />
                      <button 
                        onClick={agregarDetalle} 
                        className="bg-[#185FA5] text-white w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#11284e] transition-colors"
                        title="Agregar producto"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-gray-50">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left text-[11px] text-gray-400 uppercase">Producto</th>
                        <th className="p-2 text-center text-[11px] text-gray-400 uppercase w-20">Cant.</th>
                        <th className="p-2 text-center text-[11px] text-gray-400 uppercase w-16">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detallesTemp.map((d, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50/50">
                          <td className="p-2">
                            <div className="font-medium text-gray-700 leading-tight">{d.producto?.nombre_comercial}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{d.producto?.sku}</div>
                          </td>
                          <td className="p-2 text-center">
                            <input 
                              type="number" 
                              min="1" 
                              value={d.cantidad_solicitada} 
                              onChange={e => { 
                                const nuevos = [...detallesTemp]; 
                                nuevos[idx].cantidad_solicitada = parseInt(e.target.value); 
                                setDetallesTemp(nuevos); 
                              }} 
                              className="w-14 border rounded-lg p-1 text-center text-xs focus:ring-1 focus:ring-[#185FA5] outline-none" 
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => eliminarDetalle(idx)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {detallesTemp.length === 0 && (
                        <tr>
                          <td colSpan="3" className="p-4 text-center text-gray-400 text-xs italic">
                            Sin productos agregados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="erp-label mb-1">Justificación</label>
                <textarea 
                  value={form.justificacion} 
                  onChange={e => setForm({...form, justificacion: e.target.value})} 
                  className="erp-input w-full h-20" 
                  style={{ resize: 'none' }}
                  placeholder="Explique el motivo del requerimiento..."
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 bg-white">
              <button onClick={guardarRequerimiento} disabled={loading} className="btn-primary flex-1 py-3">
                {loading ? 'Procesando...' : 'Guardar Requerimiento'}
              </button>
              <button onClick={() => setModal(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-400 font-medium">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {detalleModal && detalleActual && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-[#185FA5] uppercase tracking-widest block mb-1">Revisión de Solicitud</span>
                <h3 className="text-xl font-bold text-[#11284e]">{detalleActual.numero}</h3>
              </div>
              <button onClick={() => setDetalleModal(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <p className="text-sm"><strong className="text-gray-400 block text-[10px] uppercase">Área:</strong> {detalleActual.area_solicitante}</p>
                <p className="text-sm"><strong className="text-gray-400 block text-[10px] uppercase">Estado:</strong> {detalleActual.estado}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl mb-6">
                 <p className="text-sm text-gray-600 italic">"{detalleActual.justificacion || 'Sin observaciones'}"</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-[11px] uppercase border-b"><th className="text-left pb-2">Producto</th><th className="text-center pb-2">Cantidad</th></tr>
                </thead>
                <tbody>
                  {detalleActual.detalles?.map(d => (
                    <tr key={d.id} className="border-b border-gray-50 last:border-none">
                      <td className="py-3 text-gray-700">{d.productos?.nombre_comercial}</td>
                      <td className="py-3 text-center font-bold text-[#185FA5]">{d.cantidad_solicitada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 flex justify-end">
              <button onClick={() => setDetalleModal(false)} className="btn-primary px-10">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}