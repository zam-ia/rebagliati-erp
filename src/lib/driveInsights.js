import { pctOf, sumBy } from './finance';

export const DRIVE_FILES = [
  {
    name: '1. EVENTOS 2026.xlsx',
    area: 'Marketing / Coordinacion',
    type: 'eventos',
    sheets: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO'],
    rows: 7899,
    fields: ['codigo', 'ficha', 'grupo_whatsapp', 'zoom', 'evento', 'modalidad', 'fecha', 'horario', 'creditos'],
    use: 'Base historica de eventos por codigo, modalidad, fechas, links y responsables.',
  },
  {
    name: 'Direccional de Campanas con UTMs l Rebagliati Diplomados.xlsx',
    area: 'Marketing',
    type: 'utms',
    sheets: ['FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO'],
    rows: 3265,
    fields: ['codigo', 'grado_academico', 'tipo_evento', 'modalidad', 'utm_campana', 'utm_anuncio', 'celular', 'grupo_usuario'],
    use: 'Cruce entre campana, celular, publico objetivo y producto vendido.',
  },
  {
    name: 'ESTRATEGIAS DE MARKETING 2026.xlsx',
    area: 'Marketing',
    type: 'estrategias',
    sheets: ['BORRADOR EST', 'CURSOS 2026', 'DIPLOMADOS 2026', 'PROMOS ADICIONALES', 'GRUPOS DE WSP'],
    rows: 4247,
    fields: ['codigo', 'evento', 'modalidad', 'fecha_inicio', 'estrategia', 'avance', 'walink', 'inscritos'],
    use: 'Mide estrategias, promociones, grupos WhatsApp, avance inicial y progreso por evento.',
  },
  {
    name: 'RANKING DE VENTAS - AREA DE MARKETING.xlsx',
    area: 'Ventas',
    type: 'ranking',
    sheets: ['RANKING DE VENTAS 2026', 'REGISTRO DIARIO 2026', 'DISTRIBUCION DE GRUPOS', 'DASHBOARD EJECUTIVOS 2026'],
    rows: 4008,
    fields: ['fecha', 'ejecutivo', 'C', 'CM', 'D', 'grupo_wsp', 'llamadas', 'repaso', 'recopilados', 'avance'],
    use: 'Ranking por C/CM/D, checklist diario, distribucion de grupos y alertas por ejecutivo.',
  },
  {
    name: 'SEGUIMIENTO DE LLAMADAS 2026.xlsx',
    area: 'Ventas',
    type: 'llamadas',
    sheets: ['ENERO 2026', 'MAYO 2026', 'JUNIO 2026', 'JULIO 2026', 'INCIDENCIAS EJECUTIVOS 2026'],
    rows: 5306,
    fields: ['numero', 'kommo', 'ejecutivo', 'evento', 'codigo', 'preinscritos', 'inscritos', 'incidencia'],
    use: 'Seguimiento de llamadas, bases asignadas, preinscritos, inscritos e incidencias.',
  },
  {
    name: 'PLANTILLA DE AUTOMATIZACION.md',
    area: 'Ventas / Marketing',
    type: 'plantillas',
    sheets: ['JUNIO', 'DIPLOMADOS', 'CURSOS'],
    rows: 59642,
    fields: ['codigo', 'certificacion', 'link_inscripcion', 'fecha_inicio', 'duracion', 'modalidad', 'publico'],
    use: 'Versionado de mensajes automatizados por producto y etapa comercial.',
  },
  {
    name: 'PLANTILLAS INFORMATIVAS- EVENTOS.md',
    area: 'Caja / Ventas',
    type: 'pagos',
    sheets: ['cuentas', 'correos', 'celulares', 'eventos'],
    rows: 322157,
    fields: ['tipo_programa', 'cuenta', 'titular', 'yape', 'plin', 'correo_area', 'voucher'],
    use: 'Validacion de pagos, cuentas oficiales, correos por area y regla de voucher.',
  },
];

export const DRIVE_FORMULAS = [
  {
    name: 'Conversion por evento',
    formula: 'inscritos / preinscritos * 100',
    source: 'SEGUIMIENTO DE LLAMADAS 2026',
    action: 'Priorizar eventos con alta conversion y bajo volumen de preinscritos para remarketing.',
  },
  {
    name: 'Incremento por estrategia',
    formula: 'progreso - inicio',
    source: 'ESTRATEGIAS DE MARKETING 2026',
    action: 'Detectar piezas, promociones y grupos WhatsApp que realmente empujan inscritos.',
  },
  {
    name: 'Checklist diario',
    formula: 'tareas_completadas / tareas_requeridas * 100',
    source: 'RANKING DE VENTAS - AREA DE MARKETING',
    action: 'Marcar ejecutivo critico cuando FB, llamadas, repaso o cierre de turno quedan incompletos.',
  },
  {
    name: 'Ranking C/CM/D',
    formula: 'C * 1 + CM * 2 + D * 6',
    source: 'RANKING DE VENTAS - AREA DE MARKETING',
    action: 'Comparar volumen con valor comercial y comision real.',
  },
  {
    name: 'SLA de lead reasignado',
    formula: 'minutos_sin_respuesta > 10',
    source: 'Kommo + seguimiento de llamadas',
    action: 'Reasignar lead y conservar ejecutivo original para resolver comision.',
  },
];

export const DRIVE_EVENT_SAMPLES = [
  { code: 'C.SALUDSEXUAL-0626', event: 'Rol de la obstetra en salud sexual y reproductiva', modality: 'Asincronico', month: 'Junio', channel: 'UTM + WhatsApp' },
  { code: 'C.ACUPUNTURAAVANZADA-0626', event: 'Taller intensivo acupuntura avanzada', modality: 'Presencial', month: 'Junio', channel: 'Canva + UTM' },
  { code: 'D.FARMACIASISMED-0426', event: 'Diplomado gestion SISMED', modality: 'Virtual', month: 'Abril', channel: 'UTM duplicada' },
  { code: 'C.PIEDIABETICO-0526', event: 'Manejo integral y curaciones avanzadas de pie diabetico', modality: 'Presencial', month: 'Mayo', channel: 'Usuario 2' },
];

export const DRIVE_PROCESS_ALERTS = [
  {
    severity: 'high',
    title: 'Datos duplicados por mes',
    detail: 'UTM y eventos repiten codigos entre meses. El ERP debe usar codigo + mes + fecha_inicio como llave operativa.',
  },
  {
    severity: 'high',
    title: 'Fechas seriales Excel',
    detail: 'Varias hojas guardan fechas como 46176, 46205, etc. La importacion debe convertir serial Excel a fecha ISO.',
  },
  {
    severity: 'medium',
    title: 'Plantillas sin versionado',
    detail: 'Automatizaciones e informativas estan en Markdown largos. Deben tener version, estado y aprobador.',
  },
  {
    severity: 'medium',
    title: 'Pagos con validacion manual',
    detail: 'Las cuentas oficiales dependen de plantillas. Caja debe validar tipo de programa, titular y voucher antes de cerrar.',
  },
];

export const DRIVE_IMPORT_PHASES = [
  { phase: '1', name: 'Catalogar fuentes', owner: 'Marketing + Ventas', status: 'Listo en ERP', output: 'ventas_fuentes_google y mapa Drive' },
  { phase: '2', name: 'Normalizar Excel', owner: 'Datos', status: 'Pendiente', output: 'Eventos, UTMs, llamadas y ranking en Supabase' },
  { phase: '3', name: 'Cruzar ventas/caja', owner: 'Caja + Finanzas', status: 'Pendiente', output: 'Pago, promesa y comision con propietario claro' },
  { phase: '4', name: 'Automatizar alertas', owner: 'Direccion', status: 'Pendiente', output: 'SLA, conversion, incidencias y eventos ganadores' },
];

export const PAYMENT_CONTROL_RULES = [
  'Usar cuentas oficiales segun tipo de programa: diplomados profesionales, diplomados tecnicos o cursos/congresos.',
  'Sin voucher legible no debe cerrarse la inscripcion.',
  'Pago en cuenta incorrecta queda en validacion y no se liquida comision hasta confirmacion de caja.',
  'Caja debe enviar pagos observados a ventas y finanzas con motivo, titular y programa.',
];

export const buildDriveMetrics = (files = DRIVE_FILES) => {
  const excelFiles = files.filter((item) => item.name.endsWith('.xlsx'));
  const markdownFiles = files.filter((item) => item.name.endsWith('.md'));
  const totalSheets = sumBy(files, (item) => item.sheets.length);
  const totalRows = sumBy(files, (item) => item.rows);
  const salesSources = files.filter((item) => item.area.includes('Ventas')).length;
  const marketingSources = files.filter((item) => item.area.includes('Marketing')).length;

  return {
    totalFiles: files.length,
    excelFiles: excelFiles.length,
    markdownFiles: markdownFiles.length,
    totalSheets,
    totalRows,
    salesSources,
    marketingSources,
    dataReadiness: pctOf(files.filter((item) => item.fields.length >= 6).length, files.length),
  };
};

export const buildDriveSourceGroups = (files = DRIVE_FILES) =>
  files.reduce((acc, item) => {
    const key = item.area.split('/')[0].trim();
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});

export const buildImportRisks = () => ({
  high: DRIVE_PROCESS_ALERTS.filter((item) => item.severity === 'high').length,
  medium: DRIVE_PROCESS_ALERTS.filter((item) => item.severity === 'medium').length,
  paymentControls: PAYMENT_CONTROL_RULES.length,
});
