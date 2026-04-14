// src/pages/finanzas/components/TabKPIs.jsx
import { Target, Info, CheckCircle2, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { KPI_DEMO } from '../data/demoData';

function BarraProgreso({ label, valor, meta, unidad, inverso }) {
  const cumplimiento = meta > 0 ? Math.min(Math.round((valor / meta) * 100), 150) : 0;
  const ok = inverso ? valor <= meta : valor >= meta;
  
  // Color dinámico según cumplimiento
  const getStatusColor = () => {
    if (ok) return 'bg-emerald-500';
    if (cumplimiento > 80) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  return (
    <div className="group space-y-2 p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Indicador</span>
          <h4 className="font-bold text-slate-700 text-sm leading-tight">{label}</h4>
        </div>
        <div className="text-right">
          <p className={`text-sm font-black ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
            {valor}{unidad} <span className="text-slate-300 font-medium mx-1">/</span> <span className="text-slate-400">Meta {meta}{unidad}</span>
          </p>
        </div>
      </div>
      
      <div className="relative">
        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${getStatusColor()}`}
            style={{ width: `${Math.min(cumplimiento, 100)}%` }}
          />
        </div>
        {cumplimiento > 100 && (
          <div className="absolute -right-2 -top-1 bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded-full font-black border border-emerald-200">
            ¡SUPERADO!
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Progreso</span>
        <span className={`text-xs font-black ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
          {cumplimiento}% {ok ? '✓' : '⚠'}
        </span>
      </div>
    </div>
  );
}

export default function TabKPIs() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* Nota Informativa Estilo Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg shadow-slate-200">
        <div className="bg-blue-500/20 p-3 rounded-xl">
          <Target size={24} className="text-blue-400"/>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest">Panel de Metas Institucionales</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Datos vinculados al documento <span className="text-blue-400 font-bold underline cursor-pointer">KPI ÁREAS</span> de Supervisión General. 
            Las variaciones fuera del 15% requieren sustento técnico.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Seguimiento Mensual */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500"/> Rendimiento Financiero
            </h3>
            <span className="text-[10px] font-black text-slate-400 px-2 py-1 bg-white border rounded-lg">ACTUALIZADO: HOY</span>
          </div>
          <div className="p-2 space-y-1">
            {KPI_DEMO.map(kpi => (
              <BarraProgreso 
                key={kpi.nombre} 
                label={kpi.nombre} 
                valor={kpi.resultado}
                meta={kpi.meta} 
                unidad={kpi.unidad} 
                inverso={kpi.inverso}
              />
            ))}
          </div>
        </div>

        {/* Checklist de Supervisión con Estilo "Audit" */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600"/> Protocolos de Supervisión
            </h3>
          </div>
          <div className="p-6 flex-1 space-y-3">
            {[
              'Elaboración y aprobación del presupuesto anual',
              'Seguimiento al cumplimiento presupuestal',
              'Control documental de ingresos y egresos',
              'Cumplimiento de plazos en pagos a terceros',
              'Control de cuentas por cobrar y morosidad',
              'Presentación mensual de estados financieros',
              'Declaración y pago de obligaciones tributarias',
              'Auditoría interna de prevención de fraudes',
            ].map((item, i) => (
              <label 
                key={i} 
                className="flex items-center gap-4 p-3 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    className="peer w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500/20 transition-all appearance-none border-2 checked:bg-blue-600 checked:border-blue-600"
                  />
                  <CheckCircle2 size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"/>
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                  {item}
                </span>
              </label>
            ))}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase justify-center">
               <Info size={12}/> 8 Protocolos obligatorios por ciclo
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}