import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabLiquidacion() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(null);

  const cargarLiquidaciones = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ceses')
      .select('*, empleados(nombre, apellido, cargo, area)')
      .not('monto_liquidacion', 'is', null)
      .order('fecha_cese', { ascending: false });
    setLiquidaciones(data || []);
    setLoading(false);
  };

  useEffect(() => {
    cargarLiquidaciones();
  }, []);

  const getMotivoLabel = (motivo) => {
    const motivos = {
      renuncia_voluntaria: 'Renuncia voluntaria',
      despido: 'Despido',
      jubilacion: 'Jubilación',
      fin_contrato: 'Fin de contrato',
      fallecimiento: 'Fallecimiento',
      otros: 'Otros'
    };
    return motivos[motivo] || motivo;
  };

  const getMotivoColor = (motivo) => {
    switch(motivo) {
      case 'renuncia_voluntaria': return 'bg-blue-100 text-blue-800';
      case 'despido': return 'bg-red-100 text-red-800';
      case 'jubilacion': return 'bg-green-100 text-green-800';
      case 'fin_contrato': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800">Historial de Liquidaciones de Beneficios Sociales</h2>
        <p className="text-xs text-gray-500">Registro de ceses con cálculo automático de liquidación</p>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
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
              <tr><td colSpan="7" className="p-8 text-center text-gray-400">Cargando...</td></tr>
            ) : liquidaciones.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-400">No hay liquidaciones registradas</td></tr>
            ) : (
              liquidaciones.map(liq => (
                <tr key={liq.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{liq.empleado_nombre}</td>
                  <td className="p-3">{liq.cargo}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getMotivoColor(liq.motivo)}`}>
                      {getMotivoLabel(liq.motivo)}
                    </span>
                  </td>
                  <td className="p-3">{liq.fecha_cese}</td>
                  <td className="p-3 font-bold text-green-700">S/ {liq.monto_liquidacion?.toLocaleString() || '—'}</td>
                  <td className="p-3">
                    {liq.beneficios_pagados ? (
                      <span className="text-green-600">✓ Pagados</span>
                    ) : (
                      <span className="text-red-400">Pendiente</span>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setModalDetalle(liq)}
                      className="text-[#185FA5] text-xs border border-[#185FA5] px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle de liquidación */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b">
              <h3 className="text-xl font-bold text-gray-800">Detalle de Liquidación</h3>
              <button onClick={() => setModalDetalle(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              {/* Datos del empleado */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Empleado:</span> <span className="font-medium">{modalDetalle.empleado_nombre}</span></div>
                <div><span className="text-gray-500">Cargo:</span> <span className="font-medium">{modalDetalle.cargo}</span></div>
                <div><span className="text-gray-500">Área:</span> <span className="font-medium">{modalDetalle.area}</span></div>
                <div><span className="text-gray-500">Motivo:</span> <span className="font-medium">{getMotivoLabel(modalDetalle.motivo)}</span></div>
                <div><span className="text-gray-500">Fecha de cese:</span> <span className="font-medium">{modalDetalle.fecha_cese}</span></div>
                <div><span className="text-gray-500">Último día trabajado:</span> <span className="font-medium">{modalDetalle.ultimo_dia_trabajado || '—'}</span></div>
              </div>

              {/* Detalle del cálculo */}
              {modalDetalle.detalle_liquidacion ? (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-gray-700">📊 Desglose del cálculo</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Sueldo bruto:</span> S/ {modalDetalle.detalle_liquidacion.sueldoBasico?.toLocaleString()}</div>
                    <div><span className="text-gray-500">Asignación familiar:</span> S/ {modalDetalle.detalle_liquidacion.asignacionFamiliar?.toLocaleString()}</div>
                    <div><span className="text-gray-500">Comodato:</span> S/ {modalDetalle.detalle_liquidacion.comodato?.toLocaleString()}</div>
                    <div><span className="text-gray-500">Años trabajados:</span> {modalDetalle.detalle_liquidacion.añosTrabajados?.toFixed(2)}</div>
                    <div><span className="text-gray-500">Días laborados (mes):</span> {modalDetalle.detalle_liquidacion.diasLaborados}</div>
                    <div><span className="text-gray-500">Remuneración del mes:</span> S/ {modalDetalle.detalle_liquidacion.remuneracionDelMes?.toLocaleString()}</div>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span>Vacaciones truncas:</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.vacacionesTruncas?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gratificaciones truncas:</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.gratificacionesTruncas?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>CTS trunca:</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.ctsTrunca?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bonificación:</span>
                      <span>S/ {modalDetalle.detalle_liquidacion.bonificacion?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t mt-2">
                      <span>Total bruto:</span>
                      <span className="text-green-700">S/ {modalDetalle.detalle_liquidacion.totalLiquidacion?.toLocaleString()}</span>
                    </div>
                    {(modalDetalle.detalle_liquidacion.descuentoAFP > 0 || modalDetalle.detalle_liquidacion.descuentoONP > 0) && (
                      <>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Descuento AFP/ONP:</span>
                          <span>- S/ {(modalDetalle.detalle_liquidacion.descuentoAFP + modalDetalle.detalle_liquidacion.descuentoONP).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold pt-2 border-t">
                          <span>Total neto a pagar:</span>
                          <span className="text-red-700">S/ {modalDetalle.detalle_liquidacion.totalFinal?.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700 text-sm">
                  No hay detalle de cálculo disponible para esta liquidación (puede ser de versión anterior).
                </div>
              )}

              {modalDetalle.observaciones && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Observaciones</div>
                  <div className="text-sm">{modalDetalle.observaciones}</div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setModalDetalle(null)}
                  className="bg-[#185FA5] text-white px-6 py-2 rounded-lg text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}