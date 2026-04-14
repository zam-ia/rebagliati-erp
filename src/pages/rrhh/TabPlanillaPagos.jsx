// src/pages/rrhh/TabPlanillaPagos.jsx
// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE CÁLCULO BASADA EN: PLANILLA_FEBRERO_2026 (hoja HABERES + TAREO)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, X, Eye, Printer, Send, Users, Briefcase, Building2, CreditCard, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Tasas AFP ─────────────────────────────────────────────────────────────
const AFP_TASAS = {
  'AFP PRIMA MIXTA / SALDO':     { fondo: 0.10, poliza: 0.0137, comision: 0.00 },
  'AFP PRIMA/FLUJO':             { fondo: 0.10, poliza: 0.0137, comision: 0.016  },
  'AFP HABITAT MIXTA / SALDO':   { fondo: 0.10, poliza: 0.0137, comision: 0.00 },
  'AFP HABITAT FLUJO':           { fondo: 0.10, poliza: 0.0137, comision: 0.0147 },
  'AFP PROFUTURO MIXTA / SALDO': { fondo: 0.10, poliza: 0.0137, comision: 0.00 },
  'AFP PROFUTURO FLUJO':         { fondo: 0.10, poliza: 0.0137, comision: 0.0169 },
  'AFP INTEGRA MIXTA / SALDO':   { fondo: 0.10, poliza: 0.0137, comision: 0.00 },
  'AFP INTEGRA FLUJO':           { fondo: 0.10, poliza: 0.0137, comision: 0.0155 },
};
const ONP_TASA = 0.13;
const ESSALUD_TASA = 0.09;
const ASIG_FAMILIAR = 102.50;

const fmt = (n) => new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

// ── CÁLCULO PRINCIPAL PLANILLA ────────────────────────────────────────────
function calcularPlanilla(emp, asistencias, mesSeleccionado) {
  const sueldoBasico     = Number(emp.sueldo_bruto       || 0);
  const asigFamiliar     = emp.tiene_hijos ? ASIG_FAMILIAR : 0;
  const comodato         = Number(emp.comodato          || 0); 
  const horasExtra25     = Number(emp.horas_extra_25     || 0);
  const horasExtra35     = Number(emp.horas_extra_35     || 0);
  const otrosIngresosBono= Number(emp.otros_ingresos_bono|| 0);
  const vacacionesTruncas= Number(emp.vacaciones_truncas || 0);
  const subsidio         = Number(emp.subsidio           || 0);
  const movilidadFija    = Number(emp.movilidad_fija     || 0);
  const movilidadVariable= Number(emp.movilidad_variable || 0);

  // Tardanzas e Incidencias
  const asisEmp = (asistencias || []).filter(a => String(a.empleado_id) === String(emp.id));
  let tardanzasSuperan10 = 0;
  let faltasInjust = 0;
  const valorPorTardanza = Number(emp.valor_por_tardanza || 10);
  
  asisEmp.forEach(a => {
    if (!a.justificacion) {
      if (a.tardanza_supera_10min || (a.tardanza && a.minutos > 10)) tardanzasSuperan10++;
      if (a.falta) faltasInjust++;
    }
  });
  
  const descTardanza = tardanzasSuperan10 * valorPorTardanza;
  const descFaltas   = faltasInjust * (sueldoBasico / 30);

  // Calcular días y horas trabajadas
  const [year, month] = mesSeleccionado.split('-');
  const diasEnMes = new Date(parseInt(year), parseInt(month), 0).getDate();
  const diasTrabajados = diasEnMes - faltasInjust - Number(emp.vacaciones_dias || 0);
  const horasTrabajadas = diasTrabajados * 8;

  // Total remuneración afecta (base para pensiones)
  const totalRemunAfecta = sueldoBasico + asigFamiliar + horasExtra25 + horasExtra35
    + otrosIngresosBono + vacacionesTruncas - descTardanza;

  // Total remuneración no afecta
  const totalRemunNoAfecta = comodato + movilidadFija + movilidadVariable + subsidio;

  // Pensiones
  const tipoPension = emp.sistema_pensionario || '';
  let onpMonto = 0, afpFondo = 0, afpPoliza = 0, afpComision = 0, afpTotal = 0, nombreSistema = '';
  
  if (tipoPension === 'ONP') {
    onpMonto = totalRemunAfecta > 0 ? totalRemunAfecta * ONP_TASA : 0;
    nombreSistema = 'ONP 13%';
  } else {
    const tasas = AFP_TASAS[tipoPension] || { fondo: 0.10, poliza: 0.0137, comision: 0.00 };
    afpFondo    = totalRemunAfecta > 0 ? totalRemunAfecta * tasas.fondo : 0;
    afpPoliza   = totalRemunAfecta > 0 ? totalRemunAfecta * tasas.poliza : 0;
    afpComision = totalRemunAfecta > 0 ? totalRemunAfecta * tasas.comision : 0;
    afpTotal    = afpFondo + afpPoliza + afpComision;
    nombreSistema = tipoPension;
  }
  const pensionTotal = tipoPension === 'ONP' ? onpMonto : afpTotal;

  // Otros descuentos
  const renta5ta        = Number(emp.renta_5ta          || 0);
  const adelantos       = Number(emp.adelantos          || 0);
  const dsctoPagoExceso = Number(emp.dscto_pago_exceso  || 0);
  const dscto15na       = Number(emp.dscto_15na         || 0);

  const totalDescuentos = pensionTotal + renta5ta + adelantos + dsctoPagoExceso + dscto15na + descFaltas;
  const netoPagar = totalRemunAfecta + totalRemunNoAfecta - totalDescuentos;

  // Aportes empleador
  const essalud9    = totalRemunAfecta > 0 ? totalRemunAfecta * ESSALUD_TASA : 0;
  const essaludVida = Number(emp.essalud_vida_ley || 0);

  return {
    sueldoBasico, asigFamiliar, comodato, horasExtra25, horasExtra35,
    otrosIngresosBono, vacacionesTruncas, descTardanza, descFaltas,
    totalRemunAfecta, movilidadFija, movilidadVariable, subsidio,
    totalRemunNoAfecta, tipoPension, nombreSistema,
    onpMonto, afpFondo, afpPoliza, afpComision, afpTotal, pensionTotal,
    renta5ta, adelantos, dsctoPagoExceso, dscto15na,
    totalDescuentos, netoPagar,
    tardanzasSuperan10, faltasInjust, valorPorTardanza,
    essalud9, essaludVida,
    banco: emp.banco_nombre || '—',
    cuenta: emp.numero_cuenta || '—',
    cuspp: emp.cuspp || '—',
    diasTrabajados,
    horasTrabajadas,
  };
}

// ── CÁLCULO LOCADORES ─────────────────────────────────────────────────────
function calcularLocador(loc, asistencias) {
  const sueldoBase = Number(loc.sueldo_base || loc.monto_mensual || 0);
  const asisLoc = (asistencias || []).filter(a => String(a.locador_id) === String(loc.id));
  let tardanzasSuperan10 = 0, faltasInjust = 0;
  const valorPorTardanza = Number(loc.valor_por_tardanza || 10);
  
  asisLoc.forEach(a => {
    if (!a.justificacion) {
      if (a.tardanza_supera_10min || (a.tardanza && a.minutos > 10)) tardanzasSuperan10++;
      if (a.falta) faltasInjust++;
    }
  });

  const descTardanza = tardanzasSuperan10 * valorPorTardanza;
  const descFaltas   = faltasInjust * (sueldoBase / 30);
  
  // Retención 4ta (8%) si supera 1500
  const retencion4ta = sueldoBase > 1500 ? sueldoBase * 0.08 : 0;
  
  const totalDescuentos = descTardanza + descFaltas + retencion4ta;
  const netoPagar = sueldoBase - totalDescuentos;

  return {
    sueldoBase, tardanzasSuperan10, faltasInjust, valorPorTardanza,
    descTardanza, descFaltas, retencion4ta, totalDescuentos, netoPagar,
    banco: loc.banco || '—',
    cuenta: loc.numero_cuenta || '—',
  };
}

// ── FUNCIÓN PARA GENERAR PDF (descarga directa) ──────────────────────────
function generarBoletaPDF(emp, calc, mesSeleccionado, tipo = 'planilla') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  let y = 14;

  // Encabezado empresa
  doc.setFillColor(17, 40, 78);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSORCIO REBAGLIATI DIPLOMADOS SAC', M, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('AV. 28 DE JULIO NRO. 1004 PISO 07 - LIMA - LIMA - LIMA', M, 16);
  doc.text('R.U.C.: 20601225175   |   ACREDITACION REMYPE: 0001377392-2016', M, 21);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(tipo === 'planilla' ? 'BOLETA DE PAGO' : 'COMPROBANTE DE PAGO', W - M, 10, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`PERÍODO: ${mesSeleccionado}`, W - M, 16, { align: 'right' });
  doc.text('D.S. Nro. 001-98-TR DEL 22.01.98', W - M, 21, { align: 'right' });

  // Datos del trabajador
  y = 34;
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 244, 250);
  doc.rect(M, y, W - 2 * M, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS DEL TRABAJADOR', M + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  const nombre = `${emp.apellido || ''}, ${emp.nombre || ''}`.toUpperCase();
  doc.text(`Apellidos y Nombres: ${nombre}`, M + 3, y + 12);
  doc.text(`DNI: ${emp.dni || '—'}`, M + 3, y + 17);
  
  doc.text(`Cargo:`, M + 70, y + 12);
  doc.text(`${emp.cargo || '—'}`, M + 90, y + 12);
  
  if (tipo === 'planilla') {
    doc.text(`Días: ${calc.diasTrabajados} | Horas: ${calc.horasTrabajadas}`, M + 70, y + 17);
    doc.text(`AFP/ONP: ${calc.nombreSistema}`, M + 130, y + 12);
    if (calc.cuspp && calc.cuspp !== '—') doc.text(`CUSPP: ${calc.cuspp}`, M + 130, y + 17);
  }
  doc.text(`Banco: ${calc.banco}  Cta: ${calc.cuenta}`, M + 3, y + 22);
  y += 32;

  if (tipo === 'planilla') {
    const colW = [68, 68, 48];
    const colX = [M, M + colW[0], M + colW[0] + colW[1]];
    const encBg = [24, 95, 165];
    [[colX[0], 'REMUNERACIONES'], [colX[1], 'DESCUENTOS'], [colX[2], 'APORT. EMPLEADOR']].forEach(([x, label]) => {
      doc.setFillColor(...encBg);
      doc.rect(x, y, colW[0], 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(label, x + colW[0] / 2, y + 4, { align: 'center' });
    });
    doc.setTextColor(0, 0, 0);
    y += 7;

    const haberes = [
      ['Básico Mensual',          calc.sueldoBasico],
      calc.asigFamiliar > 0 && ['Asignación Familiar', calc.asigFamiliar],
      calc.horasExtra25 > 0  && ['Horas Extras 25%',   calc.horasExtra25],
      calc.horasExtra35 > 0  && ['Horas Extras 35%',   calc.horasExtra35],
      calc.otrosIngresosBono > 0 && ['Otros Ingresos/Bono', calc.otrosIngresosBono],
      calc.vacacionesTruncas > 0 && ['Vacaciones/Truncos', calc.vacacionesTruncas],
      calc.descTardanza > 0  && ['(-) Desc. Tardanzas', -calc.descTardanza],
      ['Condic. Trabajo', calc.comodato],
      calc.movilidadFija > 0     && ['Movilidad Fija',     calc.movilidadFija],
      calc.movilidadVariable > 0 && ['Movilidad Variable', calc.movilidadVariable],
      calc.subsidio > 0          && ['Subsidio',           calc.subsidio],
    ].filter(Boolean);

    const descuentos = [
      calc.tipoPension === 'ONP' ? ['ONP 13%', calc.onpMonto] : ['AFP Aport. 10%', calc.afpFondo],
      calc.afpPoliza > 0   && ['AFP Póliza/Seg. 1.37%', calc.afpPoliza],
      calc.afpComision > 0 && ['AFP Comisión',          calc.afpComision],
      calc.renta5ta > 0    && ['Renta 5ta Categ.',      calc.renta5ta],
      calc.dscto15na > 0   && ['1ra Quincena Dscto.',   calc.dscto15na],
      calc.adelantos > 0   && ['Adelantos/Otros',       calc.adelantos],
      calc.dsctoPagoExceso !== 0 && ['Dscto. Pago Exceso', calc.dsctoPagoExceso],
      calc.descFaltas > 0  && ['Descto. Faltas Injust.', calc.descFaltas],
    ].filter(Boolean);

    const aportes = [
      ['EsSalud 9%',      calc.essalud9],
      calc.essaludVida > 0 && ['EsSalud Vida Ley', calc.essaludVida],
    ].filter(Boolean);

    const maxRows = Math.max(haberes.length, descuentos.length, aportes.length);
    doc.setFontSize(7.5);
    for (let i = 0; i < maxRows; i++) {
      const yRow = y + i * 5;
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, yRow, W - 2 * M, 5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      if (haberes[i]) {
        const [label, val] = haberes[i];
        doc.text(label, colX[0] + 2, yRow + 3.5);
        const color = val < 0 ? [200, 30, 30] : [30, 100, 30];
        doc.setTextColor(...color);
        doc.text(`S/ ${fmt(Math.abs(val))}`, colX[0] + colW[0] - 2, yRow + 3.5, { align: 'right' });
        doc.setTextColor(60, 60, 60);
      }
      if (descuentos[i]) {
        const [label, val] = descuentos[i];
        doc.text(label, colX[1] + 2, yRow + 3.5);
        doc.setTextColor(180, 30, 30);
        doc.text(`S/ ${fmt(val)}`, colX[1] + colW[1] - 2, yRow + 3.5, { align: 'right' });
        doc.setTextColor(60, 60, 60);
      }
      if (aportes[i]) {
        const [label, val] = aportes[i];
        doc.text(label, colX[2] + 2, yRow + 3.5);
        doc.setTextColor(60, 60, 150);
        doc.text(`S/ ${fmt(val)}`, colX[2] + colW[2] - 2, yRow + 3.5, { align: 'right' });
        doc.setTextColor(60, 60, 60);
      }
    }
    y += maxRows * 5 + 3;
    doc.setDrawColor(180, 180, 180);
    doc.line(M, y, W - M, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(230, 237, 248);
    doc.rect(M, y, W - 2 * M, 6, 'F');
    doc.setTextColor(17, 40, 78);
    doc.text('TOTAL REMUN. AFECTA:', colX[0] + 2, y + 4);
    doc.text(`S/ ${fmt(calc.totalRemunAfecta)}`, colX[0] + colW[0] - 2, y + 4, { align: 'right' });
    doc.text('TOTAL DESCUENTOS:', colX[1] + 2, y + 4);
    doc.setTextColor(180, 30, 30);
    doc.text(`S/ ${fmt(calc.totalDescuentos)}`, colX[1] + colW[1] - 2, y + 4, { align: 'right' });
    doc.setTextColor(60, 60, 150);
    doc.text('TOTAL APORTES:', colX[2] + 2, y + 4);
    doc.text(`S/ ${fmt(calc.essalud9 + calc.essaludVida)}`, colX[2] + colW[2] - 2, y + 4, { align: 'right' });
    y += 10;
    
    doc.setFillColor(17, 40, 78);
    doc.rect(M, y, W - 2 * M, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('NETO A PAGAR:', M + 4, y + 8);
    doc.setFontSize(13);
    doc.text(`S/ ${fmt(calc.netoPagar)}`, W - M - 4, y + 8, { align: 'right' });
    y += 16;
  } else {
    // Locador PDF
    autoTable(doc, {
      startY: y,
      head: [['CONCEPTO', 'MONTO (S/)']],
      body: [
        ['Honorarios (Sueldo Base)', `S/ ${fmt(calc.sueldoBase)}`],
        ...(calc.descTardanza > 0 ? [['(-) Tardanzas', `S/ ${fmt(calc.descTardanza)}`]] : []),
        ...(calc.descFaltas > 0   ? [['(-) Faltas Injustificadas', `S/ ${fmt(calc.descFaltas)}`]] : []),
        ...(calc.retencion4ta > 0 ? [['(-) Retención 4ta Categ. (8%)', `S/ ${fmt(calc.retencion4ta)}`]] : []),
        ['TOTAL DESCUENTOS', `S/ ${fmt(calc.totalDescuentos)}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [17, 40, 78], fontSize: 8, textColor: 255 },
      bodyStyles: { fontSize: 8 },
      margin: { left: M, right: M },
      tableWidth: W - 2 * M,
    });
    y = doc.lastAutoTable.finalY + 6;
    doc.setFillColor(17, 40, 78);
    doc.rect(M, y, W - 2 * M, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NETO A PAGAR:', M + 4, y + 8);
    doc.text(`S/ ${fmt(calc.netoPagar)}`, W - M - 4, y + 8, { align: 'right' });
    y += 16;
  }
  
  const pieY = 270;
  doc.setDrawColor(17, 40, 78);
  doc.line(M, pieY, W / 2 - 10, pieY);
  doc.line(W / 2 + 10, pieY, W - M, pieY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('CONSORCIO REBAGLIATI DIPLOMADOS SAC', M, pieY + 4);
  doc.text(`${emp.nombre || ''} ${emp.apellido || ''}  |  DNI: ${emp.dni || '—'}`, W - M, pieY + 4, { align: 'right' });
  doc.setFontSize(6.5);
  doc.text('FIRMA Y SELLO EMPLEADOR', M + 15, pieY + 9, { align: 'center' });
  doc.text('FIRMA TRABAJADOR', W - M - 20, pieY + 9, { align: 'center' });
  doc.text(`Lima, ${mesSeleccionado}  |  Impreso: ${new Date().toLocaleDateString('es-PE')}`, W / 2, pieY + 13, { align: 'center' });
  
  doc.save(`boleta_${(emp.apellido || emp.nombre || 'trabajador').replace(/ /g, '_')}_${mesSeleccionado}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function TabPlanillaPagos() {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7));
  const [colaboradores, setColaboradores] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [asistenciasLocadores, setAsistenciasLocadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState('planilla');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [locadorSeleccionado, setLocadorSeleccionado] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: emp } = await supabase.from('empleados').select('*').eq('estado', 'activo');
      const { data: loc } = await supabase.from('locadores').select('*').eq('estado', 'activo');
      
      const primerDia = `${mesSeleccionado}-01`;
      const ultimoDia = new Date(mesSeleccionado.split('-')[0], mesSeleccionado.split('-')[1], 0).toISOString().slice(0, 10);
      
      const { data: asis } = await supabase.from('asistencia').select('*').gte('fecha', primerDia).lte('fecha', ultimoDia);
      const { data: asisL } = await supabase.from('asistencia_locadores').select('*').gte('fecha', primerDia).lte('fecha', ultimoDia);
      
      setColaboradores(emp || []);
      setLocadores(loc || []);
      setAsistencias(asis || []);
      setAsistenciasLocadores(asisL || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [mesSeleccionado]);

  const enviarPlanillaAFinanzas = async () => {
    const total = colaboradores.reduce((s, e) => s + calcularPlanilla(e, asistencias, mesSeleccionado).netoPagar, 0);
    if (total <= 0) { alert('No hay montos en la planilla.'); return; }
    if (!window.confirm(`¿Registrar egreso en Finanzas por S/ ${fmt(total)}?`)) return;
    
    const { error } = await supabase.from('egresos').insert({
      fecha: new Date().toISOString().split('T')[0],
      concepto: `Planilla de Haberes - ${mesSeleccionado}`,
      area: 'RRHH', categoria: 'Planilla',
      proveedor: 'Nómina de Colaboradores',
      monto: total, estado: 'Pendiente',
    });
    if (error) { alert('Error al enviar a Finanzas'); return; }
    alert(`¡Planilla enviada a Finanzas: S/ ${fmt(total)}!`);
  };

  const exportarCSV = () => {
    const headers = ['Nombres y Apellidos', 'DNI', 'Área', 'Sueldo Básico', 'Comodato',
      'Total Remun. Afecta', 'Total No Afecta', 'Sistema Pensiones', 'AFP/ONP', 'Renta 5ta',
      'Adelantos', 'Tardanzas', 'Faltas Injust.', 'Total Descuentos', 'Neto a Pagar', 'Banco', 'Cuenta'];
    
    const rows = colaboradores.map(emp => {
      const c = calcularPlanilla(emp, asistencias, mesSeleccionado);
      return [
        `${emp.apellido} ${emp.nombre}`, emp.dni, emp.area,
        c.sueldoBasico, c.comodato,
        c.totalRemunAfecta, c.totalRemunNoAfecta,
        c.tipoPension, fmt(c.pensionTotal),
        c.renta5ta, c.adelantos,
        c.descTardanza, c.descFaltas,
        fmt(c.totalDescuentos), fmt(c.netoPagar),
        c.banco, c.cuenta,
      ];
    });
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planilla_${mesSeleccionado}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const subtotalPlanilla = colaboradores.reduce((s, e) => s + calcularPlanilla(e, asistencias, mesSeleccionado).netoPagar, 0);
  const subtotalLocadores = locadores.reduce((s, l) => s + calcularLocador(l, asistenciasLocadores).netoPagar, 0);
  const totalEssalud = colaboradores.reduce((s, e) => s + calcularPlanilla(e, asistencias, mesSeleccionado).essalud9, 0);

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tighter">PLANILLA & PAGOS</h2>
          <p className="text-[#185FA5] font-bold text-[10px] uppercase tracking-widest">
            Consorcio Rebagliati Diplomados S.A.C. — RUC 20601225175
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="month" value={mesSeleccionado} onChange={e => setMesSeleccionado(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-blue-500"/>
          <button onClick={exportarCSV} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-gray-50">
            <Download size={12}/> CSV
          </button>
          {vista === 'planilla' && (
            <button onClick={enviarPlanillaAFinanzas} className="flex items-center gap-1 bg-[#185FA5] text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-[#11284e]">
              <Send size={12}/> Aprobar a Finanzas
            </button>
          )}
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex gap-2 mb-4 bg-white p-1 w-max rounded-xl border border-gray-200 shadow-sm">
        <button onClick={() => setVista('planilla')} className={`px-4 py-2 text-xs font-black rounded-lg flex items-center gap-2 transition-all ${vista === 'planilla' ? 'bg-[#11284e] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Users size={14} /> PLANILLA (Quinta Categ.)
        </button>
        <button onClick={() => setVista('locacion')} className={`px-4 py-2 text-xs font-black rounded-lg flex items-center gap-2 transition-all ${vista === 'locacion' ? 'bg-[#185FA5] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
          <Briefcase size={14} /> LOCADORES (Cuarta Categ.)
        </button>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Neto Planilla',  valor: `S/ ${fmt(subtotalPlanilla)}`,  color: 'border-[#185FA5]' },
          { label: 'Neto Locadores', valor: `S/ ${fmt(subtotalLocadores)}`, color: 'border-purple-500' },
          { label: 'EsSalud Emp. (9%)',valor: `S/ ${fmt(totalEssalud)}`,    color: 'border-emerald-500' },
          { label: 'Total Nómina',   valor: `S/ ${fmt(subtotalPlanilla + subtotalLocadores)}`, color: 'border-[#11284e]' },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl border shadow-sm p-4 border-l-4 ${k.color}`}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
            <p className="text-lg font-black text-gray-800 mt-1">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* TABLAS */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 font-bold animate-pulse">Cargando datos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                  <th className="px-5 py-4">Colaborador</th>
                  {vista === 'planilla' ? (
                    <>
                      <th className="px-4 py-4 text-right">Sueldo Base</th>
                      <th className="px-4 py-4 text-center">Incidencias</th>
                      <th className="px-4 py-4 text-right">Dsctos</th>
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
                {(vista === 'planilla' ? colaboradores : locadores).map(item => {
                  const isPlanilla = vista === 'planilla';
                  const c = isPlanilla ? calcularPlanilla(item, asistencias, mesSeleccionado) : calcularLocador(item, asistenciasLocadores);
                  
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={item.foto_url || `https://ui-avatars.com/api/?name=${item.nombre}+${item.apellido}&background=185FA5&color=fff&size=64`} 
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            alt="Avatar"
                          />
                          <div>
                            <p className="font-black text-gray-800">{item.apellido} {item.nombre}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">{item.dni} | {item.cargo || 'LOCADOR'}</p>
                          </div>
                        </div>
                      </td>

                      {isPlanilla ? (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-gray-600">S/ {fmt(c.sueldoBasico)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              {c.tardanzasSuperan10 > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-black">{c.tardanzasSuperan10}T</span>}
                              {c.faltasInjust > 0 && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black">{c.faltasInjust}F</span>}
                              {c.tardanzasSuperan10 === 0 && c.faltasInjust === 0 && <span className="text-gray-300">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-red-500 font-bold">- S/ {fmt(c.totalDescuentos)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-gray-600">S/ {fmt(c.sueldoBase)}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-bold">- S/ {fmt(c.retencion4ta)}</td>
                        </>
                      )}

                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-black text-[#185FA5]">S/ {fmt(c.netoPagar)}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button 
                          onClick={() => isPlanilla ? setEmpleadoSeleccionado(item) : setLocadorSeleccionado(item)}
                          className="p-2 bg-gray-100 hover:bg-[#185FA5] hover:text-white rounded-xl transition-all text-gray-500"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL BOLETA PLANILLA (SIN FOTO) - CON ENVÍO DE CORREO CORREGIDO */}
      {/* ============================================================== */}
      {empleadoSeleccionado && (() => {
        const c = calcularPlanilla(empleadoSeleccionado, asistencias, mesSeleccionado);
        
        // Función que genera el PDF y devuelve el BASE64 LIMPIO (sin prefijo, sin espacios)
        const generarPDFBase64 = (emp, calc, mes, tipo) => {
          const doc = new jsPDF({ unit: 'mm', format: 'a4' });
          const W = 210, M = 14;
          let y = 14;

          // Encabezado empresa
          doc.setFillColor(17, 40, 78);
          doc.rect(0, 0, W, 26, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('CONSORCIO REBAGLIATI DIPLOMADOS SAC', M, 10);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('AV. 28 DE JULIO NRO. 1004 PISO 07 - LIMA - LIMA - LIMA', M, 16);
          doc.text('R.U.C.: 20601225175   |   ACREDITACION REMYPE: 0001377392-2016', M, 21);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(tipo === 'planilla' ? 'BOLETA DE PAGO' : 'COMPROBANTE DE PAGO', W - M, 10, { align: 'right' });
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`PERÍODO: ${mes}`, W - M, 16, { align: 'right' });
          doc.text('D.S. Nro. 001-98-TR DEL 22.01.98', W - M, 21, { align: 'right' });

          // Datos del trabajador
          y = 34;
          doc.setTextColor(0, 0, 0);
          doc.setFillColor(240, 244, 250);
          doc.rect(M, y, W - 2 * M, 26, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('DATOS DEL TRABAJADOR', M + 3, y + 6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          
          const nombreCompleto = `${emp.apellido || ''}, ${emp.nombre || ''}`.toUpperCase();
          doc.text(`Apellidos y Nombres: ${nombreCompleto}`, M + 3, y + 12);
          doc.text(`DNI: ${emp.dni || '—'}`, M + 3, y + 17);
          
          doc.text(`Cargo:`, M + 70, y + 12);
          doc.text(`${emp.cargo || '—'}`, M + 90, y + 12);
          
          if (tipo === 'planilla') {
            doc.text(`Días: ${calc.diasTrabajados} | Horas: ${calc.horasTrabajadas}`, M + 70, y + 17);
            doc.text(`AFP/ONP: ${calc.nombreSistema}`, M + 130, y + 12);
            if (calc.cuspp && calc.cuspp !== '—') doc.text(`CUSPP: ${calc.cuspp}`, M + 130, y + 17);
          }
          doc.text(`Banco: ${calc.banco}  Cta: ${calc.cuenta}`, M + 3, y + 22);
          y += 32;

          if (tipo === 'planilla') {
            const colW = [68, 68, 48];
            const colX = [M, M + colW[0], M + colW[0] + colW[1]];
            const encBg = [24, 95, 165];
            [[colX[0], 'REMUNERACIONES'], [colX[1], 'DESCUENTOS'], [colX[2], 'APORT. EMPLEADOR']].forEach(([x, label]) => {
              doc.setFillColor(...encBg);
              doc.rect(x, y, colW[0], 6, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7.5);
              doc.text(label, x + colW[0] / 2, y + 4, { align: 'center' });
            });
            doc.setTextColor(0, 0, 0);
            y += 7;

            const haberes = [
              ['Básico Mensual',          calc.sueldoBasico],
              calc.asigFamiliar > 0 && ['Asignación Familiar', calc.asigFamiliar],
              calc.horasExtra25 > 0  && ['Horas Extras 25%',   calc.horasExtra25],
              calc.horasExtra35 > 0  && ['Horas Extras 35%',   calc.horasExtra35],
              calc.otrosIngresosBono > 0 && ['Otros Ingresos/Bono', calc.otrosIngresosBono],
              calc.vacacionesTruncas > 0 && ['Vacaciones/Truncos', calc.vacacionesTruncas],
              calc.descTardanza > 0  && ['(-) Desc. Tardanzas', -calc.descTardanza],
              ['Condic. Trabajo', calc.comodato],
              calc.movilidadFija > 0     && ['Movilidad Fija',     calc.movilidadFija],
              calc.movilidadVariable > 0 && ['Movilidad Variable', calc.movilidadVariable],
              calc.subsidio > 0          && ['Subsidio',           calc.subsidio],
            ].filter(Boolean);

            const descuentos = [
              calc.tipoPension === 'ONP' ? ['ONP 13%', calc.onpMonto] : ['AFP Aport. 10%', calc.afpFondo],
              calc.afpPoliza > 0   && ['AFP Póliza/Seg. 1.37%', calc.afpPoliza],
              calc.afpComision > 0 && ['AFP Comisión',          calc.afpComision],
              calc.renta5ta > 0    && ['Renta 5ta Categ.',      calc.renta5ta],
              calc.dscto15na > 0   && ['1ra Quincena Dscto.',   calc.dscto15na],
              calc.adelantos > 0   && ['Adelantos/Otros',       calc.adelantos],
              calc.dsctoPagoExceso !== 0 && ['Dscto. Pago Exceso', calc.dsctoPagoExceso],
              calc.descFaltas > 0  && ['Descto. Faltas Injust.', calc.descFaltas],
            ].filter(Boolean);

            const aportes = [
              ['EsSalud 9%',      calc.essalud9],
              calc.essaludVida > 0 && ['EsSalud Vida Ley', calc.essaludVida],
            ].filter(Boolean);

            const maxRows = Math.max(haberes.length, descuentos.length, aportes.length);
            doc.setFontSize(7.5);
            for (let i = 0; i < maxRows; i++) {
              const yRow = y + i * 5;
              if (i % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(M, yRow, W - 2 * M, 5, 'F');
              }
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(60, 60, 60);
              
              if (haberes[i]) {
                const [label, val] = haberes[i];
                doc.text(label, colX[0] + 2, yRow + 3.5);
                const color = val < 0 ? [200, 30, 30] : [30, 100, 30];
                doc.setTextColor(...color);
                doc.text(`S/ ${fmt(Math.abs(val))}`, colX[0] + colW[0] - 2, yRow + 3.5, { align: 'right' });
                doc.setTextColor(60, 60, 60);
              }
              if (descuentos[i]) {
                const [label, val] = descuentos[i];
                doc.text(label, colX[1] + 2, yRow + 3.5);
                doc.setTextColor(180, 30, 30);
                doc.text(`S/ ${fmt(val)}`, colX[1] + colW[1] - 2, yRow + 3.5, { align: 'right' });
                doc.setTextColor(60, 60, 60);
              }
              if (aportes[i]) {
                const [label, val] = aportes[i];
                doc.text(label, colX[2] + 2, yRow + 3.5);
                doc.setTextColor(60, 60, 150);
                doc.text(`S/ ${fmt(val)}`, colX[2] + colW[2] - 2, yRow + 3.5, { align: 'right' });
                doc.setTextColor(60, 60, 60);
              }
            }
            y += maxRows * 5 + 3;
            doc.setDrawColor(180, 180, 180);
            doc.line(M, y, W - M, y);
            y += 4;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setFillColor(230, 237, 248);
            doc.rect(M, y, W - 2 * M, 6, 'F');
            doc.setTextColor(17, 40, 78);
            doc.text('TOTAL REMUN. AFECTA:', colX[0] + 2, y + 4);
            doc.text(`S/ ${fmt(calc.totalRemunAfecta)}`, colX[0] + colW[0] - 2, y + 4, { align: 'right' });
            doc.text('TOTAL DESCUENTOS:', colX[1] + 2, y + 4);
            doc.setTextColor(180, 30, 30);
            doc.text(`S/ ${fmt(calc.totalDescuentos)}`, colX[1] + colW[1] - 2, y + 4, { align: 'right' });
            doc.setTextColor(60, 60, 150);
            doc.text('TOTAL APORTES:', colX[2] + 2, y + 4);
            doc.text(`S/ ${fmt(calc.essalud9 + calc.essaludVida)}`, colX[2] + colW[2] - 2, y + 4, { align: 'right' });
            y += 10;
            
            doc.setFillColor(17, 40, 78);
            doc.rect(M, y, W - 2 * M, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text('NETO A PAGAR:', M + 4, y + 8);
            doc.setFontSize(13);
            doc.text(`S/ ${fmt(calc.netoPagar)}`, W - M - 4, y + 8, { align: 'right' });
            y += 16;
          } else {
            // Locador PDF
            autoTable(doc, {
              startY: y,
              head: [['CONCEPTO', 'MONTO (S/)']],
              body: [
                ['Honorarios (Sueldo Base)', `S/ ${fmt(calc.sueldoBase)}`],
                ...(calc.descTardanza > 0 ? [['(-) Tardanzas', `S/ ${fmt(calc.descTardanza)}`]] : []),
                ...(calc.descFaltas > 0   ? [['(-) Faltas Injustificadas', `S/ ${fmt(calc.descFaltas)}`]] : []),
                ...(calc.retencion4ta > 0 ? [['(-) Retención 4ta Categ. (8%)', `S/ ${fmt(calc.retencion4ta)}`]] : []),
                ['TOTAL DESCUENTOS', `S/ ${fmt(calc.totalDescuentos)}`],
              ],
              theme: 'striped',
              headStyles: { fillColor: [17, 40, 78], fontSize: 8, textColor: 255 },
              bodyStyles: { fontSize: 8 },
              margin: { left: M, right: M },
              tableWidth: W - 2 * M,
            });
            y = doc.lastAutoTable.finalY + 6;
            doc.setFillColor(17, 40, 78);
            doc.rect(M, y, W - 2 * M, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('NETO A PAGAR:', M + 4, y + 8);
            doc.text(`S/ ${fmt(calc.netoPagar)}`, W - M - 4, y + 8, { align: 'right' });
            y += 16;
          }
          
          const pieY = 270;
          doc.setDrawColor(17, 40, 78);
          doc.line(M, pieY, W / 2 - 10, pieY);
          doc.line(W / 2 + 10, pieY, W - M, pieY);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text('CONSORCIO REBAGLIATI DIPLOMADOS SAC', M, pieY + 4);
          doc.text(`${emp.nombre || ''} ${emp.apellido || ''}  |  DNI: ${emp.dni || '—'}`, W - M, pieY + 4, { align: 'right' });
          doc.setFontSize(6.5);
          doc.text('FIRMA Y SELLO EMPLEADOR', M + 15, pieY + 9, { align: 'center' });
          doc.text('FIRMA TRABAJADOR', W - M - 20, pieY + 9, { align: 'center' });
          doc.text(`Lima, ${mes}  |  Impreso: ${new Date().toLocaleDateString('es-PE')}`, W / 2, pieY + 13, { align: 'center' });
          
          // Obtener base64 y limpiarlo
          const dataUri = doc.output('datauristring');
          let base64 = dataUri.split(',')[1];
          // Eliminar espacios y saltos de línea
          base64 = base64.replace(/\s/g, '');
          // Validar que sea base64 válido
          try {
            atob(base64);
          } catch (e) {
            console.error('Base64 inválido generado', e);
            throw new Error('El PDF generado no es válido');
          }
          return base64;
        };

        // Función para enviar por correo usando fetch
        const enviarPorCorreo = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              alert('❌ No hay sesión activa. Por favor, inicia sesión nuevamente.');
              return;
            }
            console.log('✅ Sesión activa:', session.user.email);

            if (!empleadoSeleccionado.correo) {
              alert('❌ El colaborador no tiene correo electrónico registrado.');
              return;
            }
            console.log('📧 Correo destino:', empleadoSeleccionado.correo);

            console.log('📄 Generando PDF y extrayendo base64...');
            const base64 = generarPDFBase64(empleadoSeleccionado, c, mesSeleccionado, 'planilla');
            if (!base64) throw new Error('No se pudo generar el base64 del PDF');
            console.log('📄 Base64 length:', base64.length);

            const nombreCompleto = `${empleadoSeleccionado.nombre} ${empleadoSeleccionado.apellido}`;
            console.log('📡 Llamando a Edge Function...');
            const response = await fetch('https://itklklsotsybsqntyrzr.supabase.co/functions/v1/send-boleta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: empleadoSeleccionado.correo,
                nombre: nombreCompleto,
                pdfBase64: base64,
                mes: mesSeleccionado
              })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error en la función');
            console.log('✅ Respuesta:', result);
            alert('✅ Boleta enviada correctamente al correo del colaborador');
          } catch (err) {
            console.error('❌ Error:', err);
            alert('❌ Error al enviar: ' + err.message);
          }
        };

        return (
          <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* HEADER BOLETA - SIN FOTO */}
              <div className="bg-[#11284e] px-6 py-5 shrink-0 flex justify-between items-start relative">
                <div className="text-white relative z-10">
                  <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
                    <FileText size={20} className="text-blue-300" /> BOLETA DE PAGO DE REMUNERACIONES
                  </h3>
                  <p className="text-blue-200 text-[10px] font-bold mt-1">CONSORCIO REBAGLIATI DIPLOMADOS SAC - RUC: 20601225175</p>
                  <p className="text-[9px] text-white/50 mt-1 font-mono">ACREDITACION REMYPE: 0001377392-2016 | D.S. Nro. 001-98-TR DEL 22.01.98</p>
                </div>
                <div className="flex flex-col items-end">
                  <button onClick={() => setEmpleadoSeleccionado(null)} className="text-white/50 hover:text-white p-1 rounded-full bg-white/10 transition-colors"><X size={20} /></button>
                  <p className="text-blue-300 text-xs font-black uppercase tracking-widest mt-3">{mesSeleccionado}</p>
                </div>
              </div>

              {/* INFO TRABAJADOR - SIN FOTO */}
              <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 grid grid-cols-2 gap-4 text-xs shrink-0">
                <div>
                  <p className="font-black text-gray-800 text-sm uppercase">{empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}</p>
                  <p className="font-bold text-blue-700 text-[10px] uppercase">{empleadoSeleccionado.cargo || 'Colaborador'}</p>
                  <p className="text-gray-500 text-[10px] mt-1">Días trabajados: <span className="font-bold text-gray-800">{c.diasTrabajados}</span> | Horas: <span className="font-bold text-gray-800">{c.horasTrabajadas}</span></p>
                  <p className="text-gray-500 text-[10px]">F. Ingreso: <span className="font-bold text-gray-800">{empleadoSeleccionado.fecha_ingreso || '—'}</span></p>
                </div>
                <div className="flex flex-col justify-center space-y-1 border-l border-blue-100 pl-4">
                  <p className="text-gray-500 text-[10px]">DNI: <span className="font-bold text-gray-800">{empleadoSeleccionado.dni || '—'}</span></p>
                  <p className="text-gray-500 text-[10px]">Sistema Pensiones: <span className="font-bold text-gray-800">{c.nombreSistema}</span></p>
                  {c.cuspp && c.cuspp !== '—' && <p className="text-gray-500 text-[10px]">Nro. ESSALUD (CUSPP): <span className="font-bold text-gray-800">{c.cuspp}</span></p>}
                  <p className="text-gray-500 text-[10px]">Banco: <span className="font-bold text-gray-800">{c.banco}</span> | Cuenta: <span className="font-bold text-gray-800">{c.cuenta}</span></p>
                </div>
              </div>

              {/* CUERPO DE LA BOLETA (3 COLUMNAS) - igual que antes */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
                <div className="grid grid-cols-3 gap-0 border rounded-xl overflow-hidden text-[11px]">
                  {/* Columna 1: Remuneraciones */}
                  <div className="border-r">
                    <div className="bg-emerald-600 px-3 py-1.5 text-white font-black text-[9px] uppercase">Remuneraciones</div>
                    <div className="divide-y">
                      {[
                        ['Básico Mensual', c.sueldoBasico, true],
                        c.asigFamiliar > 0 && ['Asignación Familiar', c.asigFamiliar, false],
                        c.horasExtra25 > 0 && ['Horas Extras 25%', c.horasExtra25, false],
                        c.horasExtra35 > 0 && ['Horas Extras 35%', c.horasExtra35, false],
                        c.otrosIngresosBono > 0 && ['Bono / Otros Ingr.', c.otrosIngresosBono, false],
                        c.vacacionesTruncas > 0 && ['Vacac. Truncas', c.vacacionesTruncas, false],
                        c.descTardanza > 0 && ['(-) Desc. Tardanzas', c.descTardanza, false, true],
                        ['Condic. Trabajo', c.comodato, false],
                        c.movilidadFija > 0 && ['Movilidad Fija', c.movilidadFija, false],
                        c.movilidadVariable > 0 && ['Movilidad Variable', c.movilidadVariable, false],
                        c.subsidio > 0 && ['Subsidio', c.subsidio, false],
                      ].filter(Boolean).map(([label, val, bold, resta]) => (
                        <div key={label} className="flex justify-between px-3 py-1.5">
                          <span className={`${bold ? 'font-bold' : ''} text-gray-600`}>{label}</span>
                          <span className={`font-mono ${resta ? 'text-red-500' : 'font-bold text-gray-700'}`}>
                            {resta ? `- S/ ${fmt(val)}` : `S/ ${fmt(val)}`}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-3 py-1.5 bg-emerald-50">
                        <span className="font-black text-emerald-700 text-[10px]">TOTAL REMUN.</span>
                        <span className="font-black text-emerald-700 font-mono">S/ {fmt(c.totalRemunAfecta + c.totalRemunNoAfecta)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Columna 2: Descuentos */}
                  <div>
                    <div className="bg-red-600 px-3 py-1.5 text-white font-black text-[9px] uppercase">Descuentos</div>
                    <div className="divide-y">
                      {c.tipoPension === 'ONP' ? (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-gray-600">ONP 13%</span>
                          <span className="font-mono text-red-600 font-bold">S/ {fmt(c.onpMonto)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between px-3 py-1.5">
                            <span className="text-gray-600">AFP Aporte 10%</span>
                            <span className="font-mono text-red-600">S/ {fmt(c.afpFondo)}</span>
                          </div>
                          <div className="flex justify-between px-3 py-1.5">
                            <span className="text-gray-600">AFP Póliza/Seg. 1.37%</span>
                            <span className="font-mono text-red-600">S/ {fmt(c.afpPoliza)}</span>
                          </div>
                          {c.afpComision > 0 && (
                            <div className="flex justify-between px-3 py-1.5">
                              <span className="text-gray-600">AFP Comisión</span>
                              <span className="font-mono text-red-600">S/ {fmt(c.afpComision)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-1.5 bg-red-50">
                            <span className="font-bold text-red-700 text-[10px]">Total AFP</span>
                            <span className="font-black text-red-700 font-mono">S/ {fmt(c.afpTotal)}</span>
                          </div>
                        </>
                      )}
                      {c.renta5ta > 0 && (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-gray-600">Renta 5ta Categ.</span>
                          <span className="font-mono text-red-600">S/ {fmt(c.renta5ta)}</span>
                        </div>
                      )}
                      {c.descFaltas > 0 && (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-gray-600">Faltas Injust. ({c.faltasInjust})</span>
                          <span className="font-mono text-red-600">S/ {fmt(c.descFaltas)}</span>
                        </div>
                      )}
                      {c.adelantos > 0 && (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-gray-600">Adelantos</span>
                          <span className="font-mono text-red-600">S/ {fmt(c.adelantos)}</span>
                        </div>
                      )}
                      {c.dscto15na > 0 && (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-gray-600">1ra Quincena Dscto.</span>
                          <span className="font-mono text-red-600">S/ {fmt(c.dscto15na)}</span>
                        </div>
                      )}
                      {c.dsctoPagoExceso !== 0 && (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-gray-600">Dscto. Pago Exceso</span>
                          <span className="font-mono text-red-600">S/ {fmt(c.dsctoPagoExceso)}</span>
                        </div>
                      )}
                      <div className="flex justify-between px-3 py-1.5 bg-red-50">
                        <span className="font-black text-red-700 text-[10px]">TOTAL DESCTOS.</span>
                        <span className="font-black text-red-700 font-mono">S/ {fmt(c.totalDescuentos)}</span>
                      </div>
                      
                      {/* Aportes empleador dentro de descuentos */}
                      <div className="bg-blue-50 px-3 py-1 text-[9px] text-blue-500 uppercase font-bold">Aport. Empleador</div>
                      <div className="flex justify-between px-3 py-1.5">
                        <span className="text-gray-500">EsSalud 9%</span>
                        <span className="font-mono text-blue-600">S/ {fmt(c.essalud9)}</span>
                      </div>
                      {c.essaludVida > 0 && (
                        <div className="flex justify-between px-3 py-1.5">
                          <span className="text-gray-500">EsSalud Vida Ley</span>
                          <span className="font-mono text-blue-600">S/ {fmt(c.essaludVida)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Columna 3: Resumen Neto */}
                  <div className="border-l">
                    <div className="bg-amber-600 px-3 py-1.5 text-white font-black text-[9px] uppercase">Resumen</div>
                    <div className="p-3 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Remuneración</span>
                        <span className="font-black text-gray-800">S/ {fmt(c.totalRemunAfecta + c.totalRemunNoAfecta)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Descuentos</span>
                        <span className="font-black text-red-600">S/ {fmt(c.totalDescuentos)}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between">
                          <span className="font-black text-[#11284e]">NETO A PAGAR</span>
                          <span className="font-black text-[#185FA5] text-lg">S/ {fmt(c.netoPagar)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Incidencias adicionales */}
                {(c.tardanzasSuperan10 > 0 || c.faltasInjust > 0) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px]">
                    <p className="font-black text-amber-700 uppercase text-[9px] mb-1">Detalle de Incidencias</p>
                    {c.tardanzasSuperan10 > 0 && (
                      <p className="text-amber-600">• {c.tardanzasSuperan10} tardanza(s) que superan 10 min × S/{c.valorPorTardanza} = <strong>S/ {fmt(c.descTardanza)}</strong></p>
                    )}
                    {c.faltasInjust > 0 && (
                      <p className="text-red-600">• {c.faltasInjust} falta(s) injustificada(s) × S/{fmt(empleadoSeleccionado.sueldo_bruto / 30)} = <strong>S/ {fmt(c.descFaltas)}</strong></p>
                    )}
                  </div>
                )}
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="px-6 py-4 bg-gray-50 border-t flex gap-3 shrink-0">
                <button 
                  onClick={() => generarBoletaPDF(empleadoSeleccionado, c, mesSeleccionado, 'planilla')}
                  className="flex-1 bg-[#11284e] text-white py-2.5 rounded-xl text-[11px] font-black uppercase hover:bg-[#185FA5] flex items-center justify-center gap-2 transition-all"
                >
                  <Download size={14} /> Descargar PDF
                </button>
                <button 
                  onClick={enviarPorCorreo}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
                >
                  <Mail size={14} /> Enviar por correo
                </button>
                <button 
                  onClick={() => setEmpleadoSeleccionado(null)}
                  className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-[11px] font-black hover:bg-gray-300 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* MODAL LOCADOR (similar al original) */}
      {/* ============================================================== */}
      {locadorSeleccionado && (() => {
        const c = calcularLocador(locadorSeleccionado, asistenciasLocadores);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#11284e] px-5 py-4 flex justify-between items-start text-white">
                <div>
                  <p className="font-black text-[11px] uppercase tracking-widest">COMPROBANTE DE PAGO — LOCADOR</p>
                  <p className="text-[9px] text-blue-300 mt-0.5">Período: {mesSeleccionado}</p>
                </div>
                <button onClick={() => setLocadorSeleccionado(null)} className="hover:bg-white/10 p-1.5 rounded-full"><X size={16}/></button>
              </div>
              <div className="p-5 space-y-3 text-[11px]">
                <div className="bg-blue-50 rounded-xl px-4 py-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-blue-500 font-black uppercase mb-1">Empresa</p>
                    <p className="font-bold text-gray-800">CONSORCIO REBAGLIATI DIPLOMADOS SAC</p>
                    <p className="text-gray-500">RUC: 20601225175</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-blue-500 font-black uppercase mb-1">Locador</p>
                    <p className="font-bold text-gray-800">{locadorSeleccionado.apellido}, {locadorSeleccionado.nombre}</p>
                    <p className="text-gray-500">DNI: {locadorSeleccionado.dni || '—'}</p>
                    <p className="text-gray-500">{c.banco} · {c.cuenta}</p>
                  </div>
                </div>
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-emerald-600 px-3 py-1.5 text-white font-black text-[9px] uppercase">Honorarios</div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-gray-600">Sueldo Base</span>
                    <span className="font-black text-gray-800 font-mono">S/ {fmt(c.sueldoBase)}</span>
                  </div>
                  {c.descTardanza > 0 && (
                    <div className="flex justify-between px-3 py-2 border-t">
                      <span className="text-gray-600">(-) Tardanzas ({c.tardanzasSuperan10} eventos × S/{c.valorPorTardanza})</span>
                      <span className="text-red-600 font-mono">- S/ {fmt(c.descTardanza)}</span>
                    </div>
                  )}
                  {c.descFaltas > 0 && (
                    <div className="flex justify-between px-3 py-2 border-t">
                      <span className="text-gray-600">(-) Faltas Injustificadas ({c.faltasInjust})</span>
                      <span className="text-red-600 font-mono">- S/ {fmt(c.descFaltas)}</span>
                    </div>
                  )}
                  {c.retencion4ta > 0 && (
                    <div className="flex justify-between px-3 py-2 border-t">
                      <span className="text-gray-600">(-) Retención 4ta Categ. (8%)</span>
                      <span className="text-red-600 font-mono">- S/ {fmt(c.retencion4ta)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 border-t bg-red-50">
                    <span className="font-black text-red-700">Total Descuentos</span>
                    <span className="font-black text-red-700 font-mono">S/ {fmt(c.totalDescuentos)}</span>
                  </div>
                </div>
                <div className="bg-[#11284e] rounded-xl px-5 py-4 flex justify-between items-center">
                  <p className="text-white font-black uppercase">NETO A PAGAR</p>
                  <p className="text-2xl font-black text-white">S/ {fmt(c.netoPagar)}</p>
                </div>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t flex gap-2">
                <button onClick={() => generarBoletaPDF(locadorSeleccionado, c, mesSeleccionado, 'locador')} className="flex-1 bg-[#11284e] text-white py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#185FA5] flex items-center justify-center gap-1.5">
                  <Download size={13}/> PDF Comprobante
                </button>
                <button onClick={() => setLocadorSeleccionado(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl text-[10px] font-black hover:bg-gray-300">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}