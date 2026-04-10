import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, DollarSign, Users, GraduationCap, Target, Megaphone } from 'lucide-react';

export default function GestionEstrategica() {
  const [metricas, setMetricas] = useState({
    ingresosMes: 0,
    alumnosActivos: 0,
    programasActivos: 0,
    roi: 0
  });
  const [ventasPorPrograma, setVentasPorPrograma] = useState([]);
  const [inscripcionesMensuales, setInscripcionesMensuales] = useState([]);
  const [inversionPublicitaria, setInversionPublicitaria] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const primerDia = `${mesActual}-01`;
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    // Ingresos del mes
    const { data: pagos } = await supabase.from('pagos').select('monto').gte('created_at', primerDia).lte('created_at', ultimoDia);
    const ingresos = pagos?.reduce((s, p) => s + p.monto, 0) || 0;

    // Alumnos activos (inscripciones pagadas)
    const { count: alumnos } = await supabase.from('inscripciones').select('*', { count: 'exact', head: true }).eq('estado', 'pagado');

    // Programas activos (distintos programas con inscripciones en el mes)
    const { data: programasData } = await supabase.from('inscripciones').select('programa').gte('created_at', primerDia).lte('created_at', ultimoDia);
    const programasUnicos = [...new Set(programasData?.map(p => p.programa) || [])];

    // ROI simulado (ingresos / inversion_publicitaria_del_mes)
    const inversionEjemplo = 5000;
    const roi = ingresos > 0 ? ((ingresos - inversionEjemplo) / inversionEjemplo) * 100 : 0;

    setMetricas({
      ingresosMes: ingresos,
      alumnosActivos: alumnos || 0,
      programasActivos: programasUnicos.length,
      roi: Math.round(roi)
    });

    // Ventas por programa (últimos 6 meses)
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const datosProgramas = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString();
      const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1).toISOString();
      const { data: pagosMes } = await supabase.from('pagos').select('monto, inscripciones(tipo)').gte('created_at', mesInicio).lt('created_at', mesFin);
      const porTipo = { diplomado: 0, curso: 0, congreso: 0 };
      pagosMes?.forEach(p => {
        const tipo = p.inscripciones?.tipo;
        if (tipo === 'diplomado') porTipo.diplomado += p.monto;
        else if (tipo === 'curso') porTipo.curso += p.monto;
        else if (tipo === 'congreso') porTipo.congreso += p.monto;
      });
      datosProgramas.push({ mes: meses[5 - i], ...porTipo });
    }
    setVentasPorPrograma(datosProgramas);

    // Inscripciones mensuales (últimos 6 meses)
    const datosInscripciones = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString();
      const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1).toISOString();
      const { count } = await supabase.from('inscripciones').select('*', { count: 'exact', head: true }).gte('created_at', mesInicio).lt('created_at', mesFin);
      datosInscripciones.push({ mes: meses[5 - i], inscripciones: count || 0 });
    }
    setInscripcionesMensuales(datosInscripciones);

    // Inversión publicitaria (datos de ejemplo)
    setInversionPublicitaria([
      { mes: 'Ene', inversion: 4500, ventas: 12000 },
      { mes: 'Feb', inversion: 4800, ventas: 13500 },
      { mes: 'Mar', inversion: 5200, ventas: 14800 },
      { mes: 'Abr', inversion: 5000, ventas: 14200 },
      { mes: 'May', inversion: 5500, ventas: 16500 },
      { mes: 'Jun', inversion: 6000, ventas: 18000 },
    ]);

    setLoading(false);
  };

  if (loading) return <div className="text-center py-10">Cargando datos...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#11284e]">Gestión Estratégica</h1>
          <p className="text-gray-500 text-sm">Supervisión de gerencia, área académica, marketing y ventas</p>
        </div>
        <button onClick={cargarDatos} className="text-sm bg-gray-100 px-3 py-1 rounded-lg">Actualizar</button>
      </div>

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-600">
          <div className="flex items-center justify-between"><div><div className="text-sm text-gray-500">Ingresos del mes</div><div className="text-2xl font-bold">S/ {metricas.ingresosMes.toLocaleString()}</div></div><DollarSign className="text-blue-500" size={32} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-600">
          <div className="flex items-center justify-between"><div><div className="text-sm text-gray-500">Alumnos activos</div><div className="text-2xl font-bold">{metricas.alumnosActivos}</div></div><Users className="text-green-500" size={32} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-purple-600">
          <div className="flex items-center justify-between"><div><div className="text-sm text-gray-500">Programas activos</div><div className="text-2xl font-bold">{metricas.programasActivos}</div></div><GraduationCap className="text-purple-500" size={32} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-600">
          <div className="flex items-center justify-between"><div><div className="text-sm text-gray-500">ROI (retorno inversión)</div><div className="text-2xl font-bold">{metricas.roi}%</div></div><TrendingUp className="text-orange-500" size={32} /></div>
        </div>
      </div>

      {/* Ventas por programa y evolución de inscripciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold mb-4">Ventas por programa (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ventasPorPrograma}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={v => `S/ ${v}`} />
              <Bar dataKey="diplomado" fill="#185FA5" name="Diplomados" />
              <Bar dataKey="curso" fill="#60a5fa" name="Cursos" />
              <Bar dataKey="congreso" fill="#93c5fd" name="Congresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold mb-4">Evolución de inscripciones mensuales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={inscripcionesMensuales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="inscripciones" stroke="#185FA5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inversión publicitaria vs ventas */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4"><Megaphone size={20} className="text-[#185FA5]" /><h3 className="font-bold">Inversión publicitaria vs Ventas</h3></div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={inversionPublicitaria}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Line yAxisId="left" type="monotone" dataKey="inversion" stroke="#f59e0b" name="Inversión (S/)" />
            <Line yAxisId="right" type="monotone" dataKey="ventas" stroke="#185FA5" name="Ventas (S/)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}