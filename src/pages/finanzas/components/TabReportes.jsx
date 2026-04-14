// src/pages/finanzas/components/TabReportes.jsx
import { FileText, AlertCircle, BarChart2, TrendingUp, Download } from 'lucide-react';
import { INGRESOS_DEMO, EGRESOS_DEMO, MES_ACTUAL, fmt, pct } from '../data/demoData';

export default function TabReportes() {
  const totalI = INGRESOS_DEMO.filter(i => i.estado === 'Cobrado').reduce((a, i) => a + i.monto, 0);
  const totalE = EGRESOS_DEMO.filter(e => e.estado === 'Pagado').reduce((a, e) => a + e.monto, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { titulo:'Estado de Resultados del Mes', icon:<FileText size={16}/> },
          { titulo:'Reporte de Cobranzas y Morosidad', icon:<AlertCircle size={16}/> },
          { titulo:'Ejecución Presupuestal por Área', icon:<BarChart2 size={16}/> },
          { titulo:'Flujo de Caja Acumulado 2026', icon:<TrendingUp size={16}/> },
        ].map(r => (
          <div key={r.titulo} className="bg-white rounded-2xl border shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#11284e]/10 rounded-xl text-[#11284e]">{r.icon}</div>
              <p className="font-bold text-slate-700 text-sm">{r.titulo}</p>
            </div>
            <button className="text-[11px] text-blue-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Download size={13}/> Exportar
            </button>
          </div>
        ))}
      </div>

      {/* Estado de Resultados simplificado */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 bg-[#11284e] text-white">
          <h3 className="font-black text-sm uppercase tracking-tighter">Estado de Resultados — {MES_ACTUAL}</h3>
          <p className="text-[11px] text-white/50 mt-0.5">Rebagliati Diplomados SAC</p>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="font-bold text-slate-700 text-sm">INGRESOS OPERACIONALES</span>
            <span className="font-black text-emerald-700 font-mono">{fmt(totalI)}</span>
          </div>
          {['Planilla y cargas sociales','Honorarios ponentes','Marketing y publicidad','Alquiler y servicios','Tecnología y plataformas','Materiales y logística'].map((c, i) => {
            const montos = [32600, 12800, 3200, 4500, 1800, 2100];
            return (
              <div key={c} className="flex justify-between py-1 text-sm">
                <span className="text-slate-500 text-xs">{c}</span>
                <span className="text-red-600 font-mono text-xs">({fmt(montos[i])})</span>
              </div>
            );
          })}
          <div className="flex justify-between py-2 border-t border-b">
            <span className="font-bold text-slate-700 text-sm">TOTAL EGRESOS</span>
            <span className="font-black text-red-700 font-mono">({fmt(totalE)})</span>
          </div>
          <div className="flex justify-between py-3 bg-slate-50 px-3 rounded-xl">
            <span className="font-black text-slate-800">RESULTADO OPERATIVO</span>
            <span className={`font-black text-lg font-mono ${totalI - totalE >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {fmt(totalI - totalE)}
            </span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span className="text-slate-500">Margen operativo</span>
            <span className="font-black text-slate-700">{pct(totalI - totalE, totalI)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}