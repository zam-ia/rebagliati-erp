export const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const normalized = typeof value === 'string' ? value.replace(',', '.') : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
};

export const toPositiveNumber = (value) => {
  const number = toNumber(value, NaN);
  return Number.isFinite(number) && number > 0 ? number : NaN;
};

export const sumBy = (items = [], selector) =>
  items.reduce((sum, item) => sum + toNumber(selector(item)), 0);

export const formatPEN = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (dateISO, days = 1) => {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
  return { start, end };
};

export const pctOf = (value, total, decimals = 0) => {
  const base = toNumber(total);
  if (base <= 0) return 0;
  return Number(((toNumber(value) / base) * 100).toFixed(decimals));
};

export const groupSumBy = (items = [], keySelector, valueSelector) =>
  items.reduce((acc, item) => {
    const key = keySelector(item) || 'Sin clasificar';
    acc[key] = (acc[key] || 0) + toNumber(valueSelector(item));
    return acc;
  }, {});

export const monthRangeISO = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    start: start.toISOString().split('T')[0],
    nextMonth: nextMonth.toISOString().split('T')[0],
  };
};
