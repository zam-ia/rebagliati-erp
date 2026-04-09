// src/pages/Reportes.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { 
  Download, FileText, TrendingUp, DollarSign, Users, 
  Package, Calendar, Filter, RefreshCw, ChevronDown, CheckCircle 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#11284e', '#185FA5', '#3b82f6', '#60a5fa', '#93c5fd'];

export default function Reportes() {
  const [reporte, setReporte] = useState('ventas');
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarReporte = async () => {
    setLoading(true);
    try {
      if (reporte === 'ventas') {
        const { data } = await supabase
          .from('pagos')
          .select('created_at, monto')
          .gte('created_at', fechaInicio)
          .lte('created_at', fechaFin);
        
        const agrupado = {};
        data?.forEach(p => {
          const dia = p.created_at.split('T')[0];
          if (!agrupado[dia]) agrupado[dia] = 0;
          agrupado[dia] += p.monto;
        });
        setDatos(Object.entries(agrupado).map(([fecha, total]) => ({ fecha, total })));
      } else if (reporte === 'programas') {
        const { data } = await supabase
          .from('inscripciones')
          .select('tipo, monto_total')
          .gte('created_at', fechaInicio)
          .lte('created_at', fechaFin);
        
        const agrupado = {};
        data?.forEach(i => {
          const tipo = i.tipo || 'otro';
          agrupado[tipo] = (agrupado[tipo] || 0) + i.monto_total;
        });
        setDatos(Object.entries(agrupado).map(([name, value]) => ({ name, value })));
      } else if (reporte === 'cobranza') {
        const { data: pagos } = await supabase.from('pagos').select('monto').gte('created_at', fechaInicio).lte('created_at', fechaFin);
        const total = pagos?.reduce((s, p) => s + p.monto, 0) || 0;
        setDatos([{ concepto: 'Total cobrado', monto: total }]);
      }
    } catch (error) {
      console.error("Error cargando reporte:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarReporte(); }, [reporte, fechaInicio, fechaFin]);

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(17, 40, 78);
    doc.text(`Reporte de ${reporte.toUpperCase()}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 14, 28);
    doc.text(`Generado por: Sistema de Gestión ERP`, 14, 33);
    
    autoTable(doc, { 
      startY: 40,
      head: [['Concepto/Fecha', 'Monto (S/)']],
      body: datos.map(d => [d.fecha || d.name || d.concepto, `S/ ${(d.total || d.value || d.monto || 0).toLocaleString()}`]),
      headStyles: { fillColor: [24, 95, 165] },
      theme: 'striped'
    });
    
    doc.save(`reporte_${reporte}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#11284e] tracking-tight">Reportes Ejecutivos</h1>
          <p className="text-gray-500 text-sm font-medium">Visualización de datos y métricas de rendimiento</p>
        </div>
        <button 
          onClick={exportarPDF} 
          className="bg-[#11284e] hover:bg-[#185FA5] text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-900/10 font-bold"
        >
          <Download size={20} /> Exportar Datos (PDF)
        </button>
      </div>

      {/* Selectores */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 mb-8 flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            <Filter size={12}/> Tipo de Reporte
          </label>
          <div className="relative">
            <select 
              value={reporte} 
              onChange={e => setReporte(e.target.value)} 
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-[#11284e] appearance-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="ventas">📈 Ventas Cronológicas</option>
              <option value="programas">🎯 Distribución por Programa</option>
              <option value="cobranza">💰 Resumen de Cobranza</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-44">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Desde</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={e => setFechaInicio(e.target.value)} 
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-[#11284e] focus:ring-2 focus:ring-blue-100" 
            />
          </div>
          <div className="w-44">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Hasta</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={e => setFechaFin(e.target.value)} 
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-[#11284e] focus:ring-2 focus:ring-blue-100" 
            />
          </div>
          <button 
            onClick={cargarReporte} 
            className="p-3.5 bg-blue-50 text-[#185FA5] rounded-xl hover:bg-blue-100 transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-[2.5rem]" />)}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {reporte === 'ventas' && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-xl font-black text-[#11284e]">Curva de Ingresos Diarios</h3>
                  <p className="text-sm text-gray-400 font-medium">Tendencia de facturación en el período</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl text-[#185FA5]"><TrendingUp size={24}/></div>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datos}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#185FA5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#185FA5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} />
                    <Tooltip formatter={v => [`S/ ${v}`, 'Venta Total']} />
                    <Area type="monotone" dataKey="total" stroke="#185FA5" strokeWidth={4} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {reporte === 'programas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-[#11284e] mb-2">Composición de Ventas</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={datos} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                        {datos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm overflow-hidden">
                <h3 className="text-xl font-black text-[#11284e] mb-6">Detalle por Categoría</h3>
                <div className="space-y-4">
                  {datos.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                        <span className="text-sm font-black text-[#11284e] uppercase tracking-tight">{d.name}</span>
                      </div>
                      <span className="font-mono font-bold text-[#185FA5]">S/ {d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reporte === 'cobranza' && (
            <div className="flex flex-col items-center justify-center bg-white rounded-[3rem] p-16 border border-gray-100 shadow-sm relative overflow-hidden text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
                <DollarSign size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-[#11284e] mb-2">Liquidez Total Recaudada</h3>
              <p className="text-gray-400 font-medium mb-8 max-w-sm">Monto total de pagos confirmados en el rango de fechas.</p>
              <div className="text-7xl font-black text-[#11284e] tracking-tighter mb-4">
                <span className="text-3xl text-emerald-500 mr-2 font-bold uppercase">S/</span>
                {datos[0]?.monto?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest">
                <CheckCircle size={14} /> Fondo Disponible
              </div>
            </div>
          )}

          <table id="tabla-reporte" className="hidden">
            <tbody>
              <tr><td>{JSON.stringify(datos)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}