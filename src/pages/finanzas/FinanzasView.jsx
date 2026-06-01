// src/pages/finanzas/FinanzasView.jsx
import { useState } from 'react';
import {
  BarChart2,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import TabDashboard from './components/TabDashboard';
import TabIngresos from './components/TabIngresos';
import TabEgresos from './components/TabEgresos';
import TabCobranzas from './components/TabCobranzas';
import TabPresupuesto from './components/TabPresupuesto';
import TabKPIs from './components/TabKPIs';
import TabReportes from './components/TabReportes';
import { MES_ACTUAL } from './data/demoData';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, comp: <TabDashboard /> },
  { id: 'ingresos', label: 'Ingresos', icon: <TrendingUp size={15} />, comp: <TabIngresos /> },
  { id: 'egresos', label: 'Egresos', icon: <TrendingDown size={15} />, comp: <TabEgresos /> },
  { id: 'cobranzas', label: 'Cobranzas', icon: <CreditCard size={15} />, comp: <TabCobranzas /> },
  { id: 'presupuesto', label: 'Presupuesto', icon: <Target size={15} />, comp: <TabPresupuesto /> },
  { id: 'kpis', label: 'KPIs', icon: <BarChart2 size={15} />, comp: <TabKPIs /> },
  { id: 'reportes', label: 'Reportes', icon: <FileText size={15} />, comp: <TabReportes /> },
];

export default function FinanzasView() {
  const [tab, setTab] = useState('dashboard');
  const activo = TABS.find((item) => item.id === tab);

  return (
    <div className="space-y-5">
      <div className="apple-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
            <ShieldCheck size={13} /> Control financiero
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Modulo de Finanzas</h1>
          <p className="mt-2 text-sm text-slate-500">
            Rebagliati Diplomados SAC - {MES_ACTUAL}. Caja, cobranzas, presupuesto y rentabilidad en una sola lectura.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] font-mono text-slate-400 md:block">
            {new Date().toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button className="btn-apple-secondary">
            <Download size={12} /> Exportar mes
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[12px] font-bold transition-all ${
              tab === item.id
                ? 'bg-[#11284e] text-white shadow-sm'
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {activo?.comp}
    </div>
  );
}
