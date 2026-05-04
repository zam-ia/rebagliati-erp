// src/pages/rrhh/CalculoLiquidacion.jsx
import { useMemo } from 'react';

function mesesCompletos(fechaInicio, fechaFin) {
  const ini = new Date(fechaInicio + 'T12:00:00');
  const fin = new Date(fechaFin + 'T12:00:00');
  const diff =
    (fin.getFullYear() - ini.getFullYear()) * 12 +
    (fin.getMonth() - ini.getMonth());
  const diaIni = ini.getDate();
  const diaFin = fin.getDate();
  const ultimoDiaFin = new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate();
  return diaFin >= diaIni || diaFin === ultimoDiaFin ? diff + 1 : diff;
}

export default function useCalculoLiquidacion({
  empleado,
  fechaCese,
  fechaInicioPlanilla,
  ultimaGratificacion
}) {
  const calculo = useMemo(() => {
    if (!empleado || !fechaCese) return null;

    const sueldoBruto = Number(empleado.sueldo_bruto || empleado.sueldo_total || 0);
    const asignacionFamiliar = Number(empleado.asignacion_familiar || 0);
    const sistemaPensionario = empleado.sistema_pensionario || '';

    const fechaIngresoEfectiva = fechaInicioPlanilla || empleado.fecha_inicio;
    const fechaCeseObj = new Date(fechaCese + 'T12:00:00');
    const fechaIngresoObj = fechaIngresoEfectiva ? new Date(fechaIngresoEfectiva + 'T12:00:00') : new Date();
    const anioCese = fechaCeseObj.getFullYear();
    const mesCese = fechaCeseObj.getMonth();

    const RC_SIN_GRAT = sueldoBruto + asignacionFamiliar;
    const baseGrat = RC_SIN_GRAT / 2;

    // ---- 1. Promedio de gratificación (1/6) ----
    let promedioGratificacionCTS;

    if (ultimaGratificacion != null && ultimaGratificacion !== '' && Number(ultimaGratificacion) > 0) {
      promedioGratificacionCTS = Number(ultimaGratificacion);
    } else {
      let inicioSemGrat, finSemGrat;
      if (mesCese <= 5) {
        inicioSemGrat = new Date(anioCese - 1, 6, 1);
        finSemGrat = new Date(anioCese - 1, 11, 31);
      } else {
        inicioSemGrat = new Date(anioCese, 0, 1);
        finSemGrat = new Date(anioCese, 5, 30);
      }

      const fechaInicioSem = fechaIngresoObj > inicioSemGrat ? fechaIngresoObj : inicioSemGrat;
      const mesesEnSem = Math.min(6, mesesCompletos(
        fechaInicioSem.toISOString().slice(0, 10),
        finSemGrat.toISOString().slice(0, 10)
      ));

      const gratPrincipalSem = (baseGrat / 6) * mesesEnSem;
      const bonifExtraSem = gratPrincipalSem * 0.09;
      const gratTotalSem = gratPrincipalSem + bonifExtraSem;
      promedioGratificacionCTS = gratTotalSem / 6;
    }

    // ---- 2. CTS Trunca ----
    const inicioPeriodoCTS = new Date(anioCese - 1, 10, 1);
    const fechaInicioCTS = fechaIngresoObj > inicioPeriodoCTS ? fechaIngresoObj : inicioPeriodoCTS;
    const mesesCTS = mesesCompletos(
      fechaInicioCTS.toISOString().slice(0, 10),
      fechaCese
    );

    const RC_CTS = sueldoBruto + asignacionFamiliar + promedioGratificacionCTS;
    const baseCTS = RC_CTS / 2;
    const ctsTrunca = (baseCTS / 12) * mesesCTS;

    // ---- 3. Vacaciones Truncas ----
    const mesesVac = Math.min(12, mesesCompletos(fechaIngresoEfectiva, fechaCese));
    const baseVac = RC_SIN_GRAT / 2;
    const vacacionesBruto = (baseVac / 12) * mesesVac;

    let retencionVac = 0;
    if (sistemaPensionario && sistemaPensionario !== 'ONP') {
      retencionVac = vacacionesBruto * 0.1137;
    } else if (sistemaPensionario === 'ONP') {
      retencionVac = vacacionesBruto * 0.13;
    }
    const vacacionesNeto = vacacionesBruto - retencionVac;

    // ---- 4. Gratificaciones Truncas ----
    const inicioPeriodoGrat = new Date(anioCese, 0, 1);
    const fechaInicioGrat = fechaIngresoObj > inicioPeriodoGrat ? fechaIngresoObj : inicioPeriodoGrat;
    const mesesGrat = Math.min(6, mesesCompletos(
      fechaInicioGrat.toISOString().slice(0, 10),
      fechaCese
    ));
    const gratificacionPrincipal = (baseGrat / 6) * mesesGrat;
    const bonificacionExtra = gratificacionPrincipal * 0.09;
    const totalGratificaciones = gratificacionPrincipal + bonificacionExtra;

    const bonificacionEspecial = 0;

    const totalFinal = ctsTrunca + vacacionesNeto + totalGratificaciones + bonificacionEspecial;

    return {
      sueldoBruto,
      asignacionFamiliar,
      fechaIngreso: fechaIngresoEfectiva,
      RC_SIN_GRAT,
      RC_CTS,
      baseCTS,
      baseVac,
      baseGrat,
      mesesCTS,
      mesesVac,
      mesesGrat,
      promedioGratificacionCTS, // número sin formatear
      ctsTrunca: ctsTrunca.toFixed(2),
      vacacionesBruto: vacacionesBruto.toFixed(2),
      retencionVac: retencionVac.toFixed(2),
      vacacionesNeto: vacacionesNeto.toFixed(2),
      gratificacionPrincipal: gratificacionPrincipal.toFixed(2),
      bonificacionExtra: bonificacionExtra.toFixed(2),
      totalGratificaciones: totalGratificaciones.toFixed(2),
      bonificacionEspecial: bonificacionEspecial.toFixed(2),
      totalFinal: totalFinal.toFixed(2),
    };
  }, [empleado, fechaCese, fechaInicioPlanilla, ultimaGratificacion]);

  return calculo;
}