// src/pages/Reclamaciones.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Search, Eye, Edit2, Trash2, CheckCircle, Clock, 
  AlertCircle, FileText, User, ChevronRight, BookOpen, 
  AlertTriangle, ShieldCheck, X, Loader2
} from 'lucide-react';

export default function Reclamaciones() {
  const [reclamos, setReclamos] = useState([]);
  const [vista, setVista] = useState('interno'); // 'interno', 'queja', 'formal'
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    tipo: 'interno_azul',
    descripcion: '',
    cliente_nombre: '',
    numero_correlativo: '',
    estado: 'abierto',
    fecha: new Date().toISOString().split('T')[0],
    solucion: '',
    responsable: ''
  });

  const cargarDatos = async () => {
    setLoading(true);
    const { data } = await supabase.from('reclamos').select('*').order('created_at', { ascending: false });
    setReclamos(data || []);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const generarCorrelativo = async () => {
    const { count } = await supabase.from('reclamos').select('*', { count: 'exact', head: true }).eq('tipo', 'formal');
    const anio = new Date().getFullYear();
    return `LIBRO-${anio}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const guardarReclamo = async () => {
    if (!form.descripcion) return alert('La descripción es obligatoria');
    if (form.tipo === 'formal' && !form.cliente_nombre) return alert('Para el libro de reclamaciones, el nombre del cliente es obligatorio');
    
    const datosEnvio = { ...form };
    if (!editando && form.tipo === 'formal' && !datosEnvio.numero_correlativo) {
      datosEnvio.numero_correlativo = await generarCorrelativo();
    }
    delete datosEnvio.id;
    setLoading(true);
    let error;
    if (editando) {
      const res = await supabase.from('reclamos').update(datosEnvio).eq('id', editando);
      error = res.error;
    } else {
      const res = await supabase.from('reclamos').insert([datosEnvio]);
      error = res.error;
    }
    if (error) alert('Error: ' + error.message);
    else {
      setModal(false);
      cargarDatos();
    }
    setLoading(false);
  };

  const eliminarReclamo = async (id) => {
    if (confirm('¿Desea eliminar este registro permanentemente?')) {
      const { error } = await supabase.from('reclamos').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargarDatos();
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('reclamos').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) cargarDatos();
  };

  const reclamosFiltrados = reclamos.filter(r => {
    if (vista === 'interno') return r.tipo === 'interno_azul';
    if (vista === 'queja') return r.tipo === 'queja_rojo';
    if (vista === 'formal') return r.tipo === 'formal';
    return true;
  }).filter(r =>
    r.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.numero_correlativo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getStatusConfig = (estado) => {
    switch(estado) {
      case 'abierto': return 'bg-rose-50 text-rose-700 border-rose-100 ring-rose-500';
      case 'en_proceso': return 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500';
      case 'resuelto': return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-emerald-500';
      case 'cerrado': return 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-400';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#11284e] tracking-tight flex items-center gap-3">
            Atención al Cliente
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-md font-bold uppercase tracking-widest">Post-Venta</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium italic">Gestión de calidad y resolución de incidencias</p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setForm({
              tipo: vista === 'interno' ? 'interno_azul' : vista === 'queja' ? 'queja_rojo' : 'formal',
              descripcion: '',
              cliente_nombre: '',
              numero_correlativo: '',
              estado: 'abierto',
              fecha: new Date().toISOString().split('T')[0],
              solucion: '',
              responsable: ''
            });
            setModal(true);
          }}
          className="bg-[#185FA5] hover:bg-[#11284e] text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-bold"
        >
          <Plus size={20} /> Nuevo Registro
        </button>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit mb-8 border border-gray-100">
        {[
          { id: 'interno', label: 'Interno (Azul)', icon: <BookOpen size={16}/>, color: 'text-blue-600' },
          { id: 'queja', label: 'Quejas (Rojo)', icon: <AlertTriangle size={16}/>, color: 'text-rose-600' },
          { id: 'formal', label: 'Libro Reclamaciones', icon: <ShieldCheck size={16}/>, color: 'text-emerald-600' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setVista(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
              vista === tab.id 
              ? 'bg-white text-[#11284e] shadow-sm ring-1 ring-black/5' 
              : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className={vista === tab.id ? tab.color : ''}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por descripción, cliente o correlativo..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#185FA5]" 
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referencia / Cliente</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalle del Suceso</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Gestión</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reclamosFiltrados.map(r => (
              <tr key={r.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    {r.tipo === 'formal' ? (
                      <span className="font-mono font-black text-[#185FA5] text-xs leading-none mb-1">
                        {r.numero_correlativo}
                      </span>
                    ) : null}
                    <span className="font-bold text-[#11284e] uppercase text-[11px] tracking-tight">
                      {r.cliente_nombre || '— REGISTRO INTERNO —'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1 font-bold">
                      <Clock size={10}/> {r.fecha}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="max-w-md">
                    <p className="text-[#11284e] font-medium line-clamp-2 leading-relaxed">
                      {r.descripcion}
                    </p>
                    {r.solucion && (
                      <div className="mt-2 flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase">
                        <CheckCircle size={10}/> Solución: {r.solucion}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-tighter ${getStatusConfig(r.estado)}`}>
                      {r.estado.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">Atiende: {r.responsable || 'Sin asignar'}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditando(r.id); setForm(r); setModal(true); }} 
                      className="p-2.5 hover:bg-blue-50 text-blue-500 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => eliminarReclamo(r.id)} 
                      className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="w-[1px] h-8 bg-gray-100 mx-1 self-center" />
                    <select 
                      value={r.estado} 
                      onChange={e => cambiarEstado(r.id, e.target.value)} 
                      className="text-[10px] border-none bg-gray-50 font-bold rounded-lg px-2 focus:ring-1 focus:ring-blue-400 cursor-pointer"
                    >
                      <option value="abierto">Abierto</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="resuelto">Resuelto</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {reclamosFiltrados.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center opacity-20">
                    <FileText size={48} className="mb-2"/>
                    <p className="font-black uppercase tracking-widest text-sm text-gray-400">Sin registros en esta categoría</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Modernizado */}
      {modal && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
                  form.tipo === 'formal' ? 'bg-emerald-500' : form.tipo === 'queja_rojo' ? 'bg-rose-500' : 'bg-[#185FA5]'
                }`}>
                  <AlertCircle size={24}/>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#11284e]">
                    {editando ? 'Actualizar Registro' : 'Nuevo Registro'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {form.tipo.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="p-3 hover:bg-rose-50 text-rose-400 rounded-full transition-all"><X size={24}/></button>
            </div>

            <div className="p-8 space-y-6">
              {form.tipo === 'formal' && (
                <div className="relative">
                  <User className="absolute left-4 top-4 text-gray-300" size={18}/>
                  <input 
                    placeholder="Nombre Completo del Cliente *" 
                    value={form.cliente_nombre} 
                    onChange={e => setForm({...form, cliente_nombre: e.target.value})} 
                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-[#11284e] focus:ring-2 focus:ring-[#185FA5]" 
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Incidente</label>
                <textarea 
                  placeholder="Detalla lo sucedido con la mayor precisión posible..." 
                  value={form.descripcion} 
                  onChange={e => setForm({...form, descripcion: e.target.value})} 
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-[#185FA5]" 
                  rows="4" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsable</label>
                  <input 
                    placeholder="Personal a cargo" 
                    value={form.responsable} 
                    onChange={e => setForm({...form, responsable: e.target.value})} 
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-[#11284e]" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Evento</label>
                  <input 
                    type="date" 
                    value={form.fecha} 
                    onChange={e => setForm({...form, fecha: e.target.value})} 
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-[#11284e]" 
                  />
                </div>
              </div>

              {form.estado === 'resuelto' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Acción / Solución Aplicada</label>
                  <textarea 
                    placeholder="¿Cómo se resolvió este inconveniente?" 
                    value={form.solucion} 
                    onChange={e => setForm({...form, solucion: e.target.value})} 
                    className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 text-sm font-medium text-emerald-900 focus:ring-2 focus:ring-emerald-500" 
                    rows="2" 
                  />
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 flex gap-4">
              <button 
                onClick={guardarReclamo} 
                disabled={loading} 
                className="bg-[#185FA5] hover:bg-[#11284e] text-white px-8 py-4 rounded-2xl font-black text-sm flex-1 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20}/>}
                {editando ? 'ACTUALIZAR DATOS' : 'FINALIZAR REGISTRO'}
              </button>
              <button 
                onClick={() => setModal(false)} 
                className="px-8 py-4 bg-white border border-gray-200 text-gray-500 hover:text-gray-700 rounded-2xl font-black text-sm transition-all shadow-sm"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}