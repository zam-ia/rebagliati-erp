// src/pages/logistica/Auditorias.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Search, Eye, ClipboardList, CheckCircle, 
  AlertCircle, Package, X, Calendar, MapPin, 
  ArrowRight, Loader2, Info 
} from 'lucide-react';

export default function Auditorias() {
  const [auditorias, setAuditorias] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modal, setModal] = useState(false);
  const [detalleModal, setDetalleModal] = useState(false);
  const [auditoriaActual, setAuditoriaActual] = useState(null);
  const [conteoModal, setConteoModal] = useState(false);
  const [conteoActual, setConteoActual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Cíclico',
    almacen_id: '',
    observaciones: '',
    estado: 'En progreso'
  });
  const [conteoForm, setConteoForm] = useState({
    producto_id: '',
    lote_id: '',
    stock_fisico: 0
  });
  const [productosParaConteo, setProductosParaConteo] = useState([]);

  const cargarDatos = async () => {
    setLoading(true);
    const [audRes, almRes, prodRes] = await Promise.all([
      supabase.from('auditorias_inventario').select('*, almacenes(nombre)').order('created_at', { ascending: false }),
      supabase.from('almacenes').select('id, nombre').eq('activo', true),
      supabase.from('productos').select('id, nombre_comercial, sku').eq('activo', true)
    ]);
    setAuditorias(audRes.data || []);
    setAlmacenes(almRes.data || []);
    setProductos(prodRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const iniciarAuditoria = async () => {
    if (!form.almacen_id) return alert('Seleccione un almacén');
    setLoading(true);
    const { data, error } = await supabase.from('auditorias_inventario').insert([form]).select();
    if (error) alert('Error: ' + error.message);
    else {
      setModal(false);
      cargarDatos();
      const { data: lotesAlmacen } = await supabase
        .from('inventario_lotes')
        .select('id, producto_id, lote, stock_actual, productos(nombre_comercial, sku)')
        .eq('almacen_id', form.almacen_id);
      setProductosParaConteo(lotesAlmacen || []);
      setAuditoriaActual(data[0]);
      setConteoModal(true);
    }
    setLoading(false);
  };

  const registrarConteo = async () => {
    if (!conteoActual) return;
    const lote = productosParaConteo.find(p => p.id === conteoActual.id);
    const diferencia = conteoForm.stock_fisico - (lote?.stock_actual || 0);
    await supabase.from('diferencias_inventario').insert([{
      auditoria_id: auditoriaActual.id,
      producto_id: conteoActual.producto_id,
      lote_id: conteoActual.id,
      stock_sistema: lote?.stock_actual || 0,
      stock_fisico: conteoForm.stock_fisico,
      diferencia: diferencia,
      ajuste_aplicado: false
    }]);
    
    const nuevos = productosParaConteo.filter(p => p.id !== conteoActual.id);
    setProductosParaConteo(nuevos);
    setConteoActual(null);
    setConteoForm({ producto_id: '', lote_id: '', stock_fisico: 0 });
    
    if (nuevos.length === 0) {
      await supabase.from('auditorias_inventario').update({ estado: 'Completado' }).eq('id', auditoriaActual.id);
      setConteoModal(false);
      cargarDatos();
    }
  };

  const verDetalle = async (aud) => {
    const { data: diferencias } = await supabase
      .from('diferencias_inventario')
      .select('*, productos(nombre_comercial, sku), inventario_lotes(lote)')
      .eq('auditoria_id', aud.id);
    setAuditoriaActual({ ...aud, diferencias: diferencias || [] });
    setDetalleModal(true);
  };

  const auditoriasFiltradas = auditorias.filter(a =>
    a.almacenes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#11284e] tracking-tight">Auditorías de Inventario</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de conteos, conciliaciones y precisión de stock</p>
        </div>
        <button 
          onClick={() => setModal(true)} 
          className="bg-[#185FA5] hover:bg-[#11284e] text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-bold"
        >
          <Plus size={20} /> Nueva Auditoría
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por almacén o tipo de auditoría..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            className="w-full border-none focus:ring-0 pl-12 pr-4 py-3 text-sm" 
          />
        </div>
      </div>

      {/* Grid de Auditorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {auditoriasFiltradas.map(a => (
          <div key={a.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-2 ${a.estado === 'Completado' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1">{a.tipo}</span>
                <h3 className="font-bold text-[#11284e] text-lg">{a.almacenes?.nombre}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                a.estado === 'Completado' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {a.estado.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Calendar size={14} className="text-[#185FA5]" />
                {new Date(a.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <button 
              onClick={() => verDetalle(a)} 
              className="w-full py-3 bg-gray-50 hover:bg-blue-50 text-[#185FA5] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Eye size={14} /> VER REPORTE DETALLADO
            </button>
          </div>
        ))}
      </div>

      {/* Modal Nueva Auditoría */}
      {modal && (
        <div className="fixed inset-0 bg-[#11284e]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#11284e]">Nueva Auditoría</h3>
                <button onClick={() => setModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Almacén a auditar</label>
                  <select 
                    value={form.almacen_id} 
                    onChange={e => setForm({...form, almacen_id: e.target.value})} 
                    className="w-full mt-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#185FA5]"
                  >
                    <option value="">Seleccionar almacén...</option>
                    {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tipo</label>
                    <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium">
                      <option value="Cíclico">Cíclico</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Fecha</label>
                    <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Observaciones</label>
                  <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium" rows="2" placeholder="Nota opcional..." />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={iniciarAuditoria} 
                  disabled={loading}
                  className="bg-[#185FA5] hover:bg-[#11284e] text-white px-6 py-4 rounded-2xl flex-1 font-bold shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'INICIAR CONTEO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conteo Dinámico */}
      {conteoModal && auditoriaActual && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#185FA5]"><ClipboardList size={24}/></div>
              <div>
                <h3 className="text-xl font-bold text-[#11284e]">Panel de Conteo</h3>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                  {almacenes.find(a => a.id === auditoriaActual.almacen_id)?.nombre}
                </p>
              </div>
            </div>

            {conteoActual ? (
              <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 animate-in fade-in zoom-in duration-300">
                <div className="mb-6">
                  <span className="text-[10px] font-black text-[#185FA5] uppercase tracking-widest">Producto Actual</span>
                  <h4 className="text-lg font-bold text-[#11284e] leading-tight mt-1">{conteoActual.productos?.nombre_comercial}</h4>
                  <p className="text-xs text-gray-400 font-mono mt-1">LOTE: {conteoActual.lote}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">En Sistema</p>
                    <p className="text-2xl font-black text-[#11284e]">{conteoActual.stock_actual}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-blue-100 ring-2 ring-blue-50">
                    <p className="text-[10px] font-bold text-[#185FA5] uppercase">Conteo Físico</p>
                    <input 
                      type="number" 
                      autoFocus
                      value={conteoForm.stock_fisico} 
                      onChange={e => setConteoForm({...conteoForm, stock_fisico: parseInt(e.target.value) || 0})} 
                      className="w-full border-none p-0 text-2xl font-black text-[#185FA5] focus:ring-0" 
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={registrarConteo} className="bg-[#11284e] text-white px-6 py-4 rounded-2xl flex-1 font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                    REGISTRAR <ArrowRight size={18} />
                  </button>
                  <button onClick={() => setConteoActual(null)} className="bg-white text-gray-400 px-6 py-4 rounded-2xl border border-gray-200 font-bold">SALTAR</button>
                </div>
              </div>
            ) : productosParaConteo.length > 0 ? (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-4 px-2">Pendientes de conteo ({productosParaConteo.length})</p>
                <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {productosParaConteo.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setConteoActual(p); setConteoForm({ producto_id: p.producto_id, lote_id: p.id, stock_fisico: p.stock_actual }); }} 
                      className="p-4 bg-white border-2 border-gray-50 hover:border-[#185FA5] rounded-2xl cursor-pointer transition-all flex justify-between items-center group"
                    >
                      <div>
                        <div className="font-bold text-[#11284e] group-hover:text-[#185FA5] transition-colors">{p.productos?.nombre_comercial}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Lote: {p.lote} • Stock: {p.stock_actual}</div>
                      </div>
                      <Plus size={18} className="text-gray-300 group-hover:text-[#185FA5]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 border-dashed">
                <CheckCircle className="mx-auto text-emerald-500 mb-4" size={56} />
                <h4 className="text-xl font-black text-emerald-900">¡PROCESO FINALIZADO!</h4>
                <p className="text-sm text-emerald-700 mt-2 mb-6">Todos los ítems han sido conciliados.</p>
                <button onClick={() => { setConteoModal(false); cargarDatos(); }} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold">CERRAR PANEL</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalles / Resultados */}
      {detalleModal && auditoriaActual && (
        <div className="fixed inset-0 bg-[#11284e]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl p-8 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-[#11284e]">Resultados de Auditoría</h3>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-bold"><MapPin size={14} /> {auditoriaActual.almacenes?.nombre}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-bold"><Calendar size={14} /> {auditoriaActual.fecha}</div>
                </div>
              </div>
              <button onClick={() => setDetalleModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <table className="w-full">
                <thead className="sticky top-0 bg-white"><tr className="text-[10px] text-gray-400 uppercase tracking-widest font-black border-b border-gray-100"><th className="pb-4 text-left px-2">Producto / Lote</th><th className="pb-4 text-center">Sistema</th><th className="pb-4 text-center">Físico</th><th className="pb-4 text-right">Diferencia</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {auditoriaActual.diferencias?.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-2">
                        <div className="font-bold text-[#11284e] text-sm">{d.productos?.nombre_comercial}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{d.inventario_lotes?.lote}</div>
                      </td>
                      <td className="py-4 text-center text-sm font-medium text-gray-500">{d.stock_sistema}</td>
                      <td className="py-4 text-center text-sm font-bold text-[#11284e]">{d.stock_fisico}</td>
                      <td className="py-4 text-right px-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${d.diferencia !== 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia === 0 ? '✓ OK' : d.diferencia}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex gap-4">
              <button onClick={() => setDetalleModal(false)} className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-bold transition-all">CERRAR VENTANA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}