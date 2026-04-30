// src/pages/marketing/DashboardMarketing.jsx
import { Users, TrendingUp, DollarSign, BarChart3, Radio, AlertTriangle, Clock, Briefcase, CheckCircle, XCircle, Eye } from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ── Datos de ejemplo (luego se conectarán a Supabase) ──────────────────
const KPIs = [
  { label: 'Leads generados', valor: '1,200', icon: <Users size={20} />, bg: 'bg-blue-50', text: 'text-blue-700' },
  { label: 'Ventas cerradas', valor: '120', icon: <CheckCircle size={20} />, bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { label: 'Ingresos', valor: 'S/ 36,000', icon: <DollarSign size={20} />, bg: 'bg-teal-50', text: 'text-teal-700' },
  { label: 'Inversión publicitaria', valor: 'S/ 6,000', icon: <TrendingUp size={20} />, bg: 'bg-amber-50', text: 'text-amber-700' },
  { label: 'ROI', valor: '500%', icon: <BarChart3 size={20} />, bg: 'bg-purple-50', text: 'text-purple-700' },
  { label: 'Conversión', valor: '10%', icon: <Radio size={20} />, bg: 'bg-rose-50', text: 'text-rose-700' },
];

const FUNNEL = [
  { etapa: 'Leads', valor: 1000 },
  { etapa: 'Contactados', valor: 800 },
  { etapa: 'Interesados', valor: 400 },
  { etapa: 'Seguimiento', valor: 200 },
  { etapa: 'Ventas', valor: 100 },
];

const CAMPAÑAS = [
  { nombre: 'Lanzamiento Podología', leads: 320, ventas: 40, cpl: 'S/ 9.38', roi: '320%', estado: 'Activa' },
  { nombre: 'Diplomado Enfermería', leads: 450, ventas: 55, cpl: 'S/ 6.67', roi: '450%', estado: 'Activa' },
  { nombre: 'Congreso Virtual 2026', leads: 210, ventas: 15, cpl: 'S/ 23.81', roi: '120%', estado: 'Pausada' },
];

const CONTENIDO = [
  { tipo: 'Reel', alcance: '8.2K', engagement: '12%', leads: 45 },
  { tipo: 'Post educativo', alcance: '4.5K', engagement: '8%', leads: 22 },
  { tipo: 'Carrusel', alcance: '2.1K', engagement: '5%', leads: 10 },
];

const CRM_PIPELINE = [
  { etapa: 'Sin contactar', cantidad: 50, color: 'bg-gray-200' },
  { etapa: 'En seguimiento', cantidad: 120, color: 'bg-blue-200' },
  { etapa: 'Calientes', cantidad: 30, color: 'bg-amber-200' },
  { etapa: 'Cerrados', cantidad: 45, color: 'bg-emerald-200' },
];

const ALERTAS = [
  { tipo: 'critica', mensaje: 'Campaña "Congreso Virtual 2026" con ROI negativo', icon: <XCircle size={16} className="text-red-500" /> },
  { tipo: 'media', mensaje: '50 leads sin contacto > 24h', icon: <AlertTriangle size={16} className="text-amber-500" /> },
  { tipo: 'baja', mensaje: 'Campaña "Diplomado Enfermería" es la más rentable', icon: <CheckCircle size={16} className="text-emerald-500" /> },
];

// ═════════════════════════════════════════════════════════════════════════
export default function DashboardMarketing() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── KPIs Principales ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPIs.map(kpi => (
          <div key={kpi.label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-50 shadow-lg shadow-blue-100/20 p-4 flex items-center gap-3 hover:shadow-xl hover:border-blue-100 transition-all duration-200">
            <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.text} shadow-sm`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-black text-gray-800 mt-0.5">{kpi.valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Funnel + ROI ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel de conversión */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-6">
            <Eye size={20} className="text-[#185FA5]" /> Funnel de Conversión
          </h3>
          <div className="space-y-4">
            {FUNNEL.map((f, i) => (
              <div key={f.etapa} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-600 w-24">{f.etapa}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-[#185FA5] to-[#11284e] h-full rounded-full flex items-center justify-end pr-3 text-[11px] font-bold text-white"
                    style={{ width: `${(f.valor / FUNNEL[0].valor) * 100}%` }}
                  >
                    {f.valor}
                  </div>
                </div>
                {i < FUNNEL.length - 1 && (
                  <span className="text-[11px] text-red-400 font-bold w-12 text-right">
                    -{Math.round((1 - FUNNEL[i+1].valor / f.valor) * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-5 italic flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500" />
            Estás perdiendo 50% entre Contactados e Interesados
          </p>
        </div>

        {/* ROI */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-6">
            <DollarSign size={20} className="text-[#185FA5]" /> Inversión vs Ingresos (ROI)
          </h3>
          <div className="flex items-end justify-center gap-8 h-44 px-4">
            {[
              { label: 'Inversión', valor: 6000, altura: 'h-20', color: 'from-red-400 to-red-300' },
              { label: 'Ingresos', valor: 36000, altura: 'h-36', color: 'from-emerald-400 to-emerald-300' }
            ].map((bar) => (
              <div key={bar.label} className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-gray-500">S/ {fmt(bar.valor)}</span>
                <div className={`w-14 ${bar.altura} bg-gradient-to-t ${bar.color} rounded-xl shadow-md`} />
                <span className="text-[10px] font-bold text-gray-600">{bar.label}</span>
              </div>
            ))}
          </div>
          <p className="text-lg font-black text-center mt-4 text-emerald-600">ROI: 500%</p>
        </div>
      </div>

      {/* ── Campañas + Contenido ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campañas */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <Radio size={20} className="text-[#185FA5]" /> Rendimiento de Campañas
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50/50">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="p-4 text-left">Campaña</th>
                  <th className="p-4 text-right">Leads</th>
                  <th className="p-4 text-right">Ventas</th>
                  <th className="p-4 text-right">CPL</th>
                  <th className="p-4 text-right">ROI</th>
                  <th className="p-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {CAMPAÑAS.map(c => (
                  <tr key={c.nombre} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{c.nombre}</td>
                    <td className="p-4 text-right font-mono text-gray-700">{c.leads}</td>
                    <td className="p-4 text-right font-mono text-gray-700">{c.ventas}</td>
                    <td className="p-4 text-right font-mono text-gray-700">{c.cpl}</td>
                    <td className="p-4 text-right font-mono text-emerald-600 font-bold">{c.roi}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                        c.estado === 'Activa' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>{c.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <Clock size={20} className="text-[#185FA5]" /> Rendimiento de Contenido
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50/50">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="p-4 text-left">Tipo</th>
                  <th className="p-4 text-right">Alcance</th>
                  <th className="p-4 text-right">Engagement</th>
                  <th className="p-4 text-right">Leads</th>
                  <th className="p-4 text-center">Rendimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {CONTENIDO.map(c => (
                  <tr key={c.tipo} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{c.tipo}</td>
                    <td className="p-4 text-right font-mono text-gray-700">{c.alcance}</td>
                    <td className="p-4 text-right font-mono text-gray-700">{c.engagement}</td>
                    <td className="p-4 text-right font-mono text-gray-700">{c.leads}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                        c.leads > 30 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {c.leads > 30 ? '🔥 Alto' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── CRM Pipeline + Alertas ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CRM */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-6">
            <Briefcase size={20} className="text-[#185FA5]" /> Estado del CRM (Pipeline)
          </h3>
          <div className="flex flex-wrap gap-3">
            {CRM_PIPELINE.map(p => (
              <div key={p.etapa} className="flex-1 min-w-[100px] text-center">
                <div className={`w-full h-24 ${p.color} rounded-2xl flex items-center justify-center text-3xl font-black text-gray-700 shadow-sm`}>
                  {p.cantidad}
                </div>
                <span className="text-[11px] font-bold text-gray-500 mt-2 block">{p.etapa}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-5 flex items-center gap-1">
            <Clock size={12} /> Tiempo promedio de cierre: 5 días
          </p>
        </div>

        {/* Alertas inteligentes */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-6">
            <AlertTriangle size={20} className="text-[#185FA5]" /> Alertas Inteligentes
          </h3>
          <div className="space-y-3">
            {ALERTAS.map((a, i) => (
              <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border ${
                a.tipo === 'critica' ? 'bg-red-50/80 border-red-200' :
                a.tipo === 'media' ? 'bg-amber-50/80 border-amber-200' :
                'bg-emerald-50/80 border-emerald-200'
              }`}>
                <div className="mt-0.5">{a.icon}</div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{a.mensaje}</p>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">
                    {a.tipo === 'critica' ? 'Acción requerida hoy' : a.tipo === 'media' ? 'Revisar antes del viernes' : 'Informativo'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Actividad Operativa ──────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8">
        <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-6">
          <Clock size={20} className="text-[#185FA5]" /> Actividad Operativa
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Posts programados', valor: 15 },
            { label: 'Diseños pendientes', valor: 12 },
            { label: 'Campañas activas', valor: 3 },
            { label: 'Leads sin gestionar', valor: 80 },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all cursor-pointer">
              <div className="text-3xl font-black text-gray-800">{item.valor}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase mt-2 tracking-wider">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}