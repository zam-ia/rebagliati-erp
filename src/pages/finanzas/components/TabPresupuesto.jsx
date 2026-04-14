// src/pages/finanzas/components/TabPresupuesto.jsx
import { TrendingUp, TrendingDown, CheckCircle, RefreshCw } from 'lucide-react';
import KpiCard from './KpiCard';
import { PRESUPUESTO_DEMO, fmt, pct } from '../data/demoData';

export default function TabPresupuesto() {
  const ingresos_ppto = PRESUPUESTO_DEMO.filter(p => p.categoria === 'Ingresos');
  const egresos_ppto = PRESUPUESTO_DEMO.filter(p => p.categoria === 'Egresos');
  const totalIngresoPpto = ingresos_ppto.reduce((a, p) => a + p.presupuestado, 0);
  const totalEgresoPpto = egresos_ppto.reduce((a, p) => a + p.presupuestado, 0);
  const totalIngresoEjec = ingresos_ppto.reduce((a, p) => a + p.ejecutado, 0);
  const totalEgresoEjec = egresos_ppto.reduce((a, p) => a + p.ejecutado, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Presupuesto Ingresos" valor={fmt(totalIngresoPpto)} icon={TrendingUp} color="border-emerald-500"/>
        <KpiCard label="Ejecución Ingresos"   valor={fmt(totalIngresoEjec)} sub={`${pct(totalIngresoEjec, totalIngresoPpto)}% ejecutado`} icon={CheckCircle} color="border-blue-500"/>
        <KpiCard label="Presupuesto Egresos"  valor={fmt(totalEgresoPpto)}  icon={TrendingDown} color="border-red-400"/>
        <KpiCard label="Ejecución Egresos"    valor={fmt(totalEgresoEjec)}  sub={`${pct(totalEgresoEjec, totalEgresoPpto)}% ejecutado`} icon={RefreshCw} color="border-orange-500"/>
      </div>

      {[
        { titulo:'Ingresos', datos:ingresos_ppto, colorBar:'bg-emerald-500', colorExc:'bg-red-400' },
        { titulo:'Egresos',  datos:egresos_ppto,  colorBar:'bg-red-400',    colorExc:'bg-orange-400' },
      ].map(({ titulo, datos, colorBar, colorExc }) => (
        <div key={titulo} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b">
            <h3 className="font-black text-slate-700 text-xs uppercase">{titulo} — Ejecución Presupuestal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b text-[10px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="p-3 text-left">Área</th>
                  <th className="p-3 text-right">Presupuestado</th>
                  <th className="p-3 text-right">Ejecutado</th>
                  <th className="p-3 text-right">Variación</th>
                  <th className="p-3 text-center w-40">Ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {datos.map(p => {
                  const variacion = p.ejecutado - p.presupuestado;
                  const ejPct = pct(p.ejecutado, p.presupuestado);
                  const excedido = titulo === 'Egresos' ? p.ejecutado > p.presupuestado : false;
                  return (
                    <tr key={p.area} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-700 text-xs">{p.area}</td>
                      <td className="p-3 text-right font-mono text-xs">{fmt(p.presupuestado)}</td>
                      <td className="p-3 text-right font-mono font-bold text-xs">{fmt(p.ejecutado)}</td>
                      <td className={`p-3 text-right font-black text-xs ${variacion > 0 && titulo === 'Egresos' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {variacion >= 0 ? '+' : ''}{fmt(variacion)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className={`${excedido ? colorExc : colorBar} h-full rounded-full`} style={{ width: `${Math.min(ejPct, 100)}%` }}/>
                          </div>
                          <span className={`text-[10px] font-black w-8 text-right ${ejPct > 100 && titulo === 'Egresos' ? 'text-red-600' : 'text-slate-600'}`}>
                            {ejPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}