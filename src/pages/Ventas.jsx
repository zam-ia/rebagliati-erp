import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { currentMonthRange, pctOf, todayISO, toPositiveNumber } from '../lib/finance';
import {
  CATEGORY_LABELS,
  DEMO_CHECKLIST,
  DEMO_EXECUTIVES,
  DEMO_GOALS,
  DEMO_GROUPS,
  DEMO_SALES,
  SALES_CATEGORIES,
  buildSalesAlerts,
  buildSalesMetrics,
  buildSalesRanking,
} from '../lib/sales';

const statusLabel = {
  completo: 'Completo',
  en_proceso: 'En proceso',
  critico: 'Critico',
  en_uso: 'En uso',
  sin_usar: 'Sin usar',
  pendiente: 'Pendiente',
  archivado: 'Archivado',
};

const severityClass = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
};

const emptyForm = {
  executive_id: '',
  sale_date: todayISO(),
  category: 'C',
  quantity: '',
  source: 'CRM',
  observation: '',
};

function MetricCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <div className="apple-card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-2.5 ${toneClass}`}>
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-3 text-xs font-medium text-slate-500">{sub}</p>}
    </div>
  );
}

export default function Ventas() {
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [sales, setSales] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [goals, setGoals] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [groups, setGroups] = useState([]);
  const [periodId, setPeriodId] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadDemo = () => {
    setUsingDemo(true);
    setSales(DEMO_SALES);
    setExecutives(DEMO_EXECUTIVES);
    setGoals(DEMO_GOALS);
    setChecklists(DEMO_CHECKLIST);
    setGroups(DEMO_GROUPS);
  };

  const loadSales = async () => {
    setLoading(true);
    const { start, end } = currentMonthRange();

    try {
      const [
        executivesResponse,
        periodResponse,
        salesResponse,
        goalsResponse,
        checklistResponse,
        groupsResponse,
      ] = await Promise.all([
        supabase.from('ventas_ejecutivos').select('*').eq('status', 'active').order('short_name'),
        supabase.from('ventas_periodos').select('*').eq('year', new Date().getFullYear()).eq('month', new Date().getMonth() + 1).maybeSingle(),
        supabase.from('ventas_registros').select('*').gte('sale_date', start).lt('sale_date', end),
        supabase.from('ventas_metas').select('*'),
        supabase.from('ventas_checklists').select('*').gte('checklist_date', start).lt('checklist_date', end),
        supabase.from('ventas_grupos_whatsapp').select('*').order('members_count', { ascending: false }),
      ]);

      if (salesResponse.error || executivesResponse.error) {
        loadDemo();
        return;
      }

      const realExecutives = executivesResponse.data || [];
      if (realExecutives.length === 0) {
        loadDemo();
        return;
      }

      setUsingDemo(false);
      setExecutives(realExecutives);
      setPeriodId(periodResponse.data?.id || null);
      setSales(salesResponse.data || []);
      setGoals(goalsResponse.data || []);
      setChecklists((checklistResponse.data || []).map((item) => ({
        ...item,
        executive_name: realExecutives.find((exec) => exec.id === item.executive_id)?.short_name || 'Sin ejecutivo',
      })));
      setGroups(groupsResponse.data || []);
    } catch (error) {
      console.error('No se pudo cargar ventas:', error);
      loadDemo();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    if (category === 'Todas') return sales;
    return sales.filter((sale) => sale.category === category);
  }, [sales, category]);

  const ranking = useMemo(() => {
    const base = buildSalesRanking(filteredSales, executives, goals);
    const term = search.trim().toLowerCase();
    if (!term) return base;
    return base.filter((row) => `${row.executive} ${row.team}`.toLowerCase().includes(term));
  }, [filteredSales, executives, goals, search]);

  const metrics = useMemo(
    () => buildSalesMetrics(filteredSales, ranking, checklists, groups),
    [filteredSales, ranking, checklists, groups],
  );

  const alerts = useMemo(
    () => buildSalesAlerts(metrics, ranking, groups),
    [metrics, ranking, groups],
  );

  const handleSave = async () => {
    const quantity = toPositiveNumber(form.quantity);
    if (!form.executive_id || !Number.isFinite(quantity)) {
      alert('Selecciona ejecutivo y registra una cantidad mayor a 0.');
      return;
    }

    if (usingDemo || !periodId) {
      const executive = executives.find((item) => String(item.id) === String(form.executive_id));
      setSales((current) => [
        {
          id: `local-${Date.now()}`,
          ...form,
          executive_id: form.executive_id,
          executive_name: executive?.short_name,
          quantity,
        },
        ...current,
      ]);
      setForm(emptyForm);
      setShowForm(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('ventas_registros').insert({
      period_id: periodId,
      executive_id: Number(form.executive_id),
      sale_date: form.sale_date,
      category: form.category,
      quantity,
      source: form.source,
      observation: form.observation || null,
    });
    setSaving(false);

    if (error) {
      alert(`No se pudo registrar la venta: ${error.message}`);
      return;
    }

    setForm(emptyForm);
    setShowForm(false);
    loadSales();
  };

  return (
    <div className="space-y-6">
      <section className="apple-hero overflow-hidden">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
              <Activity size={13} /> Ventas operativas
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Ranking comercial, checklist y grupos WhatsApp
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Controla productividad por ejecutivo, mix C/CM/D, disciplina diaria y activos comerciales sin usar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadSales} className="btn-apple-secondary">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
            <button onClick={() => setShowForm((value) => !value)} className="btn-apple-primary">
              <Plus size={16} /> Nueva venta
            </button>
          </div>
        </div>
      </section>

      {usingDemo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Usando datos demo porque las tablas de ventas aun no estan aplicadas en Supabase.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Trophy} label="Ventas del periodo" value={metrics.total.toLocaleString('es-PE')} sub="Registros C + CM + D" />
        <MetricCard icon={Target} label="Concentracion Top 5" value={`${metrics.topFiveConcentration}%`} sub="Riesgo si supera 60%" tone="amber" />
        <MetricCard icon={ClipboardCheck} label="Checklist promedio" value={`${metrics.checklistAverage}%`} sub={`${metrics.criticalChecklists} ejecutivos criticos`} tone={metrics.checklistAverage < 50 ? 'red' : 'green'} />
        <MetricCard icon={MessageCircle} label="Grupos sin uso" value={metrics.unusedGroups} sub={`${metrics.pendingGroups} pendientes de responsable`} tone="red" />
      </div>

      {showForm && (
        <div className="apple-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Registro diario</h2>
              <p className="text-xs font-medium text-slate-500">Evita duplicar ejecutivo, fecha, categoria y evento.</p>
            </div>
            <button onClick={() => setShowForm(false)} className="btn-apple-ghost">Cerrar</button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="erp-label">Ejecutivo</span>
              <select className="erp-input" value={form.executive_id} onChange={(event) => setForm({ ...form, executive_id: event.target.value })}>
                <option value="">Seleccionar</option>
                {executives.map((exec) => (
                  <option key={exec.id} value={exec.id}>{exec.short_name || exec.full_name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="erp-label">Fecha</span>
              <input className="erp-input" type="date" value={form.sale_date} onChange={(event) => setForm({ ...form, sale_date: event.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="erp-label">Categoria</span>
              <select className="erp-input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {SALES_CATEGORIES.map((item) => <option key={item} value={item}>{item} - {CATEGORY_LABELS[item]}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="erp-label">Cantidad</span>
              <input className="erp-input" type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="0" />
            </label>
            <label className="space-y-1.5">
              <span className="erp-label">Canal</span>
              <select className="erp-input" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
                {['CRM', 'Meta Ads', 'WhatsApp', 'Referidos', 'Web'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="erp-label">Observacion</span>
              <input className="erp-input" value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} placeholder="Detalle opcional" />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-apple-primary">
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar venta'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="apple-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Ranking ponderado</h2>
              <p className="text-xs font-medium text-slate-500">Pondera C, CM y D para evitar medir solo volumen bruto.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="erp-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ejecutivo" />
              </label>
              <label className="relative">
                <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select className="erp-input pl-9" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option>Todas</option>
                  {SALES_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Ejecutivo</th>
                  <th>C</th>
                  <th>CM</th>
                  <th>D</th>
                  <th>Total</th>
                  <th>Meta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, index) => (
                  <tr key={row.executive_id}>
                    <td className="font-black text-slate-500">#{index + 1}</td>
                    <td>
                      <p className="font-bold text-slate-900">{row.executive}</p>
                      <p className="text-[11px] text-slate-400">{row.team}</p>
                    </td>
                    <td>{row.C}</td>
                    <td>{row.CM}</td>
                    <td>{row.D}</td>
                    <td className="font-black text-blue-700">{row.total}</td>
                    <td>
                      {row.goal > 0 ? (
                        <div className="min-w-[120px]">
                          <div className="mb-1 flex justify-between text-[11px] font-bold text-slate-500">
                            <span>{row.goalProgress}%</span>
                            <span>{row.goal}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(row.goalProgress, 100)}%` }} />
                          </div>
                        </div>
                      ) : 'Sin meta'}
                    </td>
                    <td>
                      <span className={`badge ${row.risk === 'Riesgo meta' ? 'badge-amber' : 'badge-green'}`}>{row.risk}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-700">
              <BarChart3 size={16} className="text-blue-600" /> Mix comercial
            </h2>
            <div className="space-y-4">
              {SALES_CATEGORIES.map((item) => (
                <div key={item}>
                  <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
                    <span>{item} - {CATEGORY_LABELS[item]}</span>
                    <span>{metrics.mix[item]?.pct || 0}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${metrics.mix[item]?.pct || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-700">
              <AlertTriangle size={16} className="text-amber-500" /> Alertas
            </h2>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  Sin alertas criticas para el periodo.
                </div>
              ) : alerts.map((alert) => (
                <div key={`${alert.type}-${alert.message}`} className={`rounded-2xl border p-4 ${severityClass[alert.severity] || severityClass.low}`}>
                  <p className="text-xs font-black uppercase tracking-wider">{alert.type}</p>
                  <p className="mt-1 text-sm font-semibold leading-5">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="apple-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <ClipboardCheck size={19} className="text-blue-600" /> Checklist operativo
          </h2>
          <div className="space-y-3">
            {checklists.map((item) => {
              const rate = pctOf(item.completion_rate, 100);
              return (
                <div key={`${item.executive_id}-${item.executive_name}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{item.executive_name}</p>
                      <p className="text-[11px] font-medium text-slate-500">{statusLabel[item.status] || item.status}</p>
                    </div>
                    <span className={`badge ${rate < 50 ? 'badge-red' : rate < 85 ? 'badge-amber' : 'badge-green'}`}>{item.completion_rate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className={`h-full rounded-full ${rate < 50 ? 'bg-red-500' : rate < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(item.completion_rate, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <MessageCircle size={19} className="text-blue-600" /> Inventario WhatsApp
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Prioriza comunidades grandes sin campana ni responsable.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Miembros</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id || group.name}>
                    <td>
                      <p className="font-bold text-slate-900">{group.name}</p>
                      <p className="text-[11px] text-slate-400">{group.career || 'Sin carrera'}</p>
                    </td>
                    <td className="font-black">{group.members_count}</td>
                    <td>
                      <span className={`badge ${
                        group.status === 'sin_usar' ? 'badge-red' :
                        group.status === 'pendiente' ? 'badge-amber' :
                        group.status === 'en_uso' ? 'badge-green' : 'badge-gray'
                      }`}>
                        {statusLabel[group.status] || group.status}
                      </span>
                    </td>
                    <td className="text-sm font-medium text-slate-600">{group.executive_name || 'Pendiente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="apple-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
          <Users size={19} className="text-blue-600" /> Enlaces entre modulos
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            ['Marketing', 'Leads y campanas alimentan el ranking por canal.'],
            ['Caja', 'Pagos confirmados validan el cierre comercial diario.'],
            ['Finanzas', 'Ingresos, egresos y metas muestran margen real.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900">
                <CheckCircle2 size={16} className="text-emerald-600" /> {title}
              </div>
              <p className="text-xs font-medium leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
