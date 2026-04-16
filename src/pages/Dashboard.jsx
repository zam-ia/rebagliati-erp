import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Calendar, Award } from 'lucide-react';

export default function Dashboard() {
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
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
  
  // Paleta de colores VIP (Azul corporativo a tonos celestes)
  const COLORS = ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

  // Formateador de moneda profesional
  const formatSoles = (monto) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto);
  };

  useEffect(() => {
    const fetchPerfil = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('nombre')
          .eq('id', session.user.id)
          .single();
        if (perfil?.nombre) {
          // Capitalizar la primera letra para que se vea elegante
          const nombreCapitalizado = perfil.nombre.charAt(0).toUpperCase() + perfil.nombre.slice(1);
          setNombreUsuario(nombreCapitalizado);
        }
      }
    };

    fetchPerfil();
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const primerDiaMes = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-01';
    const ultimoDiaMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    // Ventas del día y del mes
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
    inscripcionesConPagos?.forEach(ins => { 
      const tipo = ins.tipo || 'General'; 
      ranking[tipo] = (ranking[tipo] || 0) + (ins.monto_total || 0); 
    });
    setRankingProgramas(Object.entries(ranking).map(([name, value]) => ({ name, value })));

    // Actividad reciente
    const { data: ultimosPagos } = await supabase
      .from('pagos')
      .select(`monto, created_at, inscripciones ( programa, participantes (nombre, apellido) )`)
      .order('created_at', { ascending: false })
      .limit(5);
    setActividadReciente(ultimosPagos || []);

    // Ventas por día de la semana (últimos 30 días)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const fechaInicio30 = hace30Dias.toISOString().split('T')[0];
    const { data: pagos30dias } = await supabase.from('pagos').select('monto, created_at').gte('created_at', fechaInicio30);
    
    const ventasPorDia = [0, 0, 0, 0, 0, 0, 0];
    pagos30dias?.forEach(p => {
      const diaSemana = new Date(p.created_at).getDay();
      ventasPorDia[diaSemana] += p.monto;
    });
    const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    setVentasPorDiaSemana(diasNombres.map((nombre, idx) => ({ dia: nombre, ventas: ventasPorDia[idx] })));

    // Ventas mensuales (últimos 12 meses)
    const hoyDate = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(hoyDate.getFullYear(), hoyDate.getMonth() - i, 1);
      const mesInicio = fecha.toISOString().split('T')[0];
      const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0];
      const { data: pagosMesHistorico } = await supabase.from('pagos').select('monto').gte('created_at', mesInicio).lte('created_at', mesFin);
      const total = pagosMesHistorico?.reduce((s, p) => s + p.monto, 0) || 0;
      meses.push({ mes: fecha.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''), ventas: total });
    }
    setVentasMensuales(meses);

    setMetricas({ ventasHoy, ventasMes, inscritosHoy: inscritosHoy || 0, inscritosMes: inscritosMes || 0, puntoEquilibrio, margen });
    setCargando(false);
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Sincronizando datos...</p>
      </div>
    );
  }

  const fechaActual = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8 p-2">
      {/* Saludo Premium con Gradiente */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Buenos días, {nombreUsuario}</h2>
          <p className="text-blue-100 flex items-center gap-2">
            <Calendar size={16} /> Resumen ejecutivo · {fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1)}
          </p>
        </div>
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
      </div>

      {/* Métricas Principales - Estilo Tarjetas VIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas del día</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatSoles(metricas.ventasHoy)}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600"><DollarSign size={24} /></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas del mes</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatSoles(metricas.ventasMes)}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={24} /></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Inscripciones Hoy</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{metricas.inscritosHoy}</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Users size={24} /></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Inscripciones Mes</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{metricas.inscritosMes}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><Award size={24} /></div>
          </div>
        </div>
      </div>

      {/* Punto de equilibrio y Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-600"/> Salud Financiera
          </h3>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Punto de Equilibrio (Mes)</p>
              <p className={`text-3xl font-bold ${metricas.puntoEquilibrio >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatSoles(metricas.puntoEquilibrio)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Ingresos vs (Planilla + Locadores)</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Margen de Rentabilidad</span>
                <span className="text-sm font-bold text-gray-900">{metricas.margen.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${metricas.margen > 30 ? 'bg-green-500' : metricas.margen > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                  style={{ width: `${Math.min(Math.max(metricas.margen, 0), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Ranking de Ventas por Programa</h3>
          {rankingProgramas.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={rankingProgramas} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {rankingProgramas.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatSoles(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-40 items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">Sin datos suficientes</div>
          )}
        </div>
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Tráfico Semanal (Últimos 30 días)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ventasPorDiaSemana}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `S/${value/1000}k`} />
              <Tooltip cursor={{fill: '#f3f4f6'}} formatter={(value) => formatSoles(value)} />
              <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Crecimiento Anual</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ventasMensuales}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, textTransform: 'capitalize'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `S/${value/1000}k`} />
              <Tooltip formatter={(value) => formatSoles(value)} />
              <Line type="monotone" dataKey="ventas" stroke="#1e3a8a" strokeWidth={3} dot={{r: 4, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Transacciones Recientes</h3>
        <div className="divide-y divide-gray-100">
          {actividadReciente.map((act, idx) => (
            <div key={idx} className="py-3 flex justify-between items-center hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {act.inscripciones?.participantes?.nombre?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{act.inscripciones?.participantes?.nombre} {act.inscripciones?.participantes?.apellido}</div>
                  <div className="text-xs text-gray-500">{act.inscripciones?.programa || 'Programa General'}</div>
                </div>
              </div>
              <div className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-sm">
                {formatSoles(act.monto)}
              </div>
            </div>
          ))}
          {actividadReciente.length === 0 && <div className="text-center py-6 text-gray-400">No hay transacciones registradas hoy</div>}
        </div>
      </div>
    </div>
  );
}