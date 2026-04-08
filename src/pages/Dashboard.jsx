import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const [metricas, setMetricas] = useState({
    ingresosMes: 0,
    inscritosMes: 0,
    tasaCobro: 0,
    reclamosResueltos: 0,
  });
  const [ventasPorPrograma, setVentasPorPrograma] = useState([]);
  const [actividadReciente, setActividadReciente] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const primerDia = `${mesActual}-01`;
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);

    // 1. Ingresos del mes (pagos)
    const { data: pagosMes } = await supabase
      .from('pagos')
      .select('monto')
      .gte('created_at', primerDia)
      .lte('created_at', ultimoDia);
    const ingresos = pagosMes?.reduce((sum, p) => sum + p.monto, 0) || 0;

    // 2. Inscripciones del mes
    const { count: inscritos } = await supabase
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', primerDia)
      .lte('created_at', ultimoDia);

    // 3. Reclamos resueltos del mes (porcentaje)
    const { count: resueltos } = await supabase
      .from('reclamos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'resuelto')
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);
    const { count: totalReclamos } = await supabase
      .from('reclamos')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);
    const porcentajeResueltos = totalReclamos ? Math.round((resueltos / totalReclamos) * 100) : 0;

    // 4. Tasa de cobro (simulada: pagos / facturas, por ahora usamos placeholder 84%)
    // En un sistema completo, se podría calcular como total pagado / total facturado en el mes.
    const tasaCobro = 84; // Ajustable después

    setMetricas({
      ingresosMes: ingresos,
      inscritosMes: inscritos || 0,
      tasaCobro,
      reclamosResueltos: porcentajeResueltos,
    });

    // 5. Ventas por programa (cantidad de inscripciones por tipo)
    const { data: programas } = await supabase
      .from('inscripciones')
      .select('tipo')
      .gte('created_at', primerDia)
      .lte('created_at', ultimoDia);
    const conteo = { diplomado: 0, curso: 0, congreso: 0 };
    programas?.forEach(p => {
      if (p.tipo === 'diplomado') conteo.diplomado++;
      else if (p.tipo === 'curso') conteo.curso++;
      else if (p.tipo === 'congreso') conteo.congreso++;
    });
    setVentasPorPrograma([
      { name: 'Diplomados', value: conteo.diplomado },
      { name: 'Cursos', value: conteo.curso },
      { name: 'Congresos', value: conteo.congreso },
    ]);

    // 6. Actividad reciente (últimas 5 inscripciones)
    const { data: ultimas } = await supabase
      .from('inscripciones')
      .select('id, programa, created_at, participantes(nombre, apellido)')
      .order('created_at', { ascending: false })
      .limit(5);
    setActividadReciente(ultimas || []);

    setCargando(false);
  };

  const COLORS = ['#185FA5', '#7eb3f5', '#11284e'];

  if (cargando) {
    return <div className="text-center py-10">Cargando datos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Saludo estilo ejecutivo */}
      <div className="erp-welcome">
        <div>
          <h2>Buenos días, Lic. Flores</h2>
          <p>Aquí está el resumen del día · {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="erp-metric">
          <div className="erp-metric-label">Ingresos del mes</div>
          <div className="erp-metric-value">S/ {metricas.ingresosMes.toLocaleString()}</div>
          <div className="erp-metric-delta text-green-600">↑ 18% vs mes anterior</div>
          <div className="erp-metric-bar"><div className="erp-metric-fill" style={{ width: '82%' }} /></div>
        </div>
        <div className="erp-metric">
          <div className="erp-metric-label">Total inscritos</div>
          <div className="erp-metric-value">{metricas.inscritosMes}</div>
          <div className="erp-metric-delta text-gray-500">nuevos</div>
          <div className="erp-metric-bar"><div className="erp-metric-fill" style={{ width: '65%' }} /></div>
        </div>
        <div className="erp-metric">
          <div className="erp-metric-label">Tasa de cobro</div>
          <div className="erp-metric-value">{metricas.tasaCobro}%</div>
          <div className="erp-metric-delta text-red-500">↓ 3% vs meta</div>
          <div className="erp-metric-bar"><div className="erp-metric-fill" style={{ width: metricas.tasaCobro }} /></div>
        </div>
        <div className="erp-metric">
          <div className="erp-metric-label">Reclamos resueltos</div>
          <div className="erp-metric-value">{metricas.reclamosResueltos}%</div>
          <div className="erp-metric-delta text-green-600">↑ en plazo</div>
          <div className="erp-metric-bar"><div className="erp-metric-fill" style={{ width: metricas.reclamosResueltos }} /></div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="erp-card p-4">
          <div className="erp-card-head">
            <div className="erp-card-title">Ventas por programa</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={ventasPorPrograma}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {ventasPorPrograma.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="erp-card p-4">
          <div className="erp-card-head">
            <div className="erp-card-title">Actividad reciente</div>
            <div className="erp-card-action">Ver todo</div>
          </div>
          <div className="space-y-3">
            {actividadReciente.map(act => (
              <div key={act.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{act.participantes?.nombre} {act.participantes?.apellido}</div>
                  <div className="text-xs text-gray-400">{act.programa}</div>
                </div>
                <span className="badge badge-blue">nuevo</span>
              </div>
            ))}
            {actividadReciente.length === 0 && (
              <div className="text-center text-gray-400 py-4">Sin actividad reciente</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}