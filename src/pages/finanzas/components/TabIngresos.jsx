// src/pages/finanzas/components/TabIngresos.jsx
import { useState, useEffect } from 'react';
import { Search, PlusCircle, X, CheckCircle, Download, Tag, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fmt, ESTADO_BADGE } from '../data/demoData';

export default function TabIngresos() {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busq, setBusq] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    area: '',
    metodo: '',
    monto: '',
    referencia: ''
  });

  useEffect(() => {
    cargarIngresos();
    const subscription = supabase
      .channel('ingresos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos' }, () => cargarIngresos())
      .subscribe();
    return () => subscription.unsubscribe();
  }, []);

  const cargarIngresos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingresos')
      .select('*')
      .order('fecha', { ascending: false });
    if (!error && data) setIngresos(data);
    setLoading(false);
  };

  const handleCobrar = async (ingreso) => {
    if (ingreso.estado === 'Cobrado') return;
    const { error } = await supabase
      .from('ingresos')
      .update({ estado: 'Cobrado', updated_at: new Date() })
      .eq('id', ingreso.id);
    if (!error) cargarIngresos();
  };

  const registrarIngresoManual = async (e) => {
    e.preventDefault();
    if (!formData.concepto || !formData.monto) {
      alert('Completa concepto y monto');
      return;
    }
    const { error } = await supabase.from('ingresos').insert({
      fecha: formData.fecha,
      concepto: formData.concepto,
      area: formData.area || 'Finanzas',
      metodo: formData.metodo || 'Transferencia',
      monto: parseFloat(formData.monto),
      estado: 'Pendiente',
      referencia: formData.referencia || null,
      origen: 'finanzas_manual',
    });
    if (error) alert('Error: ' + error.message);
    else {
      setShowForm(false);
      setFormData({ fecha: new Date().toISOString().split('T')[0], concepto: '', area: '', metodo: '', monto: '', referencia: '' });
      cargarIngresos();
    }
  };

  const filtrados = ingresos.filter(i =>
    !busq || i.concepto.toLowerCase().includes(busq.toLowerCase())
  );
  const total = filtrados.reduce((a, i) => a + i.monto, 0);

  if (loading) return <div className="p-10 text-center">Cargando ingresos...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm" placeholder="Buscar ingreso..." value={busq} onChange={e => setBusq(e.target.value)} />
        </div>
        <button onClick={() => setShowForm(true)} className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2">
          <PlusCircle size={16}/> REGISTRAR INGRESO
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Control de Ingresos</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{filtrados.length} Operaciones</p>
          </div>
          <button className="text-xs font-black text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl"><Download size={14}/> EXPORTAR</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4 text-left">Detalle</th>
                <th className="px-6 py-4 text-center">Área / Método</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map(i => (
                <tr key={i.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-400 font-mono mb-1">{i.fecha}</p>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{i.concepto}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{i.area}</span><br/>
                    <span className="text-[9px] text-slate-400">{i.metodo}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 font-mono">{fmt(i.monto)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${ESTADO_BADGE[i.estado] || 'bg-slate-100'}`}>{i.estado}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {i.estado === 'Pendiente' && (
                      <button onClick={() => handleCobrar(i)} className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black">Cobrar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Total acumulado</span>
          <span className="text-2xl font-black">{fmt(total)}</span>
        </div>
      </div>

      {/* Modal similar al de egresos pero para ingresos */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6">
            <div className="flex justify-between mb-4"><h3 className="text-xl font-black">Registrar Ingreso</h3><button onClick={()=>setShowForm(false)}><X size={20}/></button></div>
            <form onSubmit={registrarIngresoManual} className="grid grid-cols-2 gap-4">
              <input type="date" value={formData.fecha} onChange={e=>setFormData({...formData, fecha:e.target.value})} className="border p-2 rounded" required />
              <input type="number" step="0.01" placeholder="Monto S/" value={formData.monto} onChange={e=>setFormData({...formData, monto:e.target.value})} className="border p-2 rounded" required />
              <input type="text" placeholder="Concepto" value={formData.concepto} onChange={e=>setFormData({...formData, concepto:e.target.value})} className="border p-2 rounded col-span-2" required />
              <input type="text" placeholder="Área" value={formData.area} onChange={e=>setFormData({...formData, area:e.target.value})} className="border p-2 rounded" />
              <input type="text" placeholder="Método (Efectivo/Transferencia/Yape)" value={formData.metodo} onChange={e=>setFormData({...formData, metodo:e.target.value})} className="border p-2 rounded" />
              <input type="text" placeholder="Referencia" value={formData.referencia} onChange={e=>setFormData({...formData, referencia:e.target.value})} className="border p-2 rounded col-span-2" />
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#11284e] text-white rounded-xl text-sm font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}