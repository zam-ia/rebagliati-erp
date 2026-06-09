import { pctOf, sumBy, toNumber } from './finance';

export const SALES_CATEGORIES = ['C', 'CM', 'D'];

export const CATEGORY_LABELS = {
  C: 'Curso',
  CM: 'Curso modular',
  D: 'Diplomado',
};

export const CATEGORY_WEIGHTS = {
  C: 1,
  CM: 2,
  D: 3.5,
};

export const DEMO_EXECUTIVES = [
  { id: 1, short_name: 'Maria F.', full_name: 'Maria Fernandez', team: 'Manana' },
  { id: 2, short_name: 'Carlos R.', full_name: 'Carlos Ramirez', team: 'Tarde' },
  { id: 3, short_name: 'Andrea P.', full_name: 'Andrea Paredes', team: 'Manana' },
  { id: 4, short_name: 'Luis G.', full_name: 'Luis Garcia', team: 'Tarde' },
  { id: 5, short_name: 'Rosa M.', full_name: 'Rosa Mendoza', team: 'Mixto' },
  { id: 6, short_name: 'Diego S.', full_name: 'Diego Salazar', team: 'Mixto' },
];

export const DEMO_SALES = [
  { id: 1, executive_id: 1, sale_date: '2026-05-02', category: 'C', quantity: 260, source: 'Meta Ads' },
  { id: 2, executive_id: 1, sale_date: '2026-05-08', category: 'D', quantity: 58, source: 'WhatsApp' },
  { id: 3, executive_id: 2, sale_date: '2026-05-03', category: 'C', quantity: 224, source: 'CRM' },
  { id: 4, executive_id: 2, sale_date: '2026-05-09', category: 'CM', quantity: 44, source: 'Referidos' },
  { id: 5, executive_id: 3, sale_date: '2026-05-04', category: 'C', quantity: 198, source: 'WhatsApp' },
  { id: 6, executive_id: 3, sale_date: '2026-05-10', category: 'D', quantity: 37, source: 'Meta Ads' },
  { id: 7, executive_id: 4, sale_date: '2026-05-05', category: 'C', quantity: 176, source: 'CRM' },
  { id: 8, executive_id: 4, sale_date: '2026-05-11', category: 'CM', quantity: 32, source: 'Web' },
  { id: 9, executive_id: 5, sale_date: '2026-05-06', category: 'D', quantity: 91, source: 'WhatsApp' },
  { id: 10, executive_id: 5, sale_date: '2026-05-12', category: 'C', quantity: 142, source: 'Meta Ads' },
  { id: 11, executive_id: 6, sale_date: '2026-05-07', category: 'C', quantity: 126, source: 'CRM' },
  { id: 12, executive_id: 6, sale_date: '2026-05-13', category: 'CM', quantity: 28, source: 'Referidos' },
];

export const DEMO_GOALS = [
  { executive_id: 1, target_total: 360 },
  { executive_id: 2, target_total: 320 },
  { executive_id: 3, target_total: 290 },
  { executive_id: 4, target_total: 270 },
  { executive_id: 5, target_total: 310 },
  { executive_id: 6, target_total: 240 },
];

export const DEMO_CHECKLIST = [
  { executive_id: 1, executive_name: 'Maria F.', completion_rate: 91, status: 'completo' },
  { executive_id: 2, executive_name: 'Carlos R.', completion_rate: 72, status: 'en_proceso' },
  { executive_id: 3, executive_name: 'Andrea P.', completion_rate: 48, status: 'critico' },
  { executive_id: 4, executive_name: 'Luis G.', completion_rate: 66, status: 'en_proceso' },
  { executive_id: 5, executive_name: 'Rosa M.', completion_rate: 39, status: 'critico' },
];

export const DEMO_GROUPS = [
  { id: 1, name: 'Diplomado Enfermeria Intensiva', members_count: 318, status: 'sin_usar', executive_name: 'Pendiente', career: 'Enfermeria' },
  { id: 2, name: 'Comunidad Podologia Clinica', members_count: 244, status: 'en_uso', executive_name: 'Maria F.', career: 'Podologia' },
  { id: 3, name: 'Administracion Hospitalaria 2026', members_count: 186, status: 'pendiente', executive_name: 'Pendiente', career: 'Gestion' },
  { id: 4, name: 'Farmacologia aplicada', members_count: 96, status: 'archivado', executive_name: 'Carlos R.', career: 'Farmacia' },
];

export const DEMO_KOMMO_QUEUE = {
  unassignedMessages: 204,
  activeUsers: 6,
  manualAssignmentMinutes: 15,
  twoFactorMinutes: 25,
  kasandraAccessMinutes: 45,
  responseLimitMinutes: 10,
  redSocialUnread: 37,
  whatsappNumbersAvailable: 8,
};

export const DEMO_PAYMENT_PROMISES = [
  { id: 1, lead: 'Rosa Garcia', executive: 'Maria F.', originalExecutive: 'Maria F.', currentExecutive: 'Carlos R.', promisedAt: '2026-06-03', amount: 420, status: 'por_vencer', risk: 'Comision compartida por reasignacion' },
  { id: 2, lead: 'Carlos Mendoza', executive: 'Andrea P.', originalExecutive: 'Andrea P.', currentExecutive: 'Andrea P.', promisedAt: '2026-06-05', amount: 620, status: 'vigente', risk: 'Seguimiento dentro de SLA' },
  { id: 3, lead: 'Milagros Torres', executive: 'Luis G.', originalExecutive: 'Luis G.', currentExecutive: 'Rosa M.', promisedAt: '2026-06-01', amount: 310, status: 'vencida', risk: 'Definir propiedad de venta' },
];

export const DEMO_INCIDENTS = [
  { executive: 'Maria F.', seniority: 'Antiguo', incidents: 2, baseDiscount: 12, suggestedDiscount: 8 },
  { executive: 'Carlos R.', seniority: 'Nuevo', incidents: 6, baseDiscount: 36, suggestedDiscount: 18 },
  { executive: 'Andrea P.', seniority: 'Nuevo', incidents: 4, baseDiscount: 24, suggestedDiscount: 12 },
  { executive: 'Luis G.', seniority: 'Antiguo', incidents: 1, baseDiscount: 6, suggestedDiscount: 6 },
  { executive: 'Rosa M.', seniority: 'Nuevo', incidents: 7, baseDiscount: 42, suggestedDiscount: 21 },
];

export const DEMO_MONTHLY_DELIVERABLES = [
  { name: 'Cuadro de seguimiento de llamadas', owner: 'Renato', window: 'Dia 1 al 4', status: 'Pendiente automatizar' },
  { name: 'Ranking de ventas', owner: 'Renato', window: 'Dia 1 al 4', status: 'Integrado en ERP' },
  { name: 'Direccional de UTMs', owner: 'Marketing', window: 'Dia 1 al 4', status: 'Requiere fuente Google Sheet' },
  { name: 'Plantillas de automatizacion', owner: 'Ventas', window: 'Dia 1 al 4', status: 'Versionar y aprobar' },
  { name: 'Plantillas informativas', owner: 'Ventas', window: 'Dia 1 al 4', status: 'Versionar y aprobar' },
];

export const DEMO_FOLLOW_UPS = [
  { id: 1, lead: 'Rosa Garcia', executive: 'Maria F.', event: 'Sondas 0626', phase: '2 contacto', nextAction: 'Enviar brochure y audio corto', sla: 'En ritmo', risk: 'medio' },
  { id: 2, lead: 'Carlos Mendoza', executive: 'Andrea P.', event: 'Enfermeria Intensiva', phase: 'Promesa de pago', nextAction: 'Confirmar voucher antes de las 18:00', sla: 'Critico', risk: 'alto' },
  { id: 3, lead: 'Milagros Torres', executive: 'Luis G.', event: 'Podologia Clinica', phase: 'Lead nuevo', nextAction: 'Primer contacto por WhatsApp', sla: 'Vencido', risk: 'alto' },
  { id: 4, lead: 'Jorge Huaman', executive: 'Rosa M.', event: 'Administracion Hospitalaria', phase: '3 contacto', nextAction: 'Resolver objecion de precio', sla: 'En ritmo', risk: 'medio' },
];

export const DEMO_UTM_CAMPAIGNS = [
  { id: 1, campaign: 'Meta Sondas Junio', source: 'Meta Ads', event: 'Sondas 0626', leads: 128, sales: 18, spend: 620, status: 'Rentable' },
  { id: 2, campaign: 'WSP Enfermeria Intensiva', source: 'WhatsApp', event: 'Enfermeria Intensiva', leads: 96, sales: 22, spend: 140, status: 'Escalar' },
  { id: 3, campaign: 'Remarketing Podologia', source: 'Remarketing', event: 'Podologia Clinica', leads: 64, sales: 7, spend: 280, status: 'Observar' },
];

export const DEMO_LIBRARY_ITEMS = [
  { id: 1, name: 'Brochure general diplomados', type: 'Brochure', owner: 'Marketing', status: 'Aprobado', usage: 'Enviar en primer contacto' },
  { id: 2, name: 'Guion de promesa de pago', type: 'Guion', owner: 'Ventas', status: 'Activo', usage: 'Usar cuando el cliente pide separar vacante' },
  { id: 3, name: 'Mensaje Kommo primer contacto', type: 'Plantilla', owner: 'Ventas', status: 'Activo', usage: 'Respuesta rapida para leads nuevos' },
  { id: 4, name: 'Objecion por precio', type: 'Plantilla', owner: 'Jefe de ventas', status: 'Revision', usage: 'Actualizar con politica de descuentos' },
];

export const DEMO_SALES_SHOWS = [
  { id: 1, event: 'Sondas 0626', moderator: 'Renato', date: '2026-06-08', target: 80, attendees: 54, hotLeads: 21, closed: 8, status: 'Programado' },
  { id: 2, event: 'Enfermeria Intensiva', moderator: 'Maria F.', date: '2026-06-10', target: 120, attendees: 96, hotLeads: 38, closed: 15, status: 'En seguimiento' },
  { id: 3, event: 'Podologia Clinica', moderator: 'Carlos R.', date: '2026-06-12', target: 60, attendees: 0, hotLeads: 0, closed: 0, status: 'Pendiente guion' },
];

export const DEMO_COORDINATION_SLA = [
  { id: 1, event: 'Sondas 0626', request: 'Confirmar docente y horario', owner: 'Coordinacion', priority: 'Alta', slaHours: 4, status: 'Pendiente' },
  { id: 2, event: 'Enfermeria Intensiva', request: 'Validar certificacion y vacantes', owner: 'Academico', priority: 'Media', slaHours: 12, status: 'En proceso' },
  { id: 3, event: 'Podologia Clinica', request: 'Actualizar temario para brochure', owner: 'Marketing', priority: 'Media', slaHours: 8, status: 'Resuelto' },
];

export const IMPROVEMENT_ROADMAP = [
  {
    phase: '0-7 dias',
    title: 'Control operativo inmediato',
    actions: ['Cola Kommo con responsables', 'SLA de 10 minutos visible', 'Tablero de turno digital', 'Bitacora de accesos 2FA'],
  },
  {
    phase: '8-21 dias',
    title: 'Automatizacion y trazabilidad',
    actions: ['Reglas de asignacion automatica', 'Promesas de pago con propietario', 'Versionado de plantillas', 'Incidencias y comisiones justas'],
  },
  {
    phase: '22-45 dias',
    title: 'Inteligencia comercial',
    actions: ['Historico por evento/producto', 'Ranking ponderado C/CM/D', 'UTMs conectadas', 'Recomendador de eventos ganadores'],
  },
];

export const COMMISSION_MODEL = {
  monthlyGoal: 180,
  weights: [
    { category: 'Diplomados / intensivos', unit: 6, mix: 50 },
    { category: 'Cursos modulares', unit: 2, mix: 15 },
    { category: 'Cursos', unit: 1, mix: 35 },
  ],
  benefits: [
    'Vale de consumo por cumplimiento sostenido',
    'Medio dia libre por cero incidencias criticas',
    'Prioridad en bases ganadoras para quien cumple SLA',
    'Reconocimiento interno por mejora mensual',
  ],
};

export const buildKommoMetrics = (queue = DEMO_KOMMO_QUEUE) => {
  const idealDistribution = queue.activeUsers > 0 ? Math.ceil(queue.unassignedMessages / queue.activeUsers) : 0;
  const dailyLostMinutes = queue.manualAssignmentMinutes + queue.twoFactorMinutes;
  return {
    ...queue,
    idealDistribution,
    dailyLostMinutes,
    monthlyLostHours: Number(((dailyLostMinutes * 22) / 60).toFixed(1)),
    assignmentRisk: queue.unassignedMessages > 0 ? 'Asignacion manual critica' : 'Cola controlada',
  };
};

export const buildPromiseMetrics = (promises = DEMO_PAYMENT_PROMISES) => ({
  total: promises.length,
  expired: promises.filter((item) => item.status === 'vencida').length,
  reassigned: promises.filter((item) => item.originalExecutive !== item.currentExecutive).length,
  amountAtRisk: sumBy(promises.filter((item) => item.status !== 'vigente'), (item) => item.amount),
});

export const buildIncidentMetrics = (incidents = DEMO_INCIDENTS) => ({
  totalIncidents: sumBy(incidents, (item) => item.incidents),
  currentDiscount: sumBy(incidents, (item) => item.baseDiscount),
  suggestedDiscount: sumBy(incidents, (item) => item.suggestedDiscount),
  newExecutivesIncidents: sumBy(incidents.filter((item) => item.seniority === 'Nuevo'), (item) => item.incidents),
});

export const normalizeKommoQueue = (row) => {
  if (!row) return DEMO_KOMMO_QUEUE;

  return {
    unassignedMessages: toNumber(row.mensajes_sin_asignar),
    activeUsers: toNumber(row.usuarios_activos),
    manualAssignmentMinutes: toNumber(row.minutos_asignacion_manual),
    twoFactorMinutes: toNumber(row.minutos_2fa),
    kasandraAccessMinutes: toNumber(row.minutos_acceso_critico || row.minutos_2fa),
    responseLimitMinutes: toNumber(row.sla_minutos || 10),
    redSocialUnread: toNumber(row.mensajes_redes_sin_leer),
    whatsappNumbersAvailable: toNumber(row.whatsapp_disponibles),
  };
};

export const normalizePaymentPromises = (rows = [], executives = []) => {
  if (!rows.length) return DEMO_PAYMENT_PROMISES;

  const executiveMap = new Map(executives.map((item) => [String(item.id), item.short_name || item.full_name]));

  return rows.map((row) => ({
    id: row.id,
    lead: row.lead_nombre,
    executive: executiveMap.get(String(row.executive_actual_id)) || 'Sin ejecutivo',
    originalExecutive: executiveMap.get(String(row.executive_original_id)) || 'Sin ejecutivo',
    currentExecutive: executiveMap.get(String(row.executive_actual_id)) || 'Sin ejecutivo',
    promisedAt: row.fecha_promesa,
    amount: toNumber(row.monto),
    status: row.estado,
    risk: row.motivo_reasignacion || row.regla_comision || 'Seguimiento activo',
  }));
};

export const normalizeIncidents = (rows = [], executives = []) => {
  if (!rows.length) return DEMO_INCIDENTS;

  const executiveMap = new Map(executives.map((item) => [String(item.id), item]));

  return rows.map((row) => {
    const executive = executiveMap.get(String(row.executive_id));
    return {
      executive: executive?.short_name || executive?.full_name || 'Sin ejecutivo',
      seniority: executive?.seniority || executive?.antiguedad || 'Nuevo',
      incidents: 1,
      baseDiscount: toNumber(row.descuento_actual),
      suggestedDiscount: toNumber(row.descuento_sugerido),
    };
  });
};

export const normalizeMonthlyDeliverables = (rows = []) => {
  if (!rows.length) return DEMO_MONTHLY_DELIVERABLES;

  return rows.map((row) => ({
    name: row.nombre,
    owner: row.responsable || 'Sin responsable',
    window: row.ventana || 'Dia 1 al 4',
    status: row.estado || 'pendiente',
  }));
};

export const normalizeCommissionModel = (row) => {
  if (!row) return COMMISSION_MODEL;

  return {
    monthlyGoal: toNumber(row.meta_total),
    weights: [
      { category: 'Diplomados / intensivos', unit: toNumber(row.diplomado_unit), mix: toNumber(row.mix_diplomado) },
      { category: 'Cursos modulares', unit: toNumber(row.curso_modular_unit), mix: toNumber(row.mix_curso_modular) },
      { category: 'Cursos', unit: toNumber(row.curso_unit), mix: toNumber(row.mix_curso) },
    ],
    benefits: Array.isArray(row.beneficios_json) && row.beneficios_json.length
      ? row.beneficios_json
      : COMMISSION_MODEL.benefits,
  };
};

export const buildSalesRanking = (sales = [], executives = [], goals = []) => {
  const executiveMap = new Map(executives.map((item) => [String(item.id), item]));
  const goalMap = new Map(goals.map((item) => [String(item.executive_id), item]));
  const ensureRow = (acc, id, fallback = {}) => {
    if (!acc[id]) {
      const executive = executiveMap.get(id) || fallback.executive || {};
      const goal = goalMap.get(id) || fallback.goal || {};
      acc[id] = {
        executive_id: id,
        executive: executive.short_name || executive.full_name || fallback.executive_name || 'Sin ejecutivo',
        team: executive.team || executive.turno || fallback.team || 'Sin equipo',
        photoUrl: executive.photo_url || executive.foto_url || executive.photoUrl || fallback.photoUrl || '',
        hrSource: executive.hr_source_label || fallback.hrSource || '',
        hrRole: executive.hr_role || fallback.hrRole || '',
        C: 0,
        CM: 0,
        D: 0,
        total: 0,
        weighted: 0,
        goal: toNumber(goal.target_total),
      };
    }
    return acc[id];
  };

  const rows = sales.reduce((acc, sale) => {
    const id = String(sale.executive_id || sale.executive?.id || sale.ventas_ejecutivos?.id || 'sin-id');
    const executive = executiveMap.get(id) || sale.executive || sale.ventas_ejecutivos || {};
    const row = ensureRow(acc, id, { executive, executive_name: sale.executive_name });

    const category = SALES_CATEGORIES.includes(sale.category) ? sale.category : 'C';
    const quantity = toNumber(sale.quantity);
    row[category] += quantity;
    row.total += quantity;
    row.weighted += quantity * CATEGORY_WEIGHTS[category];
    return acc;
  }, {});

  executives.forEach((executive) => {
    ensureRow(rows, String(executive.id), { executive });
  });

  goals.forEach((goal) => {
    const id = String(goal.executive_id || 'sin-id');
    ensureRow(rows, id, { goal });
    rows[id].goal = toNumber(goal.target_total);
  });

  return Object.values(rows)
    .map((row) => ({
      ...row,
      goalProgress: row.goal > 0 ? pctOf(row.total, row.goal) : 0,
      risk: row.goal > 0 && pctOf(row.total, row.goal) < 80 ? 'Riesgo meta' : 'En ritmo',
    }))
    .sort((a, b) => b.weighted - a.weighted);
};

export const buildSalesMetrics = (sales = [], ranking = [], checklists = [], groups = []) => {
  const total = sumBy(sales, (item) => item.quantity);
  const mix = SALES_CATEGORIES.reduce((acc, category) => {
    const quantity = sumBy(sales.filter((item) => item.category === category), (item) => item.quantity);
    acc[category] = { quantity, pct: pctOf(quantity, total, 1) };
    return acc;
  }, {});

  const topFiveTotal = sumBy(ranking.slice(0, 5), (item) => item.total);
  const checklistAverage = checklists.length
    ? Math.round(sumBy(checklists, (item) => item.completion_rate) / checklists.length)
    : 0;
  const unusedGroups = groups.filter((item) => item.status === 'sin_usar').length;
  const pendingGroups = groups.filter((item) => item.status === 'pendiente' || !item.executive_name || item.executive_name === 'Pendiente').length;

  return {
    total,
    mix,
    topFiveConcentration: pctOf(topFiveTotal, total, 1),
    checklistAverage,
    unusedGroups,
    pendingGroups,
    criticalChecklists: checklists.filter((item) => toNumber(item.completion_rate) < 50).length,
  };
};

export const buildSalesAlerts = (metrics, ranking = [], groups = []) => {
  const alerts = [];

  if (metrics.topFiveConcentration >= 60) {
    alerts.push({
      type: 'Alta concentracion',
      severity: 'high',
      message: `Top 5 concentra ${metrics.topFiveConcentration}% de ventas. Redistribuir leads para reducir dependencia.`,
    });
  }

  if (metrics.checklistAverage < 50) {
    alerts.push({
      type: 'Checklist critico',
      severity: 'critical',
      message: `Avance operativo promedio ${metrics.checklistAverage}%. Requiere intervencion del lider hoy.`,
    });
  }

  groups
    .filter((group) => group.status === 'sin_usar' && toNumber(group.members_count) >= 200)
    .slice(0, 3)
    .forEach((group) => {
      alerts.push({
        type: 'Grupo sin uso',
        severity: 'medium',
        message: `${group.name} tiene ${group.members_count} miembros sin campana asignada.`,
      });
    });

  ranking
    .filter((row) => row.goal > 0 && row.goalProgress < 80)
    .slice(0, 3)
    .forEach((row) => {
      alerts.push({
        type: 'Riesgo de meta',
        severity: 'high',
        message: `${row.executive} esta al ${row.goalProgress}% de su meta mensual.`,
      });
    });

  return alerts;
};
