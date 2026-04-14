// src/pages/finanzas/components/TabEgresos.jsx
import { useState, useEffect } from 'react';
import { PlusCircle, Search, X, CheckCircle, Download, Tag, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { fmt, ESTADO_BADGE } from '../data/demoData';

export default function TabEgresos() {
  const [egresos, setEgresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busq, setBusq] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    area: '',
    categoria: '',
    proveedor: '',
    monto: ''
  });

  useEffect(() => {
    cargarEgresos();

    // Suscripción en tiempo real
    const subscription = supabase
      .channel('egresos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'egresos' }, () => cargarEgresos())
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const cargarEgresos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('egresos')
      .select('*')
      .order('fecha', { ascending: false });
    if (!error && data) setEgresos(data);
    setLoading(false);
  };

  const handlePagar = async (egreso) => {
    if (egreso.estado === 'Pagado') return;
    
    const { error } = await supabase
      .from('egresos')
      .update({ estado: 'Pagado', updated_at: new Date() })
      .eq('id', egreso.id);
    
    if (error) {
      alert('Error al pagar: ' + error.message);
    } else {
      // Opcional: registrar movimiento en Caja (ya lo haremos desde otro lado)
      cargarEgresos();
    }
  };

  const registrarEgresoManual = async (e) => {
    e.preventDefault();
    if (!formData.concepto || !formData.monto) {
      alert('Completa concepto y monto');
      return;
    }
    
    const { error } = await supabase.from('egresos').insert({
      fecha: formData.fecha,
      concepto: formData.concepto,
      area: formData.area || 'Finanzas',
      categoria: formData.categoria || 'Varios',
      proveedor: formData.proveedor || 'No especificado',
      monto: parseFloat(formData.monto),
      estado: 'Pendiente',
      origen: 'finanzas_manual',
    });
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setShowForm(false);
      setFormData({ fecha: new Date().toISOString().split('T')[0], concepto: '', area: '', categoria: '', proveedor: '', monto: '' });
      cargarEgresos();
    }
  };

  const filtrados = egresos.filter(e =>
    !busq || e.concepto.toLowerCase().includes(busq.toLowerCase()) || e.proveedor?.toLowerCase().includes(busq.toLowerCase())
  );
  const total = filtrados.reduce((a, e) => a + e.monto, 0);
  const categorias = [...new Set(egresos.map(e => e.categoria))];
  const totalGeneral = egresos.reduce((a, e) => a + e.monto, 0);

  if (loading) return <div className="p-10 text-center">Cargando egresos...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Barra Superior con Buscador */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all"
            placeholder="Buscar por concepto o proveedor..." 
            value={busq} 
            onChange={e => setBusq(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
        >
          <PlusCircle size={16}/> REGISTRAR EGRESO
        </button>
      </div>

      {/* Resumen por Categoría */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categorias.map(cat => {
          const subtotal = egresos.filter(e => e.categoria === cat).reduce((a, e) => a + e.monto, 0);
          return (
            <div key={cat} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-rose-200 transition-colors group cursor-default">
              <div className="flex justify-between items-start mb-2">
                <Tag size={12} className="text-slate-300 group-hover:text-rose-400 transition-colors"/>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-slate-600">{Math.round((subtotal/totalGeneral)*100)}%</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase truncate leading-none mb-1">{cat}</p>
              <p className="text-sm font-black text-slate-800">{fmt(subtotal)}</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${(subtotal/totalGeneral)*100}%` }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de Egresos */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest leading-none">Control de Gastos</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Período Actual · {filtrados.length} Operaciones</p>
          </div>
          <button className="text-xs font-black text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
            <Download size={14}/> EXPORTAR REPORTE
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4 text-left font-black">Detalle del Gasto</th>
                <th className="px-6 py-4 text-center font-black">Área / Categoría</th>
                <th className="px-6 py-4 text-left font-black">Proveedor</th>
                <th className="px-6 py-4 text-right font-black">Monto Bruto</th>
                <th className="px-6 py-4 text-center font-black">Estado</th>
                <th className="px-6 py-4 text-center font-black">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map(e => (
                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-400 font-mono mb-1">{e.fecha}</p>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{e.concepto}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{e.area}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-tight">
                        {e.categoria}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 size={14} className="text-slate-300"/>
                      <span className="text-xs font-medium">{e.proveedor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 font-mono">
                    {fmt(e.monto)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm ${ESTADO_BADGE[e.estado] || 'bg-slate-100 text-slate-500'}`}>
                        {e.estado}
                      </span>
                      <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors"/>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {e.estado === 'Pendiente' && (
                      <button 
                        onClick={() => handlePagar(e)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-md transition-all"
                      >
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Total acumulado en vista</span>
          <div className="text-right">
            <span className="text-2xl font-black">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Modal de Registro Manual */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-none">Registrar Egreso</h3>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest">Salida de Capital</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} className="text-slate-400"/>
              </button>
            </div>
            
            <form onSubmit={registrarEgresoManual}>
              <div className="p-8 bg-slate-50/30">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha del Gasto</label>
                    <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Monto a Pagar (S/)</label>
                    <input type="number" step="0.01" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} required className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Concepto / Descripción</label>
                    <input type="text" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} required placeholder="Ej. Pago de publicidad..." className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Área Responsable</label>
                    <input type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} placeholder="Ej. Marketing" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría de Gasto</label>
                    <input type="text" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} placeholder="Ej. Operativo" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Proveedor / Beneficiario</label>
                    <input type="text" value={formData.proveedor} onChange={e => setFormData({...formData, proveedor: e.target.value})} placeholder="Nombre de la empresa o persona" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm" />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-10">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors">
                    CANCELAR
                  </button>
                  <button type="submit" className="flex-[2] py-4 bg-rose-600 text-white text-sm font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-200 flex items-center justify-center gap-2 transition-all active:scale-95">
                    <CheckCircle size={18}/> GUARDAR EGRESO
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}