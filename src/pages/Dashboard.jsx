import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [metricas, setMetricas] = useState({
    ventasHoy: 0,
    ventasMes: 0,
    inscritosHoy: 0,
    inscritosMes: 0,
    puntoEquilibrio: 0,
    margen: 0,
  });
  const [rankingProgramas, setRankingProgramas] = useState([]);
  const [actividadReciente, setActividadReciente] = useState([]);
  const [ventasPorDiaSemana, setVentasPorDiaSemana] = useState([]);
  const [ventasMensuales, setVentasMensuales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const COLORS = ['#185FA5', '#7eb3f5', '#11284e'];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const primerDiaMes = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-01';
    const ultimoDiaMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    // Ventas del día y del mes (igual que antes)
    const { data: pagosHoy } = await supabase.from('pagos').select('monto').gte('created_at', hoy);
    const ventasHoy = pagosHoy?.reduce((s, p) => s + p.monto, 0) || 0;
    const { data: pagosMes } = await supabase.from('pagos').select('monto').gte('created_at', primerDiaMes).lte('created_at', ultimoDiaMes);
    const ventasMes = pagosMes?.reduce((s, p) => s + p.monto, 0) || 0;

    // Inscripciones
    const { count: inscritosHoy } = await supabase.from('inscripciones').select('*', { count: 'exact', head: true }).gte('created_at', hoy);
    const { count: inscritosMes } = await supabase.from('inscripciones').select('*', { count: 'exact', head: true }).gte('created_at', primerDiaMes).lte('created_at', ultimoDiaMes);

    // Egresos (planilla + locadores)
    const { data: empleados } = await supabase.from('empleados').select('sueldo_total').eq('estado', 'activo');
    const gastoPlanilla = empleados?.reduce((s, e) => s + (e.sueldo_total || 0), 0) || 0;
    const { data: locadores } = await supabase.from('locadores').select('sueldo_base').eq('estado', 'activo');
    const gastoLocadores = locadores?.reduce((s, l) => s + (l.sueldo_base || 0), 0) || 0;
    const egresosTotales = gastoPlanilla + gastoLocadores;
    const puntoEquilibrio = ventasMes - egresosTotales;
    const margen = ventasMes > 0 ? (puntoEquilibrio / ventasMes) * 100 : 0;

    // Ranking por programa
    const { data: inscripcionesConPagos } = await supabase.from('inscripciones').select('tipo, monto_total').gte('created_at', primerDiaMes).lte('created_at', ultimoDiaMes);
    const ranking = {};
    inscripcionesConPagos?.forEach(ins => { const tipo = ins.tipo || 'otro'; ranking[tipo] = (ranking[tipo] || 0) + (ins.monto_total || 0); });
    setRankingProgramas(Object.entries(ranking).map(([name, value]) => ({ name, value })));

    // Actividad reciente
    const { data: ultimosPagos } = await supabase
      .from('pagos')
      .select(`monto, created_at, inscripciones ( programa, participantes (nombre, apellido) )`)
      .order('created_at', { ascending: false })
      .limit(5);
    setActividadReciente(ultimosPagos || []);

    // NUEVO: Ventas por día de la semana (últimos 30 días)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const fechaInicio30 = hace30Dias.toISOString().split('T')[0];
    const { data: pagos30dias } = await supabase
      .from('pagos')
      .select('monto, created_at')
      .gte('created_at', fechaInicio30);
    const ventasPorDia = [0, 0, 0, 0, 0, 0, 0]; // Dom=0, Lun=1, ..., Sáb=6
    pagos30dias?.forEach(p => {
      const diaSemana = new Date(p.created_at).getDay(); // 0 domingo
      ventasPorDia[diaSemana] += p.monto;
    });
    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    setVentasPorDiaSemana(diasNombres.map((nombre, idx) => ({ dia: nombre, ventas: ventasPorDia[idx] })));

    // NUEVO: Ventas mensuales (últimos 12 meses)
    const hoyDate = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(hoyDate.getFullYear(), hoyDate.getMonth() - i, 1);
      const mesInicio = fecha.toISOString().split('T')[0];
      const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0];
      const { data: pagosMesHistorico } = await supabase
        .from('pagos')
        .select('monto')
        .gte('created_at', mesInicio)
        .lte('created_at', mesFin);
      const total = pagosMesHistorico?.reduce((s, p) => s + p.monto, 0) || 0;
      meses.push({ mes: fecha.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }), ventas: total });
    }
    setVentasMensuales(meses);

    setMetricas({ ventasHoy, ventasMes, inscritosHoy: inscritosHoy || 0, inscritosMes: inscritosMes || 0, puntoEquilibrio, margen });
    setCargando(false);
  };

  if (cargando) return <div className="text-center py-10">Cargando datos...</div>;

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div className="erp-welcome">
        <div>
          <h2>Buenos días, Lic. Flores</h2>
          <p>Resumen ejecutivo · {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="erp-metric">
          <div className="erp-metric-label">Ventas del día</div>
          <div className="erp-metric-value">S/ {metricas.ventasHoy.toLocaleString()}</div>
        </div>
        <div className="erp-metric">
          <div className="erp-metric-label">Ventas del mes</div>
          <div className="erp-metric-value">S/ {metricas.ventasMes.toLocaleString()}</div>
        </div>
        <div className="erp-metric">
          <div className="erp-metric-label">Inscripciones hoy</div>
          <div className="erp-metric-value">{metricas.inscritosHoy}</div>
        </div>
        <div className="erp-metric">
          <div className="erp-metric-label">Inscripciones mes</div>
          <div className="erp-metric-value">{metricas.inscritosMes}</div>
        </div>
      </div>

      {/* Punto de equilibrio y ranking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="erp-metric">
          <div className="erp-metric-label">Punto de equilibrio (mes)</div>
          <div className={`erp-metric-value ${metricas.puntoEquilibrio >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            S/ {metricas.puntoEquilibrio.toLocaleString()}
          </div>
          <div>Margen: {metricas.margen.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-2">Ingresos - (Planilla + Locadores)</div>
        </div>
        <div className="erp-metric">
          <div className="erp-metric-label">Ranking de ventas por programa</div>
          {rankingProgramas.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={rankingProgramas} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50} label>
                  {rankingProgramas.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-center py-4 text-gray-400">Sin datos</div>}
        </div>
      </div>

      {/* Gráficos de ventas por día de semana y mensuales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="erp-card p-4">
          <div className="erp-card-head">
            <div className="erp-card-title">Ventas por día de la semana (últimos 30 días)</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ventasPorDiaSemana}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip formatter={(value) => `S/ ${value}`} />
              <Bar dataKey="ventas" fill="#185FA5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="erp-card p-4">
          <div className="erp-card-head">
            <div className="erp-card-title">Tendencia de ventas (últimos 12 meses)</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ventasMensuales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => `S/ ${value}`} />
              <Line type="monotone" dataKey="ventas" stroke="#185FA5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="erp-card p-4">
        <div className="erp-card-head">
          <div className="erp-card-title">Actividad reciente</div>
        </div>
        <div className="space-y-2">
          {actividadReciente.map((act, idx) => (
            <div key={idx} className="flex justify-between items-center border-b pb-2">
              <div>
                <div className="font-medium">{act.inscripciones?.participantes?.nombre} {act.inscripciones?.participantes?.apellido}</div>
                <div className="text-xs text-gray-400">{act.inscripciones?.programa}</div>
              </div>
              <div className="font-bold text-green-700">S/ {act.monto}</div>
            </div>
          ))}
          {actividadReciente.length === 0 && <div className="text-center text-gray-400">Sin actividad reciente</div>}
        </div>
      </div>
    </div>
  );
}