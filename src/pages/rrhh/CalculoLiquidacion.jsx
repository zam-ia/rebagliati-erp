import { useEffect, useState } from 'react';

export default function CalculoLiquidacion({ empleado, fechaCese, ultimoDiaTrabajado, motivo, onCalculo }) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (empleado && fechaCese) {
      calcularLiquidacion();
    }
  }, [empleado, fechaCese, ultimoDiaTrabajado, motivo]);

  const calcularLiquidacion = () => {
    if (!empleado) return;

    // ==================== DATOS BASE ====================
    const sueldoBasico = Number(empleado.sueldo_bruto) || 0;
    const asignacionFamiliar = (empleado.tiene_hijos && Number(empleado.asignacion_familiar)) || 0;
    const comodato = Number(empleado.comodato) || 0;
    const sueldoTotal = sueldoBasico + asignacionFamiliar + comodato;

    // ==================== FECHAS ====================
    const fechaIngreso = new Date(empleado.fecha_inicio);
    const fechaCeseDate = new Date(fechaCese);
    const fechaUltimoDia = ultimoDiaTrabajado ? new Date(ultimoDiaTrabajado) : fechaCeseDate;

    // ==================== TIEMPO TRABAJADO ====================
    let añosTrabajados = fechaCeseDate.getFullYear() - fechaIngreso.getFullYear();
    let mesesTrabajados = fechaCeseDate.getMonth() - fechaIngreso.getMonth();
    let diasTrabajados = fechaCeseDate.getDate() - fechaIngreso.getDate();

    if (diasTrabajados < 0) {
      mesesTrabajados--;
      const ultimoDiaMesAnterior = new Date(fechaCeseDate.getFullYear(), fechaCeseDate.getMonth(), 0).getDate();
      diasTrabajados += ultimoDiaMesAnterior;
    }
    if (mesesTrabajados < 0) {
      añosTrabajados--;
      mesesTrabajados += 12;
    }

    const totalMeses = añosTrabajados * 12 + mesesTrabajados;

    // ==================== DÍAS LABORADOS EN EL MES DE CESE ====================
    const primerDiaMes = new Date(fechaCeseDate.getFullYear(), fechaCeseDate.getMonth(), 1);
    let diasEnMes = 31;
    if ([4, 6, 9, 11].includes(fechaCeseDate.getMonth() + 1)) diasEnMes = 30;
    if (fechaCeseDate.getMonth() === 1) {
      const esBisiesto = (fechaCeseDate.getFullYear() % 4 === 0 && fechaCeseDate.getFullYear() % 100 !== 0) || fechaCeseDate.getFullYear() % 400 === 0;
      diasEnMes = esBisiesto ? 29 : 28;
    }

    let diasLaborados = fechaCeseDate.getDate();
    if (fechaUltimoDia < fechaCeseDate) {
      diasLaborados = fechaUltimoDia.getDate();
    }

    const remuneracionDelMes = (sueldoTotal / diasEnMes) * diasLaborados;

    // ==================== VACACIONES TRUNCAS (Ley: 30 días por año completo) ====================
    // Para MYPE: se calcula proporcional según meses trabajados
    const diasVacaciones = (totalMeses / 12) * 30;
    const vacacionesTruncas = (sueldoTotal / 30) * diasVacaciones;

    // ==================== GRATIFICACIONES TRUNCAS (Ley: 1 sueldo por Julio y Diciembre) ====================
    // Para MYPE: las gratificaciones son el 100% del sueldo (si el trabajador está en planilla)
    let gratificacionesTruncas = 0;
    const mesesHastaJulio = Math.min(6, totalMeses);
    const mesesHastaDiciembre = Math.min(12, totalMeses) - 6;
    
    if (mesesHastaJulio > 0) {
      gratificacionesTruncas += (sueldoTotal / 6) * mesesHastaJulio;
    }
    if (mesesHastaDiciembre > 0) {
      gratificacionesTruncas += (sueldoTotal / 6) * mesesHastaDiciembre;
    }

    // ==================== CTS (Compensación por Tiempo de Servicios) ====================
    // Para MYPE: la CTS es 1 sueldo por año completo (proporcional a meses trabajados)
    const ctsTrunca = (sueldoTotal / 12) * totalMeses;

    // ==================== BONIFICACIÓN POR MOTIVO DE CESE ====================
    let bonificacion = 0;
    if (motivo === 'despido') {
      bonificacion = sueldoTotal * 0.2; // 20% adicional por despido
    } else if (motivo === 'jubilacion') {
      bonificacion = sueldoTotal * 0.5; // 50% adicional por jubilación
    }

    // ==================== TOTAL LIQUIDACIÓN BRUTA ====================
    const totalLiquidacion = remuneracionDelMes + vacacionesTruncas + gratificacionesTruncas + ctsTrunca + bonificacion;

    // ==================== DESCUENTOS SEGÚN SISTEMA PENSIONARIO ====================
    let descuentoAFP = 0;
    let descuentoONP = 0;
    let afpComision = 0;
    let afpPrima = 0;
    
    if (empleado.sistema_pensionario === 'AFP') {
      // AFP: 10% comisión + 1.7% prima de seguro (aprox)
      afpComision = totalLiquidacion * 0.10;
      afpPrima = totalLiquidacion * 0.017;
      descuentoAFP = afpComision + afpPrima;
    } else if (empleado.sistema_pensionario === 'ONP') {
      descuentoONP = totalLiquidacion * 0.13; // 13% ONP
    }

    // ==================== TOTAL NETO A PAGAR ====================
    const totalFinal = totalLiquidacion - descuentoAFP - descuentoONP;

    // ==================== RESULTADO FINAL ====================
    const calculo = {
      sueldoBasico,
      asignacionFamiliar,
      comodato,
      sueldoTotal,
      añosTrabajados: añosTrabajados + (mesesTrabajados / 12),
      mesesTrabajados,
      diasLaborados,
      remuneracionDelMes: Math.round(remuneracionDelMes),
      vacacionesTruncas: Math.round(vacacionesTruncas),
      gratificacionesTruncas: Math.round(gratificacionesTruncas),
      ctsTrunca: Math.round(ctsTrunca),
      bonificacion: Math.round(bonificacion),
      totalLiquidacion: Math.round(totalLiquidacion),
      afpComision: Math.round(afpComision),
      afpPrima: Math.round(afpPrima),
      descuentoAFP: Math.round(descuentoAFP),
      descuentoONP: Math.round(descuentoONP),
      totalFinal: Math.round(totalFinal)
    };

    setResultado(calculo);
    if (onCalculo) onCalculo(calculo);
  };

  if (!resultado) {
    return <div className="text-center py-4 text-gray-400">Selecciona empleado y fecha para calcular</div>;
  }

  return (
    <div className="space-y-3">
      {/* Datos base */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-500">Sueldo bruto</div>
          <div className="font-bold">S/ {resultado.sueldoBasico.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-500">Asignación familiar</div>
          <div className="font-bold">S/ {resultado.asignacionFamiliar.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-500">Comodato</div>
          <div className="font-bold">S/ {resultado.comodato.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs text-gray-500">Total mensual</div>
          <div className="font-bold text-blue-600">S/ {resultado.sueldoTotal.toLocaleString()}</div>
        </div>
      </div>

      {/* Tiempo trabajado */}
      <div className="border-t pt-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-xs text-gray-500">Años trabajados</div>
            <div className="font-medium">{resultado.añosTrabajados.toFixed(2)} años</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Meses trabajados</div>
            <div className="font-medium">{resultado.mesesTrabajados} meses</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Días laborados (mes cese)</div>
            <div className="font-medium">{resultado.diasLaborados} días</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Remuneración del mes</div>
            <div className="font-medium">S/ {resultado.remuneracionDelMes.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Beneficios sociales */}
      <div className="bg-green-50 p-3 rounded-lg space-y-1">
        <div className="flex justify-between text-sm">
          <span>Vacaciones truncas (30 días/año)</span>
          <span className="font-bold">S/ {resultado.vacacionesTruncas.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Gratificaciones truncas (Jul/Dic)</span>
          <span className="font-bold">S/ {resultado.gratificacionesTruncas.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>CTS trunca (1 sueldo/año)</span>
          <span className="font-bold">S/ {resultado.ctsTrunca.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Bonificación por motivo</span>
          <span className="font-bold">S/ {resultado.bonificacion.toLocaleString()}</span>
        </div>
        <div className="border-t pt-1 mt-1 flex justify-between font-bold">
          <span>Total liquidación bruta</span>
          <span className="text-green-700">S/ {resultado.totalLiquidacion.toLocaleString()}</span>
        </div>
      </div>

      {/* Descuentos AFP/ONP */}
      {(resultado.descuentoAFP > 0 || resultado.descuentoONP > 0) && (
        <div className="bg-red-50 p-3 rounded-lg space-y-1">
          {resultado.afpComision > 0 && (
            <div className="flex justify-between text-sm">
              <span>AFP - Comisión (10%)</span>
              <span className="text-red-600">- S/ {resultado.afpComision.toLocaleString()}</span>
            </div>
          )}
          {resultado.afpPrima > 0 && (
            <div className="flex justify-between text-sm">
              <span>AFP - Prima seguro (1.7%)</span>
              <span className="text-red-600">- S/ {resultado.afpPrima.toLocaleString()}</span>
            </div>
          )}
          {resultado.descuentoONP > 0 && (
            <div className="flex justify-between text-sm">
              <span>ONP (13%)</span>
              <span className="text-red-600">- S/ {resultado.descuentoONP.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t pt-1 mt-1 flex justify-between font-bold">
            <span>Total neto a pagar</span>
            <span className="text-red-700">S/ {resultado.totalFinal.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}