import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  Banknote,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Database,
  Download,
  FileText,
  KeyRound,
  Landmark,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { addDaysISO, formatPEN, pctOf, sumBy, toNumber, toPositiveNumber, todayISO } from '../lib/finance';
import { PAYMENT_CONTROL_RULES } from '../lib/driveInsights';

const CAJA_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'turnos', label: 'Turnos', icon: CalendarClock },
  { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
  { id: 'egresos', label: 'Egresos', icon: TrendingDown },
  { id: 'arqueo', label: 'Arqueo', icon: ClipboardCheck },
  { id: 'rendicion', label: 'Rendicion', icon: Landmark },
  { id: 'conciliacion', label: 'Conciliacion', icon: CreditCard },
  { id: 'historico', label: 'Historico', icon: Database },
  { id: 'reportes', label: 'Reportes', icon: FileText },
  { id: 'parametros', label: 'Parametros', icon: Settings },
];

const TURNOS = [
  { id: 'manana', label: 'Turno manana', short: 'Manana' },
  { id: 'noche', label: 'Turno noche', short: 'Noche' },
];

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', type: 'cash' },
  { id: 'pos', label: 'P.O.S.', type: 'digital' },
  { id: 'tarjeta', label: 'Tarjeta', type: 'digital' },
  { id: 'transferencia', label: 'Transferencia', type: 'digital' },
  { id: 'yape', label: 'Yape', type: 'digital' },
  { id: 'plin', label: 'Plin', type: 'digital' },
];

const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
const DIGITAL_METHODS = new Set(PAYMENT_METHODS.filter((item) => item.type === 'digital').map((item) => item.id));
const METHOD_COLORS = ['#05C7F2', '#020873', '#16a34a', '#f59e0b', '#ef4444', '#64748b'];

const emptyMovementForm = {
  tipo: 'ingreso',
  inscripcion_id: '',
  concepto: '',
  area: 'Caja',
  categoria: 'Matricula',
  monto: '',
  metodo_pago: 'efectivo',
  canal_pos: '',
  numero_operacion: '',
  tipo_documento: '01',
  documento_cliente: '',
  tipo_comprobante: 'boleta',
  numero_comprobante: '',
  turno: 'manana',
  responsable: '',
  comprobante_url: '',
  observacion: '',
};

const emptyShiftForm = {
  turno: 'manana',
  fecha: todayISO(),
  responsable: '',
  dni_responsable: '',
  saldo_inicial: '0',
  caja_nombre: 'Caja principal',
};

const emptyRendicionForm = {
  monto: '',
  responsable_entrega: '',
  responsable_recibe: '',
  medio: 'efectivo',
  observacion: '',
};

const normalizeTurno = (value = '') => {
  const normalized = String(value).toLowerCase();
  if (normalized.includes('noche')) return 'noche';
  if (normalized.includes('tarde')) return 'noche';
  return 'manana';
};

const badgeByStatus = (status = '') => {
  const value = status.toLowerCase();
  if (['cerrado', 'cuadrado', 'validado', 'pagado', 'conciliado'].includes(value)) return 'badge-green';
  if (['observado', 'pendiente', 'en_revision', 'abierto'].includes(value)) return 'badge-amber';
  if (['critico', 'anulado', 'diferencia'].includes(value)) return 'badge-red';
  return 'badge-blue';
};

const sanitizeText = (value = '', max = 180) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);

const escapeHtml = (value = '') => sanitizeText(value, 500)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const methodLabel = (value = '') => PAYMENT_METHODS.find((item) => item.id === value)?.label || value || 'No definido';

const movementDate = (item) => item.fecha_movimiento || item.created_at || item.fecha || new Date().toISOString();

const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const dayShort = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function Kpi({ icon: Icon, label, value, detail, tone = 'blue' }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
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
      {detail && <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{detail}</p>}
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function Caja() {
  const navigate = useNavigate();
  const params = useParams();
  const routePath = params['*'] || '';
  const activeTab = CAJA_TABS.some((tab) => tab.id === routePath) ? routePath : 'dashboard';

  const [pagos, setPagos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [historicalMovements, setHistoricalMovements] = useState([]);
  const [arqueos, setArqueos] = useState([]);
  const [rendiciones, setRendiciones] = useState([]);
  const [conciliaciones, setConciliaciones] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [reportScope, setReportScope] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [shiftForm, setShiftForm] = useState(emptyShiftForm);
  const [rendicionForm, setRendicionForm] = useState(emptyRendicionForm);
  const [arqueoCounts, setArqueoCounts] = useState(() => Object.fromEntries(DENOMINATIONS.map((value) => [String(value), ''])));

  const showToast = useCallback((message, tone = 'green') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const logAudit = useCallback(async (action, detail, afterData = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      action,
      detail,
      actor_email: user?.email || 'sistema',
      actor_id: user?.id || null,
      after_data: afterData,
    };
    const { error } = await supabase.from('caja_auditoria').insert(row);
    if (error) {
      setAuditoria((current) => [{ id: `local-${Date.now()}`, created_at: new Date().toISOString(), ...row }, ...current].slice(0, 30));
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const hoy = todayISO();
    const manana = addDaysISO(hoy, 1);
    const inicioHistorico = addDaysISO(hoy, -29);

    const [
      pagosResponse,
      egresosResponse,
      pagosHistoricosResponse,
      egresosHistoricosResponse,
      inscripcionesResponse,
      turnosResponse,
      movimientosResponse,
      movimientosHistoricosResponse,
      arqueosResponse,
      rendicionesResponse,
      conciliacionesResponse,
      auditoriaResponse,
    ] = await Promise.all([
      supabase.from('pagos').select('*, inscripciones(programa, participante_id)').gte('created_at', hoy).lt('created_at', manana).order('created_at', { ascending: false }),
      supabase.from('egresos').select('*').eq('estado', 'Pagado').gte('fecha', hoy).lt('fecha', manana).order('fecha', { ascending: false }),
      supabase.from('pagos').select('*, inscripciones(programa, participante_id)').gte('created_at', inicioHistorico).lt('created_at', manana).order('created_at', { ascending: false }).limit(800),
      supabase.from('egresos').select('*').eq('estado', 'Pagado').gte('fecha', inicioHistorico).lt('fecha', manana).order('fecha', { ascending: false }).limit(800),
      supabase.from('inscripciones').select('id, programa, monto_total, monto_pagado, estado').in('estado', ['pendiente', 'parcial']).limit(80),
      supabase.from('caja_turnos').select('*').eq('fecha', hoy).order('turno'),
      supabase.from('caja_movimientos').select('*').gte('fecha_movimiento', hoy).lt('fecha_movimiento', manana).order('created_at', { ascending: false }),
      supabase.from('caja_movimientos').select('*').gte('fecha_movimiento', inicioHistorico).lt('fecha_movimiento', manana).order('created_at', { ascending: false }).limit(1000),
      supabase.from('caja_arqueos').select('*').gte('created_at', hoy).lt('created_at', manana).order('created_at', { ascending: false }),
      supabase.from('caja_rendiciones').select('*').gte('created_at', hoy).lt('created_at', manana).order('created_at', { ascending: false }),
      supabase.from('caja_conciliaciones').select('*').gte('fecha_operacion', hoy).lt('fecha_operacion', manana).order('fecha_operacion', { ascending: false }),
      supabase.from('caja_auditoria').select('*').order('created_at', { ascending: false }).limit(30),
    ]);

    const historicalLegacy = [
      ...((pagosHistoricosResponse.error ? [] : pagosHistoricosResponse.data) || []).map((pago) => ({
        id: `pago-${pago.id}`,
        tipo: 'ingreso',
        concepto: pago.inscripciones?.programa || 'Pago de inscripcion',
        monto: toNumber(pago.monto),
        metodo_pago: pago.metodo_pago,
        turno: normalizeTurno(pago.turno),
        responsable: pago.cajera || 'Caja',
        tipo_comprobante: pago.tipo_comprobante,
        numero_comprobante: pago.numero_comprobante,
        numero_operacion: pago.numero_operacion || '',
        created_at: pago.created_at,
        estado: 'validado',
        source: 'pagos',
      })),
      ...((egresosHistoricosResponse.error ? [] : egresosHistoricosResponse.data) || []).map((egreso) => ({
        id: `egreso-${egreso.id}`,
        tipo: 'egreso',
        concepto: egreso.concepto,
        monto: toNumber(egreso.monto),
        metodo_pago: egreso.metodo_pago || 'efectivo',
        turno: normalizeTurno(egreso.turno),
        responsable: egreso.proveedor || egreso.area || 'Caja',
        tipo_comprobante: egreso.categoria,
        numero_comprobante: '',
        numero_operacion: '',
        created_at: egreso.created_at || egreso.fecha,
        estado: egreso.estado || 'Pagado',
        source: 'egresos',
      })),
    ];

    setPagos(pagosResponse.error ? [] : (pagosResponse.data || []));
    setEgresos(egresosResponse.error ? [] : (egresosResponse.data || []));
    setInscripciones(inscripcionesResponse.error ? [] : (inscripcionesResponse.data || []));
    setTurnos(turnosResponse.error ? [] : (turnosResponse.data || []));
    setMovimientos(movimientosResponse.error ? [] : (movimientosResponse.data || []));
    setHistoricalMovements(movimientosHistoricosResponse.error || !movimientosHistoricosResponse.data?.length ? historicalLegacy : (movimientosHistoricosResponse.data || []));
    setArqueos(arqueosResponse.error ? [] : (arqueosResponse.data || []));
    setRendiciones(rendicionesResponse.error ? [] : (rendicionesResponse.data || []));
    setConciliaciones(conciliacionesResponse.error ? [] : (conciliacionesResponse.data || []));
    setAuditoria(auditoriaResponse.error ? [] : (auditoriaResponse.data || []));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!routePath) navigate('/caja/dashboard', { replace: true });
  }, [navigate, routePath]);

  const legacyMovements = useMemo(() => [
    ...pagos.map((pago) => ({
      id: `pago-${pago.id}`,
      tipo: 'ingreso',
      concepto: pago.inscripciones?.programa || 'Pago de inscripcion',
      monto: toNumber(pago.monto),
      metodo_pago: pago.metodo_pago,
      turno: normalizeTurno(pago.turno),
      responsable: pago.cajera || 'Caja',
      tipo_comprobante: pago.tipo_comprobante,
      numero_comprobante: pago.numero_comprobante,
      numero_operacion: pago.numero_operacion || '',
      created_at: pago.created_at,
      estado: 'validado',
      source: 'pagos',
    })),
    ...egresos.map((egreso) => ({
      id: `egreso-${egreso.id}`,
      tipo: 'egreso',
      concepto: egreso.concepto,
      monto: toNumber(egreso.monto),
      metodo_pago: egreso.metodo_pago || 'efectivo',
      turno: normalizeTurno(egreso.turno),
      responsable: egreso.proveedor || egreso.area || 'Caja',
      tipo_comprobante: egreso.categoria,
      numero_comprobante: '',
      numero_operacion: '',
      created_at: egreso.created_at || egreso.fecha,
      estado: egreso.estado || 'Pagado',
      source: 'egresos',
    })),
  ], [egresos, pagos]);

  const allMovements = movimientos.length ? movimientos : legacyMovements;
  const reportMovements = historicalMovements.length ? historicalMovements : allMovements;
  const filteredMovements = allMovements.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${item.concepto || ''} ${item.responsable || ''} ${item.numero_comprobante || ''} ${item.numero_operacion || ''}`.toLowerCase().includes(term);
  });

  const totals = useMemo(() => {
    const ingresos = sumBy(allMovements.filter((item) => item.tipo === 'ingreso'), (item) => item.monto);
    const egresosTotal = sumBy(allMovements.filter((item) => item.tipo === 'egreso'), (item) => item.monto);
    const efectivoIngresos = sumBy(allMovements.filter((item) => item.tipo === 'ingreso' && item.metodo_pago === 'efectivo'), (item) => item.monto);
    const efectivoEgresos = sumBy(allMovements.filter((item) => item.tipo === 'egreso' && item.metodo_pago === 'efectivo'), (item) => item.monto);
    const digital = sumBy(allMovements.filter((item) => DIGITAL_METHODS.has(item.metodo_pago)), (item) => item.monto);
    const rendido = sumBy(rendiciones, (item) => item.monto);
    const saldoInicial = sumBy(turnos.filter((turno) => turno.estado !== 'anulado'), (turno) => turno.saldo_inicial);
    const saldoEsperado = saldoInicial + efectivoIngresos - efectivoEgresos - rendido;
    const ultimoArqueo = arqueos[0];
    const arqueoFisico = toNumber(ultimoArqueo?.monto_fisico);
    return {
      ingresos,
      egresos: egresosTotal,
      saldo: ingresos - egresosTotal,
      efectivoIngresos,
      efectivoEgresos,
      digital,
      rendido,
      saldoInicial,
      saldoEsperado,
      arqueoFisico,
      diferencia: ultimoArqueo ? arqueoFisico - saldoEsperado : 0,
      transacciones: allMovements.length,
    };
  }, [allMovements, arqueos, rendiciones, turnos]);

  const activeWarnings = useMemo(() => {
    const warnings = [];
    if (!turnos.length) warnings.push({ id: 'sin-turno', message: 'No hay turno abierto registrado para hoy.', tab: 'turnos' });
    if (totals.efectivoIngresos > 700 && totals.rendido === 0) warnings.push({ id: 'rendicion', message: 'Efectivo alto sin rendicion a gerencia.', tab: 'rendicion' });
    if (Math.abs(totals.diferencia) > 1) warnings.push({ id: 'arqueo', message: `Diferencia de arqueo: ${formatPEN(totals.diferencia)}.`, tab: 'arqueo' });
    const digitalSinOperacion = allMovements.filter((item) => DIGITAL_METHODS.has(item.metodo_pago) && !item.numero_operacion).length;
    if (digitalSinOperacion) warnings.push({ id: 'digital', message: `${digitalSinOperacion} pagos digitales sin numero de operacion.`, tab: 'conciliacion' });
    return warnings;
  }, [allMovements, totals, turnos.length]);

  const recentMovements = useMemo(() => (
    [...allMovements]
      .sort((a, b) => new Date(movementDate(b)).getTime() - new Date(movementDate(a)).getTime())
      .slice(0, 5)
  ), [allMovements]);

  const chartRangeDays = reportScope === '30d' ? 30 : 7;

  const trendData = useMemo(() => {
    const start = addDaysISO(todayISO(), -(chartRangeDays - 1));
    const buckets = Array.from({ length: chartRangeDays }, (_, index) => {
      const key = addDaysISO(start, index);
      return { key, dia: dayShort(key), ingresos: 0, egresos: 0, neto: 0 };
    });
    const byDate = new Map(buckets.map((item) => [item.key, item]));
    reportMovements.forEach((item) => {
      const key = dateKey(movementDate(item));
      const bucket = byDate.get(key);
      if (!bucket) return;
      if (item.tipo === 'ingreso') bucket.ingresos += toNumber(item.monto);
      if (item.tipo === 'egreso') bucket.egresos += toNumber(item.monto);
      bucket.neto = bucket.ingresos - bucket.egresos;
    });
    return buckets;
  }, [chartRangeDays, reportMovements]);

  const methodData = useMemo(() => PAYMENT_METHODS
    .map((method) => ({
      name: method.label,
      value: sumBy(allMovements.filter((item) => item.tipo === 'ingreso' && item.metodo_pago === method.id), (item) => item.monto),
    }))
    .filter((item) => item.value > 0), [allMovements]);

  const turnoData = useMemo(() => TURNOS.map((turno) => {
    const rows = allMovements.filter((item) => normalizeTurno(item.turno) === turno.id);
    return {
      turno: turno.short,
      ingresos: sumBy(rows.filter((item) => item.tipo === 'ingreso'), (item) => item.monto),
      egresos: sumBy(rows.filter((item) => item.tipo === 'egreso'), (item) => item.monto),
    };
  }), [allMovements]);

  const scopedReportMovements = useMemo(() => {
    const start = new Date(`${addDaysISO(todayISO(), -(chartRangeDays - 1))}T00:00:00`).getTime();
    return reportMovements.filter((item) => new Date(movementDate(item)).getTime() >= start);
  }, [chartRangeDays, reportMovements]);

  const arqueoFisico = useMemo(() => DENOMINATIONS.reduce((sum, value) => {
    const count = toNumber(arqueoCounts[String(value)]);
    return sum + value * count;
  }, 0), [arqueoCounts]);

  const duplicateVoucher = useMemo(() => {
    const number = movementForm.numero_comprobante.trim();
    if (!number) return false;
    return pagos.some((pago) => String(pago.numero_comprobante || '').trim() === number);
  }, [movementForm.numero_comprobante, pagos]);

  const openMovementModal = (tipo) => {
    setMovementForm({ ...emptyMovementForm, tipo, categoria: tipo === 'egreso' ? 'Operativo' : 'Matricula' });
    setModal('movimiento');
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setMovementForm(emptyMovementForm);
  };

  const exportExcel = () => {
    const rows = scopedReportMovements.map((item) => `
      <tr>
        <td>${new Date(movementDate(item)).toLocaleString('es-PE')}</td>
        <td>${escapeHtml(item.tipo)}</td>
        <td>${escapeHtml(item.concepto)}</td>
        <td>${escapeHtml(methodLabel(item.metodo_pago))}</td>
        <td>${escapeHtml(item.numero_operacion)}</td>
        <td>${escapeHtml(`${item.tipo_comprobante || ''} ${item.numero_comprobante || ''}`)}</td>
        <td>${normalizeTurno(item.turno)}</td>
        <td>${escapeHtml(item.responsable)}</td>
        <td>${toNumber(item.monto).toFixed(2)}</td>
        <td>${escapeHtml(item.estado)}</td>
      </tr>
    `).join('');
    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            <tr><th colspan="10">Reporte Caja y Pagos - ${todayISO()}</th></tr>
            <tr><th>Ingresos</th><td>${totals.ingresos.toFixed(2)}</td><th>Egresos</th><td>${totals.egresos.toFixed(2)}</td><th>Saldo esperado</th><td>${totals.saldoEsperado.toFixed(2)}</td><th>Alertas</th><td>${activeWarnings.length}</td></tr>
          </table>
          <br />
          <table border="1">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Metodo</th><th>Operacion</th><th>Comprobante</th><th>Turno</th><th>Responsable</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
    downloadBlob(html, `reporte-caja-${todayISO()}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    showToast('Reporte Excel generado.');
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    doc.setTextColor(2, 8, 115);
    doc.setFontSize(18);
    doc.text('Reporte Caja y Pagos', 40, 42);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha: ${new Date().toLocaleString('es-PE')} | Rango: ${reportScope === '30d' ? '30 dias' : '7 dias'}`, 40, 60);
    autoTable(doc, {
      startY: 78,
      head: [['Indicador', 'Valor', 'Detalle']],
      body: [
        ['Ingresos', formatPEN(totals.ingresos), `${formatPEN(totals.efectivoIngresos)} efectivo / ${formatPEN(totals.digital)} digital`],
        ['Egresos', formatPEN(totals.egresos), 'Salidas autorizadas y pagadas'],
        ['Saldo esperado', formatPEN(totals.saldoEsperado), `Rendido: ${formatPEN(totals.rendido)}`],
        ['Alertas', activeWarnings.length, activeWarnings[0]?.message || 'Sin alertas criticas'],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [2, 8, 115] },
    });
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [['Fecha', 'Tipo', 'Concepto', 'Metodo', 'Operacion', 'Turno', 'Monto', 'Estado']],
      body: scopedReportMovements.slice(0, 80).map((item) => [
        new Date(movementDate(item)).toLocaleString('es-PE'),
        item.tipo || '',
        sanitizeText(item.concepto, 70),
        methodLabel(item.metodo_pago),
        item.numero_operacion || '',
        normalizeTurno(item.turno),
        formatPEN(item.monto),
        item.estado || '',
      ]),
      styles: { fontSize: 7, cellPadding: 4 },
      headStyles: { fillColor: [5, 199, 242], textColor: [2, 8, 115] },
    });
    doc.save(`reporte-caja-${todayISO()}.pdf`);
    showToast('Reporte PDF generado.');
  };

  const printReport = () => {
    window.print();
  };

  const sendReportEmail = () => {
    const subject = encodeURIComponent(`Reporte Caja y Pagos ${todayISO()}`);
    const body = encodeURIComponent([
      'Resumen Caja y Pagos',
      `Ingresos: ${formatPEN(totals.ingresos)}`,
      `Egresos: ${formatPEN(totals.egresos)}`,
      `Saldo esperado: ${formatPEN(totals.saldoEsperado)}`,
      `Alertas: ${activeWarnings.map((item) => item.message).join(' | ') || 'Sin alertas criticas'}`,
      '',
      'Para adjuntar archivo, usa Exportar PDF o Excel desde el ERP.',
    ].join('\n'));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const registrarMovimiento = async () => {
    const monto = toPositiveNumber(movementForm.monto);
    const concepto = sanitizeText(movementForm.concepto || (movementForm.tipo === 'ingreso' ? 'Pago de inscripcion' : 'Egreso de caja'), 120);
    if (!Number.isFinite(monto)) {
      showToast('El monto debe ser mayor a cero.', 'red');
      return;
    }
    if (concepto.length < 3) {
      showToast('El concepto debe tener al menos 3 caracteres.', 'red');
      return;
    }
    if (movementForm.tipo === 'ingreso' && !movementForm.inscripcion_id) {
      showToast('Selecciona una inscripcion para validar el ingreso.', 'red');
      return;
    }
    if (DIGITAL_METHODS.has(movementForm.metodo_pago) && !movementForm.numero_operacion.trim()) {
      showToast('Todo pago digital exige numero de operacion.', 'red');
      return;
    }
    if (duplicateVoucher) {
      showToast('Ese numero de comprobante ya existe en pagos de hoy.', 'red');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const movementPayload = {
      tipo: movementForm.tipo,
      fecha_movimiento: now,
      turno: movementForm.turno,
      concepto,
      area: sanitizeText(movementForm.area, 80),
      categoria: sanitizeText(movementForm.categoria, 80),
      monto,
      metodo_pago: movementForm.metodo_pago,
      canal_pos: sanitizeText(movementForm.canal_pos, 80) || null,
      numero_operacion: sanitizeText(movementForm.numero_operacion, 80) || null,
      tipo_documento: movementForm.tipo_documento,
      documento_cliente: sanitizeText(movementForm.documento_cliente, 30) || null,
      tipo_comprobante: movementForm.tipo_comprobante,
      numero_comprobante: sanitizeText(movementForm.numero_comprobante, 60) || null,
      responsable: sanitizeText(movementForm.responsable, 80) || 'Caja',
      comprobante_url: sanitizeText(movementForm.comprobante_url, 240) || null,
      observacion: sanitizeText(movementForm.observacion, 240) || null,
      estado: movementForm.tipo === 'ingreso' ? 'validado' : 'pagado',
    };

    const { error: movementError } = await supabase.from('caja_movimientos').insert(movementPayload);

    if (movementForm.tipo === 'ingreso') {
      const { error: pagoError } = await supabase.from('pagos').insert([{
        inscripcion_id: Number(movementForm.inscripcion_id),
        monto,
        tipo_comprobante: movementForm.tipo_comprobante,
        numero_comprobante: movementForm.numero_comprobante,
        metodo_pago: movementForm.metodo_pago,
        turno: movementForm.turno,
        cajera: movementForm.responsable || 'Caja',
      }]);
      if (pagoError) {
        setSaving(false);
        showToast(`No se pudo registrar el pago: ${pagoError.message}`, 'red');
        return;
      }
    } else {
      await supabase.from('egresos').insert({
        fecha: todayISO(),
        concepto: movementPayload.concepto,
        area: movementForm.area || 'Caja',
        categoria: movementForm.categoria || 'Caja',
        proveedor: movementForm.responsable || 'Caja',
        monto,
        estado: 'Pagado',
        origen: 'caja_operativa',
      });
    }

    await logAudit(
      movementForm.tipo === 'ingreso' ? 'registrar_ingreso' : 'registrar_egreso',
      `${movementPayload.concepto}: ${formatPEN(monto)}`,
      movementPayload,
    );

    setSaving(false);
    setModal(null);
    setMovementForm(emptyMovementForm);
    showToast(movementError ? 'Movimiento guardado en tablas legacy; aplica la migracion para caja_operativa.' : 'Movimiento registrado y auditado.');
    loadData();
  };

  const abrirTurno = async () => {
    const saldo = toNumber(shiftForm.saldo_inicial);
    if (!shiftForm.responsable.trim()) {
      showToast('Indica responsable del turno.', 'red');
      return;
    }
    const payload = {
      fecha: shiftForm.fecha,
      turno: shiftForm.turno,
      responsable: shiftForm.responsable,
      dni_responsable: shiftForm.dni_responsable || null,
      saldo_inicial: saldo,
      caja_nombre: shiftForm.caja_nombre || 'Caja principal',
      estado: 'abierto',
    };
    const { error } = await supabase.from('caja_turnos').insert(payload);
    if (error) {
      showToast(`No se pudo abrir turno: ${error.message}`, 'red');
      return;
    }
    await logAudit('abrir_turno', `${payload.turno} con saldo inicial ${formatPEN(saldo)}`, payload);
    setShiftForm(emptyShiftForm);
    showToast('Turno abierto correctamente.');
    loadData();
  };

  const registrarArqueo = async () => {
    const diferencia = arqueoFisico - totals.saldoEsperado;
    const payload = {
      fecha: todayISO(),
      turno: shiftForm.turno,
      denominaciones: arqueoCounts,
      monto_fisico: arqueoFisico,
      saldo_esperado: totals.saldoEsperado,
      diferencia,
      estado: Math.abs(diferencia) <= 1 ? 'cuadrado' : 'diferencia',
    };
    const { error } = await supabase.from('caja_arqueos').insert(payload);
    if (error) {
      showToast(`No se pudo guardar arqueo: ${error.message}`, 'red');
      return;
    }
    await logAudit('registrar_arqueo', `Arqueo ${payload.estado}: ${formatPEN(diferencia)}`, payload);
    showToast('Arqueo registrado.');
    loadData();
  };

  const registrarRendicion = async () => {
    const monto = toPositiveNumber(rendicionForm.monto);
    if (!Number.isFinite(monto)) {
      showToast('La rendicion debe tener monto mayor a cero.', 'red');
      return;
    }
    const payload = {
      fecha: todayISO(),
      turno: shiftForm.turno,
      monto,
      responsable_entrega: rendicionForm.responsable_entrega || 'Caja',
      responsable_recibe: rendicionForm.responsable_recibe || 'Gerencia',
      medio: rendicionForm.medio,
      observacion: rendicionForm.observacion || null,
      estado: 'validado',
    };
    const { error } = await supabase.from('caja_rendiciones').insert(payload);
    if (error) {
      showToast(`No se pudo registrar rendicion: ${error.message}`, 'red');
      return;
    }
    await logAudit('registrar_rendicion', `Rendicion a gerencia por ${formatPEN(monto)}`, payload);
    setRendicionForm(emptyRendicionForm);
    showToast('Rendicion registrada.');
    loadData();
  };

  const cerrarTurno = async (turno) => {
    const confirmed = window.confirm(`Cerrar ${turno.turno} con saldo esperado ${formatPEN(totals.saldoEsperado)}?`);
    if (!confirmed) return;
    const { error } = await supabase
      .from('caja_turnos')
      .update({ estado: 'cerrado', saldo_final: totals.saldoEsperado, cerrado_at: new Date().toISOString() })
      .eq('id', turno.id);
    if (error) {
      showToast(`No se pudo cerrar turno: ${error.message}`, 'red');
      return;
    }
    await logAudit('cerrar_turno', `Cierre ${turno.turno}: ${formatPEN(totals.saldoEsperado)}`, turno);
    showToast('Turno cerrado y auditado.');
    loadData();
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#f8fafc] p-4 md:p-6">
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl ${
          toast.tone === 'red' ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'
        }`}>
          {toast.message}
        </div>
      )}

      <section className="apple-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
              <Wallet size={13} /> Centro financiero operativo
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Caja y Pagos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Apertura de turno, ingresos, egresos, arqueo, rendicion, conciliacion, historico y reportes con trazabilidad.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadData} className="btn-apple-secondary">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
            <button onClick={() => openMovementModal('ingreso')} className="btn-apple-primary">
              <Plus size={16} /> Nuevo ingreso
            </button>
            <button onClick={() => openMovementModal('egreso')} className="btn-apple-secondary">
              <TrendingDown size={16} /> Nuevo egreso
            </button>
          </div>
        </div>
      </section>

      <div className="apple-card overflow-x-auto p-2">
        <div className="flex min-w-max gap-1">
          {CAJA_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(`/caja/${id}`)}
              className={`inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-xs font-black uppercase tracking-[0.08em] transition ${
                activeTab === id ? 'bg-[#020873] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={TrendingUp} label="Ingresos de hoy" value={formatPEN(totals.ingresos)} detail={`${formatPEN(totals.efectivoIngresos)} efectivo / ${formatPEN(totals.digital)} digital`} tone="green" />
            <Kpi icon={TrendingDown} label="Egresos pagados" value={formatPEN(totals.egresos)} detail="Salidas autorizadas y pagadas" tone="red" />
            <Kpi icon={Banknote} label="Saldo fisico esperado" value={formatPEN(totals.saldoEsperado)} detail={`Rendido a gerencia: ${formatPEN(totals.rendido)}`} tone="blue" />
            <Kpi icon={AlertTriangle} label="Alertas activas" value={activeWarnings.length} detail={activeWarnings[0]?.message || 'Sin alertas criticas'} tone={activeWarnings.length ? 'amber' : 'green'} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="apple-card p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Tendencia de flujo</h2>
                  <p className="text-xs font-medium text-slate-500">Ingresos, egresos y neto operativo por dia.</p>
                </div>
                <select className="erp-input h-10 w-full sm:w-36" value={reportScope} onChange={(e) => setReportScope(e.target.value)}>
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                </select>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `S/${Number(value).toLocaleString('es-PE')}`} width={72} />
                    <Tooltip formatter={(value) => formatPEN(value)} labelStyle={{ color: '#020873', fontWeight: 800 }} />
                    <Legend />
                    <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#05C7F2" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="neto" name="Neto" stroke="#020873" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="apple-card p-5">
              <h2 className="mb-4 text-lg font-black text-slate-900">Metodos de pago</h2>
              <div className="h-72">
                {methodData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                        {methodData.map((entry, index) => <Cell key={entry.name} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatPEN(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl bg-slate-50 text-sm font-bold text-slate-400">Sin ingresos para graficar.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="apple-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Estado de turnos</h2>
                  <p className="text-xs font-medium text-slate-500">El turno noche debe tomar el saldo final del turno manana.</p>
                </div>
                <span className="badge badge-blue">{turnos.length || 0} turnos</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {TURNOS.map((turno) => {
                  const row = turnos.find((item) => item.turno === turno.id);
                  const turnoMovs = allMovements.filter((item) => normalizeTurno(item.turno) === turno.id);
                  const ingresosTurno = sumBy(turnoMovs.filter((item) => item.tipo === 'ingreso'), (item) => item.monto);
                  const egresosTurno = sumBy(turnoMovs.filter((item) => item.tipo === 'egreso'), (item) => item.monto);
                  return (
                    <div key={turno.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">{turno.label}</p>
                          <p className="text-xs font-medium text-slate-500">{row?.responsable || 'Sin responsable'}</p>
                        </div>
                        <span className={`badge ${badgeByStatus(row?.estado || 'pendiente')}`}>{row?.estado || 'pendiente'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-2xl bg-white p-3">
                          <p className="font-black text-slate-400">Inicial</p>
                          <p className="font-black text-slate-900">{formatPEN(row?.saldo_inicial || 0)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="font-black text-slate-400">Ingresos</p>
                          <p className="font-black text-emerald-700">{formatPEN(ingresosTurno)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="font-black text-slate-400">Egresos</p>
                          <p className="font-black text-red-700">{formatPEN(egresosTurno)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="apple-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                <ShieldCheck size={19} className="text-blue-600" /> Alertas y controles
              </h2>
              <div className="space-y-3">
                {(activeWarnings.length ? activeWarnings : [{ id: 'ok', message: 'Caja operando sin alertas criticas.', tab: 'dashboard' }]).map((warning) => (
                  <button key={warning.id} type="button" onClick={() => navigate(`/caja/${warning.tab}`)} className={`w-full rounded-2xl border p-4 text-left text-sm font-semibold leading-5 transition hover:-translate-y-0.5 ${
                    activeWarnings.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}>
                    {warning.message}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="apple-card p-5">
              <h2 className="mb-4 text-lg font-black text-slate-900">Comparativo por turno</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={turnoData} margin={{ left: 0, right: 10, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="turno" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `S/${Number(value).toLocaleString('es-PE')}`} width={72} />
                    <Tooltip formatter={(value) => formatPEN(value)} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#05C7F2" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="apple-card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-black text-slate-900">Ultimos movimientos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead><tr><th>Fecha</th><th>Concepto</th><th>Metodo</th><th>Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    {recentMovements.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-slate-400">Sin movimientos.</td></tr> : recentMovements.map((item) => (
                      <tr key={item.id}>
                        <td className="text-xs font-semibold text-slate-500">{new Date(movementDate(item)).toLocaleString('es-PE')}</td>
                        <td className="font-bold text-slate-900">{item.concepto || '-'}</td>
                        <td>{methodLabel(item.metodo_pago)}</td>
                        <td className={`font-black ${item.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>{formatPEN(item.monto)}</td>
                        <td><span className={`badge ${badgeByStatus(item.estado)}`}>{item.estado || 'validado'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'turnos' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="apple-card p-5">
            <h2 className="mb-4 text-lg font-black text-slate-900">Apertura de turno</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Fecha"><input className="erp-input" type="date" value={shiftForm.fecha} onChange={(e) => setShiftForm({ ...shiftForm, fecha: e.target.value })} /></Field>
              <Field label="Turno"><select className="erp-input" value={shiftForm.turno} onChange={(e) => setShiftForm({ ...shiftForm, turno: e.target.value })}>{TURNOS.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}</select></Field>
              <Field label="Responsable"><input className="erp-input" value={shiftForm.responsable} onChange={(e) => setShiftForm({ ...shiftForm, responsable: e.target.value })} placeholder="Nombre de cajera" /></Field>
              <Field label="DNI responsable"><input className="erp-input" value={shiftForm.dni_responsable} onChange={(e) => setShiftForm({ ...shiftForm, dni_responsable: e.target.value })} placeholder="DNI" /></Field>
              <Field label="Saldo inicial"><input className="erp-input" type="number" value={shiftForm.saldo_inicial} onChange={(e) => setShiftForm({ ...shiftForm, saldo_inicial: e.target.value })} /></Field>
              <Field label="Caja asignada"><input className="erp-input" value={shiftForm.caja_nombre} onChange={(e) => setShiftForm({ ...shiftForm, caja_nombre: e.target.value })} /></Field>
            </div>
            <button onClick={abrirTurno} className="btn-apple-primary mt-5 w-full justify-center"><Save size={16} /> Abrir turno</button>
          </div>

          <div className="apple-card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-black text-slate-900">Turnos del dia</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead><tr><th>Fecha</th><th>Turno</th><th>Responsable</th><th>Inicial</th><th>Final</th><th>Estado</th><th>Accion</th></tr></thead>
                <tbody>
                  {turnos.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Sin turnos abiertos.</td></tr> : turnos.map((turno) => (
                    <tr key={turno.id}>
                      <td>{turno.fecha}</td>
                      <td className="font-bold text-slate-900">{turno.turno}</td>
                      <td>{turno.responsable}</td>
                      <td>{formatPEN(turno.saldo_inicial)}</td>
                      <td>{formatPEN(turno.saldo_final)}</td>
                      <td><span className={`badge ${badgeByStatus(turno.estado)}`}>{turno.estado}</span></td>
                      <td>{turno.estado === 'abierto' && <button onClick={() => cerrarTurno(turno)} className="btn-apple-secondary h-9">Cerrar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'ingresos' || activeTab === 'egresos' || activeTab === 'historico') && (
        <div className="apple-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">{activeTab === 'egresos' ? 'Egresos pagados' : activeTab === 'ingresos' ? 'Ingresos validados' : 'Historico de movimientos'}</h2>
              <p className="text-xs font-medium text-slate-500">Filtros por concepto, responsable, comprobante u operacion.</p>
            </div>
            <label className="relative w-full md:max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="erp-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar movimiento" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[1100px]">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Metodo</th><th>Operacion</th><th>Comprobante</th><th>Turno</th><th>Responsable</th><th>Monto</th><th>Estado</th></tr></thead>
              <tbody>
                {filteredMovements
                  .filter((item) => activeTab === 'historico' || item.tipo === (activeTab === 'ingresos' ? 'ingreso' : 'egreso'))
                  .map((item) => (
                    <tr key={item.id}>
                      <td className="text-xs font-semibold text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString('es-PE') : '-'}</td>
                      <td><span className={`badge ${item.tipo === 'ingreso' ? 'badge-green' : 'badge-red'}`}>{item.tipo}</span></td>
                      <td className="font-bold text-slate-900">{item.concepto || '-'}</td>
                      <td>{item.metodo_pago || '-'}</td>
                      <td className="font-mono text-xs">{item.numero_operacion || '-'}</td>
                      <td>{item.tipo_comprobante || '-'} {item.numero_comprobante || ''}</td>
                      <td>{normalizeTurno(item.turno)}</td>
                      <td>{item.responsable || '-'}</td>
                      <td className={`font-black ${item.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>{formatPEN(item.monto)}</td>
                      <td><span className={`badge ${badgeByStatus(item.estado)}`}>{item.estado || 'validado'}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'arqueo' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="apple-card p-5">
            <h2 className="mb-4 text-lg font-black text-slate-900">Arqueo fisico por denominacion</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {DENOMINATIONS.map((value) => (
                <Field key={value} label={`S/ ${value}`}>
                  <input className="erp-input" type="number" min="0" value={arqueoCounts[String(value)]} onChange={(e) => setArqueoCounts({ ...arqueoCounts, [String(value)]: e.target.value })} />
                </Field>
              ))}
            </div>
            <button onClick={registrarArqueo} className="btn-apple-primary mt-5 w-full justify-center"><ClipboardCheck size={16} /> Guardar arqueo</button>
          </div>
          <div className="space-y-4">
            <Kpi icon={Banknote} label="Monto fisico" value={formatPEN(arqueoFisico)} detail="Calculado por denominaciones" tone="blue" />
            <Kpi icon={Wallet} label="Saldo esperado" value={formatPEN(totals.saldoEsperado)} detail="Saldo inicial + efectivo - egresos - rendicion" tone="slate" />
            <Kpi icon={AlertTriangle} label="Diferencia" value={formatPEN(arqueoFisico - totals.saldoEsperado)} detail="Debe quedar en cero o autorizado" tone={Math.abs(arqueoFisico - totals.saldoEsperado) > 1 ? 'red' : 'green'} />
          </div>
        </div>
      )}

      {activeTab === 'rendicion' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="apple-card p-5">
            <h2 className="mb-4 text-lg font-black text-slate-900">Rendicion a gerencia</h2>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Monto"><input className="erp-input" type="number" value={rendicionForm.monto} onChange={(e) => setRendicionForm({ ...rendicionForm, monto: e.target.value })} /></Field>
              <Field label="Entrega"><input className="erp-input" value={rendicionForm.responsable_entrega} onChange={(e) => setRendicionForm({ ...rendicionForm, responsable_entrega: e.target.value })} placeholder="Caja" /></Field>
              <Field label="Recibe"><input className="erp-input" value={rendicionForm.responsable_recibe} onChange={(e) => setRendicionForm({ ...rendicionForm, responsable_recibe: e.target.value })} placeholder="Gerencia" /></Field>
              <Field label="Medio"><select className="erp-input" value={rendicionForm.medio} onChange={(e) => setRendicionForm({ ...rendicionForm, medio: e.target.value })}>{PAYMENT_METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
              <Field label="Observacion"><input className="erp-input" value={rendicionForm.observacion} onChange={(e) => setRendicionForm({ ...rendicionForm, observacion: e.target.value })} /></Field>
            </div>
            <button onClick={registrarRendicion} className="btn-apple-primary mt-5 w-full justify-center"><Landmark size={16} /> Registrar rendicion</button>
          </div>
          <div className="apple-card overflow-hidden">
            <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-black text-slate-900">Rendiciones del dia</h2></div>
            <table className="erp-table">
              <thead><tr><th>Fecha</th><th>Monto</th><th>Entrega</th><th>Recibe</th><th>Estado</th></tr></thead>
              <tbody>{rendiciones.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-slate-400">Sin rendiciones.</td></tr> : rendiciones.map((item) => (
                <tr key={item.id}><td>{item.created_at ? new Date(item.created_at).toLocaleString('es-PE') : item.fecha}</td><td className="font-black text-blue-700">{formatPEN(item.monto)}</td><td>{item.responsable_entrega}</td><td>{item.responsable_recibe}</td><td><span className={`badge ${badgeByStatus(item.estado)}`}>{item.estado}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'conciliacion' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <Kpi icon={CreditCard} label="Digital del dia" value={formatPEN(totals.digital)} detail="P.O.S., tarjeta, transferencia, Yape y Plin" tone="blue" />
            <Kpi icon={AlertTriangle} label="Pendientes operacion" value={allMovements.filter((item) => DIGITAL_METHODS.has(item.metodo_pago) && !item.numero_operacion).length} detail="No deben quedar pagos digitales sin numero" tone="amber" />
          </div>
          <div className="apple-card overflow-hidden">
            <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-black text-slate-900">Operaciones digitales</h2></div>
            <table className="erp-table">
              <thead><tr><th>Fecha</th><th>Metodo</th><th>Operacion</th><th>Monto</th><th>Estado</th></tr></thead>
              <tbody>
                {allMovements.filter((item) => DIGITAL_METHODS.has(item.metodo_pago)).map((item) => (
                  <tr key={item.id}><td>{item.created_at ? new Date(item.created_at).toLocaleString('es-PE') : '-'}</td><td>{item.metodo_pago}</td><td className="font-mono text-xs">{item.numero_operacion || 'Sin operacion'}</td><td>{formatPEN(item.monto)}</td><td><span className={`badge ${item.numero_operacion ? 'badge-green' : 'badge-amber'}`}>{item.numero_operacion ? 'conciliable' : 'observado'}</span></td></tr>
                ))}
                {conciliaciones.map((item) => (
                  <tr key={`conc-${item.id}`}><td>{item.fecha_operacion}</td><td>{item.metodo_pago}</td><td>{item.numero_operacion}</td><td>{formatPEN(item.monto)}</td><td><span className={`badge ${badgeByStatus(item.estado)}`}>{item.estado}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reportes' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="apple-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Download size={19} className="text-blue-600" />
              <h2 className="text-lg font-black text-slate-900">Generador de reportes</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Rango">
                <select className="erp-input" value={reportScope} onChange={(e) => setReportScope(e.target.value)}>
                  <option value="7d">Ultimos 7 dias</option>
                  <option value="30d">Ultimos 30 dias</option>
                </select>
              </Field>
              <button onClick={exportPdf} className="btn-apple-primary justify-center"><FileText size={16} /> Exportar PDF</button>
              <button onClick={exportExcel} className="btn-apple-secondary justify-center"><Download size={16} /> Exportar Excel</button>
              <button onClick={printReport} className="btn-apple-secondary justify-center"><Archive size={16} /> Imprimir</button>
              <button onClick={sendReportEmail} className="btn-apple-secondary justify-center"><CreditCard size={16} /> Enviar por correo</button>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Balance neto', formatPEN(totals.saldo)],
                ['Digital sobre ingresos', `${pctOf(totals.digital, totals.ingresos, 1)}%`],
                ['Movimientos exportables', scopedReportMovements.length],
                ['Riesgo operativo', activeWarnings.length ? 'Revisar' : 'Controlado'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="apple-card p-5">
              <h2 className="mb-4 text-lg font-black text-slate-900">Vista previa del reporte</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `S/${Number(value).toLocaleString('es-PE')}`} width={72} />
                    <Tooltip formatter={(value) => formatPEN(value)} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#05C7F2" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="neto" name="Neto" fill="#020873" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="apple-card overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-black text-slate-900">Movimientos incluidos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table min-w-[900px]">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Metodo</th><th>Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    {scopedReportMovements.slice(0, 12).map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(movementDate(item)).toLocaleString('es-PE')}</td>
                        <td><span className={`badge ${item.tipo === 'ingreso' ? 'badge-green' : 'badge-red'}`}>{item.tipo}</span></td>
                        <td className="font-bold text-slate-900">{item.concepto || '-'}</td>
                        <td>{methodLabel(item.metodo_pago)}</td>
                        <td className="font-black text-slate-900">{formatPEN(item.monto)}</td>
                        <td><span className={`badge ${badgeByStatus(item.estado)}`}>{item.estado || 'validado'}</span></td>
                      </tr>
                    ))}
                    {scopedReportMovements.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin movimientos para exportar.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'parametros' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Settings size={19} className="text-blue-600" /> Parametros operativos</h2>
            {[
              ['Tipos documento', '01 DNI, 06 RUC'],
              ['Metodos pago', PAYMENT_METHODS.map((item) => item.label).join(', ')],
              ['Regla efectivo', 'Monto alto en efectivo requiere rendicion sugerida'],
              ['Comprobante', 'Validar duplicados por tipo, serie, numero y monto'],
              ['Auditoria', 'Toda anulacion, cierre o correccion queda registrada'],
            ].map(([label, value]) => (
              <div key={label} className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 last:mb-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{value}</p>
              </div>
            ))}
          </div>
          <div className="apple-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><KeyRound size={19} className="text-blue-600" /> Controles desde Drive</h2>
            <div className="space-y-3">
              {PAYMENT_CONTROL_RULES.map((rule) => (
                <div key={rule} className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-5 text-blue-900">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-blue-600" />
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {auditoria.length > 0 && (
        <div className="apple-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Archive size={19} className="text-blue-600" /> Auditoria reciente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Accion</th><th>Detalle</th></tr></thead>
              <tbody>{auditoria.slice(0, 8).map((item) => (
                <tr key={item.id}><td>{item.created_at ? new Date(item.created_at).toLocaleString('es-PE') : '-'}</td><td>{item.actor_email || 'sistema'}</td><td><span className="badge badge-blue">{item.action}</span></td><td>{item.detail}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'movimiento' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">{movementForm.tipo === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo egreso'}</h2>
                <p className="text-xs font-medium text-slate-500">Validacion de turno, comprobante, metodo y operacion.</p>
              </div>
              <button onClick={closeModal} aria-label="Cerrar modal" className="rounded-full p-2 text-slate-400 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-5">
              <fieldset disabled={saving} className="grid grid-cols-1 gap-3 disabled:opacity-70 md:grid-cols-2">
                <Field label="Tipo"><select className="erp-input" value={movementForm.tipo} onChange={(e) => setMovementForm({ ...movementForm, tipo: e.target.value })}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></Field>
                <Field label="Turno"><select className="erp-input" value={movementForm.turno} onChange={(e) => setMovementForm({ ...movementForm, turno: e.target.value })}>{TURNOS.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}</select></Field>
                {movementForm.tipo === 'ingreso' && (
                  <Field label="Inscripcion" wide>
                    <select className="erp-input" value={movementForm.inscripcion_id} onChange={(e) => setMovementForm({ ...movementForm, inscripcion_id: e.target.value })}>
                      <option value="">Seleccionar inscripcion</option>
                      {inscripciones.map((ins) => <option key={ins.id} value={ins.id}>{ins.programa} - ID {ins.id}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Concepto" wide><input className="erp-input" value={movementForm.concepto} onChange={(e) => setMovementForm({ ...movementForm, concepto: e.target.value })} placeholder="Pago, devolucion, gasto o rendicion" /></Field>
                <Field label="Monto"><input className="erp-input" type="number" min="0" step="0.01" value={movementForm.monto} onChange={(e) => setMovementForm({ ...movementForm, monto: e.target.value })} /></Field>
                <Field label="Metodo"><select className="erp-input" value={movementForm.metodo_pago} onChange={(e) => setMovementForm({ ...movementForm, metodo_pago: e.target.value })}>{PAYMENT_METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
                <Field label="Canal P.O.S."><input className="erp-input" value={movementForm.canal_pos} onChange={(e) => setMovementForm({ ...movementForm, canal_pos: e.target.value })} placeholder="Visa, Izipay, Niubiz" /></Field>
                <Field label="Numero operacion"><input className="erp-input" value={movementForm.numero_operacion} onChange={(e) => setMovementForm({ ...movementForm, numero_operacion: e.target.value })} placeholder="Obligatorio en digital" /></Field>
                <Field label="Tipo documento"><select className="erp-input" value={movementForm.tipo_documento} onChange={(e) => setMovementForm({ ...movementForm, tipo_documento: e.target.value })}><option value="01">01 DNI</option><option value="06">06 RUC</option></select></Field>
                <Field label="Documento cliente"><input className="erp-input" value={movementForm.documento_cliente} onChange={(e) => setMovementForm({ ...movementForm, documento_cliente: e.target.value })} /></Field>
                <Field label="Comprobante"><select className="erp-input" value={movementForm.tipo_comprobante} onChange={(e) => setMovementForm({ ...movementForm, tipo_comprobante: e.target.value })}><option value="boleta">Boleta</option><option value="factura">Factura</option><option value="recibo">Recibo</option><option value="interno">Interno</option></select></Field>
                <Field label="Numero comprobante"><input className="erp-input" value={movementForm.numero_comprobante} onChange={(e) => setMovementForm({ ...movementForm, numero_comprobante: e.target.value })} /></Field>
                <Field label="Area"><input className="erp-input" value={movementForm.area} onChange={(e) => setMovementForm({ ...movementForm, area: e.target.value })} /></Field>
                <Field label="Categoria"><input className="erp-input" value={movementForm.categoria} onChange={(e) => setMovementForm({ ...movementForm, categoria: e.target.value })} /></Field>
                <Field label="Responsable"><input className="erp-input" value={movementForm.responsable} onChange={(e) => setMovementForm({ ...movementForm, responsable: e.target.value })} placeholder="Cajera / proveedor / area" /></Field>
                <Field label="URL voucher"><input className="erp-input" value={movementForm.comprobante_url} onChange={(e) => setMovementForm({ ...movementForm, comprobante_url: e.target.value })} /></Field>
                <Field label="Observacion" wide><input className="erp-input" value={movementForm.observacion} onChange={(e) => setMovementForm({ ...movementForm, observacion: e.target.value })} /></Field>
              </fieldset>
              {DIGITAL_METHODS.has(movementForm.metodo_pago) && !movementForm.numero_operacion && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  Todo pago digital exige numero de operacion para conciliacion.
                </div>
              )}
              {duplicateVoucher && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  Comprobante duplicado detectado en pagos de hoy.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={closeModal} disabled={saving} className="btn-apple-secondary">Cancelar</button>
              <button onClick={registrarMovimiento} disabled={saving} className="btn-apple-primary"><Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
