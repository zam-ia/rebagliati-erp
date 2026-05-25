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

export const todayISO = () => new Date().toISOString().split('T')[0];

export const monthRangeISO = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    start: start.toISOString().split('T')[0],
    nextMonth: nextMonth.toISOString().split('T')[0],
  };
};
