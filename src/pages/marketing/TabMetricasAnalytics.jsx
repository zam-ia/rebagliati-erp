// src/pages/marketing/TabMetricasAnalytics.jsx
import { BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TabMetricasAnalytics() {
  const kpis = [
    { 
      label: 'Leads Hoy', 
      value: '12', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: <BarChart3 size={20} className="text-blue-600" />,
      cambio: '+18%',
      tendencia: 'up',
    },
    { 
      label: 'Tasa Conversión', 
      value: '8.5%', 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: <TrendingUp size={20} className="text-emerald-600" />,
      cambio: '+2.1%',
      tendencia: 'up',
    },
    { 
      label: 'ROI Promedio', 
      value: '280%', 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: <TrendingUp size={20} className="text-purple-600" />,
      cambio: '+15%',
      tendencia: 'up',
    },
    { 
      label: 'CPL Promedio', 
      value: 'S/ 9.50', 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      icon: <TrendingDown size={20} className="text-amber-600" />,
      cambio: '-5.3%',
      tendencia: 'down',
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <BarChart3 className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Métricas y Analytics</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              KPIs de marketing en tiempo real
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" />
            Datos actualizados
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="border border-gray-100 rounded-2xl p-5 bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/20 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 ${kpi.bgColor} rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                {kpi.icon}
              </div>
              <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                kpi.tendencia === 'up' ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {kpi.tendencia === 'up' ? (
                  <ArrowUpRight size={12} />
                ) : (
                  <ArrowDownRight size={12} />
                )}
                {kpi.cambio}
              </div>
            </div>
            <div className="space-y-1">
              <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}