// src/pages/marketing/TabPublicidadPresupuesto.jsx
import { DollarSign, TrendingUp, Users, Target, ArrowUpRight } from 'lucide-react';

export default function TabPublicidadPresupuesto() {
  const campanas = [
    { 
      nombre: 'Podología 2026', 
      inversion: 500, 
      leads: 45, 
      cpl: 11.11, 
      roi: 320,
      color: 'text-emerald-600',
      tendencia: 'up'
    },
    { 
      nombre: 'Enfermería Intensiva', 
      inversion: 800, 
      leads: 72, 
      cpl: 11.11, 
      roi: 280,
      color: 'text-emerald-600',
      tendencia: 'up'
    },
    { 
      nombre: 'Farmacia Clínica', 
      inversion: 350, 
      leads: 18, 
      cpl: 19.44, 
      roi: 150,
      color: 'text-amber-600',
      tendencia: 'down'
    },
  ];

  const totalInversion = campanas.reduce((sum, c) => sum + c.inversion, 0);
  const totalLeads = campanas.reduce((sum, c) => sum + c.leads, 0);
  const cplPromedio = totalLeads > 0 ? totalInversion / totalLeads : 0;
  const roiPromedio = campanas.reduce((sum, c) => sum + c.roi, 0) / campanas.length;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <DollarSign className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Publicidad y Presupuesto</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Control de inversión publicitaria y retorno por campaña
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all">
          <DollarSign size={14} /> Nueva Inversión
        </button>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Inversión Total', value: `S/ ${totalInversion.toLocaleString()}`, icon: <DollarSign size={18} />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Leads', value: totalLeads.toString(), icon: <Users size={18} />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'CPL Promedio', value: `S/ ${cplPromedio.toFixed(2)}`, icon: <Target size={18} />, color: 'bg-amber-50 text-amber-600' },
          { label: 'ROI Promedio', value: `${roiPromedio.toFixed(0)}%`, icon: <TrendingUp size={18} />, color: 'bg-purple-50 text-purple-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${kpi.color}`}>
                {kpi.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-xl font-black text-gray-800">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Campaña</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Inversión</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Leads</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">CPL</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">ROI</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campanas.map((camp, idx) => (
              <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                <td className="p-4">
                  <p className="font-bold text-gray-800 text-xs">{camp.nombre}</p>
                </td>
                <td className="p-4 text-right">
                  <span className="font-mono text-gray-700 text-xs">S/ {camp.inversion.toLocaleString()}</span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-mono text-gray-700 text-xs">{camp.leads}</span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-mono text-gray-700 text-xs">S/ {camp.cpl.toFixed(2)}</span>
                </td>
                <td className="p-4 text-right">
                  <span className={`font-mono font-bold text-xs ${camp.color}`}>{camp.roi}%</span>
                </td>
                <td className="p-4 text-center">
                  <button className="p-2 hover:bg-blue-100 rounded-xl transition-colors text-gray-400 hover:text-[#185FA5]">
                    <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}