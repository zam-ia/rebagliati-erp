// src/pages/rrhh/TabPlanillaPagos.jsx
// ─────────────────────────────────────────────────────────────────────────────
// MEJORAS:
// - Modalidad de pago en complementarios editable desde la tabla (click en badge)
// - Filtro por modalidad (RHE / Efectivo / Todos)
// - Totales más visibles
// - Botón "Aprobar a Finanzas" en todas las pestañas
// - Soporte para complementarios que cesaron en el mes (cálculo proporcional automático)
// - Soporte para complementarios que ingresaron en el mes (cálculo proporcional automático)
// - Toggle de retención 4ta categoría (columna "Ret. 4ta" clickeable)
// - Corrección horas extras: si la novedad es "Sin compensación (pago por horas)",
//   se paga la hora ordinaria sin sobretasa del 25%/35%
// - NUEVA PESTAÑA: Calculadora de Costo por Trabajador (Régimen MYPE)
// - TASAS AFP ACTUALIZADAS según SBS abril 2026 (comisión flujo por AFP)
// - Cálculo correcto de descuentos AFP: fondo + prima de seguro + comisión flujo
// - Etiquetas fijas según formato oficial de planilla:
//   "AFP Aport. 10%", "AFP Com. Seg.", "AFP Com. Com."
// - COMPLEMENTARIOS: ahora se consideran también las faltas/tardanzas registradas desde
//   Novedades Planilla (tabla asistencia), además de asistencia_complementarios
// - ELIMINADO: Asignación Familiar (no aplica en régimen MYPE)
// - NUEVA PESTAÑA: Practicantes (pago por horas) con tarifa diferenciada fines de semana
// - NUEVO MODAL VIP: registro semanal / mensual con cuadrícula de horas (Lun-Dom y calendario real)
// - CORRECCIÓN AFP DUPLICADA: búsqueda flexible de tasas y ocultación de
//   "AFP Com. Com." cuando la comisión flujo es 0 (AFP mixta/saldo)
// - ESTILO BRUTAL: modal de registro de horas con diseño oscuro y vanguardista
// - PERSONALIZAR FACTOR FIN DE SEMANA: modal para cambiar el multiplicador
// - PAGO DE HORAS EXTRAS: agrupado por persona, muestra número de cuenta y total acumulado
// - NUEVA PESTAÑA: Descuentos de Tardanzas (aplicación manual, no automática)
// - Los descuentos solo impactan la planilla/complementarios tras ser aplicados en esta pestaña
// - Descuentos proporcionales al sueldo según minutos acumulados
// - Agrupación de tardanzas por colaborador en la vista de gestión
// - Modal de detalle de incidencias al hacer clic en el nombre
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Download, X, Eye, Send, Users, Briefcase,
  Mail, Loader2, AlertCircle, Clock, Filter, CalendarDays, Calculator,
  UserPlus, Plus, Trash2, Edit, ChevronLeft, ChevronRight, Grid, List,
  FileSpreadsheet, FileText, CheckCircle, Circle, Ban
} from 'lucide-react';
import jsPDF from 'jspdf';
import CalculadoraCostos from './CalculadoraCostos';

// ══════════ AFP_TASAS ACTUALIZADAS (SBS ABRIL 2026) ══════════
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

// ─── BÚSQUEDA FLEXIBLE DE TASAS AFP ───────────────────────────────────────
const buscarTasasAFP = (tipoPension) => {
  if (!tipoPension) return { fondo: 0.10, poliza: 0.0137, comision: 0.0137 };
  const tipo = tipoPension.trim().toUpperCase();
  if (AFP_TASAS[tipo]) return AFP_TASAS[tipo];
  const esFlujo = /FLUJO/i.test(tipo);
  const esMixta = /MIXTA/i.test(tipo);
  for (const [clave, tasas] of Object.entries(AFP_TASAS)) {
    const nombreAfp = clave.replace(/\s+MIXTA\s*\/\s*SALDO/i, '').replace(/\s*\/\s*FLUJO$/i, '').replace(/\s+FLUJO$/i, '').trim();
    if (tipo.includes(nombreAfp.toUpperCase())) {
      if (esFlujo) {
        const claveFlujo = `${nombreAfp} FLUJO`.toUpperCase().replace(/\s+/g, ' ');
        if (AFP_TASAS[claveFlujo]) return AFP_TASAS[claveFlujo];
      } else {
        const claveMixta = `${nombreAfp} MIXTA / SALDO`.toUpperCase().replace(/\s+/g, ' ');
        if (AFP_TASAS[claveMixta]) return AFP_TASAS[claveMixta];
      }
    }
  }
  return { fondo: 0.10, poliza: 0.0137, comision: 0.0000 };
};

// ══════════════════════════════════════════════════════════════════════════════
// CÁLCULO PLANILLA (con filtro descuento_aplicado = true)
// Ahora el descuento por tardanzas es proporcional al sueldo y minutos acumulados
// ══════════════════════════════════════════════════════════════════════════════
function calcularPlanilla(emp, asistencias = [], mesStr) {
  try {
    const tdm = diasDelMes(mesStr);
    const asisEmp = asistencias.filter(a =>
      String(a.empleado_id) === String(emp?.id) && a.descuento_aplicado === true
    );
    let tard10 = 0, fInj = 0, diasDM = 0, totalMinTard = 0;
    asisEmp.forEach(a => {
      if (!a.justificacion) {
        if (a.tardanza_supera_10min || (a.tardanza && Number(a.minutos) > 10)) {
          tard10++;
          totalMinTard += Number(a.minutos || 0);
        }
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

    const he25   = Number(emp?.horas_extra_25 || 0);
    const he35   = Number(emp?.horas_extra_35 || 0);
    const oib    = Number(emp?.otros_ingresos_bono || 0);
    const vt     = Number(emp?.vacaciones_truncas || 0);
    const gt     = Number(emp?.gratificacion_truncas || 0);
    const ctsTr  = Number(emp?.cts_truncas || 0);
    const mvF    = Number(emp?.movilidad_fija || 0);
    const mvV    = Number(emp?.movilidad_variable || 0);
    const sub    = Number(emp?.subsidio || 0);

    // Descuento proporcional: (total minutos * sueldo bruto) / (30 días * 8h * 60min) = sb / 14400 por minuto
    const dTard  = totalMinTard * sb / 14400;
    const dFalt  = fInj * (sb / 30);

    const TRA = sProp + he25 + he35 + oib + vt + gt - dTard;
    const TRNA = cProp + mvF + mvV + sub;
    const TREM = TRA + TRNA;

    const remComputable = sProp + cProp;
    const valorHoraBase = remComputable / 30 / 8;
    const hrExt25 = valorHoraBase * 1.25;
    const hrExt35 = valorHoraBase * 1.35;

    const tip = emp?.sistema_pensionario || '';
    let onp = 0, afpF = 0, afpP = 0, afpC = 0, afpT = 0;
    if (tip === 'ONP') {
      onp = TRA * ONP_TASA;
    } else {
      const t = buscarTasasAFP(tip);
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
    if (tard10 > 0) obs.push(`${tard10} TARDANZA${tard10 > 1 ? 'S' : ''} MAYOR A 10 MINUTOS (${totalMinTard} min total)`);
    if (diasDM > 0) obs.push(`${diasDM} DÍA${diasDM > 1 ? 'S' : ''} DE DESCANSO MÉDICO`);
    if (emp?.observaciones) obs.push(emp.observaciones.toUpperCase());

    return {
      tdm, diasTrab, ausentes, fInj, diasDM, hayAus,
      horas: Number(emp?.horas_trabajadas || diasTrab * 8),
      sb, sProp,
      he25, he35, oib, vt, gt, ctsTr,
      dTard, cProp, mvF, mvV, sub,
      TRA, TRNA, TREM,
      tip, afpCortoNom: afpCorto(tip),
      onp, afpF, afpP, afpC, afpT, penT,
      r5, r5As, adel, dpe, d15, dFalt, TD, NETO,
      tard10, totalMinTard, valTard: totalMinTard > 0 ? sb / 14400 : 0,  // valor por minuto
      es9, esVL,
      valorHoraBase, hrExt25, hrExt35,
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
      fechaIngresoPlanilla: emp?.fecha_ingreso_planilla || emp?.fecha_inicio,
    };
  } catch (e) {
    console.error('calcularPlanilla:', e);
    return {
      sb:0, sProp:0,
      he25:0, he35:0, oib:0, vt:0, gt:0, ctsTr:0,
      dTard:0, cProp:0, mvF:0, mvV:0, sub:0, TRA:0, TRNA:0, TREM:0,
      tip:'', afpCortoNom:'—', onp:0, afpF:0, afpP:0, afpC:0, afpT:0, penT:0,
      r5:0, r5As:0, adel:0, dpe:0, d15:0, dFalt:0, TD:0, NETO:0,
      tard10:0, totalMinTard:0, valTard:0, es9:0, esVL:0,
      valorHoraBase:0, hrExt25:0, hrExt35:0,
      banco:'—', cuenta:'—', cuspp:'—', nroEssalud:'—', cCosto:'—', cod:'—',
      tdm:30, diasTrab:30, ausentes:0, fInj:0, diasDM:0, hayAus:false,
      horas:0, obs:'', vacD:'-', vacH:'-', vacR:'-', vacDias:'-', pVac:'-',
      fechaIngresoPlanilla: null,
    };
  }
}

// ── Cálculo complementarios (con filtro descuento_aplicado = true, ahora proporcional) ──
function calcularLocador(loc, asis = [], mesStr = null) {
  try {
    const sb = Number(loc?.sueldo_base || loc?.monto_mensual || 0);
    const al = asis.filter(a =>
      String(a.locador_id) === String(loc?.id) && a.descuento_aplicado === true
    );
    let t10 = 0, fi = 0, totalMinTard = 0;
    al.forEach(a => {
      if (!a.justificacion) {
        if (a.tardanza_supera_10min || (a.tardanza && Number(a.minutos) > 10)) {
          t10++;
          totalMinTard += Number(a.minutos || 0);
        }
        if (a.falta) fi++;
      }
    });

    let diasTrabajados = 30;
    let motivoAjuste = null;
    if (mesStr) {
      const totalDiasMes = diasDelMes(mesStr);
      let diaInicio = 1, diaFin = totalDiasMes;
      let inicioAjustado = false, finAjustado = false;

      if (loc.fecha_inicio) {
        const mesInicio = loc.fecha_inicio.substring(0, 7);
        if (mesInicio === mesStr) {
          diaInicio = parseInt(loc.fecha_inicio.split('-')[2], 10);
          inicioAjustado = true;
        }
      }
      if (loc.fecha_cese) {
        const mesCese = loc.fecha_cese.substring(0, 7);
        if (mesCese === mesStr) {
          diaFin = parseInt(loc.fecha_cese.split('-')[2], 10);
          finAjustado = true;
        }
      }
      if (inicioAjustado || finAjustado) {
        diasTrabajados = diaFin - diaInicio + 1;
        if (diasTrabajados < 0) diasTrabajados = 0;
        if (inicioAjustado && finAjustado) motivoAjuste = `Ingreso ${fmtFecha(loc.fecha_inicio)} - Cese ${fmtFecha(loc.fecha_cese)}`;
        else if (inicioAjustado) motivoAjuste = `Ingreso el ${fmtFecha(loc.fecha_inicio)}`;
        else if (finAjustado) motivoAjuste = `Cese el ${fmtFecha(loc.fecha_cese)}`;
      }
    }

    diasTrabajados = Math.max(0, diasTrabajados - fi);
    const honorarioBase = (sb / 30) * diasTrabajados;
    const dt = totalMinTard * sb / 14400;
    const df = fi * (sb / 30);
    const aplica = loc?.aplica_retencion !== false;
    const ret4 = (aplica && honorarioBase > 1500) ? honorarioBase * 0.08 : 0;
    const td = dt + df + ret4;
    const neto = honorarioBase - td;

    return {
      sb, honorarioBase, t10, fi, totalMinTard, vt: sb / 14400, dt, df,
      ret4, td, neto, diasTrabajados, motivoAjuste,
      aplicaRetencion: aplica,
      banco: loc?.banco || '—',
      cuenta: loc?.numero_cuenta || '—',
      estado: loc?.estado || 'activo',
      fechaCese: loc?.fecha_cese || null,
      fechaInicio: loc?.fecha_inicio || null,
    };
  } catch {
    return {
      sb:0, honorarioBase:0, t10:0, fi:0, totalMinTard:0, vt:0, dt:0, df:0,
      ret4:0, td:0, neto:0, diasTrabajados:30, motivoAjuste:null,
      aplicaRetencion: true,
      banco:'—', cuenta:'—', estado:'activo', fechaCese:null, fechaInicio:null
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Cálculo para practicantes
// ══════════════════════════════════════════════════════════════════════════════
function calcularPracticante(loc, horas = []) {
  try {
    const sb = Number(loc?.sueldo_base || 0);
    const valorHora = sb / 240;
    const factorFinSemana = Number(loc?.factor_fin_semana) || 1.0;
    let totalHorasNormales = 0;
    let totalHorasFinSemana = 0;
    horas.forEach(h => {
      const fecha = new Date(h.fecha + 'T12:00:00');
      const dia = fecha.getUTCDay();
      const horasReg = Number(h.horas || 0);
      if (dia === 0 || dia === 6) totalHorasFinSemana += horasReg;
      else totalHorasNormales += horasReg;
    });
    const totalHoras = totalHorasNormales + totalHorasFinSemana;
    const remuneracion = (valorHora * totalHorasNormales) + (valorHora * factorFinSemana * totalHorasFinSemana);
    const aplica = loc?.aplica_retencion !== false;
    const ret4 = (aplica && remuneracion > 1500) ? remuneracion * 0.08 : 0;
    const neto = remuneracion - ret4;
    return {
      sb, valorHora, factorFinSemana,
      totalHoras, totalHorasNormales, totalHorasFinSemana,
      remuneracion, ret4, neto,
      aplicaRetencion: aplica,
      banco: loc?.banco || '—',
      cuenta: loc?.numero_cuenta || '—',
    };
  } catch {
    return {
      sb:0, valorHora:0, factorFinSemana:1.0,
      totalHoras:0, totalHorasNormales:0, totalHorasFinSemana:0,
      remuneracion:0, ret4:0, neto:0,
      aplicaRetencion:true, banco:'—', cuenta:'—'
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERADOR PDF
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

  const colDesc = [
    ['ONP 13%',              c.tip === 'ONP' ? fmt(c.onp) : ''],
    ['  RENTA 5ta',          c.r5 > 0 ? fmt(c.r5) : ''],
    ['AFP Aport. 10%',       c.tip !== 'ONP' ? fmt(c.afpF) : ''],
    ['AFP Com. Seg.',        c.tip !== 'ONP' ? fmt(c.afpP) : ''],
  ];
  if (c.tip !== 'ONP' && c.afpC > 0) {
    colDesc.push(['AFP Com. Com.', fmt(c.afpC)]);
  }
  colDesc.push(
    ['Adelanto.',            c.adel > 0 ? fmt(c.adel) : ''],
    ['Dscto pago exceso abr', c.dpe !== 0 ? fmt(c.dpe) : ''],
    ['Subsidio 35%',         ''],
    ['Obsequio al trabajador',''],
    ['Liq Benerf Soc',       ''],
    ['Prestm.1ra.quinc',     c.d15 > 0 ? fmt(c.d15) : '']
  );
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

// ─── MODAL BOLETA ─────────────
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
    ...(c.tip !== 'ONP' && c.afpC > 0 ? [{ lbl: 'AFP Com. Com.', val: c.afpC, show: true }] : []),
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
    <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md z-50 flex items-center justify-center p-2">
      <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[98vh] border border-gray-100 animate-in zoom-in-95 duration-200">
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
                  className="hover:bg-white/10 p-1.5 rounded-full text-white/60 hover:text-white mt-0.5 transition-colors">
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
              <div className="flex items-start gap-1.5 mt-0.5 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
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
            className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-2.5 rounded-xl text-[10px] font-black uppercase
                       hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98]">
            <Download size={13}/> Descargar PDF
          </button>
          <button onClick={enviarCorreo}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black
                       hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 active:scale-[0.98]">
            <Mail size={13}/> Enviar correo
          </button>
          <button onClick={onClose}
            className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-[10px] font-black hover:bg-gray-300 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL COMPLEMENTARIO ──
function ModalLocador({ loc, c, mesStr, onClose }) {
  return (
    <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="bg-[#11284e] px-5 py-4 flex justify-between items-center text-white">
          <div>
            <p className="font-black text-[11px] uppercase tracking-widest">COMPROBANTE DE PAGO — COMPLEMENTARIO</p>
            <p className="text-[9px] text-blue-300 mt-0.5">{periodoLabel(mesStr)}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full transition-colors"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3 text-[11px]">
          <div className="bg-blue-50 rounded-2xl px-4 py-3 grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <p className="font-black text-blue-600 uppercase text-[8px] mb-0.5">Empresa</p>
              <p className="font-bold text-gray-800">CONSORCIO REBAGLIATI DIPLOMADOS SAC</p>
              <p className="text-gray-500">RUC: 20601225175</p>
            </div>
            <div>
              <p className="font-black text-blue-600 uppercase text-[8px] mb-0.5">Complementario</p>
              <p className="font-bold text-gray-800">{loc.apellido}, {loc.nombre}</p>
              <p className="text-gray-500">DNI: {loc.dni || '—'}</p>
              <p className="text-gray-500">{c.banco} · {c.cuenta}</p>
              {c.fechaCese && (
                <p className="text-red-600 font-bold text-[9px] mt-1">
                  Cesó el {fmtFecha(c.fechaCese)}
                </p>
              )}
              {c.fechaInicio && mesStr === c.fechaInicio?.substring(0,7) && (
                <p className="text-emerald-600 font-bold text-[9px] mt-1">
                  Ingresó el {fmtFecha(c.fechaInicio)}
                </p>
              )}
            </div>
          </div>
          <div className="border rounded-2xl overflow-hidden text-[10px]">
            <div className="bg-emerald-600 px-3 py-1.5 text-white font-black text-[8px] uppercase">Honorarios</div>
            <div className="divide-y">
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">
                  Sueldo Base
                  {c.motivoAjuste ? (
                    <span className="font-normal text-gray-500"> ({c.motivoAjuste} → {c.diasTrabajados} días)</span>
                  ) : ''}
                </span>
                <span className="font-black text-gray-800 font-mono">S/ {fmt(c.sb)}</span>
              </div>
              {c.motivoAjuste && (
                <div className="flex justify-between px-3 py-2 bg-yellow-50">
                  <span className="text-gray-500 text-[9px]">Ajuste proporcional</span>
                  <span className="font-mono text-yellow-700">{c.diasTrabajados} días</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">Honorario Proporcional</span>
                <span className="font-black text-gray-800 font-mono">S/ {fmt(c.honorarioBase)}</span>
              </div>
              {c.dt > 0 && <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">(-) Tardanzas ({c.t10} incidencias, {c.totalMinTard} min)</span>
                <span className="text-red-600 font-mono">- S/ {fmt(c.dt)}</span>
              </div>}
              {c.df > 0 && <div className="flex justify-between px-3 py-2">
                <span className="text-gray-600">(-) Faltas ({c.fi})</span>
                <span className="text-red-600 font-mono">- S/ {fmt(c.df)}</span>
              </div>}
              {c.aplicaRetencion ? (
                c.ret4 > 0 && (
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-gray-600">(-) Retención 4ta Categ. (8%)</span>
                    <span className="text-red-600 font-mono">- S/ {fmt(c.ret4)}</span>
                  </div>
                )
              ) : (
                <div className="flex justify-between px-3 py-2 text-gray-400 italic">
                  <span>Retención 4ta no aplica (suspendida)</span>
                  <span>—</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2 bg-red-50">
                <span className="font-black text-red-700">Total Descuentos</span>
                <span className="font-black text-red-700 font-mono">S/ {fmt(c.td)}</span>
              </div>
            </div>
          </div>
          <div className="bg-[#11284e] rounded-2xl px-5 py-3 flex justify-between items-center shadow-lg">
            <p className="text-white font-black uppercase">NETO A PAGAR</p>
            <p className="text-xl font-black text-white font-mono">S/ {fmt(c.neto)}</p>
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t flex gap-2">
          <button className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-2 rounded-xl text-[10px] font-black
                             hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98]">
            <Download size={13}/> PDF
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl text-[10px] font-black hover:bg-gray-300 transition-colors">
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
  const [horasExtras, setHorasExtras] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [vista, setVista]       = useState('planilla');
  const [selEmp, setSelEmp]     = useState(null);
  const [selLoc, setSelLoc]     = useState(null);

  const [filtroModalidad, setFiltroModalidad] = useState('Todos');

  // ── Estados de Practicantes ──
  const [practicantes, setPracticantes] = useState([]);
  const [horasPracticantes, setHorasPracticantes] = useState([]);
  const [showModalPract, setShowModalPract] = useState(false);
  const [selPractId, setSelPractId] = useState(null);
  const [modoRegistro, setModoRegistro] = useState('semanal');
  const [semanaInicio, setSemanaInicio] = useState(null);
  const [horasGrid, setHorasGrid] = useState({});

  // ── Estados para el modal de factor fin de semana ──
  const [showModalFactor, setShowModalFactor] = useState(false);
  const [practFactorId, setPractFactorId] = useState(null);
  const [nuevoFactor, setNuevoFactor] = useState('');

  // ── Estados para Descuentos de Tardanzas ──
  const [tardanzasPlanilla, setTardanzasPlanilla] = useState([]);
  const [tardanzasComplementarios, setTardanzasComplementarios] = useState([]);
  const [selectedTardanzas, setSelectedTardanzas] = useState(new Set());  // ahora claves de grupo (emp_ o loc_)
  const [detalleTardanzas, setDetalleTardanzas] = useState(null);       // array de incidencias para modal
  const [showDetalleTardanzas, setShowDetalleTardanzas] = useState(false);

  // ═══ Días de la semana completa ═══
  const diasSemana = useMemo(() => {
    if (!semanaInicio) return [];
    const lunes = new Date(semanaInicio + 'T12:00:00');
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [semanaInicio]);

  // ═══ Calendario mensual real ═══
  const calendarioMensual = useMemo(() => {
    if (!mes) return [];
    const [y, m] = mes.split('-').map(Number);
    const totalDias = new Date(y, m, 0).getDate();
    const primerDiaSemana = new Date(y, m - 1, 1).getUTCDay();
    const inicioSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    const semanas = [];
    let diaActual = 1;
    while (diaActual <= totalDias) {
      const semana = [];
      for (let i = 0; i < 7; i++) {
        if (semanas.length === 0 && i < inicioSemana) {
          semana.push(null);
        } else if (diaActual > totalDias) {
          semana.push(null);
        } else {
          const fecha = `${y}-${String(m).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}`;
          semana.push(fecha);
          diaActual++;
        }
      }
      semanas.push(semana);
      if (diaActual > totalDias) break;
    }
    return semanas;
  }, [mes]);

  const cargarHorasGrid = async (practId) => {
    const { data } = await supabase
      .from('horas_practicantes')
      .select('*')
      .eq('locador_id', practId)
      .gte('fecha', `${mes}-01`)
      .lte('fecha', `${mes}-${diasDelMes(mes)}`);
    const mapa = {};
    (data || []).forEach(h => { mapa[h.fecha] = h.horas; });
    setHorasGrid(mapa);
  };

  const iniciarSemana = () => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
    setSemanaInicio(lunes.toISOString().split('T')[0]);
  };

  const abrirModalPract = (practId) => {
    setSelPractId(practId);
    iniciarSemana();
    setModoRegistro('semanal');
    cargarHorasGrid(practId);
    setShowModalPract(true);
  };

  const abrirModalFactor = (practId, factorActual) => {
    setPractFactorId(practId);
    setNuevoFactor(String(factorActual || 1.0));
    setShowModalFactor(true);
  };

  const guardarFactor = async () => {
    const factor = parseFloat(nuevoFactor);
    if (isNaN(factor) || factor < 0) {
      alert('Ingrese un número válido');
      return;
    }
    const { error } = await supabase
      .from('locadores')
      .update({ factor_fin_semana: factor })
      .eq('id', practFactorId);
    if (!error) {
      setPracticantes(prev => prev.map(p =>
        p.id === practFactorId ? { ...p, factor_fin_semana: factor } : p
      ));
      setShowModalFactor(false);
      cargar();
    } else {
      alert('Error al guardar factor: ' + error.message);
    }
  };

  const cambiarSemana = (dir) => {
    if (!semanaInicio) return;
    const d = new Date(semanaInicio + 'T12:00:00');
    d.setDate(d.getDate() + dir * 7);
    setSemanaInicio(d.toISOString().split('T')[0]);
  };

  const handleHoraChange = (fecha, valor) => {
    const v = valor === '' ? '' : Math.max(0, Number(valor));
    setHorasGrid(prev => ({ ...prev, [fecha]: v }));
  };

  const guardarHorasMasivo = async () => {
    if (!selPractId) return;
    const entradas = Object.entries(horasGrid)
      .filter(([_, h]) => h !== '' && Number(h) > 0)
      .map(([fecha, horas]) => ({
        locador_id: selPractId,
        fecha,
        horas: Number(horas)
      }));

    try {
      await supabase
        .from('horas_practicantes')
        .delete()
        .eq('locador_id', selPractId)
        .gte('fecha', `${mes}-01`)
        .lte('fecha', `${mes}-${diasDelMes(mes)}`);

      if (entradas.length > 0) {
        const { error } = await supabase.from('horas_practicantes').insert(entradas);
        if (error) throw error;
      }
      setShowModalPract(false);
      cargar();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const cargar = async () => {
    setLoading(true); setError(null);
    try {
      const { data: e, error: eE } = await supabase.from('empleados').select('*').eq('estado', 'activo');
      if (eE) throw eE;
      setCols(e || []);

      const [year, month] = mes.split('-').map(Number);
      const primerDia = `${mes}-01`;
      const ultimoDia = new Date(year, month, 0).toISOString().slice(0, 10);

      const { data: l, error: lE } = await supabase
        .from('locadores')
        .select('*')
        .or(
          `estado.eq.activo, ` +
          `and(estado.eq.inactivo,fecha_cese.gte.${primerDia},fecha_cese.lte.${ultimoDia}), ` +
          `and(fecha_inicio.gte.${primerDia},fecha_inicio.lte.${ultimoDia})`
        );
      if (lE) throw lE;
      setLocs(l || []);

      const { data: pract } = await supabase
        .from('locadores')
        .select('*')
        .eq('modalidad', 'POR HORAS')
        .eq('estado', 'activo');
      setPracticantes(pract || []);

      const { data: hp } = await supabase
        .from('horas_practicantes')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);
      setHorasPracticantes(hp || []);

      const p1 = primerDia, p2 = ultimoDia;
      const { data: a } = await supabase.from('asistencia').select('*').gte('fecha', p1).lte('fecha', p2);
      setAsis(a || []);

      const { data: al1 } = await supabase.from('asistencia_locadores').select('*').gte('fecha', p1).lte('fecha', p2);
      const { data: al2 } = await supabase.from('asistencia').select('*').not('locador_id', 'is', null).gte('fecha', p1).lte('fecha', p2);
      const locsAsis = [...(al1 || []), ...(al2 || [])];
      setAsisL(locsAsis);

      const { data: he } = await supabase.from('horas_extras').select('*').gte('fecha', p1).lte('fecha', p2);
      setHorasExtras(he || []);

      // ── Procesar tardanzas (todas) con cálculo proporcional ──
      const calcTardanza = (reg, persona, tipo) => {
        const minutos = Number(reg.minutos || 0);
        const sb = persona?.sueldo_base || persona?.sueldo_bruto || 0;
        return minutos * sb / 14400;
      };

      const tPlan = (a || []).filter(reg =>
        reg.empleado_id &&
        (reg.tardanza_supera_10min || (reg.tardanza && Number(reg.minutos) > 10))
      ).map(reg => ({
        ...reg,
        tipo: 'planilla',
        tabla: 'asistencia',
        empleado: e?.find(emp => String(emp.id) === String(reg.empleado_id)) || {},
        monto: calcTardanza(reg, e?.find(emp => String(emp.id) === String(reg.empleado_id)) || {}),
        nombre: ((e?.find(emp => String(emp.id) === String(reg.empleado_id)) || {}).apellido || '') + ' ' + ((e?.find(emp => String(emp.id) === String(reg.empleado_id)) || {}).nombre || '')
      }));
      setTardanzasPlanilla(tPlan);

      const tCompl = locsAsis.filter(reg =>
        reg.locador_id &&
        (reg.tardanza_supera_10min || (reg.tardanza && Number(reg.minutos) > 10))
      ).map(reg => {
        const tabla = al1?.some(x => x.id === reg.id) ? 'asistencia_locadores' : 'asistencia';
        const locador = l?.find(loc => String(loc.id) === String(reg.locador_id)) || {};
        return {
          ...reg,
          tipo: 'complementario',
          tabla,
          locador,
          monto: calcTardanza(reg, locador),
          nombre: (locador.apellido || '') + ' ' + (locador.nombre || '')
        };
      });
      setTardanzasComplementarios(tCompl);

    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [mes]);

  const toggleModalidadPago = async (loc) => {
    const nuevaModalidad = loc.modalidad_pago === 'Efectivo' ? 'RHE' : 'Efectivo';
    const { error } = await supabase
      .from('locadores')
      .update({ modalidad_pago: nuevaModalidad })
      .eq('id', loc.id);
    if (!error) {
      setLocs(prev => prev.map(l => l.id === loc.id ? { ...l, modalidad_pago: nuevaModalidad } : l));
    } else {
      alert('Error al actualizar modalidad: ' + error.message);
    }
  };

  const toggleRetencion4ta = async (loc) => {
    const nuevoValor = loc.aplica_retencion === false ? true : false;
    const { error } = await supabase
      .from('locadores')
      .update({ aplica_retencion: nuevoValor })
      .eq('id', loc.id);
    if (!error) {
      setLocs(prev =>
        prev.map(l => (l.id === loc.id ? { ...l, aplica_retencion: nuevoValor } : l))
      );
    } else {
      alert('Error al actualizar retención: ' + error.message);
    }
  };

  const enviarFinanzas = async (tipo) => {
    let total = 0;
    let concepto = '';
    if (tipo === 'planilla') {
      total = cols.reduce((s, e) => s + calcularPlanilla(e, asis, mes).NETO, 0);
      concepto = `Planilla de Haberes - ${mes}`;
    } else if (tipo === 'locadores') {
      total = locs.filter(l => filtroModalidad === 'Todos' || (l.modalidad_pago || 'RHE') === filtroModalidad)
        .reduce((s, l) => s + calcularLocador(l, asisL, mes).neto, 0);
      concepto = `Pago a Complementarios - ${mes}`;
    } else if (tipo === 'horas_extras') {
      total = horasExtras.filter(h => h.estado === 'Aprobado')
        .reduce((s, h) => {
          if (h.tipo_persona === 'planilla') {
            const emp = cols.find(e => e.id === h.empleado_id);
            if (emp) {
              const plan = calcularPlanilla(emp, asis, mes);
              const sinCompensacion = h.tipo_compensacion === 'Sin compensación (pago por horas)';
              const valor = sinCompensacion ? plan.valorHoraBase : plan.hrExt25;
              return s + (valor * (h.horas_decimal || 0));
            }
            return s;
          } else {
            return s + ((h.valor_hora || 0) * (h.horas_decimal || 0));
          }
        }, 0);
      concepto = `Pago de Horas Extras - ${mes}`;
    } else if (tipo === 'practicantes') {
      total = practicantes.reduce((s, p) => {
        const hp = horasPracticantes.filter(h => h.locador_id === p.id);
        return s + calcularPracticante(p, hp).neto;
      }, 0);
      concepto = `Pago a Practicantes - ${mes}`;
    }
    if (total <= 0) { alert('No hay montos para enviar a Finanzas.'); return; }
    if (!window.confirm(`¿Enviar a Finanzas por S/ ${fmt(total)}?`)) return;
    await supabase.from('egresos').insert({
      fecha: new Date().toISOString().split('T')[0],
      concepto,
      area: 'RRHH',
      categoria: tipo === 'practicantes' ? 'Practicantes' : tipo === 'planilla' ? 'Planilla' : tipo === 'locadores' ? 'Complementarios' : 'Horas Extras',
      proveedor: 'Nómina',
      monto: total,
      estado: 'Pendiente',
    });
    alert(`${concepto} enviado: S/ ${fmt(total)}`);
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

  // ── Funciones de Descuentos de Tardanzas (agrupadas) ──
  const toggleSeleccionTardanza = (grupoKey) => {
    setSelectedTardanzas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(grupoKey)) nuevo.delete(grupoKey);
      else nuevo.add(grupoKey);
      return nuevo;
    });
  };

  const aplicarDescuentos = async (tipo) => {
    const esPlanilla = tipo === 'planilla';
    const lista = esPlanilla ? tardanzasPlanilla : tardanzasComplementarios;
    // agrupar para obtener las incidencias de cada grupo seleccionado
    const idsToApply = [];
    for (const key of selectedTardanzas) {
      const [prefijo, idRef] = key.split('_');
      const refId = parseInt(idRef);
      if (esPlanilla && prefijo === 'emp') {
        lista.filter(t => !t.descuento_aplicado && t.empleado_id === refId).forEach(t => idsToApply.push(t.id));
      } else if (!esPlanilla && prefijo === 'loc') {
        lista.filter(t => !t.descuento_aplicado && t.locador_id === refId).forEach(t => idsToApply.push(t.id));
      }
    }
    if (idsToApply.length === 0) {
      alert('Seleccione al menos un colaborador con descuentos pendientes');
      return;
    }
    try {
      for (let id of idsToApply) {
        const incidencia = lista.find(t => t.id === id);
        if (!incidencia) continue;
        const table = incidencia.tabla;
        const { error } = await supabase
          .from(table)
          .update({ descuento_aplicado: true })
          .eq('id', id);
        if (error) throw error;
      }
      alert('Descuentos aplicados correctamente.');
      cargar();
      setSelectedTardanzas(new Set());
    } catch (err) {
      alert('Error al aplicar descuentos: ' + err.message);
    }
  };

  const revertirDescuentoGrupo = async (grupoKey, tipo) => {
    if (!confirm('¿Revertir todos los descuentos de este colaborador?')) return;
    const esPlanilla = tipo === 'planilla';
    const lista = esPlanilla ? tardanzasPlanilla : tardanzasComplementarios;
    const [prefijo, idRef] = grupoKey.split('_');
    const refId = parseInt(idRef);
    const incidentes = lista.filter(t => t.descuento_aplicado && 
      (esPlanilla ? t.empleado_id === refId : t.locador_id === refId));
    try {
      for (const inc of incidentes) {
        const { error } = await supabase
          .from(inc.tabla)
          .update({ descuento_aplicado: false })
          .eq('id', inc.id);
        if (error) throw error;
      }
      cargar();
    } catch (err) {
      alert('Error al revertir: ' + err.message);
    }
  };

  const exportarTardanzasExcel = () => {
    const todas = [...tardanzasPlanilla, ...tardanzasComplementarios];
    const header = 'Nombre,Sueldo Base,Tipo,Fecha,Minutos,Descuento (S/),Aplicado';
    const rows = todas.map(t => {
      const nombre = t.nombre;
      const sueldoBase = t.tipo === 'planilla' ? (t.empleado?.sueldo_bruto || 0) : (t.locador?.sueldo_base || 0);
      const aplicado = t.descuento_aplicado ? 'Sí' : 'No';
      return `${nombre},${sueldoBase},${t.tipo},${t.fecha},${t.minutos},${t.monto.toFixed(2)},${aplicado}`;
    }).join('\n');
    const csv = '\uFEFF' + header + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tardanzas_${mes}.csv`;
    a.click();
  };

  const exportarTardanzasPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(`Reporte de Tardanzas - ${periodoLabel(mes)}`, 14, 15);
    let y = 25;
    doc.setFontSize(8);
    const cols = ['Nombre', 'Tipo', 'Fecha', 'Minutos', 'Desc. S/', 'Aplicado'];
    const colX = [14, 55, 85, 115, 145, 175];
    cols.forEach((c, i) => doc.text(c, colX[i], y));
    y += 5;
    [...tardanzasPlanilla, ...tardanzasComplementarios].forEach(t => {
      doc.text(t.nombre, colX[0], y);
      doc.text(t.tipo, colX[1], y);
      doc.text(t.fecha, colX[2], y);
      doc.text(String(t.minutos || ''), colX[3], y);
      doc.text(fmt(t.monto), colX[4], y);
      doc.text(t.descuento_aplicado ? 'Sí' : 'No', colX[5], y);
      y += 5;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`tardanzas_${mes}.pdf`);
  };

  // Agrupaciones para la vista
  const gruposPlanilla = useMemo(() => {
    const map = new Map();
    tardanzasPlanilla.forEach(t => {
      const key = `emp_${t.empleado_id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          nombre: t.nombre,
          sueldoBase: t.empleado?.sueldo_bruto || 0,
          incidencias: [],
          totalMinutos: 0,
          totalDescuento: 0,
          aplicado: true,
        });
      }
      const grupo = map.get(key);
      grupo.incidencias.push(t);
      grupo.totalMinutos += Number(t.minutos || 0);
      grupo.totalDescuento += t.monto;
      if (!t.descuento_aplicado) grupo.aplicado = false;
    });
    return [...map.values()];
  }, [tardanzasPlanilla]);

  const gruposComplementarios = useMemo(() => {
    const map = new Map();
    tardanzasComplementarios.forEach(t => {
      const key = `loc_${t.locador_id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          nombre: t.nombre,
          sueldoBase: t.locador?.sueldo_base || 0,
          incidencias: [],
          totalMinutos: 0,
          totalDescuento: 0,
          aplicado: true,
        });
      }
      const grupo = map.get(key);
      grupo.incidencias.push(t);
      grupo.totalMinutos += Number(t.minutos || 0);
      grupo.totalDescuento += t.monto;
      if (!t.descuento_aplicado) grupo.aplicado = false;
    });
    return [...map.values()];
  }, [tardanzasComplementarios]);

  const totP = cols.reduce((s, e) => s + calcularPlanilla(e, asis, mes).NETO, 0);
  const totL = locs.filter(l => filtroModalidad === 'Todos' || (l.modalidad_pago || 'RHE') === filtroModalidad)
    .reduce((s, l) => s + calcularLocador(l, asisL, mes).neto, 0);
  const totEs = cols.reduce((s, e) => s + calcularPlanilla(e, asis, mes).es9, 0);
  const totHE = horasExtras.filter(h => h.estado === 'Aprobado')
    .reduce((s, h) => {
      if (h.tipo_persona === 'planilla') {
        const emp = cols.find(e => e.id === h.empleado_id);
        if (emp) {
          const plan = calcularPlanilla(emp, asis, mes);
          const sinCompensacion = h.tipo_compensacion === 'Sin compensación (pago por horas)';
          const valor = sinCompensacion ? plan.valorHoraBase : plan.hrExt25;
          return s + (valor * (h.horas_decimal || 0));
        }
        return s;
      } else {
        return s + ((h.valor_hora || 0) * (h.horas_decimal || 0));
      }
    }, 0);
  const totPract = practicantes.reduce((s, p) => {
    const hp = horasPracticantes.filter(h => h.locador_id === p.id);
    return s + calcularPracticante(p, hp).neto;
  }, 0);

  const locadoresFiltrados = useMemo(() => {
    if (filtroModalidad === 'Todos') return locs;
    return locs.filter(l => (l.modalidad_pago || 'RHE') === filtroModalidad);
  }, [locs, filtroModalidad]);

  // AGRUPACIÓN DE HORAS EXTRAS (por persona)
  const horasExtrasAgrupadas = useMemo(() => {
    const aprobadas = horasExtras.filter(h => h.estado === 'Aprobado');
    const grupos = {};
    aprobadas.forEach(h => {
      const key = h.tipo_persona === 'planilla' ? `emp_${h.empleado_id}` : `loc_${h.locador_id}`;
      if (!grupos[key]) {
        grupos[key] = {
          tipo_persona: h.tipo_persona,
          id_ref: h.tipo_persona === 'planilla' ? h.empleado_id : h.locador_id,
          horas: 0,
          total: 0,
          registros: []
        };
      }
      grupos[key].registros.push(h);
      const horasDec = Number(h.horas_decimal || 0);
      grupos[key].horas += horasDec;
      let totalReg = 0;
      if (h.tipo_persona === 'planilla') {
        const emp = cols.find(e => e.id === h.empleado_id);
        if (emp) {
          const plan = calcularPlanilla(emp, asis, mes);
          const sinComp = h.tipo_compensacion === 'Sin compensación (pago por horas)';
          const valor = sinComp ? plan.valorHoraBase : plan.hrExt25;
          totalReg = valor * horasDec;
        }
      } else {
        totalReg = (Number(h.valor_hora) || 0) * horasDec;
      }
      grupos[key].total += totalReg;
    });

    return Object.values(grupos).map(g => {
      let nombre = '', dni = '', cuenta = '';
      if (g.tipo_persona === 'planilla') {
        const emp = cols.find(e => e.id === g.id_ref);
        if (emp) {
          nombre = `${emp.apellido} ${emp.nombre}`;
          dni = emp.dni || '';
          cuenta = emp.numero_cuenta || '';
        }
      } else {
        const loc = locs.find(l => l.id === g.id_ref);
        if (loc) {
          nombre = `${loc.apellido} ${loc.nombre}`;
          dni = loc.dni || '';
          cuenta = loc.numero_cuenta || '';
        }
      }
      return { ...g, nombre, dni, cuenta };
    });
  }, [horasExtras, cols, locs, asis, mes]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
      <Loader2 className="animate-spin" size={24}/>
      <span className="text-sm font-medium">Cargando planilla...</span>
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-3 text-sm">
      <AlertCircle size={18}/>
      Error al cargar: {error}
      <button onClick={cargar} className="ml-auto bg-red-100 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition-colors">Reintentar</button>
    </div>
  );

  // ── Vista de practicantes ──
  const renderPracticantes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-gray-800 text-sm uppercase flex items-center gap-2">
          <UserPlus size={18} className="text-[#185FA5]" /> Practicantes (Pago por Horas)
        </h3>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b">
              <th className="p-3 text-left text-[10px] font-black text-gray-400 uppercase">Practicante</th>
              <th className="p-3 text-right text-[10px] font-black text-gray-400 uppercase">Sueldo Base</th>
              <th className="p-3 text-right text-[10px] font-black text-gray-400 uppercase">Valor Hora</th>
              <th className="p-3 text-right text-[10px] font-black text-gray-400 uppercase">Horas Norm.</th>
              <th className="p-3 text-right text-[10px] font-black text-gray-400 uppercase">Horas Fin Sem.</th>
              <th className="p-3 text-right text-[10px] font-black text-gray-400 uppercase">Remuneración</th>
              <th className="p-3 text-right text-[10px] font-black text-gray-400 uppercase">Ret. 4ta</th>
              <th className="p-3 text-right text-[10px] font-black text-gray-400 uppercase">Neto</th>
              <th className="p-3 text-center text-[10px] font-black text-gray-400 uppercase">Factor Fin Sem.</th>
              <th className="p-3 text-center text-[10px] font-black text-gray-400 uppercase">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {practicantes.map(p => {
              const hp = horasPracticantes.filter(h => h.locador_id === p.id);
              const c = calcularPracticante(p, hp);
              return (
                <tr key={p.id} className="hover:bg-blue-50/30">
                  <td className="p-3 font-bold text-xs">{p.apellido} {p.nombre}</td>
                  <td className="p-3 text-right font-mono text-xs">S/ {fmt(c.sb)}</td>
                  <td className="p-3 text-right font-mono text-xs">S/ {fmt(c.valorHora)}</td>
                  <td className="p-3 text-right font-mono text-xs">{c.totalHorasNormales}h</td>
                  <td className="p-3 text-right font-mono text-xs">{c.totalHorasFinSemana}h</td>
                  <td className="p-3 text-right font-mono text-xs">S/ {fmt(c.remuneracion)}</td>
                  <td className="p-3 text-right font-mono text-xs text-red-500">S/ {fmt(c.ret4)}</td>
                  <td className="p-3 text-right font-mono font-bold text-xs text-[#185FA5]">S/ {fmt(c.neto)}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <span>{p.factor_fin_semana || '1.0'}</span>
                      <button
                        onClick={() => abrirModalFactor(p.id, p.factor_fin_semana)}
                        className="p-1 bg-gray-100 hover:bg-blue-100 rounded-lg text-gray-500 hover:text-blue-600 transition"
                        title="Personalizar factor fin de semana"
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => abrirModalPract(p.id)}
                      className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-200 transition"
                    >
                      + Registrar
                    </button>
                    {hp.length > 0 && (
                      <div className="mt-1 text-[10px] text-gray-500">
                        {hp.length} día(s) registrados
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {practicantes.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-gray-400">No hay practicantes registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end text-sm font-bold mt-3">
        Total practicantes: <span className="text-[#185FA5] text-lg ml-2">S/ {fmt(totPract)}</span>
      </div>
    </div>
  );

  // ── NUEVO MODAL VIP (BRUTAL) ──
  const ModalPracticanteHoras = () => {
    const practicante = practicantes.find(p => p.id === selPractId);
    const nombrePract = practicante ? `${practicante.nombre} ${practicante.apellido}` : '';

    return (
      <div className="fixed inset-0 bg-[#0a0f1a]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-b from-[#0f172a] to-[#0b1120] rounded-[2.5rem] w-full max-w-5xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
          
          {/* Encabezado Brutal */}
          <div className="bg-gradient-to-r from-[#1e293b] via-[#0f172a] to-[#1e293b] px-8 py-5 flex justify-between items-center border-b border-white/5">
            <div className="text-white">
              <h3 className="font-black text-2xl uppercase tracking-tight flex items-center gap-3">
                <div className="p-2 bg-[#185FA5]/20 rounded-2xl">
                  <UserPlus size={22} className="text-[#3b82f6]" />
                </div>
                Registro de Horas — {nombrePract}
              </h3>
              <p className="text-xs text-blue-200/70 mt-1 ml-14">{periodoLabel(mes)}</p>
            </div>
            <button onClick={() => setShowModalPract(false)} 
              className="text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition">
              <X size={22} />
            </button>
          </div>

          {/* Selector de modo */}
          <div className="flex gap-3 px-8 pt-6 pb-4 bg-white/5 border-b border-white/5">
            <button onClick={() => setModoRegistro('semanal')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                modoRegistro === 'semanal' 
                  ? 'bg-gradient-to-r from-[#185FA5] to-[#0ea5e9] text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}>
              <List size={16} /> Vista Semanal
            </button>
            <button onClick={() => setModoRegistro('mensual')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                modoRegistro === 'mensual' 
                  ? 'bg-gradient-to-r from-[#185FA5] to-[#0ea5e9] text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}>
              <Grid size={16} /> Vista Mensual
            </button>
          </div>

          {/* Contenido del calendario */}
          <div className="p-8 overflow-y-auto flex-1">
            {modoRegistro === 'semanal' ? (
              /* ─── VISTA SEMANAL ─── */
              <div className="space-y-8">
                <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
                  <button onClick={() => cambiarSemana(-1)} 
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-white transition">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="text-center">
                    <span className="font-black text-white text-lg">
                      {diasSemana.length > 0 
                        ? `${fmtFecha(diasSemana[0])} — ${fmtFecha(diasSemana[6])}` 
                        : '...'}
                    </span>
                    <p className="text-xs text-blue-300/60 mt-0.5">Semana</p>
                  </div>
                  <button onClick={() => cambiarSemana(1)} 
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-white transition">
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia, idx) => {
                    const fecha = diasSemana[idx] || '';
                    const fueraDeMes = fecha && !fecha.startsWith(mes);
                    const esFin = idx === 5 || idx === 6;
                    return (
                      <div key={idx} className={`flex flex-col items-center space-y-3 p-4 rounded-2xl transition-all ${
                        esFin ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : 'bg-white/5'
                      } ${fueraDeMes ? 'opacity-40' : ''}`}>
                        <div className={`text-xs font-black uppercase ${
                          esFin ? 'text-amber-400' : 'text-gray-400'
                        }`}>{dia}</div>
                        <div className="text-xs text-gray-500 mb-1">
                          {fecha ? fmtFecha(fecha) : '—'}
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={horasGrid[fecha] ?? ''}
                          onChange={(e) => handleHoraChange(fecha, e.target.value)}
                          disabled={!fecha || fueraDeMes}
                          className={`w-20 text-center border-2 rounded-xl py-3 text-sm font-bold outline-none transition-all ${
                            fueraDeMes 
                              ? 'bg-gray-800/20 border-gray-700 text-gray-600 cursor-not-allowed' 
                              : esFin 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20' 
                                : 'bg-white/10 border-white/10 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
                          }`}
                          placeholder="0.0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ─── VISTA MENSUAL CALENDARIO REAL ─── */
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-black uppercase tracking-wider">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
                    <div key={d} className={`py-3 rounded-xl ${i >= 5 ? 'text-amber-400 bg-amber-400/5' : 'text-gray-400 bg-white/5'}`}>
                      {d}
                    </div>
                  ))}
                </div>
                {calendarioMensual.map((semana, idxSem) => (
                  <div key={idxSem} className="grid grid-cols-7 gap-2">
                    {semana.map((fecha, idxDia) => {
                      if (!fecha) {
                        return (
                          <div key={`empty-${idxSem}-${idxDia}`} 
                            className="p-2 rounded-xl bg-transparent min-h-[80px]" />
                        );
                      }
                      const diaNum = new Date(fecha + 'T12:00:00').getUTCDay();
                      const esFin = diaNum === 0 || diaNum === 6;
                      const diaStr = fecha.split('-')[2];
                      return (
                        <div key={fecha} className={`p-2 rounded-xl flex flex-col items-center justify-center min-h-[80px] transition-all ${
                          esFin ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : 'bg-white/5 hover:bg-white/10'
                        }`}>
                          <span className={`text-xs font-bold mb-1 ${
                            esFin ? 'text-amber-400' : 'text-gray-400'
                          }`}>{parseInt(diaStr)}</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={horasGrid[fecha] ?? ''}
                            onChange={(e) => handleHoraChange(fecha, e.target.value)}
                            className={`w-16 text-center border-2 rounded-lg py-1.5 text-xs font-bold outline-none transition-all ${
                              esFin 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 focus:border-amber-400' 
                                : 'bg-white/10 border-white/10 text-white focus:border-blue-500'
                            } focus:ring-2 focus:ring-blue-500/20`}
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-white/5 border-t border-white/5 flex justify-between items-center">
            <div className="text-lg font-black text-white">
              Total horas: <span className="text-[#38bdf8] text-2xl ml-3">
                {fmt(Object.values(horasGrid).reduce((s, h) => s + (Number(h) || 0), 0))}
              </span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowModalPract(false)} 
                className="px-8 py-3.5 bg-white/5 text-gray-300 font-bold rounded-2xl hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={guardarHorasMasivo} 
                className="px-8 py-3.5 bg-gradient-to-r from-[#185FA5] to-[#0ea5e9] text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98]">
                Guardar Horas
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── MODAL DETALLE DE TARDANZAS ───
  const ModalDetalleTardanzas = () => {
    if (!detalleTardanzas) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
          <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
            <h3 className="font-black text-gray-800 text-lg">Detalle de Incidencias</h3>
            <button onClick={() => setShowDetalleTardanzas(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20}/>
            </button>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Minutos</th>
                  <th className="p-2 text-right">Descuento (S/)</th>
                </tr>
              </thead>
              <tbody>
                {detalleTardanzas.map((inc, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{fmtFecha(inc.fecha)}</td>
                    <td className="p-2">{inc.minutos || 0}</td>
                    <td className="p-2 text-right font-mono">{fmt(inc.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
              <Users className="w-6 h-6 text-[#185FA5]" />
            </div>
            <h2 className="text-3xl font-black text-[#0B1527] tracking-tight">PLANILLA & PAGOS</h2>
          </div>
          <p className="text-[#185FA5] font-bold text-[10px] uppercase tracking-widest ml-12">
            Consorcio Rebagliati Diplomados S.A.C. — RUC 20601225175
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"/>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white border-2 border-gray-100 text-gray-700
                       px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm">
            <Download size={14}/> CSV
          </button>
          <button onClick={() => enviarFinanzas(vista)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white px-4 py-2.5
                       rounded-xl text-xs font-bold hover:from-[#1a6ab8] hover:to-[#15569c] transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]">
            <Send size={14}/> Aprobar a Finanzas
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { l: 'Neto Planilla',    v: `S/ ${fmt(totP)}`,       c: 'border-[#185FA5] bg-blue-50/50' },
          { l: 'Neto Complementarios',   v: `S/ ${fmt(totL)}`,       c: 'border-purple-500 bg-purple-50/50' },
          { l: 'EsSalud Emp. 9%',  v: `S/ ${fmt(totEs)}`,      c: 'border-emerald-500 bg-emerald-50/50' },
          { l: 'Horas Extras',     v: `S/ ${fmt(totHE)}`,      c: 'border-amber-500 bg-amber-50/50' },
          { l: 'Total Nómina',     v: `S/ ${fmt(totP + totL + totHE + totPract)}`, c: 'border-[#0B1527] bg-gray-100/50' },
        ].map(k => (
          <div key={k.l} className={`bg-white rounded-2xl border shadow-sm p-5 border-l-4 ${k.c} backdrop-blur-sm`}>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k.l}</p>
            <p className="text-lg font-black text-gray-800 mt-1">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-5 bg-white/80 p-1.5 w-max rounded-2xl border border-blue-50 shadow-lg shadow-blue-100/20 backdrop-blur-sm">
        <button onClick={() => setVista('planilla')} className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 ${vista === 'planilla' ? 'bg-gradient-to-r from-[#11284e] to-[#0B1527] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}><Users size={14}/> PLANILLA (5ta Categ.)</button>
        <button onClick={() => setVista('locacion')} className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 ${vista === 'locacion' ? 'bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}><Briefcase size={14}/> COMPLEMENTARIOS (4ta Categ.)</button>
        <button onClick={() => setVista('horas_extras')} className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 ${vista === 'horas_extras' ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-500/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}><Clock size={14}/> PAGO DE HORAS EXTRAS</button>
        <button onClick={() => setVista('calculadora')} className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 ${vista === 'calculadora' ? 'bg-gradient-to-r from-[#11284e] to-[#0B1527] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}><Calculator size={14}/> CALCULADORA COSTO</button>
        <button onClick={() => setVista('practicantes')} className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 ${vista === 'practicantes' ? 'bg-gradient-to-r from-[#11284e] to-[#0B1527] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}><UserPlus size={14}/> PRACTICANTES</button>
        <button onClick={() => setVista('descuentos_tardanzas')} className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 ${vista === 'descuentos_tardanzas' ? 'bg-gradient-to-r from-[#11284e] to-[#0B1527] text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}><Ban size={14}/> DESC. TARDANZAS</button>
      </div>

      {vista === 'locacion' && (
        <div className="mb-4 flex items-center gap-3 bg-white/80 rounded-2xl p-3 border border-blue-50 shadow-sm backdrop-blur-sm">
          <Filter size={16} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500">Modalidad de Pago:</span>
          <div className="flex gap-1.5">
            {['Todos', 'RHE', 'Efectivo'].map(m => (
              <button key={m} onClick={() => setFiltroModalidad(m)}
                className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${filtroModalidad === m ? 'bg-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {m}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-4">({locadoresFiltrados.length} complementarios)</span>
        </div>
      )}

      {vista === 'calculadora' && <CalculadoraCostos />}
      {vista === 'practicantes' && renderPracticantes()}

      {/* ═══ VISTA: DESCUENTOS DE TARDANZAS (AGRUPADA) ═══ */}
      {vista === 'descuentos_tardanzas' && (
        <div className="space-y-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl p-6">
            <h3 className="text-lg font-black text-gray-800 mb-2">Gestión de Descuentos por Tardanzas</h3>
            <p className="text-sm text-gray-500 mb-6">
              Incidencias agrupadas por colaborador. Seleccione y aplique los descuentos.
              Haga clic en el nombre para ver el detalle.
            </p>

            {/* Planilla */}
            <div className="mb-8">
              <h4 className="font-bold text-[#185FA5] mb-3 flex items-center gap-2"><Users size={16}/> Planilla (5ta Categoría)</h4>
              {gruposPlanilla.length === 0 && (
                <p className="text-center text-gray-400 italic py-4">Sin tardanzas pendientes</p>
              )}
              {gruposPlanilla.map(g => (
                <div key={g.key} className="bg-white border rounded-xl mb-3 overflow-hidden">
                  <div className="p-4 flex flex-wrap items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="checkbox"
                        checked={selectedTardanzas.has(g.key)}
                        onChange={() => toggleSeleccionTardanza(g.key)}
                        className="w-4 h-4 rounded accent-[#185FA5]"
                        disabled={g.aplicado} />
                      <button onClick={() => { setDetalleTardanzas(g.incidencias); setShowDetalleTardanzas(true); }}
                        className="text-left font-bold text-[#185FA5] hover:underline">{g.nombre}</button>
                      <span className="text-sm text-gray-500">S/ {fmt(g.sueldoBase)}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span>{g.incidencias.length} incidencia(s)</span>
                      <span>{g.totalMinutos} min</span>
                      <span className="font-bold text-red-600">S/ {fmt(g.totalDescuento)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.aplicado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {g.aplicado ? 'Aplicado' : 'Pendiente'}
                      </span>
                      {g.aplicado ? (
                        <button onClick={() => revertirDescuentoGrupo(g.key, 'planilla')}
                          className="text-xs text-red-500 hover:underline">Revertir</button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Complementarios */}
            <div className="mb-8">
              <h4 className="font-bold text-purple-700 mb-3 flex items-center gap-2"><Briefcase size={16}/> Complementarios (4ta Categoría)</h4>
              {gruposComplementarios.length === 0 && (
                <p className="text-center text-gray-400 italic py-4">Sin tardanzas pendientes</p>
              )}
              {gruposComplementarios.map(g => (
                <div key={g.key} className="bg-white border rounded-xl mb-3 overflow-hidden">
                  <div className="p-4 flex flex-wrap items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="checkbox"
                        checked={selectedTardanzas.has(g.key)}
                        onChange={() => toggleSeleccionTardanza(g.key)}
                        className="w-4 h-4 rounded accent-purple-600"
                        disabled={g.aplicado} />
                      <button onClick={() => { setDetalleTardanzas(g.incidencias); setShowDetalleTardanzas(true); }}
                        className="text-left font-bold text-purple-700 hover:underline">{g.nombre}</button>
                      <span className="text-sm text-gray-500">S/ {fmt(g.sueldoBase)}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span>{g.incidencias.length} incidencia(s)</span>
                      <span>{g.totalMinutos} min</span>
                      <span className="font-bold text-red-600">S/ {fmt(g.totalDescuento)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.aplicado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {g.aplicado ? 'Aplicado' : 'Pendiente'}
                      </span>
                      {g.aplicado ? (
                        <button onClick={() => revertirDescuentoGrupo(g.key, 'complementario')}
                          className="text-xs text-red-500 hover:underline">Revertir</button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botones */}
            <div className="flex flex-wrap gap-3 mt-6 justify-end">
              <button onClick={exportarTardanzasExcel}
                className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition">
                <FileSpreadsheet size={16}/> Exportar Excel
              </button>
              <button onClick={exportarTardanzasPDF}
                className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition">
                <FileText size={16}/> Exportar PDF
              </button>
              <button onClick={() => aplicarDescuentos('planilla')}
                className="flex items-center gap-2 bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25">
                <CheckCircle size={16}/> Aplicar en Planilla
              </button>
              <button onClick={() => aplicarDescuentos('complementario')}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-purple-500/25">
                <CheckCircle size={16}/> Aplicar en Complementarios
              </button>
            </div>
          </div>
          {showDetalleTardanzas && <ModalDetalleTardanzas />}
        </div>
      )}

      {/* Tablas de planilla / complementarios / horas extras */}
      {vista !== 'calculadora' && vista !== 'practicantes' && vista !== 'descuentos_tardanzas' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-blue-100/20 border border-blue-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <tr className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                  <th className="px-5 py-4">Colaborador</th>
                  {vista === 'planilla' ? (
                    <>
                      <th className="px-4 py-4 text-right">Sueldo Base</th>
                      <th className="px-4 py-4 text-right">Proporcional</th>
                      <th className="px-4 py-4 text-center">Incidencias</th>
                      <th className="px-4 py-4 text-center">Sistema</th>
                      <th className="px-4 py-4 text-right">AFP/ONP</th>
                      <th className="px-4 py-4 text-right">Otros Dsctos</th>
                      <th className="px-5 py-4 text-right">Neto a Pagar</th>
                      <th className="px-5 py-4 text-center">Boleta</th>
                    </>
                  ) : vista === 'locacion' ? (
                    <>
                      <th className="px-4 py-4 text-right">Honorario Base</th>
                      <th className="px-4 py-4 text-right">Ajuste</th>
                      <th className="px-4 py-4 text-center">Ret. 4ta</th>
                      <th className="px-4 py-4 text-center">Modalidad Pago</th>
                      <th className="px-5 py-4 text-right">Neto a Pagar</th>
                      <th className="px-5 py-4 text-center">Boleta</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-4 text-center">Tipo</th>
                      <th className="px-4 py-4 text-right">Cuenta</th>
                      <th className="px-4 py-4 text-right">Horas Tot.</th>
                      <th className="px-4 py-4 text-right">Total</th>
                      <th className="px-5 py-4 text-right">Neto a Pagar</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {(vista === 'planilla' ? cols : vista === 'locacion' ? locadoresFiltrados : horasExtrasAgrupadas).length === 0 ? (
                  <tr><td colSpan={vista === 'planilla' ? 9 : vista === 'locacion' ? 7 : 6} className="p-12 text-center text-gray-400 italic font-medium">Sin registros para este período</td></tr>
                ) : (
                  (vista === 'planilla' ? cols : vista === 'locacion' ? locadoresFiltrados : horasExtrasAgrupadas).map(item => {
                    if (vista === 'planilla') {
                      const c = calcularPlanilla(item, asis, mes);
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img src={item.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((item.nombre||'')+' '+(item.apellido||''))}&background=185FA5&color=fff&size=56`}
                                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md" alt=""/>
                              <div>
                                <p className="font-black text-gray-800 text-xs">{item.apellido} {item.nombre}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">{item.dni} | {item.cargo || 'EMPLEADO'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-gray-500 text-xs">S/ {fmt(c.sb)}</td>
                          <td className={`px-4 py-4 text-right font-mono text-xs ${c.hayAus ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                            S/ {fmt(c.sProp)}
                            {c.hayAus && <span className="text-[8px] block text-amber-500">{c.diasTrab}/{c.tdm}d</span>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center gap-1">
                              {c.tard10 > 0 && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-[8px] font-black">{c.tard10}T</span>}
                              {c.fInj   > 0 && <span className="bg-red-100   text-red-800   px-1.5 py-0.5 rounded-full text-[8px] font-black">{c.fInj}F</span>}
                              {c.diasDM > 0 && <span className="bg-blue-100  text-blue-800  px-1.5 py-0.5 rounded-full text-[8px] font-black">{c.diasDM}DM</span>}
                              {c.tard10 === 0 && c.fInj === 0 && c.diasDM === 0 && <span className="text-gray-300">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${c.tip === 'ONP' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {c.tip === 'ONP' ? 'ONP' : c.afpCortoNom}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-red-500 font-mono text-xs">S/ {fmt(c.penT)}</td>
                          <td className="px-4 py-4 text-right text-red-400 font-mono text-[10px]">
                            {(c.r5 + c.adel + c.dpe + c.d15) > 0 ? `S/ ${fmt(c.r5 + c.adel + c.dpe + c.d15)}` : '—'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-black text-[#185FA5]">S/ {fmt(c.NETO)}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => setSelEmp(item)} className="p-2 bg-gray-100 hover:bg-[#185FA5] hover:text-white rounded-xl transition-colors">
                              <Eye size={15}/>
                            </button>
                          </td>
                        </tr>
                      );
                    } else if (vista === 'locacion') {
                      const c = calcularLocador(item, asisL, mes);
                      const esCesado = item.estado === 'inactivo';
                      const ingresoEnMes = item.fecha_inicio && mes === item.fecha_inicio.substring(0,7);
                      return (
                        <tr key={item.id} className={`hover:bg-purple-50/30 transition-colors ${esCesado ? 'bg-red-50/20' : ''}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img src={item.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((item.nombre||'')+' '+(item.apellido||''))}&background=185FA5&color=fff&size=56`}
                                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md" alt=""/>
                              <div>
                                <p className="font-black text-gray-800 text-xs flex items-center gap-2">
                                  {item.apellido} {item.nombre}
                                  {esCesado && (
                                    <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-black">INACTIVO</span>
                                  )}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">
                                  {item.dni} | COMPLEMENTARIO
                                  {esCesado && item.fecha_cese && (
                                    <span className="text-red-500 ml-2"><CalendarDays size={10} className="inline mr-0.5"/>Cesó: {fmtFecha(item.fecha_cese)}</span>
                                  )}
                                  {!esCesado && ingresoEnMes && (
                                    <span className="text-emerald-600 ml-2"><CalendarDays size={10} className="inline mr-0.5"/>Ingresó: {fmtFecha(item.fecha_inicio)}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-gray-500 text-xs">
                            S/ {fmt(c.honorarioBase)}
                            {c.motivoAjuste && <span className="block text-[8px] text-yellow-600">{c.diasTrabajados} días</span>}
                          </td>
                          <td className="px-4 py-4 text-right text-red-500 text-xs">
                            {c.motivoAjuste ? <span className="text-[9px] text-yellow-700 font-bold">{c.motivoAjuste}</span> : '—'}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button onClick={() => toggleRetencion4ta(item)}
                              className="group flex items-center gap-1 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                              title={c.aplicaRetencion ? 'Retención activa – clic para suspender' : 'Retención suspendida – clic para activar'}>
                              {c.aplicaRetencion ? (
                                <>
                                  <span className="text-xs font-black text-red-600">{fmt(c.ret4)}</span>
                                  <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-black">8%</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-black text-gray-300">S/ 0.00</span>
                                  <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-black">—</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button onClick={() => toggleModalidadPago(item)}
                              className={`text-[8px] font-black px-2 py-1 rounded-full cursor-pointer transition-all hover:opacity-80 ${
                                item.modalidad_pago === 'Efectivo' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`} title="Clic para cambiar modalidad">
                              {item.modalidad_pago || 'RHE'}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-black text-[#185FA5]">S/ {fmt(c.neto)}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => setSelLoc(item)} className="p-2 bg-gray-100 hover:bg-[#185FA5] hover:text-white rounded-xl transition-colors">
                              <Eye size={15}/>
                            </button>
                          </td>
                        </tr>
                      );
                    } else {
                      // Horas Extras Agrupadas
                      const grupo = item;
                      return (
                        <tr key={grupo.id_ref} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(grupo.nombre)}&background=185FA5&color=fff&size=56`}
                                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md" alt=""/>
                              <div>
                                <p className="font-black text-gray-800 text-xs">{grupo.nombre}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">
                                  {grupo.dni} | {grupo.tipo_persona === 'planilla' ? 'Planilla' : 'Complementario'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                              grupo.tipo_persona === 'planilla' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {grupo.tipo_persona === 'planilla' ? 'Planilla' : 'Complementario'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-xs">
                            {grupo.cuenta ? <span className="text-gray-700">{grupo.cuenta}</span> : <span className="text-gray-400 italic">—</span>}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-xs">{grupo.horas.toFixed(2)}h</td>
                          <td className="px-4 py-4 text-right font-bold text-amber-700 text-xs">S/ {fmt(grupo.total)}</td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-black text-[#185FA5]">S/ {fmt(grupo.total)}</span>
                          </td>
                        </tr>
                      );
                    }
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vista !== 'calculadora' && vista !== 'practicantes' && vista !== 'descuentos_tardanzas' && (
        <div className="mt-5 flex justify-end gap-8 text-sm font-bold pr-2 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-blue-50 shadow-lg shadow-blue-100/20">
          <span className="text-gray-600">Total {vista === 'planilla' ? 'Planilla' : vista === 'locacion' ? 'Complementarios' : 'Horas Extras'}:</span>
          <span className="text-[#185FA5] text-lg font-black">S/ {fmt(vista === 'planilla' ? totP : vista === 'locacion' ? totL : totHE)}</span>
          {vista === 'planilla' && (
            <>
              <span className="text-gray-600">EsSalud Emp.:</span>
              <span className="text-emerald-600 text-lg font-black">S/ {fmt(totEs)}</span>
            </>
          )}
        </div>
      )}

      {selEmp && <ModalBoleta emp={selEmp} c={calcularPlanilla(selEmp, asis, mes)} mesStr={mes} onClose={() => setSelEmp(null)} />}
      {selLoc && <ModalLocador loc={selLoc} c={calcularLocador(selLoc, asisL, mes)} mesStr={mes} onClose={() => setSelLoc(null)} />}
      {showModalPract && <ModalPracticanteHoras />}

      {/* ═══ MODAL FACTOR FIN DE SEMANA ═══ */}
      {showModalFactor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-800">Factor Fin de Semana</h3>
              <button onClick={() => setShowModalFactor(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Multiplicador para horas trabajadas en sábados y domingos (ej: 1.0 = sin recargo, 1.5 = 50% extra).
            </p>
            <input
              type="number"
              step="0.1"
              min="0"
              value={nuevoFactor}
              onChange={(e) => setNuevoFactor(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModalFactor(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-bold">Cancelar</button>
              <button onClick={guardarFactor} className="flex-1 py-2.5 bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white rounded-xl font-bold shadow-lg">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}