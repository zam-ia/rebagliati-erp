import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [metricas, setMetricas] = useState({
    ingresosDia: 0,
    inscripcionesDia: 0,
    reclamosAbiertos: 0,
    asistenciaHoy: 0
  });
  const [ingresosMensuales, setIngresosMensuales] = useState([]);
  const [ultimosPagos, setUltimosPagos] = useState([]);
  const [eventosProximos, setEventosProximos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    
    const hoy = new Date().toISOString().split('T')[0];
    
    // Ingresos del día
    const { data: pagosHoy } = await supabase
      .from('pagos')
      .select('monto')
      .gte('created_at', hoy);
    
    const ingresosDia = pagosHoy?.reduce((sum, p) => sum + p.monto, 0) || 0;
    
    // Inscripciones del día
    const { count: inscripcionesDia } = await supabase
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hoy);
    
    // Reclamos abiertos
    const { count: reclamosAbiertos } = await supabase
      .from('reclamos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'abierto');
    
    // Asistencia de hoy
    const { count: asistenciaHoy } = await supabase
      .from('asistencia')
      .select('*', { count: 'exact', head: true })
      .eq('fecha', hoy);
    
    setMetricas({
      ingresosDia,
      inscripcionesDia: inscripcionesDia || 0,
      reclamosAbiertos: reclamosAbiertos || 0,
      asistenciaHoy: asistenciaHoy || 0
    });
    
    // Ingresos últimos 6 meses
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const datosMensuales = [];
    
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString();
      const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1).toISOString();
      
      const { data: pagosMes } = await supabase
        .from('pagos')
        .select('monto')
        .gte('created_at', mesInicio)
        .lt('created_at', mesFin);
      
      const total = pagosMes?.reduce((sum, p) => sum + p.monto, 0) || 0;
      datosMensuales.push({ mes: meses[5 - i], ingresos: total });
    }
    setIngresosMensuales(datosMensuales);
    
    // Últimos 5 pagos
    const { data: pagosRecientes } = await supabase
      .from('pagos')
      .select(`
        id,
        monto,
        metodo_pago,
        created_at,
        inscripciones (
          programa,
          estado
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    setUltimosPagos(pagosRecientes || []);
    
    // Eventos próximos (inscripciones con fecha de evento en el futuro)
    const { data: eventos } = await supabase
      .from('inscripciones')
      .select('programa, fecha_evento, estado')
      .gte('fecha_evento', hoy)
      .order('fecha_evento', { ascending: true })
      .limit(5);
    
    setEventosProximos(eventos || []);
    setCargando(false);
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Ejecutivo</h1>
      
      {/* Tarjetas métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary" style={{ borderLeftColor: '#185FA5' }}>
          <div className="text-gray-500 text-sm mb-1">Ingresos del día</div>
          <div className="text-2xl font-bold text-gray-800">S/ {metricas.ingresosDia.toFixed(2)}</div>
          <div className="text-green-500 text-sm mt-2">💰 Total recaudado</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="text-gray-500 text-sm mb-1">Inscripciones del día</div>
          <div className="text-2xl font-bold text-gray-800">{metricas.inscripcionesDia}</div>
          <div className="text-blue-500 text-sm mt-2">📝 Nuevos registros</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="text-gray-500 text-sm mb-1">Reclamos abiertos</div>
          <div className="text-2xl font-bold text-gray-800">{metricas.reclamosAbiertos}</div>
          <div className="text-red-500 text-sm mt-2">⚠️ Pendientes atender</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="text-gray-500 text-sm mb-1">Asistencia hoy</div>
          <div className="text-2xl font-bold text-gray-800">{metricas.asistenciaHoy}</div>
          <div className="text-gray-500 text-sm mt-2">👥 Personal presente</div>
        </div>
      </div>
      
      {/* Gráfico de ingresos */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Ingresos últimos 6 meses</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ingresosMensuales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value) => `S/ ${value}`} />
            <Legend />
            <Bar dataKey="ingresos" fill="#185FA5" name="Ingresos (S/)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Últimos pagos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Últimos pagos registrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Programa</th>
                  <th className="text-left p-2">Monto</th>
                  <th className="text-left p-2">Método</th>
                  <th className="text-left p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimosPagos.map((pago) => (
                  <tr key={pago.id} className="border-t">
                    <td className="p-2">{pago.inscripciones?.programa || '-'}</td>
                    <td className="p-2">S/ {pago.monto}</td>
                    <td className="p-2">{pago.metodo_pago}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        pago.inscripciones?.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                        pago.inscripciones?.estado === 'parcial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {pago.inscripciones?.estado || 'pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
                {ultimosPagos.length === 0 && (
                  <tr><td colSpan="4" className="text-center p-4 text-gray-500">No hay pagos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Eventos próximos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Eventos próximos</h2>
          <div className="space-y-3">
            {eventosProximos.map((evento, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">{evento.programa}</div>
                  <div className="text-sm text-gray-500">
                    {evento.fecha_evento ? new Date(evento.fecha_evento).toLocaleDateString() : 'Fecha por definir'}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  evento.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                  evento.estado === 'parcial' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {evento.estado}
                </span>
              </div>
            ))}
            {eventosProximos.length === 0 && (
              <div className="text-center p-4 text-gray-500">No hay eventos próximos</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;