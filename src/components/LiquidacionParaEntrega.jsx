// src/components/LiquidacionParaEntrega.jsx
import React from 'react';

const numeroALetras = (num) => {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';
  if (num < 0) return 'MENOS ' + numeroALetras(-num);
  if (num < 10) return unidades[num];
  if (num < 20) return especiales[num - 10];
  if (num < 100) {
    const dec = Math.floor(num / 10);
    const uni = num % 10;
    return (decenas[dec] || '') + (uni > 0 ? ' Y ' + unidades[uni] : '');
  }
  if (num < 1000) {
    const cen = Math.floor(num / 100);
    const resto = num % 100;
    return (cen === 1 && resto === 0 ? 'CIEN' : (centenas[cen] || '')) + (resto > 0 ? ' ' + numeroALetras(resto) : '');
  }
  if (num < 1000000) {
    const miles = Math.floor(num / 1000);
    const resto = num % 1000;
    const strMiles = miles === 1 ? 'MIL' : numeroALetras(miles) + ' MIL';
    return strMiles + (resto > 0 ? ' ' + numeroALetras(resto) : '');
  }
  return num.toString();
};

const calcularPeriodo = (desde, hasta) => {
  if (!desde || !hasta) return { anios: 0, meses: 0, dias: 0 };
  let d1 = new Date(desde + 'T00:00:00');
  let d2 = new Date(hasta + 'T00:00:00');
  if (isNaN(d1) || isNaN(d2)) return { anios: 0, meses: 0, dias: 0 };
  if (d1 > d2) [d1, d2] = [d2, d1];

  let anios = d2.getFullYear() - d1.getFullYear();
  let meses = d2.getMonth() - d1.getMonth();
  let dias = d2.getDate() - d1.getDate();

  if (dias < 0) {
    meses--;
    const ultimoDiaMesAnterior = new Date(d2.getFullYear(), d2.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }
  if (meses < 0) {
    anios--;
    meses += 12;
  }
  return { anios, meses, dias };
};

const formatFecha = (fecha) => {
  if (!fecha) return '—';
  try {
    const d = new Date(fecha + 'T00:00:00');
    if (isNaN(d)) return fecha;
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return fecha; }
};

export default function LiquidacionParaEntrega({ empleado, calculo, motivo, fechaCese }) {
  if (!calculo || !empleado) return null;

  const fechaCeseStr = fechaCese || '';
  const fechaIngresoStr = empleado.fecha_inicio || calculo.fechaIngreso || '';

  const periodo = calcularPeriodo(fechaIngresoStr, fechaCeseStr);

  const totalNum = parseFloat(calculo.totalFinal) || 0;
  const parteEntera = Math.floor(totalNum);
  const centavos = Math.round((totalNum - parteEntera) * 100);
  const letras = numeroALetras(parteEntera) + ' Y ' + centavos + '/100 NUEVOS SOLES';

  const esAFP = empleado.sistema_pensionario && empleado.sistema_pensionario !== 'ONP';

  // Para sección 1.1 (último mes)
  const sueldoMes = calculo.sueldoBruto || 0;
  const diasLaborados = 30; // Asumimos mes completo
  const totalRemMes = sueldoMes; // Simplificación
  const afpMes = esAFP ? (sueldoMes * 0.1137) : 0; // Tasa promedio AFP (11.37%)
  const condTrabajo = empleado.comodato || 0;
  const pagoPlanilla = totalRemMes + condTrabajo - afpMes; // Lo que ya se pagó en planilla

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 text-[11px] font-mono border shadow-xl print:shadow-none print:border-none print:text-[10px]" id="liquidacion-print">
      <h2 className="text-center font-bold text-base mb-6 tracking-wide">LIQUIDACIÓN DE BENEFICIOS SOCIALES</h2>

      {/* Datos del trabajador */}
      <table className="w-full text-xs mb-5 border-b border-gray-300 pb-3">
        <tbody>
          <tr><td className="font-bold w-48 py-1">NOMBRE DEL TRABAJADOR</td><td className="py-1">{empleado.nombre} {empleado.apellido}</td></tr>
          <tr><td className="font-bold py-1">DNI</td><td className="py-1">{empleado.dni || '—'}</td></tr>
          <tr><td className="font-bold py-1">CARGO</td><td className="py-1">{empleado.cargo || '—'}</td></tr>
          <tr><td className="font-bold py-1">FECHA DE INGRESO</td><td className="py-1">{formatFecha(fechaIngresoStr)}</td></tr>
          <tr><td className="font-bold py-1">FECHA DE CESE</td><td className="py-1">{formatFecha(fechaCeseStr)}</td></tr>
          <tr><td className="font-bold py-1">MOTIVO DE CESE</td><td className="py-1 uppercase">{motivo === 'fin_contrato' ? 'TERMINO DE CONTRATO' : motivo}</td></tr>
          <tr><td className="font-bold py-1">PERIODO DE TRABAJO</td><td className="py-1">{periodo.anios} AÑOS, {periodo.meses} MESES, {periodo.dias} DIAS</td></tr>
          <tr><td className="font-bold py-1">ACREDITACION REMYPE</td><td className="py-1">2016-05-27 &nbsp; 0001377392-2016</td></tr>
        </tbody>
      </table>

      {/* 1. REMUNERACION COMPUTABLE */}
      <h3 className="font-bold text-xs mb-2 bg-gray-100 p-1">1.- REMUNERACIÓN COMPUTABLE</h3>
      <table className="w-full text-xs mb-4">
        <tbody>
          <tr>
            <td className="py-1">SUELDO BASICO EMPRESA MYPE</td>
            <td className="text-right font-bold">{calculo.sueldoBruto?.toFixed(2)}</td>
          </tr>
          <tr>
            <td className="py-1">ASIGNACIÓN FAMILIAR</td>
            <td className="text-right">{calculo.asignacionFamiliar?.toFixed(2) || '0.00'}</td>
          </tr>
          <tr>
            <td className="py-1">PROMEDIO DE GRATIFICACIÓN PERCIBIDA (1/6)</td>
            <td className="text-right">{calculo.promedioGratificacionCTS?.toFixed(2) || '0.00'}</td>
          </tr>
          <tr className="font-bold border-t border-gray-400">
            <td className="py-1">TOTAL REMUNERACIÓN</td>
            <td className="text-right">{calculo.RC_CTS?.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* 1.1 REMUNERACIONES DEL MES */}
      <h3 className="font-bold text-xs mb-2 bg-gray-100 p-1">1.1 REMUNERACIONES DEL MES</h3>
      <table className="w-full text-xs mb-4">
        <tbody>
          <tr>
            <td className="py-1">DIAS LABORADOS : {sueldoMes.toFixed(2)} ÷ 30 × {diasLaborados} DIAS</td>
            <td className="text-right font-bold">{sueldoMes.toFixed(2)}</td>
          </tr>
          <tr>
            <td className="py-1">DCTO TARD O /OTROS DSCT</td>
            <td className="text-right">0.00</td>
          </tr>
          <tr>
            <td className="py-1">LICENCIA SIN GOCE HABERES</td>
            <td className="text-right">0.00</td>
          </tr>
          <tr>
            <td className="py-1">FALTA INJUSTIFICADA (DIAS)</td>
            <td className="text-right">0.00</td>
          </tr>
          {esAFP && (
            <tr>
              <td className="py-1">AFP {empleado.sistema_pensionario?.replace('AFP ','')} (11.37%)</td>
              <td className="text-right text-red-600">- {afpMes.toFixed(2)}</td>
            </tr>
          )}
          <tr>
            <td className="py-1">CONDICIÓN DE TRABAJO</td>
            <td className="text-right">{condTrabajo.toFixed(2)}</td>
          </tr>
          <tr className="font-bold border-t border-gray-400">
            <td className="py-1">PAGO FIN DE MES REALIZADO EN PLANILLA</td>
            <td className="text-right text-red-600">- {pagoPlanilla.toFixed(2)}</td>
          </tr>
          <tr className="font-bold text-base">
            <td className="py-1">NETO A PAGAR</td>
            <td className="text-right">0.00</td>
          </tr>
        </tbody>
      </table>

      {/* 2. CALCULO DE LA CTS */}
      <h3 className="font-bold text-xs mb-2 bg-gray-100 p-1">2.- CÁLCULO DE LA CTS</h3>
      <p className="text-xs mb-1">
        Periodo: DEL {formatFecha(calculo.fechaCeseObj ? new Date(calculo.fechaCeseObj).toISOString().slice(0,10) : '')} AL {formatFecha(fechaCeseStr)} ({calculo.mesesCTS} meses)
      </p>
      <p className="text-xs mb-2">
        {calculo.RC_CTS?.toFixed(2)} ÷ 12 × {calculo.mesesCTS} MESES = S/ {calculo.ctsTrunca}
      </p>
      <p className="text-xs font-bold mb-4">TOTAL CTS POR PAGAR: S/ {calculo.ctsTrunca}</p>

      {/* 3. VACACIONES TRUNCAS */}
      <h3 className="font-bold text-xs mb-2 bg-gray-100 p-1">3.- VACACIONES TRUNCAS</h3>
      <p className="text-xs mb-1">
        Del {formatFecha(fechaIngresoStr)} al {formatFecha(fechaCeseStr)} ({calculo.mesesVac} meses)
      </p>
      <p className="text-xs mb-2">
        {calculo.baseVac?.toFixed(2)} ÷ 12 × {calculo.mesesVac} MESES = S/ {calculo.vacacionesBruto}
      </p>

      {esAFP && (
        <div className="text-xs mb-2">
          <p className="font-semibold">AFP {empleado.sistema_pensionario?.replace('AFP ','')}:</p>
          <p>Fondo Pensión (10%): { (calculo.vacacionesBruto * 0.10).toFixed(2)}</p>
          <p>Comisión VAR sobre RA (0%): 0.00</p>
          <p>Prima de Seguro (1.37%): { (calculo.vacacionesBruto * 0.0137).toFixed(2)}</p>
          <p className="font-bold">Total Retención AFP: S/ {calculo.retencionVac}</p>
        </div>
      )}
      {!esAFP && (
        <p className="text-xs mb-2">ONP (13%): S/ {calculo.retencionVac}</p>
      )}

      <p className="text-xs font-bold mb-4">TOTAL VACACIONES A PAGAR: S/ {calculo.vacacionesNeto}</p>

      {/* 4. GRATIFICACIONES TRUNCAS */}
      <h3 className="font-bold text-xs mb-2 bg-gray-100 p-1">4.- GRATIFICACIONES TRUNCAS</h3>
      <p className="text-xs mb-1">
        Periodo: DEL 01.01.{new Date(fechaCeseStr).getFullYear()} AL {formatFecha(fechaCeseStr)} ({calculo.mesesGrat} meses)
      </p>
      <p className="text-xs mb-2">
        {calculo.baseGrat?.toFixed(2)} ÷ 6 × {calculo.mesesGrat} MESES = S/ {calculo.gratificacionPrincipal}
      </p>
      <p className="text-xs mb-1">BONIFICACIÓN EXTRAORDINARIA (9%): S/ {calculo.bonificacionExtra}</p>
      <p className="text-xs font-bold mb-4">TOTAL GRATIFICACIÓN A PAGAR: S/ {calculo.totalGratificaciones}</p>

      {/* 5. BONIFICACION ESPECIAL */}
      <h3 className="font-bold text-xs mb-2 bg-gray-100 p-1">5.- BONIFICACIÓN ESPECIAL</h3>
      <p className="text-xs mb-1">0.00 × 0.09 = 0.00</p>
      <p className="text-xs font-bold mb-4">BONIFICACION ESPECIAL A PAGAR: S/ {calculo.bonificacionEspecial || '0.00'}</p>

      {/* TOTAL FINAL */}
      <div className="border-t-2 border-gray-800 pt-4 mt-4">
        <p className="font-bold text-sm">TOTAL A RECIBIR POR CONCEPTO DE LIQUIDACIÓN: S/ {totalNum.toFixed(2)}</p>
        <p className="text-xs mt-2">SON: {letras}</p>
      </div>

      {/* Firmas */}
      <div className="mt-12 flex justify-between text-xs">
        <div className="text-center w-1/2">
          <p className="border-b border-black mx-8 mb-1">&nbsp;</p>
          <p className="font-semibold">CONSORCIO REBAGLIATI DIPLOMADOS SAC</p>
          <p>GERENTE GENERAL</p>
        </div>
        <div className="text-center w-1/2">
          <p className="border-b border-black mx-8 mb-1">&nbsp;</p>
          <p className="font-semibold">{empleado.nombre} {empleado.apellido}</p>
          <p>DNI: {empleado.dni || ''}</p>
        </div>
      </div>
      <p className="text-[9px] mt-8 text-center text-gray-600 leading-relaxed">
        FIRMO LA PRESENTE COMO CONSTANCIA DE HABER RECIBIDO LA INTEGRIDAD DE MI LIQUIDACION DE<br/>
        BENEFICIOS SOCIALES DE CONFORMIDAD AL D.LEG. Nº 650 Y NO TENIENDO NADA QUE RECLAMAR.
      </p>
      <p className="text-center text-xs mt-4">{formatFecha(fechaCeseStr)}</p>
    </div>
  );
}