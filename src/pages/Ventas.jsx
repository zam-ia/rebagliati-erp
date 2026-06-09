import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  ClipboardList,
  Database,
  DollarSign,
  Edit2,
  FileText,
  Filter,
  Gift,
  KeyRound,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Target,
  Trophy,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAdminUser } from '../lib/access';
import { currentMonthRange, pctOf, todayISO, toPositiveNumber } from '../lib/finance';
import {
  DRIVE_FILES,
  DRIVE_FORMULAS,
  DRIVE_IMPORT_PHASES,
  DRIVE_PROCESS_ALERTS,
  PAYMENT_CONTROL_RULES,
  buildDriveMetrics,
  buildImportRisks,
} from '../lib/driveInsights';
import {
  CATEGORY_LABELS,
  COMMISSION_MODEL,
  DEMO_CHECKLIST,
  DEMO_EXECUTIVES,
  DEMO_GOALS,
  DEMO_GROUPS,
  DEMO_INCIDENTS,
  DEMO_KOMMO_QUEUE,
  DEMO_COORDINATION_SLA,
  DEMO_FOLLOW_UPS,
  DEMO_LIBRARY_ITEMS,
  DEMO_MONTHLY_DELIVERABLES,
  DEMO_PAYMENT_PROMISES,
  DEMO_SALES,
  DEMO_SALES_SHOWS,
  DEMO_UTM_CAMPAIGNS,
  IMPROVEMENT_ROADMAP,
  SALES_CATEGORIES,
  buildIncidentMetrics,
  buildKommoMetrics,
  buildPromiseMetrics,
  buildSalesAlerts,
  buildSalesMetrics,
  buildSalesRanking,
  normalizeCommissionModel,
  normalizeIncidents,
  normalizeKommoQueue,
  normalizeMonthlyDeliverables,
  normalizePaymentPromises,
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

const SALES_SUBMODULES = [
  { id: 'resumen', path: 'resumen', label: 'Panel diario', icon: Activity, permission: 'ventas_dashboard' },
  { id: 'pizarra', path: 'pizarra', label: 'Pizarra digital', icon: ClipboardList, permission: 'ventas_pizarra' },
  { id: 'kommo', path: 'kommo', label: 'Leads y KOMMO', icon: MessageCircle, permission: 'ventas_kommo' },
  { id: 'seguimiento', path: 'seguimiento', label: 'Seguimiento comercial', icon: ClipboardList, permission: 'ventas_seguimiento' },
  { id: 'promesas', path: 'promesas', label: 'Promesas de pago', icon: Clock, permission: 'ventas_promesas' },
  { id: 'nueva-venta', path: 'nueva-venta', label: 'Ventas e inscripciones', icon: Plus, permission: 'ventas_nueva_venta' },
  { id: 'eventos', path: 'eventos', label: 'Eventos 360', icon: Database, permission: 'ventas_eventos' },
  { id: 'marketing', path: 'marketing', label: 'Campanas, UTMs y marketing', icon: BarChart3, permission: 'ventas_marketing' },
  { id: 'biblioteca', path: 'biblioteca', label: 'Biblioteca comercial', icon: FileText, permission: 'ventas_biblioteca' },
  { id: 'show', path: 'show', label: 'Show de ventas', icon: Trophy, permission: 'ventas_show' },
  { id: 'ranking', path: 'ranking', label: 'Ranking y productividad', icon: Trophy, permission: 'ventas_ranking' },
  { id: 'metas', path: 'metas', label: 'Metas', icon: Target, permission: 'ventas_metas' },
  { id: 'checklist', path: 'checklist', label: 'Rutina operativa', icon: ClipboardCheck, permission: 'ventas_checklist' },
  { id: 'comisiones', path: 'comisiones', label: 'Comisiones e incidencias', icon: Gift, permission: 'ventas_comisiones' },
  { id: 'coordinacion', path: 'coordinacion', label: 'Coordinacion academica', icon: ClipboardCheck, permission: 'ventas_coordinacion' },
  { id: 'grupos', path: 'grupos', label: 'Comunidades y remarketing', icon: Users, permission: 'ventas_grupos' },
  { id: 'plantillas', path: 'plantillas', label: 'Plantillas comerciales', icon: FileText, permission: 'ventas_plantillas' },
  { id: 'accesos', path: 'accesos', label: 'Accesos criticos', icon: KeyRound, permission: 'ventas_accesos' },
  { id: 'alertas', path: 'alertas', label: 'Alertas inteligentes', icon: Bell, permission: 'ventas_alertas' },
  { id: 'reportes', path: 'reportes', label: 'Reportes gerenciales', icon: FileText, permission: 'ventas_entregables' },
  { id: 'importador', path: 'importador', label: 'Importador', icon: Upload, permission: 'ventas_importador' },
  { id: 'administracion', path: 'administracion', label: 'Administracion', icon: Settings, permission: 'ventas_administracion' },
];

const DEFAULT_PIZARRA_USERS = [
  { id: 'U1', linea: '598-779', responsables: 'Diana M. / Bonnie', lider: 'Renato', estado: 'Operativo' },
  { id: 'U2', linea: '598-779', responsables: 'Mariana / Diego', lider: 'Renato', estado: 'Operativo' },
  { id: 'U3', linea: '567-177', responsables: 'Ariana / Monica', lider: 'Antonella', estado: 'Revision' },
  { id: 'U4', linea: '567-177', responsables: 'Samu / Daniela', lider: 'Antonella', estado: 'Operativo' },
  { id: 'U5', linea: '002-945', responsables: 'Eliana / Anarosa', lider: 'Patt', estado: 'Operativo' },
  { id: 'U6', linea: '002-945', responsables: 'Ale / Kevin', lider: 'Patt', estado: 'Revision' },
];

const DEFAULT_WAPEROS = [
  { id: 'W1', linea: '098-0', responsable: 'Patt', estado: 'Disponible' },
  { id: 'W2', linea: '185-0', responsable: 'Patt', estado: 'Disponible' },
  { id: 'W3', linea: '833-0', responsable: 'Patt', estado: 'Disponible' },
  { id: '443', linea: '443', responsable: 'Antonella', estado: 'Por asignar' },
  { id: '772', linea: '772', responsable: 'Antonella', estado: 'Por asignar' },
  { id: '920', linea: '920', responsable: 'Antonella', estado: 'Por asignar' },
  { id: '654', linea: '654', responsable: 'Mariana', estado: 'Observado' },
];

const DEFAULT_SOCIAL_BOARD = [
  { canal: 'FB', C: 1, D: 0, Obst: 0, mensaje: 'Campana activa' },
  { canal: 'IG', C: 0, D: 0, Obst: 0, mensaje: 'Historias del dia' },
  { canal: 'TikTok', C: 90, D: 0, Obst: 0, mensaje: 'Video promocional' },
  { canal: 'API', C: 691, D: 577, Obst: 670, mensaje: 'Carga automatica' },
];

const DEFAULT_CUTS = [
  { id: 'apertura', hora: '8:00 am', responsable: 'Patt', valor: 224, estado: 'Hecho' },
  { id: 'medio', hora: '12:30 pm', responsable: 'Renato', valor: 7, estado: 'Revision' },
  { id: 'tarde', hora: '5:00 pm', responsable: 'Antonella', valor: 27, estado: 'Hecho' },
  { id: 'pre-cierre', hora: '7:00 pm', responsable: 'Antonella', valor: 0, estado: 'Pendiente' },
  { id: 'cierre', hora: '8:45 pm', responsable: 'Antonella', valor: 0, estado: 'Pendiente' },
];

const loadLocalJson = (key, fallback) => {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const loadLocalNumber = (key, fallback) => {
  if (typeof localStorage === 'undefined') return fallback;
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const newExecutiveInitial = {
  hrPersonKey: '',
  full_name: '',
  short_name: '',
  turno: 'mixto',
};

const emptyLeadSourceForm = {
  nombre: '',
  evento_codigo: '',
  evento_nombre: '',
  form_url: '',
  sheet_url: '',
  sheet_gid: '',
  canal_default: 'Google Sheets',
  origen_default: 'FORMULARIO',
asignacion_modo: 'manual',
};

const emptyKommoForm = {
nombre: 'Kommo principal',
base_url: '',
account_subdomain: '',
integration_id: '',
client_id: '',
secret_ref: '',
webhook_secret_ref: '',
observacion: '',
estado: 'pendiente',
};

const LEAD_PHASES = ['LEAD NUEVO', '1Â° CONTACTO', '2Â° CONTACTO', '3Â° CONTACTO', '4Â° CONTACTO', 'PROMESA DE PAGO'];
const LEAD_CLOSURES = ['ACTIVO', 'GANADO', 'PERDIDO'];

const createWebhookSecret = () => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(18);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

const makeShortName = (value = '') => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0] || ''}.`;
};

const normalizeHrPeople = (employees = [], contractors = []) => {
  const normalize = (person, type) => {
    const fullName = `${person.nombre || ''} ${person.apellido || ''}`.trim();
    const role = person.cargo || person.modalidad || 'Sin cargo';
    const area = person.area || 'Sin area';
    return {
      key: `${type}:${person.id}`,
      id: person.id,
      type,
      sourceLabel: type === 'empleado' ? 'Planilla' : 'Complementario',
      fullName,
      shortName: makeShortName(fullName),
      role,
      area,
      phone: person.telefono || '',
      email: person.correo || '',
    };
  };

  const people = [
    ...employees.map((person) => normalize(person, 'empleado')),
    ...contractors.map((person) => normalize(person, 'locador')),
  ];

  return people
    .filter((person) => {
      const searchable = `${person.fullName} ${person.role} ${person.area}`.toLowerCase();
      return ['ventas', 'comercial', 'ejecutivo', 'asesor'].some((word) => searchable.includes(word));
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
};

const actionQueue = [
  { action: 'Asignar leads pendientes', detail: 'Kommo inicia con cola alta sin responsable.', severity: 'critical' },
  { action: 'Activar grupo Enfermeria Intensiva', detail: '318 miembros sin campana asignada.', severity: 'medium' },
  { action: 'Revisar promesa vencida', detail: 'S/ 310 pendiente con propiedad de comision por definir.', severity: 'high' },
  { action: 'Corregir acceso critico', detail: 'Caso Kasandra supero 30 minutos por autenticacion.', severity: 'high' },
];

const ACCESS_LEVELS = [
  { role: 'Ejecutivo comercial', scope: 'Nueva venta, checklist, promesas propias, plantillas activas', badge: 'Operativo' },
  { role: 'Supervisor / encargado', scope: 'Cola Kommo, ranking de equipo, grupos, reasignaciones y alertas', badge: 'Control' },
  { role: 'Jefe de ventas', scope: 'Metas, comisiones, incidencias, reportes, importador y administracion comercial', badge: 'Direccion' },
  { role: 'Gerencia', scope: 'Resumen, rentabilidad, metas, comisiones aprobadas y alertas criticas', badge: 'Lectura ejecutiva' },
  { role: 'Marketing', scope: 'UTMs, campanas, grupos, plantillas y eventos ganadores', badge: 'Lectura + fuentes' },
  { role: 'Coordinacion', scope: 'Eventos, fechas, modalidad, vacantes y estado academico', badge: 'Lectura coordinacion' },
];

const EXPECTED_MIX = { C: 35, CM: 15, D: 50 };
const CHART_COLORS = ['#020873', '#05C7F2', '#16a34a', '#f59e0b', '#ef4444', '#64748b'];
const tooltipStyle = {
  border: '1px solid rgba(15,23,42,0.08)',
  borderRadius: 14,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12),0 4px 10px rgba(0,0,0,0.06)',
  fontSize: 12,
};

const shortDate = (value = '') => {
  const [, month, day] = String(value).split('-');
  return day && month ? `${day}/${month}` : value;
};

const buildDailyTrend = (salesRows = [], dailyGoal = 60) => {
  const grouped = salesRows.reduce((acc, sale) => {
    const date = sale.sale_date || sale.created_at?.slice(0, 10) || todayISO();
    acc[date] = (acc[date] || 0) + toPositiveNumber(sale.quantity);
    return acc;
  }, {});

  const rows = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ventas]) => ({ date, dia: shortDate(date), ventas, meta: dailyGoal }));

  return rows.length ? rows : [{ date: todayISO(), dia: shortDate(todayISO()), ventas: 0, meta: dailyGoal }];
};

const buildMonthlyProgress = (dailyRows = [], globalGoal = 1800) => {
  let cumulative = 0;
  const expectedStep = dailyRows.length ? globalGoal / dailyRows.length : globalGoal;
  return dailyRows.map((row, index) => {
    cumulative += row.ventas;
    return {
      dia: row.dia,
      real: cumulative,
      ideal: Math.round(expectedStep * (index + 1)),
    };
  });
};

const buildFunnelData = (kommoMetrics, promiseMetrics, totalSales) => {
  const leads = Math.max(kommoMetrics.unassignedMessages + totalSales + 80, totalSales + 1);
  return [
    { name: 'Leads', value: leads },
    { name: 'Contactados', value: Math.max(leads - kommoMetrics.unassignedMessages, 0) },
    { name: 'Interesados', value: Math.max(totalSales + promiseMetrics.total * 18, 0) },
    { name: 'Promesas', value: Math.max(promiseMetrics.total * 18, promiseMetrics.total) },
    { name: 'Validado', value: totalSales },
  ];
};

const buildChannelData = (salesRows = []) => {
  const grouped = salesRows.reduce((acc, sale) => {
    const source = sale.source || 'Sin canal';
    acc[source] = acc[source] || { canal: source, ventas: 0, leads: 0 };
    const ventas = toPositiveNumber(sale.quantity);
    acc[source].ventas += ventas;
    acc[source].leads += Math.max(ventas + Math.ceil(ventas * 1.8), ventas);
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({ ...item, conversion: item.leads ? pctOf(item.ventas, item.leads, 1) : 0 }))
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 6);
};

function ChartCard({ title, children, action }) {
  return (
    <div className="apple-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function FunnelChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.name}>
          <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
            <span>{item.name}</span>
            <span>{item.value.toLocaleString('es-PE')}</span>
          </div>
          <div className="h-8 overflow-hidden rounded-full bg-slate-100">
            <div
              className="flex h-full items-center rounded-full px-3 text-xs font-black text-white"
              style={{ width: `${Math.max((item.value / max) * 100, 8)}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            >
              {pctOf(item.value, max, 1)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const getInitials = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((item) => item[0]?.toUpperCase())
  .join('') || 'EX';

const goalTone = (progress) => {
  if (progress >= 100) return { ring: '#10b981', soft: 'bg-emerald-50 text-emerald-700', label: 'Meta lograda' };
  if (progress >= 80) return { ring: '#05C7F2', soft: 'bg-cyan-50 text-[#020873]', label: 'En ritmo' };
  if (progress >= 50) return { ring: '#f59e0b', soft: 'bg-amber-50 text-amber-700', label: 'Por reforzar' };
  return { ring: '#ef4444', soft: 'bg-red-50 text-red-700', label: 'Critico' };
};

function ExecutiveGoalCards({ rows, onSelect, limit = 8 }) {
  const orderedRows = rows
    .filter((row) => row.executive && row.executive !== 'Sin ejecutivo')
    .sort((a, b) => (b.goalProgress || 0) - (a.goalProgress || 0));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {orderedRows.slice(0, limit).map((row, index) => {
        const progress = row.goal > 0 ? row.goalProgress : 0;
        const ringProgress = Math.min(Math.max(progress, 0), 100);
        const tone = goalTone(progress);
        return (
          <button
            key={row.executive_id}
            type="button"
            onClick={() => onSelect?.(row.executive_id)}
            className="group overflow-hidden rounded-[26px] border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="relative min-h-[190px] p-5">
              <div className="absolute inset-0 opacity-[0.055]" style={{ background: 'linear-gradient(90deg, transparent 0 35%, #020873 35% 36%, transparent 36% 64%, #020873 64% 65%, transparent 65%), radial-gradient(circle at center, #020873 0 8%, transparent 9%)' }} />
              <div className="relative flex items-center gap-5">
                <div
                  className="grid h-32 w-32 shrink-0 place-items-center rounded-full p-3"
                  style={{ background: `conic-gradient(${tone.ring} ${ringProgress * 3.6}deg, #e5e7eb 0deg)` }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-white">
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-[#020873] text-2xl font-black text-white shadow-inner">
                      {getInitials(row.executive)}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">#{index + 1}</span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${tone.soft}`}>{tone.label}</span>
                  </div>
                  <p className="mt-3 text-4xl font-black tracking-tight text-[#020873]">{progress.toFixed(3)}%</p>
                  <div className="my-3 h-1 w-40 max-w-full rounded-full bg-slate-200" />
                  <h3 className="text-xl font-black uppercase leading-6 text-[#020873]">{row.executive}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">{row.team}</p>
                  <p className="mt-3 text-sm font-black text-slate-900">
                    {Number(row.total || 0).toLocaleString('es-PE')} de {row.goal ? Number(row.goal).toLocaleString('es-PE') : 'sin meta'} ventas
                  </p>
                </div>
              </div>

              <div className="relative mt-4 grid grid-cols-3 gap-2">
                {SALES_CATEGORIES.map((category) => (
                  <div key={category} className="rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{category}</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{row[category]}</p>
                  </div>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const criticalAccessDemo = [
  { user: 'Kasandra', platform: 'Correo', type: 'Cambio de autenticacion', minutes: 45, status: 'Escalado' },
  { user: 'Usuario 1', platform: 'Kommo', type: '2FA pendiente', minutes: 25, status: 'Pendiente' },
  { user: 'Marketing', platform: 'Meta', type: 'Token por renovar', minutes: 18, status: 'En revision' },
];

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
  const navigate = useNavigate();
  const params = useParams();
  const salesRoutePath = params['*'] || '';
  const requestedPath = salesRoutePath.split('/')[0] || 'resumen';
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [sales, setSales] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [goals, setGoals] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [groups, setGroups] = useState([]);
  const [kommoQueue, setKommoQueue] = useState(DEMO_KOMMO_QUEUE);
  const [paymentPromises, setPaymentPromises] = useState(DEMO_PAYMENT_PROMISES);
  const [incidents, setIncidents] = useState(DEMO_INCIDENTS);
  const [monthlyDeliverables, setMonthlyDeliverables] = useState(DEMO_MONTHLY_DELIVERABLES);
  const [commissionModel, setCommissionModel] = useState(COMMISSION_MODEL);
  const [periodId, setPeriodId] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [activeModule, setActiveModule] = useState('resumen');
  const [allowedSalesModules, setAllowedSalesModules] = useState(SALES_SUBMODULES);
  const [saving, setSaving] = useState(false);
  const [savingExecutive, setSavingExecutive] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [hrPeople, setHrPeople] = useState([]);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
const [leadRows, setLeadRows] = useState([]);
const [eventHistory, setEventHistory] = useState([]);
const [kommoConfigs, setKommoConfigs] = useState([]);
const [savingLeadSource, setSavingLeadSource] = useState(false);
const [savingKommoConfig, setSavingKommoConfig] = useState(false);
const [leadSourceForm, setLeadSourceForm] = useState(emptyLeadSourceForm);
  const [kommoForm, setKommoForm] = useState(emptyKommoForm);
  const [newExecutive, setNewExecutive] = useState(newExecutiveInitial);
  const [pizarraUsers] = useState(() => loadLocalJson('ventas_pizarra_users', DEFAULT_PIZARRA_USERS));
  const [pizarraWaperos] = useState(() => loadLocalJson('ventas_pizarra_waperos', DEFAULT_WAPEROS));
  const [pizarraSocial, setPizarraSocial] = useState(() => loadLocalJson('ventas_pizarra_social', DEFAULT_SOCIAL_BOARD));
  const [pizarraCuts, setPizarraCuts] = useState(() => loadLocalJson('ventas_pizarra_cuts', DEFAULT_CUTS));
  const [pizarraMonthlyGoal, setPizarraMonthlyGoal] = useState(() => loadLocalNumber('ventas_meta_mensual', 1800));
  const formWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/google-form-leads`;
  const kommoWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/kommo-webhook`;

  const goToModule = useCallback((moduleId) => {
    const target = SALES_SUBMODULES.find((item) => item.id === moduleId);
    navigate(`/ventas/${target?.path || 'resumen'}`);
  }, [navigate]);

  const loadDemo = useCallback(() => {
    setUsingDemo(true);
    setSales(DEMO_SALES);
    setExecutives(DEMO_EXECUTIVES);
    setGoals(DEMO_GOALS);
    setChecklists(DEMO_CHECKLIST);
    setGroups(DEMO_GROUPS);
    setKommoQueue(DEMO_KOMMO_QUEUE);
    setPaymentPromises(DEMO_PAYMENT_PROMISES);
    setIncidents(DEMO_INCIDENTS);
    setMonthlyDeliverables(DEMO_MONTHLY_DELIVERABLES);
    setCommissionModel(COMMISSION_MODEL);
  setLeadSources([]);
  setLeadRows([]);
  setEventHistory([]);
  setKommoConfigs([]);
}, []);

  const loadSales = useCallback(async () => {
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
        kommoResponse,
        promisesResponse,
        incidentsResponse,
        deliverablesResponse,
        commissionResponse,
        employeesResponse,
        contractorsResponse,
        auditResponse,
      leadSourcesResponse,
      leadsResponse,
      eventHistoryResponse,
      kommoConfigResponse,
    ] = await Promise.all([
        supabase.from('ventas_ejecutivos').select('*').eq('status', 'active').order('short_name'),
        supabase.from('ventas_periodos').select('*').eq('year', new Date().getFullYear()).eq('month', new Date().getMonth() + 1).maybeSingle(),
        supabase.from('ventas_registros').select('*').gte('sale_date', start).lt('sale_date', end),
        supabase.from('ventas_metas').select('*'),
        supabase.from('ventas_checklists').select('*').gte('checklist_date', start).lt('checklist_date', end),
        supabase.from('ventas_grupos_whatsapp').select('*').order('members_count', { ascending: false }),
        supabase.from('ventas_kommo_turnos').select('*').order('fecha', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('ventas_promesas_pago').select('*').order('fecha_promesa', { ascending: true }).limit(20),
        supabase.from('ventas_incidencias').select('*').gte('fecha', start).lt('fecha', end),
        supabase.from('ventas_entregables_mensuales').select('*').order('id', { ascending: true }),
        supabase.from('ventas_comisiones_modelos').select('*').eq('activo', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('empleados').select('id,nombre,apellido,cargo,area,telefono,correo,estado').order('apellido'),
        supabase.from('locadores').select('id,nombre,apellido,modalidad,area,telefono,correo,estado').eq('estado', 'activo').order('apellido'),
        supabase.from('ventas_auditoria').select('*').order('created_at', { ascending: false }).limit(25),
      supabase.from('ventas_formularios_google').select('*').order('created_at', { ascending: false }),
      supabase.from('ventas_leads').select('*, ventas_ejecutivos(short_name, full_name)').order('created_at', { ascending: false }).limit(80),
      supabase.from('ventas_eventos_historico').select('*').order('periodo', { ascending: false }).limit(240),
      supabase.from('kommo_configuracion').select('*').order('created_at', { ascending: false }),
    ]);

      setHrPeople(normalizeHrPeople(employeesResponse.data || [], contractorsResponse.data || []));
      setAuditLogs(auditResponse.error ? [] : (auditResponse.data || []));
      setLeadSources(leadSourcesResponse.error ? [] : (leadSourcesResponse.data || []));
    setLeadRows(leadsResponse.error ? [] : (leadsResponse.data || []));
    setEventHistory(eventHistoryResponse.error ? [] : (eventHistoryResponse.data || []));
    setKommoConfigs(kommoConfigResponse.error ? [] : (kommoConfigResponse.data || []));
    if (!kommoConfigResponse.error && kommoConfigResponse.data?.[0]) {
      const config = kommoConfigResponse.data[0];
      setKommoForm({
        nombre: config.nombre || 'Kommo principal',
        base_url: config.base_url || '',
        account_subdomain: config.account_subdomain || '',
        integration_id: config.integration_id || '',
        client_id: config.client_id || '',
        secret_ref: config.secret_ref || '',
        webhook_secret_ref: config.webhook_secret_ref || '',
        observacion: config.observacion || '',
        estado: config.estado || 'pendiente',
      });
    }

      if (salesResponse.error || executivesResponse.error) {
        loadDemo();
        return;
      }

      const realExecutives = executivesResponse.data || [];
      const currentPeriodId = periodResponse.data?.id || null;
      const loadedGoals = goalsResponse.data || [];
      const periodGoals = currentPeriodId
        ? loadedGoals.filter((item) => String(item.period_id || '') === String(currentPeriodId))
        : loadedGoals;

      if (realExecutives.length === 0) {
        setUsingDemo(false);
        setExecutives([]);
        setPeriodId(currentPeriodId);
        setSales(salesResponse.data || []);
        setGoals(periodGoals);
        setChecklists([]);
        setGroups(groupsResponse.data || []);
        setKommoQueue(kommoResponse.error ? DEMO_KOMMO_QUEUE : normalizeKommoQueue(kommoResponse.data));
        setPaymentPromises([]);
        setIncidents([]);
        setMonthlyDeliverables(deliverablesResponse.error ? DEMO_MONTHLY_DELIVERABLES : normalizeMonthlyDeliverables(deliverablesResponse.data || []));
        setCommissionModel(commissionResponse.error ? COMMISSION_MODEL : normalizeCommissionModel(commissionResponse.data));
        return;
      }

      setUsingDemo(false);
      setExecutives(realExecutives);
      setPeriodId(currentPeriodId);
      setSales(salesResponse.data || []);
      setGoals(periodGoals);
      setChecklists((checklistResponse.data || []).map((item) => ({
        ...item,
        executive_name: realExecutives.find((exec) => exec.id === item.executive_id)?.short_name || 'Sin ejecutivo',
      })));
      setGroups(groupsResponse.data || []);
      setKommoQueue(kommoResponse.error ? DEMO_KOMMO_QUEUE : normalizeKommoQueue(kommoResponse.data));
      setPaymentPromises(promisesResponse.error ? DEMO_PAYMENT_PROMISES : normalizePaymentPromises(promisesResponse.data || [], realExecutives));
      setIncidents(incidentsResponse.error ? DEMO_INCIDENTS : normalizeIncidents(incidentsResponse.data || [], realExecutives));
      setMonthlyDeliverables(deliverablesResponse.error ? DEMO_MONTHLY_DELIVERABLES : normalizeMonthlyDeliverables(deliverablesResponse.data || []));
      setCommissionModel(commissionResponse.error ? COMMISSION_MODEL : normalizeCommissionModel(commissionResponse.data));
    } catch (error) {
      console.error('No se pudo cargar ventas:', error);
      loadDemo();
    } finally {
      setLoading(false);
    }
  }, [loadDemo]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    localStorage.setItem('ventas_pizarra_users', JSON.stringify(pizarraUsers));
  }, [pizarraUsers]);

  useEffect(() => {
    localStorage.setItem('ventas_pizarra_waperos', JSON.stringify(pizarraWaperos));
  }, [pizarraWaperos]);

  useEffect(() => {
    localStorage.setItem('ventas_pizarra_social', JSON.stringify(pizarraSocial));
  }, [pizarraSocial]);

  useEffect(() => {
    localStorage.setItem('ventas_pizarra_cuts', JSON.stringify(pizarraCuts));
  }, [pizarraCuts]);

  useEffect(() => {
    localStorage.setItem('ventas_meta_mensual', String(pizarraMonthlyGoal || 1800));
  }, [pizarraMonthlyGoal]);

  useEffect(() => {
    const loadModulePermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const requestedModule = SALES_SUBMODULES.find((item) => item.path === requestedPath || item.id === requestedPath) || SALES_SUBMODULES[0];

      const isAdmin = Boolean(user && isAdminUser(user.email));
      setCurrentUserIsAdmin(isAdmin);
      if (!user || isAdmin) {
        setAllowedSalesModules(SALES_SUBMODULES);
        setActiveModule(requestedModule.id);
        if (!salesRoutePath) navigate(`/ventas/${requestedModule.path}`, { replace: true });
        return;
      }

      const { data } = await supabase
        .from('permisos_usuarios')
        .select('modulo, puede_ver')
        .eq('user_id', user.id)
        .eq('puede_ver', true);

      const permissionSet = new Set((data || []).map((item) => item.modulo));
      const hasFullSales = permissionSet.has('Ventas');
      const modules = hasFullSales
        ? SALES_SUBMODULES
        : SALES_SUBMODULES.filter((item) => permissionSet.has(item.permission));

      const visibleModules = modules.length ? modules : SALES_SUBMODULES.slice(0, 1);
      setAllowedSalesModules(visibleModules);
      if (visibleModules.some((item) => item.id === requestedModule.id)) {
        setActiveModule(requestedModule.id);
      } else {
        setActiveModule(visibleModules[0].id);
        navigate(`/ventas/${visibleModules[0].path}`, { replace: true });
      }
    };

    loadModulePermissions();
  }, [navigate, requestedPath, salesRoutePath]);

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
  const driveMetrics = useMemo(() => buildDriveMetrics(), []);
  const importRisks = useMemo(() => buildImportRisks(), []);
  const kommoMetrics = useMemo(() => buildKommoMetrics(kommoQueue), [kommoQueue]);
  const promiseMetrics = useMemo(() => buildPromiseMetrics(paymentPromises), [paymentPromises]);
  const incidentMetrics = useMemo(() => buildIncidentMetrics(incidents), [incidents]);
  const shouldShow = (...ids) => ids.includes(activeModule);
  const canCreateSale = allowedSalesModules.some((item) => item.id === 'nueva-venta');
  const canManageSales = allowedSalesModules.some((item) => item.id === 'administracion');
  const globalGoal = useMemo(() => goals.reduce((sum, item) => sum + (Number(item.target_total) || 0), 0), [goals]);
  const globalProgress = globalGoal > 0 ? pctOf(metrics.total, globalGoal) : pctOf(metrics.total, 1800);
  const dailyGoal = Math.max(Math.ceil((globalGoal || 1800) / 30), 1);
  const dailyRequired = Math.max(Math.ceil(((globalGoal || 1800) - metrics.total) / 8), 0);
  const pizarraEffectiveMonthlyGoal = pizarraMonthlyGoal || globalGoal || 1800;
  const todaySales = useMemo(
    () => sales.filter((sale) => sale.sale_date === todayISO()).reduce((sum, sale) => sum + toPositiveNumber(sale.quantity), 0),
    [sales],
  );
  const dailyTrend = useMemo(() => buildDailyTrend(filteredSales, dailyGoal), [dailyGoal, filteredSales]);
  const monthlyProgress = useMemo(() => buildMonthlyProgress(dailyTrend, globalGoal || 1800), [dailyTrend, globalGoal]);
  const funnelData = useMemo(() => buildFunnelData(kommoMetrics, promiseMetrics, metrics.total), [kommoMetrics, metrics.total, promiseMetrics]);
  const channelData = useMemo(() => buildChannelData(filteredSales), [filteredSales]);
  const mixChartData = useMemo(() => SALES_CATEGORIES.map((item) => ({
    categoria: item,
    actual: metrics.mix[item]?.pct || 0,
    meta: EXPECTED_MIX[item],
  })), [metrics.mix]);
  const commercialRisk = alerts[0]?.message || (metrics.topFiveConcentration >= 60
    ? `Top 5 concentra ${metrics.topFiveConcentration}%`
    : 'Sin riesgo critico');
  const projection = Math.round(metrics.total + dailyRequired * 8);
  const leadStats = useMemo(() => ({
    total: leadRows.length,
    active: leadRows.filter((lead) => lead.cierre === 'ACTIVO').length,
    won: leadRows.filter((lead) => lead.cierre === 'GANADO').length,
    lost: leadRows.filter((lead) => lead.cierre === 'PERDIDO').length,
    pendingContact: leadRows.filter((lead) => !lead.fecha_contacto).length,
  }), [leadRows]);
  const pizarraStats = useMemo(() => {
    const socialTotal = pizarraSocial.reduce((sum, row) => sum + Number(row.C || 0) + Number(row.D || 0) + Number(row.Obst || 0), 0);
    const pendingCuts = pizarraCuts.filter((item) => item.estado !== 'Hecho').length;
    const availableWsp = pizarraWaperos.filter((item) => item.estado !== 'Bloqueado').length;
    return {
      socialTotal,
      pendingCuts,
      availableWsp,
      unassigned: kommoMetrics.unassignedMessages,
      redUnread: kommoMetrics.redSocialUnread,
      responseLimit: kommoMetrics.responseLimitMinutes,
      promises: promiseMetrics.total,
      expiredPromises: promiseMetrics.expired,
    };
  }, [kommoMetrics, pizarraCuts, pizarraSocial, pizarraWaperos, promiseMetrics]);

  const pizarraSocialTotals = useMemo(() => pizarraSocial.reduce((totals, row) => ({
    C: totals.C + Number(row.C || 0),
    D: totals.D + Number(row.D || 0),
    Obst: totals.Obst + Number(row.Obst || 0),
    total: totals.total + Number(row.C || 0) + Number(row.D || 0) + Number(row.Obst || 0),
  }), { C: 0, D: 0, Obst: 0, total: 0 }), [pizarraSocial]);

  const pizarraUserRows = useMemo(() => pizarraUsers.map((slot, index) => {
    const rank = ranking[index] || {};
    const assignedBase = Math.max(Math.ceil((kommoMetrics.unassignedMessages || 0) / Math.max(pizarraUsers.length, 1)), 0);
    const progress = rank.goalProgress || pctOf(rank.total || 0, dailyGoal || 1);
    return {
      ...slot,
      ejecutivo: rank.executive || slot.responsables,
      ventas: rank.total || 0,
      meta: rank.goal || dailyGoal,
      progress,
      pendientes: assignedBase + (index < (kommoMetrics.unassignedMessages % Math.max(pizarraUsers.length, 1)) ? 1 : 0),
      promesas: paymentPromises.filter((item) => item.currentExecutive === rank.executive || item.executive === rank.executive).length,
      riesgo: progress >= 90 ? 'En ritmo' : progress >= 60 ? 'Atencion' : 'Critico',
    };
  }), [dailyGoal, kommoMetrics.unassignedMessages, paymentPromises, pizarraUsers, ranking]);

  const updateCut = (id, field, value) => {
    setPizarraCuts((current) => current.map((item) => (item.id === id ? { ...item, [field]: field === 'valor' ? Number(value) || 0 : value } : item)));
  };

  const updateSocial = (canal, field, value) => {
    setPizarraSocial((current) => current.map((item) => {
      if (item.canal !== canal) return item;
      return {
        ...item,
        [field]: ['C', 'D', 'Obst'].includes(field) ? Number(value) || 0 : value,
      };
    }));
  };
  const eventAnalytics = useMemo(() => {
    const grouped = new Map();

    leadSources.forEach((source) => {
      const key = source.evento_codigo || source.nombre;
      grouped.set(key, {
        key,
        codigo: source.evento_codigo || 'Sin codigo',
        nombre: source.evento_nombre || source.nombre,
        source,
        leads: 0,
        contactados: 0,
        ganados: 0,
        perdidos: 0,
        historicoLeads: 0,
        historicoGanados: 0,
      });
    });

    leadRows.forEach((lead) => {
      const key = lead.evento_codigo || lead.evento_nombre || 'Sin evento';
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          codigo: lead.evento_codigo || 'Sin codigo',
          nombre: lead.evento_nombre || 'Sin evento',
          source: null,
          leads: 0,
          contactados: 0,
          ganados: 0,
          perdidos: 0,
          historicoLeads: 0,
          historicoGanados: 0,
        });
      }
      const item = grouped.get(key);
      item.leads += 1;
      if (lead.fecha_contacto || lead.fase !== 'LEAD NUEVO') item.contactados += 1;
      if (lead.cierre === 'GANADO') item.ganados += 1;
      if (lead.cierre === 'PERDIDO') item.perdidos += 1;
    });

    eventHistory.forEach((row) => {
      const key = row.evento_codigo || row.evento_nombre;
      if (!key) return;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          codigo: row.evento_codigo || 'Historico',
          nombre: row.evento_nombre || row.evento_codigo,
          source: null,
          leads: 0,
          contactados: 0,
          ganados: 0,
          perdidos: 0,
          historicoLeads: 0,
          historicoGanados: 0,
        });
      }
      const item = grouped.get(key);
      item.historicoLeads += Number(row.leads || 0);
      item.historicoGanados += Number(row.ganados || row.inscritos || 0);
    });

    return Array.from(grouped.values()).map((item) => {
      const conversion = item.leads ? pctOf(item.ganados, item.leads, 1) : 0;
      const historicalConversion = item.historicoLeads ? pctOf(item.historicoGanados, item.historicoLeads, 1) : 0;
      return {
        ...item,
        conversion,
        historicalConversion,
        recommendation: historicalConversion && conversion < historicalConversion
          ? 'Por debajo del historico: reforzar remarketing y asignacion de leads.'
          : conversion > 0
            ? 'Avance saludable: sostener seguimiento y cierre.'
            : 'Sin cierre aun: priorizar primer contacto y segmentacion.',
      };
    }).sort((a, b) => b.leads - a.leads);
  }, [eventHistory, leadRows, leadSources]);

  const pizarraEventRows = useMemo(() => eventAnalytics.slice(0, 4).map((item) => ({
    ...item,
    alert: item.conversion < 5 && item.leads > 0 ? 'Reforzar seguimiento' : item.conversion >= 10 ? 'Escalar cierre' : 'Medir',
  })), [eventAnalytics]);

  const followUpRows = useMemo(() => {
    if (!leadRows.length) return DEMO_FOLLOW_UPS;
    return leadRows.slice(0, 12).map((lead) => ({
      id: lead.id,
      lead: lead.nombre || 'Sin nombre',
      executive: lead.ventas_ejecutivos?.short_name || lead.ventas_ejecutivos?.full_name || 'Sin asignar',
      event: lead.evento_codigo || lead.evento_nombre || 'Sin evento',
      phase: lead.fase || 'LEAD NUEVO',
      nextAction: lead.observacion || (lead.fecha_contacto ? 'Continuar seguimiento' : 'Primer contacto pendiente'),
      sla: lead.fecha_contacto ? 'En ritmo' : 'Pendiente',
      risk: !lead.fecha_contacto ? 'alto' : lead.cierre === 'GANADO' ? 'bajo' : 'medio',
    }));
  }, [leadRows]);

  const campaignRows = useMemo(() => {
    if (!leadSources.length && !leadRows.length) return DEMO_UTM_CAMPAIGNS;
    const grouped = new Map();
    leadRows.forEach((lead) => {
      const key = lead.origen || lead.canal || 'Sin canal';
      if (!grouped.has(key)) {
        grouped.set(key, { id: key, campaign: key, source: lead.canal || 'Google Sheets', event: 'Multiples eventos', leads: 0, sales: 0, spend: 0, status: 'Medir' });
      }
      const row = grouped.get(key);
      row.leads += 1;
      if (lead.cierre === 'GANADO') row.sales += 1;
    });
    return Array.from(grouped.values()).map((row) => ({
      ...row,
      status: row.sales > 0 ? 'Rentable' : 'Observar',
    }));
  }, [leadRows, leadSources]);

  const libraryRows = useMemo(() => DEMO_LIBRARY_ITEMS, []);
  const salesShowRows = useMemo(() => DEMO_SALES_SHOWS, []);
  const coordinationRows = useMemo(() => DEMO_COORDINATION_SLA, []);

  const selectedHrPerson = useMemo(
    () => hrPeople.find((person) => person.key === newExecutive.hrPersonKey),
    [hrPeople, newExecutive.hrPersonKey],
  );

  const appendLocalAudit = useCallback((entry) => {
    setAuditLogs((current) => [
      {
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        module: 'ventas',
        ...entry,
      },
      ...current,
    ].slice(0, 25));
  }, []);

  const handleAddManualPromise = () => {
    const lead = window.prompt('Nombre del lead:');
    if (!lead?.trim()) return;

    const amountText = window.prompt('Monto S/:');
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Ingresa un monto valido para registrar la promesa.');
      return;
    }

    const newPromise = {
      id: `manual-${Date.now()}`,
      lead: lead.trim(),
      amount,
      originalExecutive: 'Manual',
      currentExecutive: 'Por asignar',
      executive: 'Por asignar',
      status: 'pendiente',
      risk: 'Alta',
      dueDate: new Date().toISOString().slice(0, 10),
    };

    setPaymentPromises((current) => [newPromise, ...current]);
    appendLocalAudit({
      action: 'promesa_manual',
      entity_type: 'ventas_promesas_pago',
      entity_id: newPromise.id,
      detail: `Nueva promesa manual: ${newPromise.lead} S/${amount.toLocaleString('es-PE')}`,
      after_data: newPromise,
    });
  };

  const logSalesAction = useCallback(async ({ action, entityType, entityId, detail, afterData }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const entry = {
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      detail,
      actor_email: user?.email || 'sistema',
      actor_id: user?.id || null,
      after_data: afterData || null,
    };

    const { error } = await supabase.from('ventas_auditoria').insert(entry);
    if (error) appendLocalAudit(entry);
  }, [appendLocalAudit]);

  const ensureCurrentSalesPeriod = useCallback(async () => {
    if (periodId) return periodId;

    const now = new Date();
    const { start } = currentMonthRange();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const payload = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      start_date: start,
      end_date: endDate,
      status: 'open',
    };

    const { data, error } = await supabase
      .from('ventas_periodos')
      .upsert(payload, { onConflict: 'year,month' })
      .select('id')
      .single();

    if (error) throw error;
    setPeriodId(data.id);
    return data.id;
  }, [periodId]);

  const handleUpdateExecutiveGoal = useCallback(async (row, value) => {
    const executiveId = Number(row.executive_id);
    if (!Number.isFinite(executiveId)) {
      alert('Primero vincula esta venta a un ejecutivo valido para asignar meta.');
      return;
    }

    const target = Number(value);
    if (!Number.isFinite(target) || target < 0) {
      alert('Ingresa una meta valida.');
      return;
    }

    const applyLocalGoal = (periodValue = periodId) => {
      setGoals((current) => {
        const existing = current.find((item) => String(item.executive_id) === String(row.executive_id));
        const nextGoal = {
          ...(existing || {}),
          executive_id: executiveId,
          period_id: periodValue,
          target_total: target,
        };
        return existing
          ? current.map((item) => (String(item.executive_id) === String(row.executive_id) ? nextGoal : item))
          : [...current, nextGoal];
      });
    };

    if (usingDemo) {
      applyLocalGoal();
      appendLocalAudit({
        action: 'actualizar_meta_demo',
        entity_type: 'ventas_metas',
        entity_id: String(row.executive_id),
        detail: `Meta demo actualizada para ${row.executive}: ${target}`,
      });
      return;
    }

    try {
      const currentPeriod = await ensureCurrentSalesPeriod();
      const payload = {
        period_id: currentPeriod,
        executive_id: executiveId,
        target_total: target,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('ventas_metas')
        .upsert(payload, { onConflict: 'period_id,executive_id' })
        .select('*')
        .single();

      if (error) throw error;
      applyLocalGoal(currentPeriod);
      await logSalesAction({
        action: 'actualizar_meta_ejecutivo',
        entityType: 'ventas_metas',
        entityId: data?.id || row.executive_id,
        detail: `Meta actualizada para ${row.executive}: ${target}`,
        afterData: data || payload,
      });
    } catch (error) {
      alert(`No se pudo actualizar la meta: ${error.message}`);
    }
  }, [appendLocalAudit, ensureCurrentSalesPeriod, logSalesAction, periodId, usingDemo]);

  const handleHrPersonChange = (value) => {
    const person = hrPeople.find((item) => item.key === value);
    setNewExecutive({
      ...newExecutive,
      hrPersonKey: value,
      full_name: person?.fullName || newExecutive.full_name,
      short_name: person?.shortName || newExecutive.short_name,
    });
  };

  const handleEditExecutive = async (exec) => {
    const newShortName = window.prompt('Actualiza el nombre corto del ejecutivo', exec.short_name || exec.full_name);
    if (!newShortName) return;
    const updatedExecutive = { ...exec, short_name: newShortName };

    if (!usingDemo) {
      const { error } = await supabase.from('ventas_ejecutivos').update({ short_name: newShortName }).eq('id', exec.id);
      if (error) {
        alert(`No se pudo actualizar el ejecutivo: ${error.message}`);
        return;
      }
    }

    setExecutives((current) => current.map((item) => (item.id === exec.id ? updatedExecutive : item)));
    await logSalesAction({
      action: 'editar_ejecutivo',
      entityType: 'ventas_ejecutivos',
      entityId: exec.id,
      detail: `Nombre corto actualizado a ${newShortName}`,
      afterData: updatedExecutive,
    });
  };

  const handleRemoveExecutive = async (exec) => {
    if (!window.confirm(`Eliminar ejecutivo ${exec.short_name || exec.full_name}?`)) return;
    if (!usingDemo) {
      const { error } = await supabase.from('ventas_ejecutivos').delete().eq('id', exec.id);
      if (error) {
        alert(`No se pudo eliminar el ejecutivo: ${error.message}`);
        return;
      }
    }

    setExecutives((current) => current.filter((item) => item.id !== exec.id));
    await logSalesAction({
      action: 'eliminar_ejecutivo',
      entityType: 'ventas_ejecutivos',
      entityId: exec.id,
      detail: `Ejecutivo eliminado ${exec.short_name || exec.full_name}`,
      afterData: exec,
    });
  };

  const handleCreateExecutive = async () => {
    const fullName = newExecutive.full_name.trim();
    if (!fullName) {
      alert('Ingresa o vincula el nombre del ejecutivo.');
      return;
    }

    const payloadBase = {
      full_name: fullName,
      short_name: newExecutive.short_name.trim() || makeShortName(fullName),
      turno: newExecutive.turno,
      role_type: 'full_time',
      status: 'active',
      start_date: todayISO(),
      phone: selectedHrPerson?.phone || null,
    };

    if (usingDemo) {
      const localExecutive = {
        id: `local-exec-${Date.now()}`,
        ...payloadBase,
        team: newExecutive.turno,
      };
      setExecutives((current) => [...current, localExecutive]);
      setNewExecutive(newExecutiveInitial);
      appendLocalAudit({
        action: 'crear_ejecutivo',
        entity_type: 'ventas_ejecutivos',
        entity_id: localExecutive.id,
        detail: `Ejecutivo creado localmente: ${payloadBase.short_name}`,
        actor_email: 'modo demo',
        after_data: localExecutive,
      });
      return;
    }

    setSavingExecutive(true);
    const linkedPayload = selectedHrPerson ? {
      ...payloadBase,
      hr_person_type: selectedHrPerson.type,
      hr_person_id: selectedHrPerson.id,
      hr_linked_at: new Date().toISOString(),
    } : payloadBase;

    let response = await supabase.from('ventas_ejecutivos').insert(linkedPayload).select('*').single();
    if (response.error && selectedHrPerson && /hr_person|schema cache|column/i.test(response.error.message || '')) {
      response = await supabase.from('ventas_ejecutivos').insert(payloadBase).select('*').single();
    }
    setSavingExecutive(false);

    if (response.error) {
      alert(`No se pudo crear el ejecutivo: ${response.error.message}`);
      return;
    }

    await logSalesAction({
      action: 'crear_ejecutivo',
      entityType: 'ventas_ejecutivos',
      entityId: response.data?.id,
      detail: selectedHrPerson
        ? `Ejecutivo vinculado a RRHH: ${payloadBase.short_name} (${selectedHrPerson.sourceLabel})`
        : `Ejecutivo creado manualmente: ${payloadBase.short_name}`,
      afterData: response.data,
    });
    setNewExecutive(newExecutiveInitial);
    loadSales();
  };

  const handleCreateLeadSource = async () => {
    const sourceName = leadSourceForm.nombre.trim();
    if (!sourceName) {
      alert('Ingresa un nombre para la fuente.');
      return;
    }

    if (!leadSourceForm.form_url.trim() && !leadSourceForm.sheet_url.trim()) {
      alert('Agrega el enlace del formulario o de la hoja de respuestas.');
      return;
    }

    const payload = {
      ...leadSourceForm,
      nombre: sourceName,
      evento_codigo: leadSourceForm.evento_codigo.trim() || null,
      evento_nombre: leadSourceForm.evento_nombre.trim() || null,
      form_url: leadSourceForm.form_url.trim() || null,
      sheet_url: leadSourceForm.sheet_url.trim() || null,
      sheet_gid: leadSourceForm.sheet_gid.trim() || null,
      canal_default: leadSourceForm.canal_default.trim() || 'Google Sheets',
      origen_default: leadSourceForm.origen_default.trim() || 'FORMULARIO',
      webhook_secret: createWebhookSecret(),
      estado: 'activo',
    };

    setSavingLeadSource(true);
    const { data, error } = await supabase.from('ventas_formularios_google').insert(payload).select('*').single();
    setSavingLeadSource(false);

    if (error) {
      alert(`No se pudo guardar la fuente: ${error.message}`);
      return;
    }

    setLeadSources((current) => [data, ...current]);
    setLeadSourceForm(emptyLeadSourceForm);
    await logSalesAction({
      action: 'crear_fuente_formulario',
      entityType: 'ventas_formularios_google',
      entityId: data.id,
      detail: `Fuente Drive/Sheets creada: ${data.nombre}`,
      afterData: data,
    });
  };

  const handleUpdateLead = async (leadId, patch) => {
    const updatedAt = new Date().toISOString();
    setLeadRows((current) => current.map((lead) => (lead.id === leadId ? { ...lead, ...patch, updated_at: updatedAt } : lead)));

    const { error } = await supabase
      .from('ventas_leads')
      .update({ ...patch, updated_at: updatedAt })
      .eq('id', leadId);

    if (error) {
      alert(`No se pudo actualizar el lead: ${error.message}`);
      loadSales();
    }
  };

const handleSyncLeadSource = async (source) => {
    if (!source.sheet_url) {
      alert('Esta fuente necesita un enlace de Google Sheets.');
      return;
    }

    if (!source.webhook_secret) {
      alert('Esta fuente no tiene API key. Crea nuevamente la fuente o asigna un secreto.');
      return;
    }

    const { data, error } = await supabase.functions.invoke('google-form-leads', {
      body: {
        action: 'sync_sheet',
        source_id: source.id,
        api_key: source.webhook_secret,
      },
    });

    if (error || data?.error) {
      alert(`No se pudo sincronizar la hoja: ${error?.message || data?.error}`);
      return;
    }

    alert(`Sincronizacion lista: ${data?.inserted || 0} lead(s) procesados.`);
  loadSales();
};

const handleSaveKommoConfig = async () => {
  const payload = {
    nombre: kommoForm.nombre.trim() || 'Kommo principal',
    base_url: kommoForm.base_url.trim() || null,
    account_subdomain: kommoForm.account_subdomain.trim() || null,
    integration_id: kommoForm.integration_id.trim() || null,
    client_id: kommoForm.client_id.trim() || null,
    secret_ref: kommoForm.secret_ref.trim() || null,
    webhook_secret_ref: kommoForm.webhook_secret_ref.trim() || null,
    observacion: kommoForm.observacion.trim() || null,
    estado: kommoForm.estado || 'pendiente',
    updated_at: new Date().toISOString(),
  };

  setSavingKommoConfig(true);
  const current = kommoConfigs[0];
  const response = current?.id
    ? await supabase.from('kommo_configuracion').update(payload).eq('id', current.id).select('*').single()
    : await supabase.from('kommo_configuracion').insert(payload).select('*').single();
  setSavingKommoConfig(false);

  if (response.error) {
    alert(`No se pudo guardar KOMMO: ${response.error.message}`);
    return;
  }

  setKommoConfigs([response.data, ...kommoConfigs.filter((item) => item.id !== response.data.id)]);
  await logSalesAction({
    action: 'configurar_kommo',
    entityType: 'kommo_configuracion',
    entityId: response.data.id,
    detail: `Configuracion KOMMO ${response.data.estado}: ${response.data.nombre}`,
    afterData: response.data,
  });
};

const handleSave = async () => {
    const quantity = toPositiveNumber(form.quantity);
    if (!form.executive_id || !Number.isFinite(quantity)) {
      alert('Selecciona ejecutivo y registra una cantidad mayor a 0.');
      return;
    }

    if (usingDemo || !periodId) {
      const executive = executives.find((item) => String(item.id) === String(form.executive_id));
      const localSale = {
        id: `local-${Date.now()}`,
        ...form,
        executive_id: form.executive_id,
        executive_name: executive?.short_name,
        quantity,
      };
      setSales((current) => [
        localSale,
        ...current,
      ]);
      appendLocalAudit({
        action: 'crear_venta',
        entity_type: 'ventas_registros',
        entity_id: localSale.id,
        detail: `Venta local registrada para ${executive?.short_name || 'Sin ejecutivo'}`,
        actor_email: usingDemo ? 'modo demo' : 'sistema',
        after_data: localSale,
      });
      setForm(emptyForm);
      return;
    }

    setSaving(true);
    const payload = {
      period_id: periodId,
      executive_id: Number(form.executive_id),
      sale_date: form.sale_date,
      category: form.category,
      quantity,
      source: form.source,
      observation: form.observation || null,
    };

    const { data, error } = await supabase.from('ventas_registros').insert(payload).select('*').single();
    setSaving(false);

    if (error) {
      alert(`No se pudo registrar la venta: ${error.message}`);
      return;
    }

    await logSalesAction({
      action: 'crear_venta',
      entityType: 'ventas_registros',
      entityId: data?.id,
      detail: `Venta prevalidada registrada: ${quantity} ${form.category}`,
      afterData: data || payload,
    });
    setForm(emptyForm);
    loadSales();
  };

  return (
    <div className="space-y-6">
      <section className="apple-hero overflow-hidden">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
              <Activity size={13} /> Cabina comercial
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Ventas
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Dashboard comercial, para el control de las ventas, caja, marketing y finanzas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadSales} className="btn-apple-secondary">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
            {canCreateSale && (
              <button onClick={() => goToModule('nueva-venta')} className="btn-apple-primary">
                <Plus size={16} /> Nueva venta
              </button>
            )}
          </div>
        </div>
      </section>

      {usingDemo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Usando datos demo porque las tablas de ventas aun no estan aplicadas en Supabase.
        </div>
      )}

      {shouldShow('pizarra') && (
        <div className="space-y-5">
          <section className="apple-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#020873] text-white">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#05C7F2]">Ventas 360</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Pizarra digital</h2>
                  <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                    Lectura diaria de asignacion, lineas WSP, promesas y cortes comerciales.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[620px]">
                {[
                  { label: 'Sin asignar', value: pizarraStats.unassigned, detail: `SLA ${pizarraStats.responseLimit} min`, tone: 'border-red-500 bg-red-50 text-red-700' },
                  { label: 'WSP activos', value: pizarraStats.availableWsp, detail: `${pizarraWaperos.length} lineas`, tone: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                  { label: 'Promesas', value: pizarraStats.promises, detail: `${pizarraStats.expiredPromises} vencidas`, tone: 'border-[#05C7F2] bg-cyan-50 text-[#020873]' },
                  { label: 'Cortes pendientes', value: pizarraStats.pendingCuts, detail: `${pizarraCuts.length} programados`, tone: 'border-amber-500 bg-amber-50 text-amber-700' },
                ].map((metric) => (
                  <div key={metric.label} className={`rounded-2xl border-l-4 bg-white p-3 shadow-sm ${metric.tone}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{metric.label}</p>
                    <p className="mt-1 text-3xl font-black leading-none">{Number(metric.value || 0).toLocaleString('es-PE')}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.2fr_0.9fr]">
            <div className="apple-card p-4">
              <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Meta mensual</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={pizarraEffectiveMonthlyGoal}
                  onChange={(event) => setPizarraMonthlyGoal(Number(event.target.value) || 1800)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xl font-black text-slate-950 outline-none focus:border-[#05C7F2]"
                />
                <span className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-black text-[#020873]">
                  {pctOf(metrics.total, pizarraEffectiveMonthlyGoal)}%
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">Objetivo operativo para lectura de pizarra.</p>
            </div>

            <div className="apple-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Redes sociales</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{pizarraSocialTotals.total.toLocaleString('es-PE')}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-black text-slate-400">C</p>
                    <p className="font-black text-slate-950">{pizarraSocialTotals.C}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-black text-slate-400">D</p>
                    <p className="font-black text-slate-950">{pizarraSocialTotals.D}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-black text-slate-400">Obst</p>
                    <p className="font-black text-slate-950">{pizarraSocialTotals.Obst}</p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">Resumen compacto de mensajes por canal.</p>
            </div>

            <div className="apple-card p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Promesa manual</p>
              <button type="button" onClick={handleAddManualPromise} className="btn-apple-primary mt-2 w-full justify-center">
                <Plus size={16} /> Agregar promesa
              </button>
              <p className="mt-2 text-xs font-medium text-slate-500">Queda registrada en auditoria local de ventas.</p>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.35fr_0.65fr]">
            <section className="apple-card overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Usuarios U1 - U6</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">Responsable, leads pendientes, meta diaria y riesgo operativo.</p>
                </div>
                <span className="badge badge-blue">Vista ejecutiva</span>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                {pizarraUserRows.map((slot) => (
                  <article key={slot.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#020873] text-sm font-black text-white">{slot.id}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{slot.responsables}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">Responsable</p>
                        </div>
                      </div>
                      <span className={`badge ${slot.riesgo === 'Critico' ? 'badge-red' : slot.riesgo === 'Atencion' ? 'badge-amber' : 'badge-green'}`}>{slot.riesgo}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Pendientes</p>
                        <p className="mt-1 text-xl font-black text-slate-950">{slot.pendientes}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Meta</p>
                        <p className="mt-1 text-xl font-black text-slate-950">{slot.meta}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Promesas</p>
                        <p className="mt-1 text-xl font-black text-[#020873]">{slot.promesas}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-black text-slate-500">
                      <span>Cumplimiento</span>
                      <span>{slot.progress}%</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
                      <div className={`h-full rounded-full ${slot.riesgo === 'Critico' ? 'bg-red-500' : slot.riesgo === 'Atencion' ? 'bg-amber-500' : 'bg-[#05C7F2]'}`} style={{ width: `${Math.min(slot.progress, 100)}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="apple-card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-black text-slate-900">Waperos</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">Estado compacto de lineas y responsables.</p>
              </div>
              <div className="space-y-2 p-4">
                {pizarraWaperos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#020873] text-xs font-black text-white">{item.id}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{item.responsable}</p>
                        <p className="text-xs font-bold text-slate-500">{item.linea}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${item.estado === 'Bloqueado' ? 'bg-red-50 text-red-700' : item.estado === 'Observado' ? 'bg-amber-50 text-amber-700' : item.estado === 'Por asignar' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{item.estado}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="apple-card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-black text-slate-900">Registro de redes</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">Cursos, diplomados, Obstetricia y mensaje activo por canal.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Canal</th>
                      <th>C</th>
                      <th>D</th>
                      <th>Obst</th>
                      <th>Total</th>
                      <th>Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pizarraSocial.map((row) => (
                      <tr key={row.canal}>
                        <td className="font-black text-slate-950">{row.canal}</td>
                        {['C', 'D', 'Obst'].map((field) => (
                          <td key={field}>
                            <input
                              type="number"
                              value={row[field]}
                              onChange={(event) => updateSocial(row.canal, field, event.target.value)}
                              className="h-9 w-16 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-black text-slate-900 outline-none focus:border-[#05C7F2]"
                            />
                          </td>
                        ))}
                        <td className="font-black text-[#020873]">{Number(row.C || 0) + Number(row.D || 0) + Number(row.Obst || 0)}</td>
                        <td>
                          <input
                            type="text"
                            value={row.mensaje || ''}
                            onChange={(event) => updateSocial(row.canal, 'mensaje', event.target.value)}
                            className="h-9 w-56 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#05C7F2]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="apple-card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-black text-slate-900">Lineas especiales</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">Numeros operativos para API, WhatsApp y asignacion rapida.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                {pizarraWaperos.filter((item) => ['443', '772', '920', '654'].includes(item.id)).map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-black text-slate-950">{item.linea}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.estado === 'Observado' ? 'bg-amber-50 text-amber-700' : item.estado === 'Bloqueado' ? 'bg-red-50 text-red-700' : item.estado === 'Por asignar' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{item.estado}</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-bold text-slate-600">{item.responsable}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="apple-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Cortes del dia</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">Seguimiento horizontal por hora, responsable y estado.</p>
              </div>
              <span className="badge badge-amber">{pizarraStats.pendingCuts} pendientes</span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
              {pizarraCuts.map((cut) => (
                <article key={cut.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-950">{cut.hora}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{cut.responsable}</p>
                    </div>
                    <input
                      type="number"
                      value={cut.valor}
                      onChange={(event) => updateCut(cut.id, 'valor', event.target.value)}
                      className="h-10 w-20 rounded-2xl border border-slate-200 bg-white px-2 text-center text-lg font-black text-[#020873] outline-none focus:border-[#05C7F2]"
                    />
                  </div>
                  <select value={cut.estado} onChange={(event) => updateCut(cut.id, 'estado', event.target.value)} className="mt-3 h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-[#05C7F2]">
                    {['Pendiente', 'Revision', 'Hecho'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                  {cut.estado !== 'Hecho' && (
                    <button type="button" onClick={() => updateCut(cut.id, 'estado', 'Hecho')} className="mt-2 h-9 w-full rounded-full bg-[#020873] px-3 text-xs font-black text-white transition hover:bg-[#05C7F2] hover:text-[#020873]">
                      Marcar hecho
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="apple-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Accion inmediata</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">Tres eventos criticos para seguimiento comercial.</p>
              </div>
              <span className="badge badge-blue">{pizarraEventRows.length} eventos evaluados</span>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
              {pizarraEventRows.slice(0, 3).map((item) => (
                <article key={item.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{item.codigo}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{item.nombre}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${item.alert === 'Escalar cierre' ? 'bg-emerald-50 text-emerald-700' : item.alert === 'Reforzar seguimiento' ? 'bg-amber-50 text-amber-700' : 'bg-cyan-50 text-[#020873]'}`}>{item.alert}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Leads</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{item.leads}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Gan.</p>
                      <p className="mt-1 text-lg font-black text-emerald-700">{item.ganados}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Conv.</p>
                      <p className="mt-1 text-lg font-black text-[#020873]">{item.conversion}%</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}


      {shouldShow('resumen') && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Target} label="Meta del mes" value={`${globalProgress}%`} sub={`${metrics.total.toLocaleString('es-PE')} de ${(globalGoal || 1800).toLocaleString('es-PE')} - Proy. ${projection.toLocaleString('es-PE')}`} tone={globalProgress < 80 ? 'amber' : 'green'} />
        <MetricCard icon={Trophy} label="Hoy" value={todaySales.toLocaleString('es-PE')} sub={`Meta diaria ${dailyGoal}. Faltan ${Math.max(dailyGoal - todaySales, 0)}`} tone={todaySales < dailyGoal ? 'amber' : 'green'} />
        <MetricCard icon={MessageCircle} label="Leads pendientes" value={kommoMetrics.unassignedMessages} sub={`${kommoMetrics.redSocialUnread} redes sin leer - SLA ${kommoMetrics.responseLimitMinutes} min`} tone="red" />
        <MetricCard icon={AlertTriangle} label="Riesgo comercial" value={alerts.length ? 'Alto' : 'Bajo'} sub={commercialRisk} tone={alerts.length ? 'red' : 'green'} />
      </div>}

      {shouldShow('resumen') && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Tendencia diaria de ventas">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="salesTrend" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#05C7F2" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#05C7F2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="ventas" stroke="#020873" fill="url(#salesTrend)" strokeWidth={3} />
                  <Line type="monotone" dataKey="meta" stroke="#05C7F2" strokeDasharray="6 4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Avance mensual acumulado">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="real" stroke="#020873" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="ideal" stroke="#05C7F2" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {shouldShow('__oculto') && (
        <div className="apple-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">ConexiÃ³n RRHH</p>
              <h3 className="mt-3 text-2xl font-black text-slate-900">{hrPeople.length} perfiles comerciales detectados</h3>
              <p className="mt-2 text-sm text-slate-500">
                Los ejecutivos de Ventas pueden vincularse con el directorio corporativo de RR.HH. para registrar roles y turnos reales.
              </p>
            </div>
            <button onClick={() => navigate('/rrhh/directorio')} className="btn-apple-secondary inline-flex items-center gap-2">
              <Users size={16} /> Ver directorio RRHH
            </button>
          </div>
        </div>
      )}

      {shouldShow('resumen') && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <ChartCard title="Embudo Kommo">
            <FunnelChart data={funnelData} />
          </ChartCard>

          <ChartCard title="Ranking visual por ejecutivo">
            <ExecutiveGoalCards rows={ranking} limit={2} onSelect={() => goToModule('ranking')} />
          </ChartCard>
        </div>
      )}

      {shouldShow('resumen') && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Mix C / CM / D">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mixChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 12, fill: '#334155' }} width={42} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="meta" fill="#dbeafe" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="actual" fill="#020873" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Conversion por canal">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="canal" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="ventas" radius={[8, 8, 0, 0]}>
                    {channelData.map((item, index) => <Cell key={item.canal} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {shouldShow('resumen') && (
        <div className="apple-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <Bell size={19} className="text-red-500" /> Alertas accionables
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[...alerts.slice(0, 4), ...actionQueue].slice(0, 4).map((item) => (
              <button key={item.action || item.message} onClick={() => goToModule(item.type === 'Riesgo de meta' ? 'metas' : 'kommo')} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${severityClass[item.severity] || severityClass.medium}`}>
                <p className="text-sm font-black">{item.action || item.type}</p>
                <p className="mt-1 text-xs font-semibold leading-5">{item.detail || item.message}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {shouldShow('importador') && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileText} label="Fuentes Drive" value={driveMetrics.totalFiles} sub={`${driveMetrics.excelFiles} Excel, ${driveMetrics.markdownFiles} Markdown`} />
        <MetricCard icon={BarChart3} label="Hojas auditadas" value={driveMetrics.totalSheets} sub={`${driveMetrics.totalRows.toLocaleString('es-PE')} filas detectadas`} tone="green" />
        <MetricCard icon={AlertTriangle} label="Riesgos importacion" value={importRisks.high + importRisks.medium} sub={`${importRisks.high} altos, ${importRisks.medium} medios`} tone="amber" />
        <MetricCard icon={CheckCircle2} label="Controles caja" value={importRisks.paymentControls} sub="Voucher, cuenta, titular y programa" tone="green" />
      </div>}

      {shouldShow('nueva-venta') && (
        <div className="apple-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Nueva venta validable</h2>
              <p className="text-xs font-medium text-slate-500">No cuenta para ranking definitivo hasta que Caja confirme el pago.</p>
            </div>
            <span className="badge badge-amber">Pendiente de validacion</span>
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
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar venta prevalidada'}
            </button>
          </div>
        </div>
      )}

      {shouldShow('ranking') && (
        <>
          <section className="apple-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Metas individuales por ejecutivo</h2>
                <p className="text-xs font-medium text-slate-500">Comparativo visual de avance real contra meta asignada para cada ejecutivo.</p>
              </div>
              <span className="badge badge-blue">{ranking.filter((row) => row.goal > 0).length} con meta activa</span>
            </div>
            <div className="p-5">
              <ExecutiveGoalCards rows={ranking} onSelect={() => goToModule('metas')} />
            </div>
          </section>

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
        </>
      )}

      {(shouldShow('kommo') || shouldShow('reportes')) && <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {shouldShow('kommo') && <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <MessageCircle size={19} className="text-blue-600" /> Cola Kommo y tablero de turno
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Sustituye la pizarra acrilica por control de asignacion, SLA y canales pendientes.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            {[
              ['Usuarios activos', kommoMetrics.activeUsers, 'Base para distribuir automaticamente'],
              ['Sin responder', kommoMetrics.unassignedMessages, 'No deben iniciar el dia sin responsable'],
              ['Redes sin leer', kommoMetrics.redSocialUnread, 'Recepcion y marketing deben tener corte visible'],
              ['Numeros WSP', kommoMetrics.whatsappNumbersAvailable, 'Inventario operativo por turno'],
              ['SLA respuesta', `${kommoMetrics.responseLimitMinutes} min`, 'Si excede, reasignacion con trazabilidad'],
              ['Estado', kommoMetrics.assignmentRisk, 'Automatizacion prioritaria'],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>}

        {shouldShow('reportes') && <div className="apple-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <FileText size={19} className="text-blue-600" /> Reportes comerciales
          </h2>
          <p className="mb-4 text-xs font-medium leading-5 text-slate-500">
            Genera sustento mensual para direccion, marketing, caja y finanzas sin rehacer Excel manual.
          </p>
          <div className="space-y-3">
            {monthlyDeliverables.map((item) => (
              <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.owner} - {item.window}</p>
                  </div>
                  <span className="badge badge-blue">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>}
      </div>}

      {shouldShow('kommo') && (
        <div className="apple-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Database size={19} className="text-blue-600" /> Leads desde Drive/Sheets
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Bandeja alimentada por hojas Google Sheets, formularios vinculados, campaÃ±as WSP y cargas manuales por evento.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
              {[
                ['Total', leadStats.total],
                ['Activos', leadStats.active],
                ['Ganados', leadStats.won],
                ['Sin contacto', leadStats.pendingContact],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="text-lg font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table min-w-[1180px]">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contacto</th>
                  <th>Evento</th>
                  <th>Origen</th>
                  <th>Fase</th>
                  <th>Observacion</th>
                  <th>Cierre</th>
                  <th>Fecha contacto</th>
                </tr>
              </thead>
              <tbody>
                {leadRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm font-medium text-slate-400">
                      Aun no hay leads sincronizados. Registra una fuente en Configuracion y conecta el webhook.
                    </td>
                  </tr>
                ) : leadRows.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <p className="font-bold text-slate-900">{lead.nombre || 'Sin nombre'}</p>
                      <p className="text-[11px] text-slate-400">{lead.profesion || lead.departamento || 'Sin detalle'}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-700">{lead.telefono || '-'}</p>
                      <p className="text-[11px] text-slate-400">{lead.correo || '-'}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-700">{lead.evento_codigo || '-'}</p>
                      <p className="max-w-[220px] truncate text-[11px] text-slate-400">{lead.evento_nombre || '-'}</p>
                    </td>
                    <td><span className="badge badge-blue">{lead.origen || lead.canal || 'FORMULARIO'}</span></td>
                    <td>
                      <select
                        className="erp-input min-w-[150px]"
                        value={lead.fase || 'LEAD NUEVO'}
                        onChange={(event) => handleUpdateLead(lead.id, { fase: event.target.value })}
                      >
                        {LEAD_PHASES.map((phase) => <option key={phase}>{phase}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        className="erp-input min-w-[220px]"
                        value={lead.observacion || ''}
                        onChange={(event) => setLeadRows((current) => current.map((item) => (item.id === lead.id ? { ...item, observacion: event.target.value } : item)))}
                        onBlur={(event) => handleUpdateLead(lead.id, { observacion: event.target.value })}
                        placeholder="Observacion comercial"
                      />
                    </td>
                    <td>
                      <select
                        className="erp-input min-w-[120px]"
                        value={lead.cierre || 'ACTIVO'}
                        onChange={(event) => handleUpdateLead(lead.id, { cierre: event.target.value })}
                      >
                        {LEAD_CLOSURES.map((closure) => <option key={closure}>{closure}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        className="erp-input min-w-[150px]"
                        type="date"
                        value={lead.fecha_contacto || ''}
                        onChange={(event) => handleUpdateLead(lead.id, { fecha_contacto: event.target.value || null })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shouldShow('seguimiento') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="apple-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <ClipboardList size={19} className="text-blue-600" /> Seguimiento comercial
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Prioriza proximas acciones por lead, ejecutivo, evento y SLA sin abrir hojas externas.
                </p>
              </div>
              <span className="badge badge-blue">{followUpRows.length} acciones visibles</span>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Ejecutivo</th>
                    <th>Evento</th>
                    <th>Fase</th>
                    <th>Proxima accion</th>
                    <th>SLA</th>
                    <th>Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {followUpRows.map((row) => (
                    <tr key={row.id}>
                      <td className="font-bold text-slate-900">{row.lead}</td>
                      <td>{row.executive}</td>
                      <td>{row.event}</td>
                      <td><span className="badge badge-blue">{row.phase}</span></td>
                      <td className="max-w-sm text-xs font-medium leading-5 text-slate-500">{row.nextAction}</td>
                      <td><span className={`badge ${row.sla === 'Vencido' || row.sla === 'Critico' ? 'badge-red' : row.sla === 'Pendiente' ? 'badge-amber' : 'badge-green'}`}>{row.sla}</span></td>
                      <td><span className={`badge ${row.risk === 'alto' ? 'badge-red' : row.risk === 'medio' ? 'badge-amber' : 'badge-green'}`}>{row.risk}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <MetricCard icon={Clock} label="Pendientes SLA" value={followUpRows.filter((row) => row.sla !== 'En ritmo').length} sub="Primer contacto, promesas y tareas abiertas" tone="amber" />
            <MetricCard icon={AlertTriangle} label="Riesgo alto" value={followUpRows.filter((row) => row.risk === 'alto').length} sub="Requiere supervisor o reasignacion" tone="red" />
            <div className="apple-card p-5">
              <h2 className="mb-4 text-sm font-black uppercase tracking-[0.12em] text-slate-700">Reglas operativas</h2>
              {['Ningun lead sin duenio al cierre de turno.', 'Promesa vencida pasa a revision de supervisor.', 'Observacion obligatoria antes de marcar perdido.', 'Primer contacto dentro del SLA configurado.'].map((item) => (
                <div key={item} className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600 last:mb-0">{item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {shouldShow('eventos') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="apple-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Database size={19} className="text-blue-600" /> Curso y eventos
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Controla cada taller, curso o diplomado desde su hoja Drive y compara contra el historico.
                </p>
              </div>
              <span className="badge badge-blue">{eventAnalytics.length} eventos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Leads</th>
                    <th>Contactados</th>
                    <th>Ganados</th>
                    <th>Conversion</th>
                    <th>Historico</th>
                    <th>Recomendacion</th>
                  </tr>
                </thead>
                <tbody>
                  {eventAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm font-medium text-slate-400">
                        Registra una fuente Drive/Sheets por evento para iniciar el tablero.
                      </td>
                    </tr>
                  ) : eventAnalytics.map((event) => (
                    <tr key={event.key}>
                      <td>
                        <p className="font-bold text-slate-900">{event.nombre}</p>
                        <p className="text-[11px] font-medium text-slate-400">{event.codigo}</p>
                      </td>
                      <td className="font-black text-slate-900">{event.leads}</td>
                      <td>{event.contactados}</td>
                      <td><span className="badge badge-green">{event.ganados}</span></td>
                      <td>
                        <div className="min-w-[120px]">
                          <div className="mb-1 flex justify-between text-[11px] font-bold text-slate-500">
                            <span>{event.conversion}%</span>
                            <span>{event.perdidos} perdidos</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#020873]" style={{ width: `${Math.min(event.conversion, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        {event.historicoLeads ? (
                          <span className="badge badge-blue">{event.historicalConversion}% hist.</span>
                        ) : (
                          <span className="badge badge-gray">Sin historico</span>
                        )}
                      </td>
                      <td className="max-w-sm text-xs font-medium leading-5 text-slate-500">{event.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <ChartCard title="Conversion por evento">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventAnalytics.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="codigo" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="conversion" radius={[8, 8, 0, 0]}>
                      {eventAnalytics.slice(0, 8).map((item, index) => <Cell key={item.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="apple-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                <Upload size={19} className="text-blue-600" /> Datos historicos
              </h2>
              <p className="text-sm font-medium leading-6 text-slate-500">
                La base de 3 anos conviene cargarla a Supabase como historico consolidado. Drive queda como fuente, pero el analisis y recomendaciones deben correr sobre datos propios del ERP.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Registros hist.</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{eventHistory.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Fuentes Drive</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{leadSources.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {shouldShow('marketing') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="apple-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <BarChart3 size={19} className="text-blue-600" /> Campanas, UTMs y marketing
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Conecta campana, lead, venta, descuento y resultado para decidir donde invertir.
                </p>
              </div>
              <span className="badge badge-blue">{campaignRows.length} fuentes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[880px]">
                <thead>
                  <tr>
                    <th>Campana</th>
                    <th>Fuente</th>
                    <th>Evento</th>
                    <th>Leads</th>
                    <th>Ventas</th>
                    <th>Conversion</th>
                    <th>CPL</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignRows.map((row) => {
                    const conversion = row.leads ? pctOf(row.sales, row.leads, 1) : 0;
                    const cpl = row.spend && row.leads ? row.spend / row.leads : 0;
                    return (
                      <tr key={row.id || row.campaign}>
                        <td className="font-bold text-slate-900">{row.campaign}</td>
                        <td>{row.source}</td>
                        <td>{row.event}</td>
                        <td>{row.leads}</td>
                        <td className="font-black text-blue-700">{row.sales}</td>
                        <td>{conversion}%</td>
                        <td>{cpl ? `S/ ${cpl.toFixed(2)}` : '-'}</td>
                        <td><span className={`badge ${row.status === 'Rentable' || row.status === 'Escalar' ? 'badge-green' : row.status === 'Medir' ? 'badge-blue' : 'badge-amber'}`}>{row.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <ChartCard title="Ventas por fuente">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="source" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                      {campaignRows.map((item, index) => <Cell key={item.id || item.campaign} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <div className="apple-card p-5">
              <h2 className="mb-4 text-sm font-black uppercase tracking-[0.12em] text-slate-700">Decision comercial</h2>
              <p className="text-sm font-medium leading-6 text-slate-500">
                Las campanas con conversion saludable deben alimentar show de ventas y remarketing. Las campanas sin cierre quedan en observacion para revisar mensaje, publico y descuento.
              </p>
            </div>
          </div>
        </div>
      )}

      {shouldShow('importador') && <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <FileText size={19} className="text-blue-600" /> Auditoria Drive y fuentes comerciales
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Archivos descargados: eventos, UTMs, ranking, seguimiento, estrategias y plantillas.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Fuente</th>
                  <th>Area</th>
                  <th>Hojas</th>
                  <th>Uso operativo</th>
                </tr>
              </thead>
              <tbody>
                {DRIVE_FILES.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.fields.slice(0, 4).join(' / ')}</p>
                    </td>
                    <td><span className="badge badge-blue">{item.area}</span></td>
                    <td className="font-black">{item.sheets.length}</td>
                    <td className="max-w-md text-xs font-medium leading-5 text-slate-500">{item.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <BarChart3 size={19} className="text-blue-600" /> Formulas que deben quedar automatizadas
            </h2>
            <div className="space-y-3">
              {DRIVE_FORMULAS.map((item) => (
                <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-900">{item.name}</p>
                  <p className="mt-1 font-mono text-[11px] font-bold text-blue-700">{item.formula}</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{item.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <AlertTriangle size={19} className="text-amber-500" /> Alertas de datos
            </h2>
            <div className="space-y-3">
              {DRIVE_PROCESS_ALERTS.map((item) => (
                <div key={item.title} className={`rounded-2xl border p-4 text-sm font-semibold ${
                  item.severity === 'high' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                  <p className="font-black">{item.title}</p>
                  <p className="mt-1 text-xs leading-5">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>}

      {(shouldShow('checklist') || shouldShow('grupos')) && <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {shouldShow('checklist') && <div className="apple-card p-5">
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
        </div>}

        {shouldShow('grupos') && <div className="apple-card overflow-hidden">
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
        </div>}
      </div>}

      {(shouldShow('promesas') || shouldShow('comisiones')) && <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {shouldShow('promesas') && <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Clock size={19} className="text-blue-600" /> Promesas de pago y propiedad de comision
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Evita mezclar comisiones cuando una base se reasigna por demora.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Original</th>
                  <th>Actual</th>
                  <th>Promesa</th>
                  <th>Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {paymentPromises.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-bold text-slate-900">{item.lead}</p>
                      <p className="text-[11px] text-slate-400">S/ {item.amount}</p>
                    </td>
                    <td>{item.originalExecutive}</td>
                    <td>{item.currentExecutive}</td>
                    <td>
                      <span className={`badge ${item.status === 'vencida' ? 'badge-red' : item.status === 'por_vencer' ? 'badge-amber' : 'badge-green'}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-xs font-medium text-slate-500">{item.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>}

        {shouldShow('comisiones') && <div className="apple-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <Gift size={19} className="text-blue-600" /> Comisiones e incidencias
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Meta</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{commissionModel.monthlyGoal}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Incidencias</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{incidentMetrics.totalIncidents}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Ajuste sugerido</p>
              <p className="mt-2 text-2xl font-black text-emerald-600">-{incidentMetrics.currentDiscount - incidentMetrics.suggestedDiscount}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {commissionModel.weights.map((item) => (
              <div key={item.category} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.category}</p>
                  <p className="text-xs text-slate-500">Mix meta {item.mix}%</p>
                </div>
                <span className="text-lg font-black text-slate-900">S/ {item.unit}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">Beneficios no monetarios</p>
            <ul className="mt-3 space-y-2 text-sm font-medium text-blue-900">
              {commissionModel.benefits.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </div>
        </div>}
      </div>}

      {/* SecciÃ³n 'Plan de mejora del area' removida segÃºn solicitud */}

      {shouldShow('importador', 'administracion') && <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {shouldShow('importador') && <div className="apple-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <Clock size={19} className="text-blue-600" /> Fases de importacion Drive
          </h2>
          <div className="space-y-3">
            {DRIVE_IMPORT_PHASES.map((item) => (
              <div key={item.phase} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.phase}. {item.name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{item.owner} - {item.output}</p>
                  </div>
                  <span className={`badge ${item.status === 'Listo en ERP' ? 'badge-green' : 'badge-amber'}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* Reglas Caja removidas del mÃ³dulo segÃºn solicitud */}
      </div>}

      {shouldShow('metas') && (
        <div className="space-y-6">
          <section className="apple-card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Target size={19} className="text-blue-600" /> Tablero de metas individuales
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Cada ejecutivo se mide contra su propia meta mensual asignada.</p>
            </div>
            <div className="p-5">
              <ExecutiveGoalCards rows={ranking} onSelect={() => goToModule('ranking')} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="apple-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                <Target size={19} className="text-blue-600" /> Metas y proyeccion
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Meta mensual', globalGoal || 180, 'Cantidad objetivo'],
                  ['Avance actual', `${globalProgress}%`, 'Ventas / meta'],
                  ['Brecha faltante', Math.max((globalGoal || 180) - metrics.total, 0), 'Registros pendientes'],
                  ['Venta diaria req.', dailyRequired || 0, 'Proyeccion 8 dias'],
                ].map(([label, value, detail]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="apple-card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <BarChart3 size={19} className="text-blue-600" /> Metas por ejecutivo
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Ejecutivo</th>
                      <th>Meta</th>
                      <th>Avance</th>
                      <th>Brecha</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row) => (
                      <tr key={`goal-${row.executive_id}`}>
                        <td className="font-bold text-slate-900">{row.executive}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            defaultValue={row.goal || ''}
                            onBlur={(event) => handleUpdateExecutiveGoal(row, event.target.value || 0)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') event.currentTarget.blur();
                            }}
                            disabled={!Number.isFinite(Number(row.executive_id))}
                            className="h-9 w-24 rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-black text-slate-900 outline-none focus:border-[#05C7F2]"
                            placeholder="0"
                          />
                        </td>
                        <td>{row.goalProgress}%</td>
                        <td>{row.goal ? Math.max(row.goal - row.total, 0) : '-'}</td>
                        <td><span className={`badge ${row.goalProgress < 65 ? 'badge-red' : row.goalProgress < 80 ? 'badge-amber' : 'badge-green'}`}>{row.goalProgress < 65 ? 'Critico' : row.risk}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {shouldShow('biblioteca') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="apple-card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <FileText size={19} className="text-blue-600" /> Biblioteca comercial
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Brochures, guiones y plantillas aprobadas para no vender con informacion desactualizada.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Tipo</th>
                    <th>Responsable</th>
                    <th>Uso</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {libraryRows.map((item) => (
                    <tr key={item.id}>
                      <td className="font-bold text-slate-900">{item.name}</td>
                      <td>{item.type}</td>
                      <td>{item.owner}</td>
                      <td className="max-w-sm text-xs font-medium leading-5 text-slate-500">{item.usage}</td>
                      <td><span className={`badge ${item.status === 'Aprobado' || item.status === 'Activo' ? 'badge-green' : 'badge-amber'}`}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="apple-card p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.12em] text-slate-700">Gobierno de contenido</h2>
            {['Cada plantilla debe tener responsable y version.', 'Marketing actualiza brochure; ventas valida utilidad.', 'KOMMO usa solo mensajes aprobados.', 'Reportar error crea solicitud de actualizacion.'].map((item) => (
              <div key={item} className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900 last:mb-0">{item}</div>
            ))}
          </div>
        </div>
      )}

      {shouldShow('show') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="apple-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Trophy size={19} className="text-blue-600" /> Show de ventas y clientes potenciales
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">Mide reuniones comerciales, moderadores, leads calientes y cierres generados.</p>
              </div>
              <span className="badge badge-blue">{salesShowRows.length} reuniones</span>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Fecha</th>
                    <th>Moderador</th>
                    <th>Meta</th>
                    <th>Asistentes</th>
                    <th>Calientes</th>
                    <th>Cierres</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {salesShowRows.map((item) => (
                    <tr key={item.id}>
                      <td className="font-bold text-slate-900">{item.event}</td>
                      <td>{item.date}</td>
                      <td>{item.moderator}</td>
                      <td>{item.target}</td>
                      <td>{item.attendees}</td>
                      <td className="font-black text-amber-600">{item.hotLeads}</td>
                      <td className="font-black text-blue-700">{item.closed}</td>
                      <td><span className={`badge ${item.status === 'En seguimiento' ? 'badge-green' : item.status === 'Programado' ? 'badge-blue' : 'badge-amber'}`}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ChartCard title="Cierres por show">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesShowRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="event" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="closed" fill="#020873" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {shouldShow('coordinacion') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="apple-card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <ClipboardCheck size={19} className="text-blue-600" /> Coordinacion academica
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Consultas internas con SLA para fechas, docentes, certificaciones, temarios y vacantes.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Solicitud</th>
                    <th>Responsable</th>
                    <th>Prioridad</th>
                    <th>SLA</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {coordinationRows.map((item) => (
                    <tr key={item.id}>
                      <td className="font-bold text-slate-900">{item.event}</td>
                      <td className="max-w-sm text-xs font-medium leading-5 text-slate-500">{item.request}</td>
                      <td>{item.owner}</td>
                      <td><span className={`badge ${item.priority === 'Alta' ? 'badge-red' : 'badge-amber'}`}>{item.priority}</span></td>
                      <td>{item.slaHours} h</td>
                      <td><span className={`badge ${item.status === 'Resuelto' ? 'badge-green' : item.status === 'En proceso' ? 'badge-blue' : 'badge-amber'}`}>{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="apple-card p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.12em] text-slate-700">Impacto en ventas</h2>
            <p className="text-sm font-medium leading-6 text-slate-500">
              Si coordinacion demora, ventas pierde cierres por falta de fecha, docente o certificacion clara. Este tablero convierte consultas academicas en tareas trazables.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Abiertas</p>
                <p className="mt-2 text-2xl font-black text-amber-800">{coordinationRows.filter((item) => item.status !== 'Resuelto').length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">Resueltas</p>
                <p className="mt-2 text-2xl font-black text-emerald-800">{coordinationRows.filter((item) => item.status === 'Resuelto').length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {shouldShow('plantillas') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <FileText size={19} className="text-blue-600" /> Plantillas comerciales
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {['Primera respuesta', 'Seguimiento 1', 'Promesa de pago', 'Cierre urgente', 'Objecion precio', 'Plantilla Kommo'].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">{item}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Estado: aprobada / activa / obsoleta</p>
                </div>
              ))}
            </div>
          </div>
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <ClipboardList size={19} className="text-blue-600" /> Versionado recomendado
            </h2>
            <div className="space-y-3">
              {['Producto asociado', 'Responsable aprobador', 'Ultima actualizacion', 'Uso recomendado', 'Codigo o link Kommo'].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
                  <CheckCircle2 size={17} className="shrink-0 text-blue-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {shouldShow('accesos') && (
        <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <ShieldAlert size={19} className="text-red-500" /> Accesos criticos y bitacora 2FA
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Registra bloqueos de Kommo, WhatsApp, Meta, correo y cambios de autenticacion.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Plataforma</th>
                  <th>Tipo</th>
                  <th>Minutos perdidos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {criticalAccessDemo.map((item) => (
                  <tr key={`${item.user}-${item.platform}`}>
                    <td className="font-bold text-slate-900">{item.user}</td>
                    <td>{item.platform}</td>
                    <td>{item.type}</td>
                    <td className={item.minutes > 30 ? 'font-black text-red-600' : 'font-black text-amber-600'}>{item.minutes}</td>
                    <td><span className={`badge ${item.minutes > 30 ? 'badge-red' : 'badge-amber'}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shouldShow('alertas') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <Bell size={19} className="text-red-500" /> Motor de alertas inteligentes
            </h2>
            <div className="space-y-3">
              {[...alerts, ...DRIVE_PROCESS_ALERTS.map((item) => ({ type: item.title, severity: item.severity, message: item.detail }))].map((alert) => (
                <div key={`${alert.type}-${alert.message}`} className={`rounded-2xl border p-4 ${severityClass[alert.severity] || severityClass.medium}`}>
                  <p className="text-xs font-black uppercase tracking-wider">{alert.type}</p>
                  <p className="mt-1 text-sm font-semibold leading-5">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <Database size={19} className="text-blue-600" /> Condiciones automaticas
            </h2>
            <div className="space-y-3">
              {[
                'Top 5 supera 60% de concentracion.',
                'Ejecutivo bajo 80% de meta.',
                'Lead sin respuesta por mas de 10 minutos.',
                'Grupo de mas de 200 miembros sin campana.',
                'Acceso critico supera 30 minutos perdidos.',
                'Venta sin canal, evento o ejecutivo.',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600">{item}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {shouldShow('administracion') && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <Database size={19} className="text-blue-600" /> Fuentes Drive/Sheets
            </h2>
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-950">Webhook Supabase</p>
              <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-[11px] font-semibold text-blue-900">
                {formWebhookUrl || 'Configura VITE_SUPABASE_URL para generar el endpoint'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="erp-label">Nombre de fuente</span>
                <input className="erp-input" value={leadSourceForm.nombre} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, nombre: event.target.value })} placeholder="Sondas nasogastricas - Junio" />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Codigo evento</span>
                <input className="erp-input" value={leadSourceForm.evento_codigo} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, evento_codigo: event.target.value })} placeholder="CI.COLOCACIONSONDAS-0626" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="erp-label">Evento / curso / diplomado</span>
                <input className="erp-input" value={leadSourceForm.evento_nombre} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, evento_nombre: event.target.value })} placeholder="Taller intensivo colocacion de sondas" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="erp-label">Enlace Google Form opcional</span>
                <input className="erp-input" value={leadSourceForm.form_url} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, form_url: event.target.value })} placeholder="https://docs.google.com/forms/..." />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="erp-label">Hoja de respuestas</span>
                <input className="erp-input" value={leadSourceForm.sheet_url} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, sheet_url: event.target.value })} placeholder="https://docs.google.com/spreadsheets/..." />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">GID hoja</span>
                <input className="erp-input" value={leadSourceForm.sheet_gid} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, sheet_gid: event.target.value })} placeholder="0" />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Asignacion</span>
                <select className="erp-input" value={leadSourceForm.asignacion_modo} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, asignacion_modo: event.target.value })}>
                  <option value="manual">Manual</option>
                  <option value="round_robin">Round robin</option>
                  <option value="por_turno">Por turno</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Canal por defecto</span>
                <input className="erp-input" value={leadSourceForm.canal_default} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, canal_default: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Origen por defecto</span>
                <input className="erp-input" value={leadSourceForm.origen_default} onChange={(event) => setLeadSourceForm({ ...leadSourceForm, origen_default: event.target.value })} />
              </label>
              <div className="md:col-span-2">
                <button onClick={handleCreateLeadSource} disabled={savingLeadSource} className="btn-apple-primary w-full justify-center">
                  <Save size={16} /> {savingLeadSource ? 'Guardando...' : 'Guardar fuente de leads'}
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-black text-slate-900">Fuentes registradas</p>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {leadSources.length === 0 ? (
                  <p className="p-4 text-sm font-medium text-slate-500">Aun no hay fuentes Drive/Sheets registradas.</p>
                ) : leadSources.map((source) => (
                  <div key={source.id} className="border-b border-slate-50 px-4 py-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{source.nombre}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{source.evento_codigo || 'Sin codigo'} - {source.origen_default}</p>
                      </div>
                      <span className={`badge ${source.estado === 'activo' ? 'badge-green' : source.estado === 'error' ? 'badge-red' : 'badge-amber'}`}>{source.estado}</span>
                    </div>
                    <p className="mt-2 break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-[11px] font-semibold text-slate-500">
                      source_id: {source.id} | api_key: {source.webhook_secret || 'sin secreto'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleSyncLeadSource(source)} className="btn-apple-secondary">
                        <RefreshCw size={14} /> Sincronizar hoja
                      </button>
                      {source.sheet_url && (
                        <a href={source.sheet_url} target="_blank" rel="noreferrer" className="btn-apple-secondary">
                          <FileText size={14} /> Abrir Sheet
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <MessageCircle size={19} className="text-blue-600" /> Integracion KOMMO
            </h2>
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-950">Webhook para KOMMO</p>
              <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-[11px] font-semibold text-blue-900">
                {kommoWebhookUrl || 'Configura VITE_SUPABASE_URL para generar el endpoint'}
              </p>
              <p className="mt-2 text-xs font-medium leading-5 text-blue-800">
                Guarda tokens reales como secretos de Supabase. El ERP solo almacena referencias, subdominio, pipeline y estado operativo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="erp-label">Nombre</span>
                <input className="erp-input" value={kommoForm.nombre} onChange={(event) => setKommoForm({ ...kommoForm, nombre: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Estado</span>
                <select className="erp-input" value={kommoForm.estado} onChange={(event) => setKommoForm({ ...kommoForm, estado: event.target.value })}>
                  <option value="pendiente">Pendiente</option>
                  <option value="conectado">Conectado</option>
                  <option value="error">Error</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Subdominio KOMMO</span>
                <input className="erp-input" value={kommoForm.account_subdomain} onChange={(event) => setKommoForm({ ...kommoForm, account_subdomain: event.target.value })} placeholder="miempresa" />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Base URL</span>
                <input className="erp-input" value={kommoForm.base_url} onChange={(event) => setKommoForm({ ...kommoForm, base_url: event.target.value })} placeholder="https://miempresa.kommo.com" />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Integration ID</span>
                <input className="erp-input" value={kommoForm.integration_id} onChange={(event) => setKommoForm({ ...kommoForm, integration_id: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Client ID</span>
                <input className="erp-input" value={kommoForm.client_id} onChange={(event) => setKommoForm({ ...kommoForm, client_id: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Secret ref</span>
                <input className="erp-input" value={kommoForm.secret_ref} onChange={(event) => setKommoForm({ ...kommoForm, secret_ref: event.target.value })} placeholder="KOMMO_CLIENT_SECRET" />
              </label>
              <label className="space-y-1.5">
                <span className="erp-label">Webhook secret ref</span>
                <input className="erp-input" value={kommoForm.webhook_secret_ref} onChange={(event) => setKommoForm({ ...kommoForm, webhook_secret_ref: event.target.value })} placeholder="KOMMO_WEBHOOK_SECRET" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="erp-label">Observacion tecnica</span>
                <input className="erp-input" value={kommoForm.observacion} onChange={(event) => setKommoForm({ ...kommoForm, observacion: event.target.value })} placeholder="Pipeline, responsables, campos personalizados o pendientes OAuth" />
              </label>
              <div className="md:col-span-2">
                <button onClick={handleSaveKommoConfig} disabled={savingKommoConfig} className="btn-apple-primary w-full justify-center">
                  <Save size={16} /> {savingKommoConfig ? 'Guardando...' : 'Guardar preparacion KOMMO'}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['Webhook', kommoConfigs[0]?.webhook_secret_ref ? 'Listo' : 'Pendiente'],
                ['OAuth/API', kommoConfigs[0]?.secret_ref ? 'Referenciado' : 'Pendiente'],
                ['Estado', kommoConfigs[0]?.estado || 'pendiente'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <Settings size={19} className="text-blue-600" /> Administracion comercial
            </h2>
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-black text-blue-950">Ejecutivos comerciales</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-blue-800">
                    Vincula el ejecutivo con Directorio Corporativo de RR.HH. o crea un nombre comercial temporal si todavia no existe.
                  </p>
                </div>
                <span className="badge badge-blue">{executives.length} activos</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="erp-label">Vincular desde RR.HH. (solo perfiles comerciales)</span>
                  <select className="erp-input" value={newExecutive.hrPersonKey} onChange={(event) => handleHrPersonChange(event.target.value)}>
                    <option value="">Crear manual o elegir persona</option>
                    {hrPeople.map((person) => (
                      <option key={person.key} value={person.key}>
                        {person.fullName} - {person.role} - {person.sourceLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="erp-label">Nombre completo</span>
                  <input className="erp-input" value={newExecutive.full_name} onChange={(event) => setNewExecutive({ ...newExecutive, full_name: event.target.value, short_name: newExecutive.short_name || makeShortName(event.target.value) })} placeholder="Nombre del ejecutivo" />
                </label>
                <label className="space-y-1.5">
                  <span className="erp-label">Nombre corto</span>
                  <input className="erp-input" value={newExecutive.short_name} onChange={(event) => setNewExecutive({ ...newExecutive, short_name: event.target.value })} placeholder="Ej: Maria F." />
                </label>
                <label className="space-y-1.5">
                  <span className="erp-label">Turno</span>
                  <select className="erp-input" value={newExecutive.turno} onChange={(event) => setNewExecutive({ ...newExecutive, turno: event.target.value })}>
                    <option value="manana">Manana</option>
                    <option value="tarde">Tarde</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button onClick={handleCreateExecutive} disabled={savingExecutive} className="btn-apple-primary w-full justify-center">
                    <UserPlus size={16} /> {savingExecutive ? 'Creando...' : 'Crear ejecutivo'}
                  </button>
                </div>
              </div>

              {hrPeople.length === 0 && (
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  No se detectaron perfiles comerciales en RR.HH.; puedes crear el ejecutivo manualmente y vincularlo despues.
                </p>
              )}
            </div>

            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-black text-slate-900">Ejecutivos visibles en ventas</p>
              </div>
              <div className="max-h-56 overflow-y-auto custom-scrollbar">
                {executives.length === 0 ? (
                  <p className="p-4 text-sm font-medium text-slate-500">Aun no hay ejecutivos activos. Crea el primero desde este panel.</p>
                ) : executives.map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-black text-slate-900">{exec.short_name || exec.full_name}</p>
                      <p className="text-xs font-medium text-slate-500">{exec.full_name} - {exec.turno || exec.team || 'mixto'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageSales && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditExecutive(exec)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600 transition-colors"
                            title="Editar ejecutivo"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExecutive(exec)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600 transition-colors"
                            title="Eliminar ejecutivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      <span className="badge badge-green">Activo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {['Ejecutivos', 'Equipos y turnos', 'Metas', 'Productos/eventos', 'Canales', 'Reglas de comision', 'SLA', 'Periodos'].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">{item}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Configurable desde Admin Usuarios y tablas comerciales.</p>
                </div>
              ))}
            </div>
          </div>
          {/* Niveles de acceso removidos del mÃ³dulo segÃºn solicitud */}
        </div>
      )}

      {currentUserIsAdmin && (
        <div className="apple-card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Clock size={19} className="text-blue-600" /> Historico de cambios comerciales
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Registra acciones clave del modulo Ventas: ventas creadas, ejecutivos y futuros cambios operativos.
              </p>
            </div>
            <span className="badge badge-blue">{auditLogs.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Accion</th>
                  <th>Entidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm font-medium text-slate-400">
                      Sin registros todavia. El historial se activara cuando exista la tabla ventas_auditoria o se registren cambios locales.
                    </td>
                  </tr>
                ) : auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs font-semibold text-slate-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString('es-PE') : '-'}
                    </td>
                    <td className="font-bold text-slate-900">{log.actor_email || 'sistema'}</td>
                    <td><span className="badge badge-blue">{log.action}</span></td>
                    <td className="text-sm text-slate-600">{log.entity_type || '-'}</td>
                    <td className="max-w-xl text-xs font-medium leading-5 text-slate-500">{log.detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enlaces entre modulos removidos del mÃ³dulo segÃºn solicitud */}
    </div>
  );
}
