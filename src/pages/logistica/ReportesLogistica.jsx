// src/pages/logistica/ReportesLogistica.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Download, FileText, Package, TrendingUp, 
  AlertCircle, Calendar, RefreshCw, BarChart3, 
  Box, Clock, ShieldAlert 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportesLogistica() {
  const [reporte, setReporte] = useState('productos');
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarReporte = async () => {
    setLoading(true);
    let query;
    switch(reporte) {
      case 'productos':
        const { data: prod } = await supabase.from('productos').select('sku, nombre_comercial, tipo, stock_minimo, activo').order('nombre_comercial');
        setDatos(prod || []);
        break;
      case 'movimientos':
        const { data: mov } = await supabase.from('movimientos_inventario').select('*, productos(nombre_comercial, sku)').gte('created_at', fechaInicio).lte('created_at', fechaFin).order('created_at', { ascending: false });
        setDatos(mov || []);
        break;
      case 'vencimientos':
        const hoy = new Date().toISOString().split('T')[0];
        const dentro30 = new Date(); dentro30.setDate(dentro30.getDate() + 30);
        const { data: lotes } = await supabase.from('inventario_lotes').select('*, productos(nombre_comercial, sku)').lte('fecha_vencimiento', dentro30.toISOString().split('T')[0]).gt('fecha_vencimiento', hoy).gt('stock_actual', 0);
        setDatos(lotes || []);
        break;
      case 'stock':
        const { data: stock } = await supabase.from('inventario_lotes').select('*, productos(nombre_comercial, sku), almacenes(nombre)').gt('stock_actual', 0);
        setDatos(stock || []);
        break;
    }
    setLoading(false);
  };

  useEffect(() => { cargarReporte(); }, [reporte]);

  const exportarPDF = () => {
    const doc = new jsPDF();
    const titulo = reporte.charAt(0).toUpperCase() + reporte.slice(1);
    
    doc.setFontSize(18);
    doc.setTextColor(17, 40, 78); // #11284e
    doc.text(`Reporte de ${titulo}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, { 
      html: '#tabla-reporte', 
      startY: 35,
      headStyles: { fillStyle: 'solid', fillColor: [24, 95, 165], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 35 }
    });
    
    doc.save(`ERP_Reporte_${reporte}_${new Date().getTime()}.pdf`);
  };

  const menuReportes = [
    { id: 'productos', label: 'Catálogo', icon: <Package size={20}/>, color: 'text-blue-500' },
    { id: 'stock', label: 'Stock Actual', icon: <Box size={20}/>, color: 'text-emerald-500' },
    { id: 'movimientos', label: 'Movimientos', icon: <RefreshCw size={20}/>, color: 'text-purple-500' },
    { id: 'vencimientos', label: 'Alertas Venc.', icon: <ShieldAlert size={20}/>, color: 'text-red-500' },
  ];

  const getColumnas = () => {
    switch(reporte) {
      case 'productos': return ['SKU', 'Producto', 'Tipo', 'Mínimo', 'Estado'];
      case 'movimientos': return ['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Motivo'];
      case 'vencimientos': return ['Producto', 'Lote', 'Vencimiento', 'Stock', 'Costo'];
      case 'stock': return ['Producto', 'Almacén', 'Lote', 'Stock', 'Vencimiento'];
      default: return [];
    }
  };

  return (
    <div className="p-8 bg-[#fbfcfd] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#11284e] tracking-tight">Reportes Logísticos</h1>
          <p className="text-gray-500 text-sm mt-1">Inteligencia de inventario y exportación oficial</p>
        </div>
        <button 
          onClick={exportarPDF} 
          className="bg-[#11284e] hover:bg-black text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-900/10 font-bold text-sm"
        >
          <Download size={18} /> Exportar PDF
        </button>
      </div>

      {/* Tabs / Selector de Reporte */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {menuReportes.map((item) => (
          <button
            key={item.id}
            onClick={() => setReporte(item.id)}
            className={`p-6 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-3 group
              ${reporte === item.id 
                ? 'bg-white border-[#185FA5] shadow-xl shadow-blue-900/5 ring-4 ring-blue-50' 
                : 'bg-white border-transparent hover:border-gray-200 shadow-sm'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${reporte === item.id ? 'bg-[#185FA5] text-white' : 'bg-gray-100 text-gray-400'}`}>
              {item.icon}
            </div>
            <span className={`font-bold text-sm ${reporte === item.id ? 'text-[#11284e]' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Filtros de Fecha (Solo para movimientos) */}
      {reporte === 'movimientos' && (
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex gap-6 items-end mb-8 animate-in fade-in slide-in-from-top-2">
          <div className="flex-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rango Desde</label>
            <div className="relative mt-1">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-[#11284e]" />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rango Hasta</label>
            <div className="relative mt-1">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-[#11284e]" />
            </div>
          </div>
          <button onClick={cargarReporte} className="bg-[#185FA5] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#11284e] transition-colors">
            Filtrar
          </button>
        </div>
      )}

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={40} className="animate-spin text-blue-200" />
            <p className="text-gray-400 font-bold text-sm animate-pulse">Procesando datos...</p>
          </div>
        ) : (
          <table id="tabla-reporte" className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                {getColumnas().map(col => (
                  <th key={col} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Renderizado dinámico según el tipo de reporte */}
              {reporte === 'productos' && datos.map(p => (
                <tr key={p.sku} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[#185FA5]">{p.sku}</td>
                  <td className="px-6 py-4 font-bold text-[#11284e]">{p.nombre_comercial}</td>
                  <td className="px-6 py-4 text-gray-500">{p.tipo}</td>
                  <td className="px-6 py-4 font-bold text-gray-600">{p.stock_minimo}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${p.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      {p.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                </tr>
              ))}

              {reporte === 'movimientos' && datos.map(m => (
                <tr key={m.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4 text-gray-500">{new Date(m.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${m.tipo === 'Entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {m.tipo.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#11284e]">{m.productos?.nombre_comercial}</td>
                  <td className="px-6 py-4 font-black">{m.cantidad}</td>
                  <td className="px-6 py-4 text-gray-400 italic text-xs">{m.motivo || '—'}</td>
                </tr>
              ))}

              {reporte === 'stock' && datos.map(l => (
                <tr key={l.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#11284e]">{l.productos?.nombre_comercial}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{l.almacenes?.nombre}</td>
                  <td className="px-6 py-4 font-mono text-gray-400">{l.lote}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`font-black text-lg ${l.stock_actual <= (l.productos?.stock_minimo || 5) ? 'text-red-500 animate-pulse' : 'text-[#185FA5]'}`}>
                        {l.stock_actual}
                      </span>
                      {l.stock_actual <= (l.productos?.stock_minimo || 5) && <span className="text-[9px] text-red-400 font-bold tracking-tighter">STOCK CRÍTICO</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{l.fecha_vencimiento || '—'}</td>
                </tr>
              ))}

              {reporte === 'vencimientos' && datos.map(l => (
                <tr key={l.id} className="bg-red-50/30 hover:bg-red-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-red-900">{l.productos?.nombre_comercial}</td>
                  <td className="px-6 py-4 font-mono text-red-400">{l.lote}</td>
                  <td className="px-6 py-4 font-black text-red-600 uppercase text-xs">{l.fecha_vencimiento}</td>
                  <td className="px-6 py-4 font-bold text-red-700">{l.stock_actual}</td>
                  <td className="px-6 py-4 font-bold text-[#11284e]">S/ {l.costo_unitario?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && datos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <AlertCircle size={48} strokeWidth={1} />
            <p className="mt-4 font-bold">No se encontraron registros para este reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}