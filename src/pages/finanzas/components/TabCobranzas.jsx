// src/pages/finanzas/components/TabCobranzas.jsx
import { useState } from 'react';
import { DollarSign, AlertCircle, TrendingDown, Target } from 'lucide-react';
import KpiCard from './KpiCard';
import { COBRANZAS_DEMO, fmt, pct, ESTADO_BADGE } from '../data/demoData';

export default function TabCobranzas() {
  const [filtro, setFiltro] = useState('');
  const filtrados = COBRANZAS_DEMO.filter(c =>
    !filtro || c.estado === filtro || c.alumno.toLowerCase().includes(filtro.toLowerCase())
  );
  const totalPorCobrar = COBRANZAS_DEMO.reduce((a, c) => a + (c.monto_total - c.monto_pagado), 0);
  const morosos = COBRANZAS_DEMO.filter(c => c.estado === 'Moroso');

  return (
    <div className="space-y-4">
      {/* KPIs cobranza */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total por cobrar', valor:fmt(totalPorCobrar), color:'border-amber-500', icon:DollarSign },
          { label:'Alumnos morosos',  valor:morosos.length, color:'border-red-500', icon:AlertCircle },
          { label:'Deuda morosos',   valor:fmt(morosos.reduce((a, c) => a + (c.monto_total - c.monto_pagado), 0)), color:'border-red-400', icon:TrendingDown },
          { label:'Tasa morosidad',  valor:`${pct(morosos.length, COBRANZAS_DEMO.length)}%`, color:'border-orange-500', icon:Target },
        ].map(k => (
          <KpiCard key={k.label} label={k.label} valor={k.valor} icon={k.icon} color={k.color}/>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <input 
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-48 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Buscar alumno..." 
          value={filtro} 
          onChange={e => setFiltro(e.target.value)}
        />
        <select 
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          value={filtro} 
          onChange={e => setFiltro(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {['Al día','Vencido','Moroso','Cancelado'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b">
          <h3 className="font-black text-slate-700 text-xs uppercase">Control de Cobranzas · {filtrados.length} alumnos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b text-[10px] font-black text-slate-400 uppercase">
              <tr>
                <th className="p-3 text-left">Alumno</th>
                <th className="p-3 text-left">Programa</th>
                <th className="p-3 text-center">Cuotas</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Pagado</th>
                <th className="p-3 text-right">Saldo</th>
                <th className="p-3 text-center">Vencimiento</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50 ${c.estado === 'Moroso' ? 'bg-red-50/30' : ''}`}>
                  <td className="p-3 font-bold text-slate-800 text-xs">{c.alumno}</td>
                  <td className="p-3 text-xs text-slate-500">{c.diplomado}</td>
                  <td className="p-3 text-center text-xs font-mono">
                    <span className="font-bold text-emerald-600">{c.pagadas}</span>
                    <span className="text-slate-400">/{c.cuotas}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{fmt(c.monto_total)}</td>
                  <td className="p-3 text-right font-mono text-xs text-emerald-700 font-bold">{fmt(c.monto_pagado)}</td>
                  <td className="p-3 text-right font-mono text-xs font-black text-red-700">{fmt(c.monto_total - c.monto_pagado)}</td>
                  <td className="p-3 text-center text-xs font-mono text-slate-500">{c.vencimiento}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ESTADO_BADGE[c.estado] || 'bg-slate-100 text-slate-500'}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="p-3 text-center text-xs font-mono text-blue-600">
                    <a href={`https://wa.me/51${c.telefono}`} target="_blank" rel="noreferrer" className="hover:underline">
                      {c.telefono}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}