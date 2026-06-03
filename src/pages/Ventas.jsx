import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  DEMO_MONTHLY_DELIVERABLES,
  DEMO_PAYMENT_PROMISES,
  DEMO_SALES,
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
  { id: 'resumen', path: 'resumen', label: 'Resumen ejecutivo', icon: Activity, permission: 'ventas_dashboard' },
  { id: 'nueva-venta', path: 'nueva-venta', label: 'Nueva venta', icon: Plus, permission: 'ventas_nueva_venta' },
  { id: 'ranking', path: 'ranking', label: 'Ranking comercial', icon: Trophy, permission: 'ventas_ranking' },
  { id: 'metas', path: 'metas', label: 'Metas y proyeccion', icon: Target, permission: 'ventas_metas' },
  { id: 'kommo', path: 'kommo', label: 'Cola Kommo', icon: MessageCircle, permission: 'ventas_kommo' },
  { id: 'checklist', path: 'checklist', label: 'Checklist diario', icon: ClipboardCheck, permission: 'ventas_checklist' },
  { id: 'grupos', path: 'grupos', label: 'Grupos WhatsApp', icon: Users, permission: 'ventas_grupos' },
  { id: 'promesas', path: 'promesas', label: 'Promesas de pago', icon: Clock, permission: 'ventas_promesas' },
  { id: 'comisiones', path: 'comisiones', label: 'Comisiones e incidencias', icon: Gift, permission: 'ventas_comisiones' },
  { id: 'reportes', path: 'reportes', label: 'Reportes comerciales', icon: FileText, permission: 'ventas_entregables' },
  { id: 'plantillas', path: 'plantillas', label: 'Plantillas comerciales', icon: FileText, permission: 'ventas_plantillas' },
  { id: 'accesos', path: 'accesos', label: 'Accesos criticos', icon: KeyRound, permission: 'ventas_accesos' },
  { id: 'alertas', path: 'alertas', label: 'Alertas inteligentes', icon: Bell, permission: 'ventas_alertas' },
  { id: 'importador', path: 'importador', label: 'Importador', icon: Upload, permission: 'ventas_importador' },
  { id: 'administracion', path: 'administracion', label: 'Administracion', icon: Settings, permission: 'ventas_administracion' },
];

const newExecutiveInitial = {
  hrPersonKey: '',
  full_name: '',
  short_name: '',
  turno: 'mixto',
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

const accessLevels = [
  { role: 'Ejecutivo comercial', scope: 'Nueva venta, checklist, promesas propias, plantillas activas', badge: 'Operativo' },
  { role: 'Supervisor / encargado', scope: 'Cola Kommo, ranking de equipo, grupos, reasignaciones y alertas', badge: 'Control' },
  { role: 'Jefe de ventas', scope: 'Metas, comisiones, incidencias, reportes, importador y administracion comercial', badge: 'Direccion' },
  { role: 'Gerencia', scope: 'Resumen, rentabilidad, metas, comisiones aprobadas y alertas criticas', badge: 'Lectura ejecutiva' },
  { role: 'Marketing', scope: 'UTMs, campanas, grupos, plantillas y eventos ganadores', badge: 'Lectura + fuentes' },
  { role: 'Coordinacion', scope: 'Eventos, fechas, modalidad, vacantes y estado academico', badge: 'Lectura coordinacion' },
];

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
  const [newExecutive, setNewExecutive] = useState(newExecutiveInitial);

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
      ]);

      setHrPeople(normalizeHrPeople(employeesResponse.data || [], contractorsResponse.data || []));
      setAuditLogs(auditResponse.error ? [] : (auditResponse.data || []));

      if (salesResponse.error || executivesResponse.error) {
        loadDemo();
        return;
      }

      const realExecutives = executivesResponse.data || [];
      if (realExecutives.length === 0) {
        setUsingDemo(false);
        setExecutives([]);
        setPeriodId(periodResponse.data?.id || null);
        setSales(salesResponse.data || []);
        setGoals(goalsResponse.data || []);
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
      setPeriodId(periodResponse.data?.id || null);
      setSales(salesResponse.data || []);
      setGoals(goalsResponse.data || []);
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
  const dailyRequired = Math.max(Math.ceil((globalGoal - metrics.total) / 8), 0);
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
              <Activity size={13} /> Dashboard de Ventas
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Ventas Operativas 360°
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Dashboard comercial integrado con RRHH, transparencia de gestión y un único punto de control para ventas, caja, marketing y finanzas.
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


      {shouldShow('resumen') && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Trophy} label="Ventas del periodo" value={metrics.total.toLocaleString('es-PE')} sub="Registros C + CM + D" />
        <MetricCard icon={Target} label="Avance de meta" value={`${globalProgress}%`} sub={`${dailyRequired} registros/dia requeridos`} tone={globalProgress < 80 ? 'amber' : 'green'} />
        <MetricCard icon={MessageCircle} label="Kommo sin asignar" value={kommoMetrics.unassignedMessages} sub={`${kommoMetrics.idealDistribution} mensajes aprox. por usuario`} tone="red" />
        <MetricCard icon={Clock} label="Promesas en riesgo" value={promiseMetrics.reassigned} sub={`${promiseMetrics.expired} vencida(s), S/ ${promiseMetrics.amountAtRisk} en seguimiento`} tone="red" />
      </div>}

      {shouldShow('resumen') && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Target} label="Concentracion Top 5" value={`${metrics.topFiveConcentration}%`} sub="Riesgo si supera 60%" tone="amber" />
        <MetricCard icon={ClipboardCheck} label="Checklist promedio" value={`${metrics.checklistAverage}%`} sub={`${metrics.criticalChecklists} ejecutivos criticos`} tone={metrics.checklistAverage < 60 ? 'red' : 'green'} />
        <MetricCard icon={Users} label="Grupos sin uso" value={metrics.unusedGroups} sub={`${metrics.pendingGroups} pendientes de responsable`} tone="red" />
        <MetricCard icon={Clock} label="Tiempo perdido diario" value={`${kommoMetrics.dailyLostMinutes} min`} sub={`${kommoMetrics.monthlyLostHours} h/mes por asignacion y 2FA`} tone="amber" />
      </div>}

      {shouldShow('resumen') && (
        <div className="apple-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Conexión RRHH</p>
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
        <div className="apple-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
            <Bell size={19} className="text-red-500" /> Acciones urgentes de hoy
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {actionQueue.map((item) => (
              <div key={item.action} className={`rounded-2xl border p-4 ${severityClass[item.severity] || severityClass.medium}`}>
                <p className="text-sm font-black">{item.action}</p>
                <p className="mt-1 text-xs font-semibold leading-5">{item.detail}</p>
              </div>
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

      {shouldShow('ranking', 'resumen') && <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
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
      </div>}

      {(shouldShow('kommo', 'resumen') || shouldShow('reportes')) && <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {shouldShow('kommo', 'resumen') && <div className="apple-card overflow-hidden">
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

        {shouldShow('reportes', 'resumen') && <div className="apple-card p-5">
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

      {(shouldShow('checklist', 'resumen') || shouldShow('grupos', 'resumen')) && <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {shouldShow('checklist', 'resumen') && <div className="apple-card p-5">
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

        {shouldShow('grupos', 'resumen') && <div className="apple-card overflow-hidden">
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

      {(shouldShow('promesas', 'resumen') || shouldShow('comisiones')) && <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {shouldShow('promesas', 'resumen') && <div className="apple-card overflow-hidden">
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

      {/* Sección 'Plan de mejora del area' removida según solicitud */}

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

        {/* Reglas Caja removidas del módulo según solicitud */}
      </div>}

      {shouldShow('metas') && (
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
                      <td>{row.goal || 'Sin meta'}</td>
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
          {/* Niveles de acceso removidos del módulo según solicitud */}
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

      {/* Enlaces entre modulos removidos del módulo según solicitud */}
    </div>
  );
}
