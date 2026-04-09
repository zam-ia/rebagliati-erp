import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Building2, 
  Phone, 
  Mail, 
  Star, 
  User, 
  MapPin, 
  PackageCheck, 
  ShieldCheck,
  X
} from 'lucide-react';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    razon_social: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
    contacto: '',
    rubro: '',
    lead_time_promedio: 0,
    score_cumplimiento: 0,
    certificaciones: '',
    activo: true
  });

  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase.from('proveedores').select('*').order('razon_social');
    setProveedores(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.razon_social) return alert('Razón social es obligatoria');
    const datos = { ...form };
    delete datos.id;
    setLoading(true);
    let error;
    if (editando) {
      const res = await supabase.from('proveedores').update(datos).eq('id', editando);
      error = res.error;
    } else {
      const res = await supabase.from('proveedores').insert([datos]);
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
    if (confirm('¿Eliminar proveedor?')) {
      const { error } = await supabase.from('proveedores').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargar();
    }
  };

  const proveedoresFiltrados = proveedores.filter(p =>
    p.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.ruc?.includes(busqueda) ||
    p.rubro?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#11284e] tracking-tight">Proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión estratégica y evaluación de socios comerciales</p>
        </div>
        <button 
          onClick={() => { 
            setEditando(null); 
            setForm({ razon_social: '', ruc: '', direccion: '', telefono: '', email: '', contacto: '', rubro: '', lead_time_promedio: 0, score_cumplimiento: 0, certificaciones: '', activo: true }); 
            setModal(true); 
          }} 
          className="bg-[#185FA5] hover:bg-[#11284e] text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-semibold"
        >
          <Plus size={20} /> Nuevo Proveedor
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div className="erp-card mb-8 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUC o rubro..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#185FA5] transition-all"
          />
        </div>
      </div>

      {/* Grid de Proveedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proveedoresFiltrados.map(p => (
          <div key={p.id} className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#185FA5] group-hover:bg-[#185FA5] group-hover:text-white transition-colors">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[#11284e] text-lg leading-tight">{p.razon_social}</h3>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">RUC: {p.ruc || '—'}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditando(p.id); setForm(p); setModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => eliminar(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="inline-block px-3 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium mb-4">
              {p.rubro || 'Sin rubro especificado'}
            </div>

            <div className="space-y-2 mb-6">
              {p.telefono && <div className="flex items-center gap-3 text-gray-500 text-sm"><Phone size={14} className="text-gray-300"/> {p.telefono}</div>}
              {p.email && <div className="flex items-center gap-3 text-gray-500 text-sm"><Mail size={14} className="text-gray-300"/> {p.email}</div>}
              {p.contacto && <div className="flex items-center gap-3 text-gray-500 text-sm"><User size={14} className="text-gray-300"/> {p.contacto}</div>}
            </div>

            <div className="bg-[#fbfcfd] rounded-2xl p-4 flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Cumplimiento</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={14} className={p.score_cumplimiento >= 80 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                  <span className={`text-sm font-bold ${p.score_cumplimiento >= 80 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {p.score_cumplimiento}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Lead Time</p>
                <p className="text-sm font-bold text-[#11284e] mt-1">{p.lead_time_promedio} días</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                {p.activo ? '● Operativo' : '○ Inactivo'}
              </span>
              {p.certificaciones && <ShieldCheck size={18} className="text-emerald-500" title="Cuenta con certificaciones" />}
            </div>
          </div>
        ))}
        {proveedoresFiltrados.length === 0 && (
          <div className="col-span-full bg-white rounded-[32px] py-20 text-center border-2 border-dashed border-gray-100">
             <Building2 size={48} className="mx-auto text-gray-200 mb-4" />
             <p className="text-gray-400 font-medium">No se encontraron proveedores</p>
          </div>
        )}
      </div>

      {/* Modal - Estilo Rediseñado */}
      {modal && (
        <div className="fixed inset-0 bg-[#11284e]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-[#11284e] flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl text-[#185FA5]"><Building2 size={20} /></div>
                {editando ? 'Editar Proveedor' : 'Registro de Proveedor'}
              </h3>
              <button onClick={() => setModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 bg-[#fbfcfd]">
              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="erp-label mb-1 ml-1">Razón Social *</label>
                  <input 
                    placeholder="Ej. Corporación Logística S.A.C." 
                    value={form.razon_social} 
                    onChange={e => setForm({...form, razon_social: e.target.value})} 
                    className="erp-input w-full" 
                  />
                </div>
                <div>
                  <label className="erp-label mb-1 ml-1">RUC</label>
                  <input 
                    placeholder="11 dígitos" 
                    value={form.ruc} 
                    onChange={e => setForm({...form, ruc: e.target.value})} 
                    className="erp-input w-full" 
                  />
                </div>
                <div>
                  <label className="erp-label mb-1 ml-1">Rubro / Giro</label>
                  <input 
                    placeholder="Ej. Suministros, Transporte" 
                    value={form.rubro} 
                    onChange={e => setForm({...form, rubro: e.target.value})} 
                    className="erp-input w-full" 
                  />
                </div>
              </div>

              {/* Contacto */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-[#185FA5] uppercase tracking-widest flex items-center gap-2">
                   <Phone size={14} /> Información de Contacto
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Nombre de contacto" value={form.contacto} onChange={e => setForm({...form, contacto: e.target.value})} className="erp-input w-full bg-gray-50/50" />
                  <input placeholder="Teléfono / WhatsApp" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="erp-input w-full bg-gray-50/50" />
                  <div className="col-span-full">
                    <input placeholder="Correo electrónico corporativo" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="erp-input w-full bg-gray-50/50" />
                  </div>
                  <div className="col-span-full flex items-center gap-2 px-1">
                    <MapPin size={16} className="text-gray-400" />
                    <input placeholder="Dirección fiscal / almacén" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} className="erp-input w-full bg-gray-50/50" />
                  </div>
                </div>
              </div>

              {/* KPIs y Certificaciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="erp-label ml-1">Lead Time (Días)</label>
                  <div className="relative">
                    <PackageCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input type="number" value={form.lead_time_promedio} onChange={e => setForm({...form, lead_time_promedio: parseInt(e.target.value)})} className="erp-input w-full pl-10" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="erp-label ml-1">Score Cumplimiento (%)</label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input type="number" min="0" max="100" value={form.score_cumplimiento} onChange={e => setForm({...form, score_cumplimiento: parseInt(e.target.value)})} className="erp-input w-full pl-10" />
                  </div>
                </div>
                <div className="col-span-full">
                  <label className="erp-label ml-1">Certificaciones (ISO, Digemid, etc.)</label>
                  <textarea value={form.certificaciones} onChange={e => setForm({...form, certificaciones: e.target.value})} className="erp-input w-full h-20 pt-3" style={{ resize: 'none' }} />
                </div>
              </div>

              <div className="flex items-center gap-3 p-2">
                <input 
                  type="checkbox" 
                  id="activo"
                  checked={form.activo} 
                  onChange={e => setForm({...form, activo: e.target.checked})} 
                  className="w-5 h-5 rounded-lg text-[#185FA5] focus:ring-[#185FA5] border-gray-300 transition-all cursor-pointer"
                />
                <label htmlFor="activo" className="text-sm font-semibold text-gray-700 cursor-pointer">Proveedor habilitado para operaciones</label>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 bg-white sticky bottom-0">
              <button 
                onClick={guardar} 
                disabled={loading} 
                className="bg-[#185FA5] hover:bg-[#11284e] text-white px-8 py-3 rounded-2xl flex-1 font-bold transition-all shadow-lg shadow-blue-50"
              >
                {loading ? 'Procesando...' : editando ? 'Actualizar Proveedor' : 'Registrar Proveedor'}
              </button>
              <button 
                onClick={() => setModal(false)} 
                className="px-8 py-3 border border-gray-200 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
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