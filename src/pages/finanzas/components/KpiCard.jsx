// src/pages/finanzas/components/KpiCard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KpiCard({ label, valor, sub, icon: Icon, color, delta }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{valor}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color.replace('border-','bg-').replace('-500','-100').replace('-600','-100')}`}>
          <Icon size={18} className={color.replace('border-','text-')} />
        </div>
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {delta >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
          {delta >= 0 ? '+' : ''}{delta}% vs mes anterior
        </div>
      )}
    </div>
  );
}