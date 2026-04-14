// src/pages/finanzas/data/demoData.js
export const MES_ACTUAL = new Date().toLocaleString('es-PE', { month: 'long', year: 'numeric' });

export const INGRESOS_DEMO = [
  { id:1, fecha:'2026-04-01', concepto:'Matrícula Diplomado UCSS - Ciclo 1', area:'Académica', monto:18500, metodo:'Transferencia', estado:'Cobrado', referencia:'TRF-001' },
  { id:2, fecha:'2026-04-02', concepto:'Cuotas Diplomado Enfermería - Grupo B', area:'Académica', monto:12400, metodo:'Yape/Plin', estado:'Cobrado', referencia:'YPE-045' },
  { id:3, fecha:'2026-04-03', concepto:'Inscripciones Curso Farmacología', area:'Académica', monto:6800, metodo:'Transferencia', estado:'Cobrado', referencia:'TRF-002' },
  { id:4, fecha:'2026-04-05', concepto:'Cuotas pendientes - Diplomado Enero', area:'Académica', monto:4200, metodo:'Efectivo', estado:'Pendiente', referencia:'' },
  { id:5, fecha:'2026-04-08', concepto:'Matrícula Técnico Enfermería Noche', area:'Académica', monto:9300, metodo:'Transferencia', estado:'Cobrado', referencia:'TRF-003' },
  { id:6, fecha:'2026-04-10', concepto:'Diplomado Administración Hospitalaria', area:'Académica', monto:15600, metodo:'Transferencia', estado:'Cobrado', referencia:'TRF-004' },
  { id:7, fecha:'2026-04-12', concepto:'Cuotas vencidas - Grupo C Marzo', area:'Académica', monto:3100, metodo:'', estado:'Vencido', referencia:'' },
];

export const EGRESOS_DEMO = [
  { id:1, fecha:'2026-04-01', concepto:'Planilla personal planilla - Marzo', area:'RRHH', monto:28400, categoria:'Planilla', proveedor:'Colaboradores', estado:'Pagado' },
  { id:2, fecha:'2026-04-02', concepto:'Honorarios ponentes - Diplomados', area:'Académica', monto:12800, categoria:'Honorarios', proveedor:'Varios ponentes', estado:'Pagado' },
  { id:3, fecha:'2026-04-03', concepto:'Alquiler oficina - San Isidro', area:'Administración', monto:4500, categoria:'Alquiler', proveedor:'Inmobiliaria López', estado:'Pagado' },
  { id:4, fecha:'2026-04-05', concepto:'Publicidad Facebook/Instagram - Abril', area:'Marketing', monto:3200, categoria:'Marketing', proveedor:'Meta Ads', estado:'Pagado' },
  { id:5, fecha:'2026-04-07', concepto:'Plataforma Zoom + Campus Virtual', area:'Sistemas', monto:1800, categoria:'Tecnología', proveedor:'Zoom/Moodle', estado:'Pagado' },
  { id:6, fecha:'2026-04-09', concepto:'Materiales eventos - folders, impresiones', area:'Logística', monto:2100, categoria:'Materiales', proveedor:'Graficolor SAC', estado:'Pendiente' },
  { id:7, fecha:'2026-04-10', concepto:'EsSalud + AFP planilla', area:'RRHH', monto:4200, categoria:'Cargas Sociales', proveedor:'EsSalud/AFP', estado:'Por pagar' },
  { id:8, fecha:'2026-04-12', concepto:'Locadores de servicios - Abril', area:'RRHH', monto:8900, categoria:'Honorarios', proveedor:'Locadores', estado:'Por pagar' },
];

export const COBRANZAS_DEMO = [
  { id:1, alumno:'García Quispe, Rosa Elena', diplomado:'Diplomado Gestión en Salud', cuotas:6, pagadas:4, monto_total:1800, monto_pagado:1200, vencimiento:'2026-04-15', telefono:'987654321', estado:'Al día' },
  { id:2, alumno:'Mendoza Ríos, Carlos Alberto', diplomado:'Diplomado Enfermería Avanzada', cuotas:8, pagadas:8, monto_total:2400, monto_pagado:2400, vencimiento:'2026-04-10', telefono:'976543210', estado:'Cancelado' },
  { id:3, alumno:'Torres Huanca, Milagros', diplomado:'Técnico Enfermería Nocturno', cuotas:10, pagadas:6, monto_total:3000, monto_pagado:1800, vencimiento:'2026-04-05', telefono:'965432109', estado:'Vencido' },
  { id:4, alumno:'Paredes Salcedo, Juan Carlos', diplomado:'Diplomado Farmacología Clínica', cuotas:6, pagadas:2, monto_total:1800, monto_pagado:600, vencimiento:'2026-03-20', telefono:'954321098', estado:'Moroso' },
  { id:5, alumno:'Quispe Mamani, Sandra', diplomado:'Diplomado Administración Hospitalaria', cuotas:8, pagadas:5, monto_total:2400, monto_pagado:1500, vencimiento:'2026-04-20', telefono:'943210987', estado:'Al día' },
  { id:6, alumno:'Flores Adriano, Martha', diplomado:'Diplomado Gestión en Salud', cuotas:6, pagadas:0, monto_total:1800, monto_pagado:0, vencimiento:'2026-03-15', telefono:'932109876', estado:'Moroso' },
];

export const PRESUPUESTO_DEMO = [
  { area:'Académica',    presupuestado:45000, ejecutado:38200, categoria:'Ingresos' },
  { area:'Marketing',    presupuestado:8000,  ejecutado:7100,  categoria:'Egresos' },
  { area:'RRHH',         presupuestado:38000, ejecutado:41500, categoria:'Egresos' },
  { area:'Logística',    presupuestado:6000,  ejecutado:4200,  categoria:'Egresos' },
  { area:'Tecnología',   presupuestado:3000,  ejecutado:1800,  categoria:'Egresos' },
  { area:'Administración',presupuestado:6000, ejecutado:5800,  categoria:'Egresos' },
];

export const KPI_DEMO = [
  { nombre:'Margen de rentabilidad', meta:80, resultado:62, unidad:'%', area:'Finanzas' },
  { nombre:'Plazo promedio de cobranza', meta:30, resultado:45, unidad:'días', area:'Finanzas', inverso:true },
  { nombre:'Liquidez corriente', meta:1.5, resultado:1.2, unidad:'ratio', area:'Finanzas' },
  { nombre:'Tasa de morosidad', meta:10, resultado:18, unidad:'%', area:'Finanzas', inverso:true },
  { nombre:'Cobertura de egresos fijos', meta:90, resultado:85, unidad:'%', area:'Finanzas' },
  { nombre:'ROI Marketing', meta:300, resultado:420, unidad:'%', area:'Marketing' },
];

export const ESTADO_BADGE = {
  'Cobrado':   'bg-emerald-100 text-emerald-700',
  'Cancelado': 'bg-emerald-100 text-emerald-700',
  'Pagado':    'bg-emerald-100 text-emerald-700',
  'Al día':    'bg-blue-100 text-blue-700',
  'Pendiente': 'bg-amber-100 text-amber-700',
  'Por pagar': 'bg-amber-100 text-amber-700',
  'Vencido':   'bg-orange-100 text-orange-700',
  'Moroso':    'bg-red-100 text-red-700',
};

export const fmt = (n) => `S/ ${Number(n||0).toLocaleString('es-PE', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
export const pct = (v, total) => total > 0 ? Math.round((v/total)*100) : 0;