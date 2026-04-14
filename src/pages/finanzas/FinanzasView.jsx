// src/pages/finanzas/FinanzasView.jsx
import { useState } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, CreditCard, Target, BarChart2, FileText, Download } from 'lucide-react';
import TabDashboard from './components/TabDashboard';
import TabIngresos from './components/TabIngresos';
import TabEgresos from './components/TabEgresos';
import TabCobranzas from './components/TabCobranzas';
import TabPresupuesto from './components/TabPresupuesto';
import TabKPIs from './components/TabKPIs';
import TabReportes from './components/TabReportes';
import { MES_ACTUAL } from './data/demoData';

const TABS = [
  { id:'dashboard',   label:'Dashboard',   icon:<LayoutDashboard size={15}/>,  comp:<TabDashboard /> },
  { id:'ingresos',    label:'Ingresos',    icon:<TrendingUp size={15}/>,        comp:<TabIngresos /> },
  { id:'egresos',     label:'Egresos',     icon:<TrendingDown size={15}/>,      comp:<TabEgresos /> },
  { id:'cobranzas',   label:'Cobranzas',   icon:<CreditCard size={15}/>,        comp:<TabCobranzas /> },
  { id:'presupuesto', label:'Presupuesto', icon:<Target size={15}/>,            comp:<TabPresupuesto /> },
  { id:'kpis',        label:'KPIs',        icon:<BarChart2 size={15}/>,         comp:<TabKPIs /> },
  { id:'reportes',    label:'Reportes',    icon:<FileText size={15}/>,          comp:<TabReportes /> },
];

export default function FinanzasView() {
  const [tab, setTab] = useState('dashboard');
  const activo = TABS.find(t => t.id === tab);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Módulo de Finanzas</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Rebagliati Diplomados SAC · {MES_ACTUAL}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono hidden md:block">
            {new Date().toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors">
            <Download size={12}/> Exportar mes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-[#11284e] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      {activo?.comp}
    </div>
  );
}