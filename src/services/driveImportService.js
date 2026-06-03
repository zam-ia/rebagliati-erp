export const excelSerialToIso = (value, date1904 = false) => {
  if (value === null || value === undefined || value === '') return null;
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;

  const startDate = date1904 ? new Date(Date.UTC(1904, 0, 1)) : new Date(Date.UTC(1899, 11, 30));
  const days = Math.floor(serial);
  const ms = startDate.getTime() + days * 86400000;
  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export const normalizeDateField = (value, date1904 = false) => {
  if (!value && value !== 0) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const isoMatch = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  return excelSerialToIso(value, date1904);
};

export const buildEventKey = ({ codigo_evento, mes_operativo, fecha_inicio }) => {
  const code = String(codigo_evento || '').trim().toUpperCase();
  const month = String(mes_operativo || '').trim().toLowerCase();
  const date = String(fecha_inicio || '').slice(0, 10);
  return `${code}::${month}::${date}`;
};

export const buildCampaignKey = ({ codigo_evento, codigo_utm, canal, mes_operativo }) => {
  const code = String(codigo_evento || '').trim().toUpperCase();
  const utm = String(codigo_utm || '').trim().toUpperCase();
  const channel = String(canal || '').trim().toLowerCase();
  const month = String(mes_operativo || '').trim().toLowerCase();
  return `${code}::${utm}::${channel}::${month}`;
};

export const detectDuplicateKeys = (rows = [], keyFn) => {
  const seen = new Map();
  const duplicates = [];

  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key) return;
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
  });

  seen.forEach((count, key) => {
    if (count > 1) duplicates.push(key);
  });

  return duplicates;
};
