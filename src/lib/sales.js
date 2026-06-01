import { pctOf, sumBy, toNumber } from './finance';

export const SALES_CATEGORIES = ['C', 'CM', 'D'];

export const CATEGORY_LABELS = {
  C: 'Curso',
  CM: 'Curso modular',
  D: 'Diplomado',
};

export const CATEGORY_WEIGHTS = {
  C: 1,
  CM: 1.35,
  D: 1.2,
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

export const buildSalesRanking = (sales = [], executives = [], goals = []) => {
  const executiveMap = new Map(executives.map((item) => [String(item.id), item]));
  const goalMap = new Map(goals.map((item) => [String(item.executive_id), item]));

  const rows = sales.reduce((acc, sale) => {
    const id = String(sale.executive_id || sale.executive?.id || sale.ventas_ejecutivos?.id || 'sin-id');
    const executive = executiveMap.get(id) || sale.executive || sale.ventas_ejecutivos || {};
    if (!acc[id]) {
      acc[id] = {
        executive_id: id,
        executive: executive.short_name || executive.full_name || sale.executive_name || 'Sin ejecutivo',
        team: executive.team || executive.turno || 'Sin equipo',
        C: 0,
        CM: 0,
        D: 0,
        total: 0,
        weighted: 0,
        goal: toNumber(goalMap.get(id)?.target_total),
      };
    }

    const category = SALES_CATEGORIES.includes(sale.category) ? sale.category : 'C';
    const quantity = toNumber(sale.quantity);
    acc[id][category] += quantity;
    acc[id].total += quantity;
    acc[id].weighted += quantity * CATEGORY_WEIGHTS[category];
    return acc;
  }, {});

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
