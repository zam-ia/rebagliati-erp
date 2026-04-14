import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabLiquidacion() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);

  const cargarLiquidaciones = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('ceses')
      .select(`
        *,
        empleados (
          nombre,
          apellido,
          cargo,
          area
        )
      `)
      .not('monto_liquidacion', 'is', null)
      .order('fecha_cese', { ascending: false });

    if (queryError) {
      console.error('Error al cargar liquidaciones:', queryError);
      setError('No se pudieron cargar las liquidaciones. Intente nuevamente.');
      setLiquidaciones([]);
    } else {
      setLiquidaciones(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    cargarLiquidaciones();
  }, [cargarLiquidaciones]);

  const getMotivoLabel = (motivo) => {
    const motivos = {
      renuncia_voluntaria: 'Renuncia voluntaria',
      despido: 'Despido',
      jubilacion: 'Jubilación',
      fin_contrato: 'Fin de contrato',
      fallecimiento: 'Fallecimiento',
      otros: 'Otros',
    };
    return motivos[motivo] || motivo;
  };

  const getMotivoColor = (motivo) => {
    switch (motivo) {
      case 'renuncia_voluntaria': return 'bg-blue-100 text-blue-800';
      case 'despido': return 'bg-red-100 text-red-800';
      case 'jubilacion': return 'bg-green-100 text-green-800';
      case 'fin_contrato': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const empleadoCompleto = (liq) => {
    const emp = liq.empleados || {};
    return `${emp.nombre || ''} ${emp.apellido || ''}`.trim() || 'Sin nombre';
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Historial de Liquidaciones de Beneficios Sociales
          </h2>
          <p className="text-xs text-gray-500">
            Registro de ceses con cálculo automático de liquidación
          </p>
        </div>

        <button
          onClick={cargarLiquidaciones}
          disabled={loading}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Empleado</th>
              <th className="p-3 text-left">Cargo</th>
              <th className="p-3 text-left">Motivo</th>
              <th className="p-3 text-left">Fecha cese</th>
              <th className="p-3 text-left">Liquidación final</th>
              <th className="p-3 text-left">Beneficios pagados</th>
              <th className="p-3 text-left">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  Cargando liquidaciones…
                </td>
              </tr>
            ) : liquidaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No hay liquidaciones registradas
                </td>
              </tr>
            ) : (
              liquidaciones.map((liq) => {
                const empleado = liq.empleados || {};
                return (
                  <tr key={liq.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{empleadoCompleto(liq)}</td>
                    <td className="p-3">{empleado.cargo || '—'}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getMotivoColor(
                          liq.motivo
                        )}`}
                      >
                        {getMotivoLabel(liq.motivo)}
                      </span>
                    </td>
                    <td className="p-3">{liq.fecha_cese}</td>
                    <td className="p-3 font-bold text-green-700">
                      S/ {liq.monto_liquidacion?.toLocaleString('es-PE') || '—'}
                    </td>
                    <td className="p-3">
                      {liq.beneficios_pagados ? (
                        <span className="text-green-600 font-medium">✓ Pagados</span>
                      ) : (
                        <span className="text-red-400">Pendiente</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setModalDetalle(liq)}
                        className="text-[#185FA5] text-xs border border-[#185FA5] px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle (mejorado) */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Detalle de Liquidación</h3>
              <button
                onClick={() => setModalDetalle(null)}
                className="text-3xl leading-none text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-73px)] space-y-6">
              {/* Datos del empleado */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500 block">Empleado</span>
                  <span className="font-medium">{empleadoCompleto(modalDetalle)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Cargo</span>
                  <span className="font-medium">{modalDetalle.empleados?.cargo || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Área</span>
                  <span className="font-medium">{modalDetalle.empleados?.area || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Motivo</span>
                  <span className="font-medium">{getMotivoLabel(modalDetalle.motivo)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Fecha de cese</span>
                  <span className="font-medium">{modalDetalle.fecha_cese}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Último día trabajado</span>
                  <span className="font-medium">{modalDetalle.ultimo_dia_trabajado || '—'}</span>
                </div>
              </div>

              {/* Desglose del cálculo */}
              {modalDetalle.detalle_liquidacion ? (
                <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                  <h4 className="font-bold text-gray-700 flex items-center gap-2">
                    📊 Desglose del cálculo
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>Sueldo bruto: <span className="font-medium">S/ {modalDetalle.detalle_liquidacion.sueldoBasico?.toLocaleString('es-PE')}</span></div>
                    <div>Asignación familiar: <span className="font-medium">S/ {modalDetalle.detalle_liquidacion.asignacionFamiliar?.toLocaleString('es-PE')}</span></div>
                    <div>Comodato: <span className="font-medium">S/ {modalDetalle.detalle_liquidacion.comodato?.toLocaleString('es-PE')}</span></div>
                    <div>Años trabajados: <span className="font-medium">{modalDetalle.detalle_liquidacion.añosTrabajados?.toFixed(2)}</span></div>
                    <div>Días laborados (mes): <span className="font-medium">{modalDetalle.detalle_liquidacion.diasLaborados}</span></div>
                    <div>Remuneración del mes: <span className="font-medium">S/ {modalDetalle.detalle_liquidacion.remuneracionDelMes?.toLocaleString('es-PE')}</span></div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Vacaciones truncas</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.vacacionesTruncas?.toLocaleString('es-PE')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gratificaciones truncas</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.gratificacionesTruncas?.toLocaleString('es-PE')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>CTS trunca</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.ctsTrunca?.toLocaleString('es-PE')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bonificación</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.bonificacion?.toLocaleString('es-PE')}</span>
                    </div>

                    <div className="flex justify-between text-base font-bold border-t pt-3 mt-3">
                      <span>Total bruto</span>
                      <span className="text-green-700">
                        S/ {modalDetalle.detalle_liquidacion.totalLiquidacion?.toLocaleString('es-PE')}
                      </span>
                    </div>

                    {(modalDetalle.detalle_liquidacion.descuentoAFP > 0 || modalDetalle.detalle_liquidacion.descuentoONP > 0) && (
                      <>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Descuento AFP/ONP</span>
                          <span>
                            - S/ {(modalDetalle.detalle_liquidacion.descuentoAFP + modalDetalle.detalle_liquidacion.descuentoONP).toLocaleString('es-PE')}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t pt-3">
                          <span>Total neto a pagar</span>
                          <span className="text-red-700">
                            S/ {modalDetalle.detalle_liquidacion.totalFinal?.toLocaleString('es-PE')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl text-yellow-700 text-sm">
                  No hay detalle de cálculo disponible (versión anterior del registro).
                </div>
              )}

              {modalDetalle.observaciones && (
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Observaciones</div>
                  <p className="text-sm">{modalDetalle.observaciones}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setModalDetalle(null)}
                className="bg-[#185FA5] text-white px-8 py-3 rounded-2xl text-sm font-medium hover:bg-[#144d85] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}