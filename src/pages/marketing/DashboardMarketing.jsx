import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Megaphone,
  Radio,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { formatPEN, pctOf, sumBy } from '../../lib/finance';

const campaigns = [
  { name: 'Lanzamiento Podologia', leads: 320, sales: 40, spend: 3000, revenue: 12600, status: 'Activa' },
  { name: 'Diplomado Enfermeria', leads: 450, sales: 55, spend: 3000, revenue: 16500, status: 'Activa' },
  { name: 'Congreso Virtual 2026', leads: 210, sales: 15, spend: 5000, revenue: 6900, status: 'Pausada' },
];

const content = [
  { type: 'Reel', reach: 8200, engagement: 12, leads: 45 },
  { type: 'Post educativo', reach: 4500, engagement: 8, leads: 22 },
  { type: 'Carrusel', reach: 2100, engagement: 5, leads: 10 },
];

const pipeline = [
  { stage: 'Sin contactar', amount: 50, color: 'bg-slate-200' },
  { stage: 'En seguimiento', amount: 120, color: 'bg-blue-200' },
  { stage: 'Calientes', amount: 30, color: 'bg-amber-200' },
  { stage: 'Cerrados', amount: 45, color: 'bg-emerald-200' },
];

const operational = [
  { label: 'Posts programados', value: 15 },
  { label: 'Disenos pendientes', value: 12 },
  { label: 'Campanas activas', value: 3 },
  { label: 'Leads sin gestionar', value: 80 },
];

function Kpi({ icon: Icon, label, value, tone = 'blue', sub }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  }[tone];

  return (
    <div className="apple-card p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-2.5 ${toneClass}`}>
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-3 text-[11px] font-medium text-slate-500">{sub}</p>}
    </div>
  );
}

export default function DashboardMarketing() {
  const totalLeads = sumBy(campaigns, (item) => item.leads);
  const totalSales = sumBy(campaigns, (item) => item.sales);
  const totalSpend = sumBy(campaigns, (item) => item.spend);
  const totalRevenue = sumBy(campaigns, (item) => item.revenue);
  const roi = pctOf(totalRevenue - totalSpend, totalSpend);
  const conversion = pctOf(totalSales, totalLeads, 1);
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const cpa = totalSales > 0 ? totalSpend / totalSales : 0;
  const funnel = [
    { stage: 'Leads', value: totalLeads },
    { stage: 'Contactados', value: 800 },
    { stage: 'Interesados', value: 400 },
    { stage: 'Seguimiento', value: 200 },
    { stage: 'Ventas', value: totalSales },
  ];
  const alerts = [
    { severity: 'high', text: 'Congreso Virtual 2026 consume 45% del gasto y aporta bajo margen.' },
    { severity: 'medium', text: '50 leads sin contacto superan 24 horas. Deben pasar a Ventas hoy.' },
    { severity: 'low', text: 'Diplomado Enfermeria mantiene mejor conversion y debe recibir mas presupuesto.' },
  ];

  return (
    <div className="space-y-6">
      <section className="apple-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
            <Megaphone size={13} /> Marketing y crecimiento
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Tablero comercial de Marketing</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            ROI, conversion, pipeline y alertas conectadas al flujo comercial. La lectura prioriza decisiones diarias.
          </p>
        </div>
        <Link to="/ventas" className="btn-apple-primary">
          Ver ranking ventas <ArrowRight size={16} />
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} label="Leads" value={totalLeads.toLocaleString('es-PE')} sub="Campanas activas" />
        <Kpi icon={CheckCircle} label="Ventas" value={totalSales} tone="green" sub={`${conversion}% conversion`} />
        <Kpi icon={DollarSign} label="Ingresos" value={formatPEN(totalRevenue)} tone="green" />
        <Kpi icon={TrendingUp} label="Inversion" value={formatPEN(totalSpend)} tone="amber" />
        <Kpi icon={BarChart3} label="ROI" value={`${roi}%`} tone={roi >= 250 ? 'green' : 'amber'} sub={`CPL ${formatPEN(cpl)}`} />
        <Kpi icon={Target} label="CPA" value={formatPEN(cpa)} tone="purple" sub="Costo por venta" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="apple-card p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900">
            <Eye size={20} className="text-blue-600" /> Funnel de conversion
          </h2>
          <div className="space-y-4">
            {funnel.map((item, index) => {
              const width = pctOf(item.value, funnel[0].value);
              const drop = index < funnel.length - 1 ? pctOf(item.value - funnel[index + 1].value, item.value) : 0;
              return (
                <div key={item.stage} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-bold text-slate-600">{item.stage}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="flex h-full items-center justify-end rounded-full bg-slate-900 pr-3 text-[11px] font-bold text-white" style={{ width: `${width}%` }}>
                      {item.value}
                    </div>
                  </div>
                  {index < funnel.length - 1 && <span className="w-12 text-right text-[11px] font-bold text-red-500">-{drop}%</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Mayor fuga: Contactados a Interesados. Reforzar guion y velocidad de respuesta.
          </div>
        </div>

        <div className="apple-card p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900">
            <DollarSign size={20} className="text-blue-600" /> Inversion vs ingresos
          </h2>
          <div className="flex h-48 items-end justify-center gap-10">
            {[
              { label: 'Inversion', value: totalSpend, height: pctOf(totalSpend, totalRevenue), color: 'bg-amber-400' },
              { label: 'Ingresos', value: totalRevenue, height: 100, color: 'bg-emerald-500' },
            ].map((bar) => (
              <div key={bar.label} className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{formatPEN(bar.value)}</span>
                <div className={`w-16 rounded-2xl ${bar.color}`} style={{ height: `${Math.max(bar.height, 18)}%` }} />
                <span className="text-[11px] font-bold text-slate-500">{bar.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-2xl font-black text-emerald-600">ROI {roi}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Radio size={20} className="text-blue-600" /> Campanas
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Campana</th>
                  <th>Leads</th>
                  <th>Ventas</th>
                  <th>CPL</th>
                  <th>ROI</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((item) => {
                  const itemCpl = item.leads > 0 ? item.spend / item.leads : 0;
                  const itemRoi = pctOf(item.revenue - item.spend, item.spend);
                  return (
                    <tr key={item.name}>
                      <td className="font-bold text-slate-900">{item.name}</td>
                      <td>{item.leads}</td>
                      <td>{item.sales}</td>
                      <td>{formatPEN(itemCpl)}</td>
                      <td className={itemRoi >= 250 ? 'font-black text-emerald-600' : 'font-black text-amber-600'}>{itemRoi}%</td>
                      <td><span className={`badge ${item.status === 'Activa' ? 'badge-green' : 'badge-amber'}`}>{item.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Clock size={20} className="text-blue-600" /> Contenido y operacion
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Alcance</th>
                  <th>Engagement</th>
                  <th>Leads</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {content.map((item) => (
                  <tr key={item.type}>
                    <td className="font-bold text-slate-900">{item.type}</td>
                    <td>{item.reach.toLocaleString('es-PE')}</td>
                    <td>{item.engagement}%</td>
                    <td>{item.leads}</td>
                    <td><span className={`badge ${item.leads > 30 ? 'badge-green' : 'badge-gray'}`}>{item.leads > 30 ? 'Alto' : 'Normal'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="apple-card p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900">
            <Briefcase size={20} className="text-blue-600" /> Pipeline CRM
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {pipeline.map((item) => (
              <div key={item.stage} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                <div className={`mx-auto flex h-20 items-center justify-center rounded-2xl text-3xl font-black text-slate-800 ${item.color}`}>
                  {item.amount}
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.stage}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="apple-card p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900">
            <AlertTriangle size={20} className="text-amber-500" /> Alertas inteligentes
          </h2>
          <div className="space-y-3">
            {alerts.map((item) => (
              <div
                key={item.text}
                className={`rounded-2xl border p-4 text-sm font-semibold ${
                  item.severity === 'high'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : item.severity === 'medium'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="apple-card p-6">
        <h2 className="mb-5 text-lg font-black text-slate-900">Actividad operativa</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {operational.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
              <div className="text-3xl font-black text-slate-900">{item.value}</div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
