// src/pages/rrhh/TabPlanillaPagos.jsx
// ─────────────────────────────────────────────────────────────────────────────
// BOLETA FIEL A LA ESTRUCTURA OFICIAL REBAGLIATI
// CORRECCIÓN: FECHA DE INGRESO MUESTRA fecha_ingreso_planilla
// ENVÍO DE CORREO CON EDGE FUNCTION 'send-boleta'
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Download, X, Eye, Send, Users, Briefcase,
  Mail, Loader2, AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';

// ── Constantes de cálculo ─────────────────────────────────────────────────
const AFP_TASAS = {
  'AFP PRIMA MIXTA / SALDO':     { fondo: 0.10, poliza: 0.0137, comision: 0.0000 },
  'AFP PRIMA/FLUJO':             { fondo: 0.10, poliza: 0.0137, comision: 0.0160 },
  'AFP HABITAT MIXTA / SALDO':   { fondo: 0.10, poliza: 0.0137, comision: 0.0000 },
  'AFP HABITAT FLUJO':           { fondo: 0.10, poliza: 0.0137, comision: 0.0147 },
  'AFP PROFUTURO MIXTA / SALDO': { fondo: 0.10, poliza: 0.0137, comision: 0.0000 },
  'AFP PROFUTURO FLUJO':         { fondo: 0.10, poliza: 0.0137, comision: 0.0169 },
  'AFP INTEGRA MIXTA / SALDO':   { fondo: 0.10, poliza: 0.0137, comision: 0.0000 },
  'AFP INTEGRA FLUJO':           { fondo: 0.10, poliza: 0.0137, comision: 0.0155 },
};
const ONP_TASA     = 0.13;
const ESSALUD_TASA = 0.09;
const ASIG_FAM     = 102.50;

const MESES_ES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(num);
};

const fmtFecha = (s) => {
  if (!s) return '—';
  try { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
  catch { return s; }
};

const diasDelMes = (mesStr) => {
  const [y, m] = mesStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const periodoLabel = (mesStr) => {
  const [y, m] = mesStr.split('-').map(Number);
  return `${MESES_ES[m - 1]} DE ${y}`;
};

const afpCorto = (tipoPension) => {
  if (!tipoPension || tipoPension === 'ONP') return tipoPension || '—';
  return tipoPension
    .replace(/^AFP\s+/i, '')
    .replace(/\s+MIXTA\s*\/\s*SALDO$/i, '')
    .replace(/\s*\/\s*FLUJO$/i, '')
    .replace(/\s+FLUJO$/i, '')
    .trim()
    .toUpperCase();
};

// ══════════════════════════════════════════════════════════════════════════════
// CÁLCULO PLANILLA
// ══════════════════════════════════════════════════════════════════════════════
function calcularPlanilla(emp, asistencias = [], mesStr) {
  try {
    const tdm = diasDelMes(mesStr);
    const asisEmp = asistencias.filter(a => String(a.empleado_id) === String(emp?.id));
    let tard10 = 0, fInj = 0, diasDM = 0;
    const valTard = Number(emp?.valor_por_tardanza || 10);
    asisEmp.forEach(a => {
      if (!a.justificacion) {
        if (a.tardanza_supera_10min || (a.tardanza && Number(a.minutos) > 10)) tard10++;
        if (a.falta) fInj++;
      }
      if (a.descanso_medico) diasDM++;
    });

    const ausentes   = fInj + diasDM;
    const diasTrab   = tdm - ausentes;
    const hayAus     = ausentes > 0;

    const sb     = Number(emp?.sueldo_bruto || 0);
    const sProp  = hayAus ? (sb / tdm) * diasTrab : sb;
    const com    = Number(emp?.comodato || 0);
    const cProp  = hayAus ? (com / tdm) * diasTrab : com;

    const af     = emp?.tiene_hijos ? ASIG_FAM : 0;
    const he25   = Number(emp?.horas_extra_25 || 0);
    const he35   = Number(emp?.horas_extra_35 || 0);
    const oib    = Number(emp?.otros_ingresos_bono || 0);
    const vt     = Number(emp?.vacaciones_truncas || 0);
    const gt     = Number(emp?.gratificacion_truncas || 0);
    const ctsTr  = Number(emp?.cts_truncas || 0);
    const mvF    = Number(emp?.movilidad_fija || 0);
    const mvV    = Number(emp?.movilidad_variable || 0);
    const sub    = Number(emp?.subsidio || 0);

    const dTard  = tard10 * valTard;
    const dFalt  = fInj * (sb / 30);

    const TRA = sProp + af + he25 + he35 + oib + vt + gt - dTard;
    const TRNA = cProp + mvF + mvV + sub;
    const TREM = TRA + TRNA;

    const tip = emp?.sistema_pensionario || '';
    let onp = 0, afpF = 0, afpP = 0, afpC = 0, afpT = 0;
    if (tip === 'ONP') {
      onp = TRA * ONP_TASA;
    } else {
      const t = AFP_TASAS[tip] || { fondo: 0.10, poliza: 0.0137, comision: 0 };
      afpF = TRA * t.fondo;
      afpP = TRA * t.poliza;
      afpC = TRA * t.comision;
      afpT = afpF + afpP + afpC;
    }
    const penT = tip === 'ONP' ? onp : afpT;

    const r5    = Number(emp?.renta_5ta || 0);
    const r5As  = Number(emp?.renta_5ta_asumida || 0);
    const adel  = Number(emp?.adelantos || 0);
    const dpe   = Number(emp?.dscto_pago_exceso || 0);
    const d15   = Number(emp?.dscto_15na || 0);

    const TD   = penT + r5 + adel + dpe + d15 + dFalt;
    const NETO = TREM - TD;

    const es9  = TRA * ESSALUD_TASA;
    const esVL = Number(emp?.essalud_vida_ley || 0);

    const obs = [];
    if (fInj > 0)   obs.push(`${fInj} DÍA${fInj > 1 ? 'S' : ''} DE FALTA INJUSTIFICADA`);
    if (tard10 > 0) obs.push(`${tard10} TARDANZA${tard10 > 1 ? 'S' : ''} MAYOR A 10 MINUTOS`);
    if (diasDM > 0) obs.push(`${diasDM} DÍA${diasDM > 1 ? 'S' : ''} DE DESCANSO MÉDICO`);
    if (emp?.observaciones) obs.push(emp.observaciones.toUpperCase());

    return {
      tdm, diasTrab, ausentes, fInj, diasDM, hayAus,
      horas: Number(emp?.horas_trabajadas || diasTrab * 8),
      sb, sProp, af, he25, he35, oib, vt, gt, ctsTr,
      dTard, cProp, mvF, mvV, sub,
      TRA, TRNA, TREM,
      tip, afpCortoNom: afpCorto(tip),
      onp, afpF, afpP, afpC, afpT, penT,
      r5, r5As, adel, dpe, d15, dFalt, TD, NETO,
      tard10, valTard,
      es9, esVL,
      banco: emp?.banco_nombre || emp?.banco || '—',
      cuenta: emp?.numero_cuenta || '—',
      cuspp: emp?.cuspp || '—',
      nroEssalud: emp?.nro_essalud || '—',
      cCosto: emp?.c_costo || '—',
      cod: emp?.codigo_interno || String(emp?.id || '—'),
      vacD: emp?.vacaciones_desde || '-',
      vacH: emp?.vacaciones_hasta || '-',
      vacR: emp?.vacaciones_retorno || '-',
      vacDias: emp?.vacaciones_dias || '-',
      pVac: emp?.periodo_vacacional || '-',
      obs: obs.join(' | '),
      // FECHA DE INGRESO A PLANILLA (con fallback a fecha_inicio)
      fechaIngresoPlanilla: emp?.fecha_ingreso_planilla || emp?.fecha_inicio,
    };
  } catch (e) {
    console.error('calcularPlanilla:', e);
    return {
      sb:0, sProp:0, af:0, he25:0, he35:0, oib:0, vt:0, gt:0, ctsTr:0,
      dTard:0, cProp:0, mvF:0, mvV:0, sub:0, TRA:0, TRNA:0, TREM:0,
      tip:'', afpCortoNom:'—', onp:0, afpF:0, afpP:0, afpC:0, afpT:0, penT:0,
      r5:0, r5As:0, adel:0, dpe:0, d15:0, dFalt:0, TD:0, NETO:0,
      tard10:0, valTard:10, es9:0, esVL:0,
      banco:'—', cuenta:'—', cuspp:'—', nroEssalud:'—', cCosto:'—', cod:'—',
      tdm:30, diasTrab:30, ausentes:0, fInj:0, diasDM:0, hayAus:false,
      horas:0, obs:'', vacD:'-', vacH:'-', vacR:'-', vacDias:'-', pVac:'-',
      fechaIngresoPlanilla: null,
    };
  }
}

// ── Cálculo locadores ─────────────────────────────────────────────────────
function calcularLocador(loc, asis = []) {
  try {
    const sb = Number(loc?.sueldo_base || loc?.monto_mensual || 0);
    const al = asis.filter(a => String(a.locador_id) === String(loc?.id));
    let t10 = 0, fi = 0;
    const vt = Number(loc?.valor_por_tardanza || 10);
    al.forEach(a => {
      if (!a.justificacion) {
        if (a.tardanza_supera_10min || (a.tardanza && Number(a.minutos) > 10)) t10++;
        if (a.falta) fi++;
      }
    });
    const dt = t10 * vt, df = fi * (sb / 30);
    const ret4 = sb > 1500 ? sb * 0.08 : 0;
    const td = dt + df + ret4;
    return { sb, t10, fi, vt, dt, df, ret4, td, neto: sb - td,
      banco: loc?.banco || '—', cuenta: loc?.numero_cuenta || '—' };
  } catch { return { sb:0, t10:0, fi:0, vt:10, dt:0, df:0, ret4:0, td:0, neto:0, banco:'—', cuenta:'—' }; }
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERADOR PDF (versión que retorna base64 y versión que descarga)
// ══════════════════════════════════════════════════════════════════════════════
function generarPDF(emp, c, mesStr, returnBase64 = false) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, ML = 12, MR = 12;
  const AZUL  = [17, 40, 78];
  const AZUL2 = [24, 95, 165];
  const GRIS  = [248, 250, 252];
  let y = 0;

  const periodo = periodoLabel(mesStr);
  const nomCompleto = `${(emp.apellido || '').toUpperCase()} ${(emp.nombre || '').toUpperCase()}`;

  // ENCABEZADO
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text('CONSORCIO REBAGLIATI DIPLOMADOS SAC', ML, 8);
  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text('R.U.C. : 20601225175', ML, 13);
  doc.text('AV 28 DE JULIO 1004 PISO 07  -  LIMA - LIMA - LIMA', ML, 17);
  doc.text('ACREDITACION REMYPE   27/05/2016   0001377392-2016', ML, 21);
  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('BOLETAS DE PAGO', W - MR, 8, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  doc.text(periodo, W - MR, 13, { align: 'right' });
  doc.text('D.S. Nro. 001-98-TR DEL 22.01.98', W - MR, 17, { align: 'right' });
  doc.setFontSize(7);
  doc.text(`CODIGO  ${c.cod}`, ML, 24);
  y = 29;

  // DATOS TRABAJADOR
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'bold').setFontSize(7);
  doc.text('APELLIDOS Y NOMBRES', ML, y + 3.5);
  doc.text(':', ML + 42, y + 3.5);
  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text(nomCompleto, ML + 45, y + 3.5);
  doc.line(ML, y + 5, W - MR, y + 5);
  y += 5;

  doc.setFont('helvetica', 'bold').setFontSize(7);
  doc.text('CARGO', ML, y + 3.5);
  doc.text(':', ML + 42, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(emp.cargo || '—', ML + 45, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Nro. ESSALUD :', W / 2 + 5, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(c.nroEssalud, W / 2 + 35, y + 3.5);
  doc.line(ML, y + 5, W - MR, y + 5);
  y += 5;

  doc.setFont('helvetica', 'bold').setFontSize(7);
  doc.text('FECHA DE INGRESO', ML, y + 3.5);
  doc.text(':', ML + 42, y + 3.5);
  doc.setFont('helvetica', 'normal');
  // ─── CORRECCIÓN: Usar fechaIngresoPlanilla del cálculo ──────────────────
  doc.text(fmtFecha(c.fechaIngresoPlanilla), ML + 45, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.text('No.CUSPP:', W / 2 + 5, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(c.cuspp, W / 2 + 25, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.text('AFP:', W / 2 + 68, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(c.afpCortoNom || (c.tip === 'ONP' ? 'ONP' : '—'), W / 2 + 76, y + 3.5);
  doc.line(ML, y + 5, W - MR, y + 5);
  y += 5;

  doc.setFont('helvetica', 'bold').setFontSize(7);
  doc.text('CONDICION', ML, y + 3.5);
  doc.text(':', ML + 42, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PLANILLA', ML + 45, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Nro. D.N.I.', W / 2 + 5, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(emp.dni || '—'), W / 2 + 26, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.text('C. COSTO', W / 2 + 68, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(c.cCosto), W / 2 + 82, y + 3.5);
  doc.line(ML, y + 5, W - MR, y + 5);
  y += 5;

  doc.setFont('helvetica', 'bold').setFontSize(7);
  doc.text('FECHA DE CESE', ML, y + 3.5);
  doc.text(':', ML + 42, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(emp.fecha_cese ? fmtFecha(emp.fecha_cese) : '-', ML + 45, y + 3.5);
  doc.line(ML, y + 5, W - MR, y + 5);
  y += 6;

  // SUELDO BÁSICO | DÍAS | HORAS
  doc.setFillColor(235, 240, 252);
  doc.rect(ML, y, W - ML - MR, 7, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.setTextColor(17, 40, 78);
  doc.text(' SUELDO BASICO', ML + 1, y + 4.8);
  doc.setFont('helvetica', 'normal');
  doc.text(fmt(c.sb), ML + 36, y + 4.8);
  doc.setFont('helvetica', 'bold');
  doc.text('DIAS TRABAJADOS', ML + 80, y + 4.8);
  doc.setFont('helvetica', 'normal');
  doc.text(String(c.diasTrab), ML + 112, y + 4.8);
  doc.setFont('helvetica', 'bold');
  doc.text(' Nº H. TRAB.', ML + 130, y + 4.8);
  doc.setFont('helvetica', 'normal');
  doc.text(String(c.horas), ML + 152, y + 4.8);
  doc.setTextColor(0, 0, 0);
  y += 9;

  // COLUMNAS REMUNERACIONES / DESCUENTOS / APORTES
  const C1 = ML;
  const C2 = ML + 82;
  const C3 = ML + 152;
  const W1 = 82, W2 = 70, W3 = W - ML - MR - 82 - 70;

  doc.setFillColor(...AZUL2);
  doc.rect(C1, y, W1, 6, 'F');
  doc.rect(C2, y, W2, 6, 'F');
  doc.rect(C3, y, W3, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.text('REMUNERACIONES:', C1 + 2, y + 4.2);
  doc.text('DESCUENTOS', C2 + W2 / 2, y + 4.2, { align: 'center' });
  doc.text('APORT. EMPLEADOR', C3 + 1, y + 4.2);
  doc.setTextColor(0, 0, 0);
  y += 7;

  const colRem = [
    ['Basico Mensual Jornal',    fmt(c.sProp)],
    ['Horas Extras  25%',        c.he25 > 0 ? fmt(c.he25) : ''],
    ['Horas Extras  35%',        c.he35 > 0 ? fmt(c.he35) : ''],
    ['Descuentos por tardanzas', c.dTard > 0 ? `(${fmt(c.dTard)})` : ''],
    ['RENTA 5ta Asumido',        c.r5As > 0 ? fmt(c.r5As) : ''],
    ['Movilidad',                (c.mvF + c.mvV) > 0 ? fmt(c.mvF + c.mvV) : ''],
    ['Vacaciones',               c.vt > 0 ? fmt(c.vt) : ''],
    ['Gratificación',            c.gt > 0 ? fmt(c.gt) : ''],
    ['Comp. Tiempo de Servicio', c.ctsTr > 0 ? fmt(c.ctsTr) : ''],
    ['Condicion de trabajo',     c.cProp > 0 ? fmt(c.cProp) : ''],
    ['Subsidio',                 c.sub > 0 ? fmt(c.sub) : ''],
  ];
  if (c.af > 0) colRem.splice(1, 0, ['Asig. Familiar', fmt(c.af)]);

  const colDesc = [
    ['ONP 13%',              c.tip === 'ONP' ? fmt(c.onp) : ''],
    ['  RENTA 5ta',          c.r5 > 0 ? fmt(c.r5) : ''],
    ['AFP Aport. 10%',       c.tip !== 'ONP' ? fmt(c.afpF) : ''],
    ['AFP Com. Seg.',        c.tip !== 'ONP' ? fmt(c.afpP) : ''],
    ['AFP Com. Com.',        c.afpC > 0 ? fmt(c.afpC) : ''],
    ['Adelanto.',            c.adel > 0 ? fmt(c.adel) : ''],
    ['Dscto pago exceso abr', c.dpe !== 0 ? fmt(c.dpe) : ''],
    ['Subsidio 35%',         ''],
    ['Obsequio al trabajador',''],
    ['Liq Benerf Soc',       ''],
    ['Prestm.1ra.quinc',     c.d15 > 0 ? fmt(c.d15) : ''],
  ];
  if (c.dFalt > 0) colDesc.splice(5, 0, ['Desc.Faltas Injust.', fmt(c.dFalt)]);

  const colAp = [
    [' ESSALUD  9%',    fmt(c.es9)],
    ['SIS',             ''],
    ['Essalud Vida Ley', c.esVL > 0 ? fmt(c.esVL) : ''],
  ];

  const nRows = Math.max(colRem.length, colDesc.length, colAp.length);
  const rowH = 4.8;

  for (let i = 0; i < nRows; i++) {
    const yR = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(...GRIS);
      doc.rect(C1, yR, W - ML - MR, rowH, 'F');
    }
    doc.setFont('helvetica', 'normal').setFontSize(6.8);
    doc.setTextColor(50, 50, 50);

    if (colRem[i]) {
      doc.text(colRem[i][0], C1 + 1.5, yR + 3.3);
      if (colRem[i][1]) {
        const isNeg = colRem[i][1].startsWith('(');
        doc.setTextColor(isNeg ? 180 : 50, isNeg ? 30 : 120, isNeg ? 30 : 50);
        doc.text(colRem[i][1], C2 - 1.5, yR + 3.3, { align: 'right' });
        doc.setTextColor(50, 50, 50);
      }
    }
    if (colDesc[i]) {
      doc.text(colDesc[i][0], C2 + 1.5, yR + 3.3);
      if (colDesc[i][1]) {
        doc.setTextColor(170, 25, 25);
        doc.text(colDesc[i][1], C3 - 1.5, yR + 3.3, { align: 'right' });
        doc.setTextColor(50, 50, 50);
      }
    }
    if (colAp[i]) {
      doc.text(colAp[i][0], C3 + 1.5, yR + 3.3);
      if (colAp[i][1]) {
        doc.setTextColor(30, 80, 160);
        doc.text(colAp[i][1], W - MR - 0.5, yR + 3.3, { align: 'right' });
        doc.setTextColor(50, 50, 50);
      }
    }
  }
  y += nRows * rowH + 1;

  // TOTALES
  doc.setDrawColor(180, 190, 210);
  doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);
  y += 1.5;
  doc.setFillColor(222, 232, 248);
  doc.rect(ML, y, W - ML - MR, 6.5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.setTextColor(...AZUL);
  doc.text('  TOTAL REMUNERACION', C1 + 1, y + 4.4);
  doc.text(':', C1 + 44, y + 4.4);
  doc.text(fmt(c.TREM), C2 - 1.5, y + 4.4, { align: 'right' });
  doc.text('  Total Dscto. S/.', C2 + 1, y + 4.4);
  doc.setTextColor(170, 25, 25);
  doc.text(fmt(c.TD), C3 - 1.5, y + 4.4, { align: 'right' });
  doc.setTextColor(...AZUL);
  doc.text('   Total    S/. ', C3 + 1, y + 4.4);
  doc.setTextColor(30, 80, 160);
  doc.text(fmt(c.es9 + c.esVL), W - MR - 0.5, y + 4.4, { align: 'right' });
  y += 8;

  // (-) DESCUENTOS
  doc.setFillColor(240, 243, 252);
  doc.rect(ML, y, W - ML - MR, 6, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.setTextColor(...AZUL);
  doc.text(' (-) DESCUENTOS', C1 + 1, y + 4);
  doc.text(':', C1 + 39, y + 4);
  doc.setTextColor(170, 25, 25);
  doc.text(`-${fmt(c.TD)}`, C2 - 1.5, y + 4, { align: 'right' });
  y += 8;

  // NETO A PAGAR
  doc.setFillColor(...AZUL);
  doc.rect(ML, y, W - ML - MR, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('NETO A PAGAR', ML + 3, y + 7.5);
  doc.text(':', ML + 41, y + 7.5);
  doc.setFontSize(13);
  doc.text(fmt(c.NETO), W - MR - 3, y + 8, { align: 'right' });
  y += 14;

  // OBSERVACIONES
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.text('Observaciones:', ML, y + 3.5);
  doc.setFont('helvetica', 'normal').setFontSize(7);
  if (c.obs) {
    doc.setTextColor(160, 25, 25);
    doc.text(c.obs, ML + 32, y + 3.5, { maxWidth: W - ML - MR - 35 });
    doc.setTextColor(0, 0, 0);
  }
  y += 8;

  // VACACIONES TOMADAS
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.text('VACACIONES TOMADAS', ML, y + 3);
  y += 5;
  const vCols = ['DESDE', 'HASTA', 'RETORNO', 'DIAS'];
  const vVals = [c.vacD, c.vacH, c.vacR, String(c.vacDias)];
  const vW = 36, vX0 = ML;
  vCols.forEach((h, i) => {
    doc.setFillColor(...AZUL2);
    doc.rect(vX0 + i * vW, y, vW - 1, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold').setFontSize(6.5);
    doc.text(h, vX0 + i * vW + vW / 2, y + 3.5, { align: 'center' });
  });
  y += 6;
  vVals.forEach((v, i) => {
    doc.setFillColor(245, 248, 255);
    doc.rect(vX0 + i * vW, y, vW - 1, 5, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal').setFontSize(6.5);
    doc.text(v || '-', vX0 + i * vW + vW / 2, y + 3.5, { align: 'center' });
  });
  y += 7;
  doc.setFont('helvetica', 'bold').setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('PERIODO VACACIONAL', ML, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(c.pVac || '-', ML + 38, y + 3);

  if (returnBase64) {
    const dataUri = doc.output('datauristring');
    return dataUri.split(',')[1].replace(/\s/g, '');
  } else {
    const nomFile = `boleta_${(emp.apellido || 'trab').replace(/\s/g, '_')}_${mesStr}.pdf`;
    doc.save(nomFile);
  }
}

// ─── MODAL BOLETA (con envío de correo corregido) ───────────────────────────
function ModalBoleta({ emp, c, mesStr, onClose }) {
  const periodo = periodoLabel(mesStr);
  const nomCompleto = `${(emp.apellido || '').toUpperCase()} ${(emp.nombre || '').toUpperCase()}`;

  const enviarCorreo = async () => {
    try {
      const correo = emp.correo || emp.email;
      if (!correo) throw new Error('Correo no registrado');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión no iniciada');

      const pdfBase64 = generarPDF(emp, c, mesStr, true);

      const { error } = await supabase.functions.invoke('send-boleta', {
        body: { email: correo, nombre: `${emp.nombre} ${emp.apellido}`, pdfBase64, mes: mesStr }
      });

      if (error) throw error;
      alert(`✅ Boleta enviada a ${correo}`);
    } catch (err) {
      console.error(err);
      alert('❌ Error al enviar: ' + err.message);
    }
  };

  const filasRem = [
    { lbl: 'Basico Mensual Jornal',    val: c.sProp, show: true },
    { lbl: 'Asig. Familiar',           val: c.af,    show: c.af > 0 },
    { lbl: 'Horas Extras  25%',        val: c.he25,  show: true },
    { lbl: 'Horas Extras  35%',        val: c.he35,  show: true },
    { lbl: 'Descuentos por tardanzas', val: c.dTard,  show: true, neg: true },
    { lbl: 'RENTA 5ta Asumido',        val: c.r5As,  show: true },
    { lbl: 'Movilidad',                val: c.mvF + c.mvV, show: true },
    { lbl: 'Vacaciones',               val: c.vt,    show: true },
    { lbl: 'Gratificación',            val: c.gt,    show: true },
    { lbl: 'Comp. Tiempo de Servicio', val: c.ctsTr, show: true },
    { lbl: 'Condicion de trabajo',     val: c.cProp, show: true },
    { lbl: 'Subsidio',                 val: c.sub,   show: true },
  ];

  const filasDesc = [
    { lbl: 'ONP 13%',               val: c.tip === 'ONP' ? c.onp : 0,  show: true },
    { lbl: '  RENTA 5ta',           val: c.r5,              show: true },
    { lbl: 'AFP Aport. 10%',        val: c.tip !== 'ONP' ? c.afpF : 0, show: true },
    { lbl: 'AFP Com. Seg.',         val: c.tip !== 'ONP' ? c.afpP : 0, show: true },
    { lbl: 'AFP Com. Com.',         val: c.afpC,            show: true },
    { lbl: 'Adelanto.',             val: c.adel,            show: true },
    { lbl: 'Dscto pago exceso abr', val: c.dpe,             show: true },
    { lbl: 'Desc.Faltas Injust.',   val: c.dFalt,           show: c.dFalt > 0 },
    { lbl: 'Subsidio 35%',         val: 0,                 show: true },
    { lbl: 'Obsequio al trabajador',val: 0,                 show: true },
    { lbl: 'Liq Benerf Soc',       val: 0,                 show: true },
    { lbl: 'Prestm.1ra.quinc',     val: c.d15,             show: true },
  ];

  const filasAp = [
    { lbl: ' ESSALUD  9%',    val: c.es9,  show: true },
    { lbl: 'SIS',             val: 0,      show: true },
    { lbl: 'Essalud Vida Ley',val: c.esVL, show: true },
  ];

  const nRows = Math.max(filasRem.length, filasDesc.length, filasAp.length);

  const FilaTabla = ({ rem, desc, ap, idx }) => (
    <div className={`grid border-b border-gray-100 text-[9px] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}
      style={{ gridTemplateColumns: '82px 70px 1px 70px 62px 1px auto' }}>
      <div className="px-1.5 py-1 text-gray-600 truncate">{rem?.lbl || ''}</div>
      <div className={`px-1 py-1 text-right font-mono ${rem?.neg && rem?.val > 0 ? 'text-red-600' : rem?.val > 0 ? 'text-emerald-700 font-bold' : 'text-gray-300'}`}>
        {rem?.val > 0 ? (rem.neg ? `(${fmt(rem.val)})` : fmt(rem.val)) : ''}
      </div>
      <div className="bg-gray-200"/>
      <div className="px-1.5 py-1 text-gray-600 truncate">{desc?.lbl || ''}</div>
      <div className={`px-1 py-1 text-right font-mono ${desc?.val > 0 ? 'text-red-600 font-bold' : 'text-gray-300'}`}>
        {desc?.val > 0 ? fmt(desc.val) : ''}
      </div>
      <div className="bg-gray-200"/>
      <div className="px-1.5 py-1 flex justify-between">
        <span className="text-gray-600 truncate">{ap?.lbl || ''}</span>
        <span className={`font-mono ml-1 ${ap?.val > 0 ? 'text-blue-700 font-bold' : 'text-gray-300'}`}>
          {ap?.val > 0 ? fmt(ap.val) : ''}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <div className="bg-white w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[98vh]">
        <div className="bg-[#11284e] px-5 py-3 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="text-white">
              <p className="font-black text-[13px] tracking-tight">CONSORCIO REBAGLIATI DIPLOMADOS SAC</p>
              <p className="text-[8px] text-white/50 leading-tight">R.U.C. : 20601225175</p>
              <p className="text-[8px] text-white/50 leading-tight">AV 28 DE JULIO 1004 PISO 07  ·  LIMA - LIMA - LIMA</p>
              <p className="text-[8px] text-white/40 leading-tight">ACREDITACION REMYPE  27/05/2016  0001377392-2016</p>
            </div>
            <div className="text-right text-white">
              <div className="flex items-start gap-3">
                <div>
                  <p className="font-black text-[12px]">BOLETAS DE PAGO</p>
                  <p className="text-[10px] text-blue-300 font-bold">{periodo}</p>
                  <p className="text-[8px] text-white/40">D.S. Nro. 001-98-TR DEL 22.01.98</p>
                </div>
                <button onClick={onClose}
                  className="hover:bg-white/10 p-1.5 rounded-full text-white/60 hover:text-white mt-0.5">
                  <X size={16}/>
                </button>
              </div>
            </div>
          </div>
          <p className="text-[8px] text-white/40 mt-1">CODIGO  {c.cod}</p>
        </div>

        <div className="bg-blue-50 border-b border-blue-100 px-5 py-2 flex-shrink-0 text-[9px]">
          {[
            { l: 'APELLIDOS Y NOMBRES', v: nomCompleto, extra: null },
            { l: 'CARGO', v: emp.cargo || '—', extra: { l: 'Nro. ESSALUD :', v: c.nroEssalud } },
            // ─── CORRECCIÓN: usar c.fechaIngresoPlanilla ──────────────────
            { l: 'FECHA DE INGRESO', v: fmtFecha(c.fechaIngresoPlanilla),
              extra2: { l: 'No.CUSPP:', v: c.cuspp }, extra3: { l: 'AFP:', v: c.afpCortoNom || (c.tip === 'ONP' ? 'ONP' : '—') } },
            { l: 'CONDICION', v: 'PLANILLA',
              extra2: { l: 'Nro. D.N.I.', v: String(emp.dni || '—') }, extra3: { l: 'C. COSTO', v: String(c.cCosto) } },
            { l: 'FECHA DE CESE', v: emp.fecha_cese ? fmtFecha(emp.fecha_cese) : '-', extra: null },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-1 py-0.5 border-b border-blue-100 last:border-0">
              <span className="font-black text-gray-500 w-32 flex-shrink-0 uppercase">{row.l}:</span>
              <span className="text-gray-800 font-mono flex-1">{row.v}</span>
              {row.extra && (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="font-black text-gray-500 uppercase">{row.extra.l}</span>
                  <span className="font-mono text-gray-800">{row.extra.v}</span>
                </div>
              )}
              {row.extra2 && (
                <div className="flex items-center gap-3 ml-auto">
                  <span className="font-black text-gray-500 uppercase">{row.extra2.l}</span>
                  <span className="font-mono text-gray-800">{row.extra2.v}</span>
                  {row.extra3 && <>
                    <span className="font-black text-gray-500 uppercase">{row.extra3.l}</span>
                    <span className="font-mono font-black text-[#185FA5]">{row.extra3.v}</span>
                  </>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-blue-100/50 border-b border-blue-200 px-5 py-1.5 flex-shrink-0 flex gap-8 text-[9px]">
          <span className="font-black text-[#185FA5] uppercase">SUELDO BASICO</span>
          <span className="font-mono font-bold">{fmt(c.sb)}</span>
          <span className="font-black text-[#185FA5] uppercase ml-4">DIAS TRABAJADOS</span>
          <span className="font-mono font-bold">{c.diasTrab}</span>
          <span className="font-black text-[#185FA5] uppercase ml-4">Nº H. TRAB.</span>
          <span className="font-mono font-bold">{c.horas}</span>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="grid border-b-2 border-[#185FA5] text-[8px] font-black uppercase text-white"
            style={{ gridTemplateColumns: '82px 70px 1px 70px 62px 1px auto' }}>
            <div className="bg-[#185FA5] px-1.5 py-1.5 col-span-2 text-center">REMUNERACIONES:</div>
            <div className="bg-[#185FA5]"/>
            <div className="bg-[#185FA5] px-1.5 py-1.5 col-span-2 text-center">DESCUENTOS</div>
            <div className="bg-[#185FA5]"/>
            <div className="bg-[#185FA5] px-1.5 py-1.5">  APORT. EMPLEADOR</div>
          </div>

          {Array.from({ length: nRows }).map((_, i) => (
            <FilaTabla key={i} idx={i}
              rem={filasRem[i]}
              desc={filasDesc[i]}
              ap={filasAp[i]}/>
          ))}

          <div className="grid border-t-2 border-blue-300 bg-blue-50 text-[9px] font-black"
            style={{ gridTemplateColumns: '82px 70px 1px 70px 62px 1px auto' }}>
            <div className="px-1.5 py-1.5 text-[#185FA5] col-span-2">
              <span className="mr-1">TOTAL REMUNERACION</span>
              <span>:</span>
              <span className="ml-1 font-mono">{fmt(c.TREM)}</span>
            </div>
            <div className="bg-blue-200"/>
            <div className="px-1.5 py-1.5 text-gray-600">Total Dscto. S/.</div>
            <div className="px-1 py-1.5 text-right font-mono text-red-700">{fmt(c.TD)}</div>
            <div className="bg-blue-200"/>
            <div className="px-1.5 py-1.5 flex justify-between text-blue-800">
              <span>   Total    S/.</span>
              <span className="font-mono">{fmt(c.es9 + c.esVL)}</span>
            </div>
          </div>

          <div className="grid bg-blue-50/50 border-b text-[9px] font-black text-[#185FA5]"
            style={{ gridTemplateColumns: '82px 70px 1px 70px 62px 1px auto' }}>
            <div className="px-1.5 py-1.5 col-span-2">
              <span className="mr-1">(-) DESCUENTOS</span>
              <span>:</span>
              <span className="ml-1 font-mono text-red-700">-{fmt(c.TD)}</span>
            </div>
            <div/><div/><div/><div/><div/>
          </div>

          <div className="bg-[#11284e] px-5 py-3 flex justify-between items-center">
            <p className="font-black text-white uppercase text-[12px]">NETO A PAGAR :</p>
            <div className="text-right">
              <p className="font-black text-white text-[22px] font-mono leading-none">
                S/ {fmt(c.NETO)}
              </p>
              <p className="text-[8px] text-blue-300 mt-0.5">{c.banco}  ·  {c.cuenta}</p>
            </div>
          </div>

          <div className="px-5 py-2 border-b bg-white">
            <p className="text-[8px] font-black text-gray-500 uppercase">Observaciones:</p>
            {c.obs ? (
              <div className="flex items-start gap-1.5 mt-0.5 bg-red-50 border border-red-100 rounded px-3 py-1.5">
                <AlertCircle size={11} className="text-red-500 flex-shrink-0 mt-0.5"/>
                <p className="text-[9px] font-bold text-red-700">{c.obs}</p>
              </div>
            ) : (
              <p className="text-[9px] text-gray-300 italic mt-0.5">Sin observaciones</p>
            )}
          </div>

          <div className="px-5 py-2 bg-white">
            <p className="text-[8px] font-black text-gray-500 uppercase mb-1">VACACIONES TOMADAS</p>
            <div className="flex gap-0 max-w-xs text-[8px]">
              {['DESDE','HASTA','RETORNO','DIAS'].map((h) => (
                <div key={h} className="flex-1 text-center">
                  <div className="bg-[#185FA5] text-white font-black py-0.5 text-[7px] rounded-t">{h}</div>
                  <div className="border border-t-0 border-gray-200 rounded-b py-0.5 font-mono text-gray-600 bg-gray-50">
                    {h === 'DESDE' ? c.vacD : h === 'HASTA' ? c.vacH : h === 'RETORNO' ? c.vacR : c.vacDias}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1 text-[8px]">
              <span className="font-black text-gray-500 uppercase">PERIODO VACACIONAL:</span>
              <span className="font-mono text-gray-700">{c.pVac}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t flex gap-2 flex-shrink-0">
          <button onClick={() => generarPDF(emp, c, mesStr, false)}
            className="flex-1 bg-[#11284e] text-white py-2.5 rounded-xl text-[10px] font-black uppercase
                       hover:bg-[#185FA5] transition-colors flex items-center justify-center gap-1.5">
            <Download size={13}/> Descargar PDF
          </button>
          <button onClick={enviarCorreo}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black
                       hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
            <Mail size={13}/> Enviar correo
          </button>
          <button onClick={onClose}
            className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-[10px] font-black hover:bg-gray-300">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL LOCADOR ────────────────────────────────────────────────────────
function ModalLocador({ loc, c, mesStr, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#11284e] px-5 py-4 flex justify-between items-center text-white">
          <div>
            <p className="font-black text-[11px] uppercase tracking-widest">COMPROBANTE DE PAGO — LOCADOR</p>
            <p className="text-[9px] text-blue-300 mt-0.5">{periodoLabel(mesStr)}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3 text-[11px]">
          <div className="bg-blue-50 rounded-xl px-4 py-3 grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <p className="font-black text-blue-600 uppercase text-[8px] mb-0.5">Empresa</p>
              <p className="font-bold text-gray-800">CONSORCIO REBAGLIATI DIPLOMADOS SAC</p>
              <p className="text-gray-500">RUC: 20601225175</p>
            </div>
            <div>
              <p className="font-black text-blue-600 uppercase text-[8px] mb-0.5">Locador</p>
              <p className="font-bold text-gray-800">{loc.apellido}, {loc.nombre}</p>
              <p className="text-gray-500">DNI: {loc.dni || '—'}</p>
              <p className="text-gray-500">{c.banco} · {c.cuenta}</p>
            </div>
          </div>
          <div className="border rounded-xl overflow-hidden text-[10px]">
            <div className="bg-emerald-600 px-3 py-1.5 text-white font-black text-[8px] uppercase">Honorarios</div>
            <div className="divide-y">
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">Sueldo Base</span>
                <span className="font-black text-gray-800 font-mono">S/ {fmt(c.sb)}</span>
              </div>
              {c.dt > 0 && <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">(-) Tardanzas ({c.t10}×S/{c.vt})</span>
                <span className="text-red-600 font-mono">- S/ {fmt(c.dt)}</span>
              </div>}
              {c.df > 0 && <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">(-) Faltas ({c.fi})</span>
                <span className="text-red-600 font-mono">- S/ {fmt(c.df)}</span>
              </div>}
              {c.ret4 > 0 && <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">(-) Retención 4ta Categ. (8%)</span>
                <span className="text-red-600 font-mono">- S/ {fmt(c.ret4)}</span>
              </div>}
              <div className="flex justify-between px-3 py-2 bg-red-50">
                <span className="font-black text-red-700">Total Descuentos</span>
                <span className="font-black text-red-700 font-mono">S/ {fmt(c.td)}</span>
              </div>
            </div>
          </div>
          <div className="bg-[#11284e] rounded-xl px-5 py-3 flex justify-between items-center">
            <p className="text-white font-black uppercase">NETO A PAGAR</p>
            <p className="text-xl font-black text-white font-mono">S/ {fmt(c.neto)}</p>
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t flex gap-2">
          <button className="flex-1 bg-[#11284e] text-white py-2 rounded-xl text-[10px] font-black
                             hover:bg-[#185FA5] flex items-center justify-center gap-1.5">
            <Download size={13}/> PDF
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl text-[10px] font-black hover:bg-gray-300">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function TabPlanillaPagos() {
  const [mes, setMes]           = useState(new Date().toISOString().slice(0, 7));
  const [cols, setCols]         = useState([]);
  const [locs, setLocs]         = useState([]);
  const [asis, setAsis]         = useState([]);
  const [asisL, setAsisL]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [vista, setVista]       = useState('planilla');
  const [selEmp, setSelEmp]     = useState(null);
  const [selLoc, setSelLoc]     = useState(null);

  const cargar = async () => {
    setLoading(true); setError(null);
    try {
      const { data: e, error: eE } = await supabase.from('empleados').select('*').eq('estado', 'activo');
      if (eE) throw eE;
      const { data: l, error: lE } = await supabase.from('locadores').select('*').eq('estado', 'activo');
      if (lE) throw lE;
      const p1 = `${mes}-01`;
      const p2 = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().slice(0, 10);
      const { data: a, error: aE } = await supabase.from('asistencia').select('*').gte('fecha', p1).lte('fecha', p2);
      if (aE) throw aE;
      const { data: al, error: alE } = await supabase.from('asistencia_locadores').select('*').gte('fecha', p1).lte('fecha', p2);
      if (alE) throw alE;
      setCols(e || []); setLocs(l || []); setAsis(a || []); setAsisL(al || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [mes]);

  const enviarFinanzas = async () => {
    const total = cols.reduce((s, e) => s + calcularPlanilla(e, asis, mes).NETO, 0);
    if (!window.confirm(`¿Enviar planilla a Finanzas por S/ ${fmt(total)}?`)) return;
    await supabase.from('egresos').insert({
      fecha: new Date().toISOString().split('T')[0],
      concepto: `Planilla de Haberes - ${mes}`, area: 'RRHH',
      categoria: 'Planilla', proveedor: 'Nómina Colaboradores',
      monto: total, estado: 'Pendiente',
    });
    alert(`Planilla enviada: S/ ${fmt(total)}`);
  };

  const exportCSV = () => {
    const hdr = ['Nombres','DNI','Área','Cargo','Sueldo Básico','Proporcional','Comodato',
      'Total Afecto','Total No Afecto','Sistema','AFP/ONP','Renta5ta','Adelantos',
      'Desc.Tardanzas','Desc.Faltas','Total Desctos','Neto a Pagar','EsSalud Emp.','Banco','Cuenta'].join(',');
    const rows = cols.map(emp => {
      const c = calcularPlanilla(emp, asis, mes);
      return [
        `${emp.apellido} ${emp.nombre}`, emp.dni, emp.area, emp.cargo,
        c.sb, c.sProp, c.cProp, c.TRA, c.TRNA,
        c.tip, fmt(c.penT), c.r5, c.adel,
        c.dTard, c.dFalt, fmt(c.TD), fmt(c.NETO), fmt(c.es9), c.banco, c.cuenta,
      ].join(',');
    }).join('\n');
    const blob = new Blob(['\uFEFF' + hdr + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planilla_${mes}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totP  = cols.reduce((s, e) => s + calcularPlanilla(e, asis, mes).NETO, 0);
  const totL  = locs.reduce((s, l) => s + calcularLocador(l, asisL).neto, 0);
  const totEs = cols.reduce((s, e) => s + calcularPlanilla(e, asis, mes).es9, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <Loader2 className="animate-spin" size={24}/>
      <span className="text-sm">Cargando planilla...</span>
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 text-sm">
      <AlertCircle size={18}/>
      Error al cargar: {error}
      <button onClick={cargar} className="ml-auto bg-red-100 px-3 py-1 rounded-lg font-bold">Reintentar</button>
    </div>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tighter">PLANILLA & PAGOS</h2>
          <p className="text-[#185FA5] font-bold text-[10px] uppercase tracking-widest">
            Consorcio Rebagliati Diplomados S.A.C. — RUC 20601225175
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-blue-500"/>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700
                       px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-gray-50">
            <Download size={12}/> CSV
          </button>
          {vista === 'planilla' && (
            <button onClick={enviarFinanzas}
              className="flex items-center gap-1.5 bg-[#185FA5] text-white px-3 py-1.5
                         rounded-lg text-[10px] font-black hover:bg-[#11284e]">
              <Send size={12}/> Aprobar a Finanzas
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Neto Planilla',    v: `S/ ${fmt(totP)}`,       c: 'border-[#185FA5]' },
          { l: 'Neto Locadores',   v: `S/ ${fmt(totL)}`,       c: 'border-purple-500' },
          { l: 'EsSalud Emp. 9%',  v: `S/ ${fmt(totEs)}`,      c: 'border-emerald-500' },
          { l: 'Total Nómina',     v: `S/ ${fmt(totP + totL)}`, c: 'border-[#11284e]' },
        ].map(k => (
          <div key={k.l} className={`bg-white rounded-xl border shadow-sm p-4 border-l-4 ${k.c}`}>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k.l}</p>
            <p className="text-lg font-black text-gray-800 mt-1">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 bg-white p-1 w-max rounded-xl border border-gray-200 shadow-sm">
        <button onClick={() => setVista('planilla')}
          className={`px-4 py-2 text-xs font-black rounded-lg flex items-center gap-2 transition-all
                      ${vista === 'planilla' ? 'bg-[#11284e] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Users size={14}/> PLANILLA (Quinta Categ.)
        </button>
        <button onClick={() => setVista('locacion')}
          className={`px-4 py-2 text-xs font-black rounded-lg flex items-center gap-2 transition-all
                      ${vista === 'locacion' ? 'bg-[#185FA5] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Briefcase size={14}/> LOCADORES (Cuarta Categ.)
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                <th className="px-5 py-4">Colaborador</th>
                {vista === 'planilla' ? (
                  <>
                    <th className="px-4 py-4 text-right">Sueldo Base</th>
                    <th className="px-4 py-4 text-right">Proporcional</th>
                    <th className="px-4 py-4 text-center">Incidencias</th>
                    <th className="px-4 py-4 text-center">Sistema</th>
                    <th className="px-4 py-4 text-right">AFP/ONP</th>
                    <th className="px-4 py-4 text-right">Otros Dsctos</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-4 text-right">Honorario</th>
                    <th className="px-4 py-4 text-right">Retención (8%)</th>
                  </>
                )}
                <th className="px-5 py-4 text-right">Neto a Pagar</th>
                <th className="px-5 py-4 text-center">Boleta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {(vista === 'planilla' ? cols : locs).length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-gray-400 italic">Sin registros</td></tr>
              ) : (vista === 'planilla' ? cols : locs).map(item => {
                const isPlan = vista === 'planilla';
                const c = isPlan
                  ? calcularPlanilla(item, asis, mes)
                  : calcularLocador(item, asisL);
                return (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((item.nombre||'')+' '+(item.apellido||''))}&background=185FA5&color=fff&size=56`}
                          className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                          alt=""/>
                        <div>
                          <p className="font-black text-gray-800">{item.apellido} {item.nombre}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase truncate max-w-[140px]">
                            {item.dni} | {item.cargo || (isPlan ? 'EMPLEADO' : 'LOCADOR')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {isPlan ? (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">S/ {fmt(c.sb)}</td>
                        <td className={`px-4 py-3 text-right font-mono ${c.hayAus ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                          S/ {fmt(c.sProp)}
                          {c.hayAus && <span className="text-[8px] block text-amber-500">{c.diasTrab}/{c.tdm}d</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            {c.tard10 > 0 && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-black">{c.tard10}T</span>}
                            {c.fInj   > 0 && <span className="bg-red-100   text-red-800   px-1.5 py-0.5 rounded text-[8px] font-black">{c.fInj}F</span>}
                            {c.diasDM > 0 && <span className="bg-blue-100  text-blue-800  px-1.5 py-0.5 rounded text-[8px] font-black">{c.diasDM}DM</span>}
                            {c.tard10 === 0 && c.fInj === 0 && c.diasDM === 0 && <span className="text-gray-300">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase
                            ${c.tip === 'ONP' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {c.tip === 'ONP' ? 'ONP' : c.afpCortoNom}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 font-mono">S/ {fmt(c.penT)}</td>
                        <td className="px-4 py-3 text-right text-red-400 font-mono text-[10px]">
                          {(c.r5 + c.adel + c.dpe + c.d15) > 0 ? `S/ ${fmt(c.r5 + c.adel + c.dpe + c.d15)}` : '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">S/ {fmt(c.sb)}</td>
                        <td className="px-4 py-3 text-right text-red-500">S/ {fmt(c.ret4)}</td>
                      </>
                    )}

                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-black text-[#185FA5]">
                        S/ {fmt(isPlan ? c.NETO : c.neto)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => isPlan ? setSelEmp(item) : setSelLoc(item)}
                        className="p-2 bg-gray-100 hover:bg-[#185FA5] hover:text-white
                                   rounded-xl transition-all text-gray-500"
                        title="Ver boleta">
                        <Eye size={15}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-6 text-xs text-gray-500 font-bold pr-2">
        <span>Total {vista === 'planilla' ? 'planilla' : 'locadores'}:
          <span className="text-[#185FA5] ml-1">
            S/ {fmt(vista === 'planilla' ? totP : totL)}
          </span>
        </span>
        {vista === 'planilla' && (
          <span>EsSalud emp.:
            <span className="text-emerald-600 ml-1">S/ {fmt(totEs)}</span>
          </span>
        )}
      </div>

      {selEmp && (
        <ModalBoleta
          emp={selEmp}
          c={calcularPlanilla(selEmp, asis, mes)}
          mesStr={mes}
          onClose={() => setSelEmp(null)}
        />
      )}
      {selLoc && (
        <ModalLocador
          loc={selLoc}
          c={calcularLocador(selLoc, asisL)}
          mesStr={mes}
          onClose={() => setSelLoc(null)}
        />
      )}
    </div>
  );
}