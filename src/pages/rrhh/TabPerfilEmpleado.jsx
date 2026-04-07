import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TabPerfilEmpleado() {
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('Vacaciones');
  
  // Estados de datos
  const [vacaciones, setVacaciones] = useState([]);
  const [descansos, setDescansos] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Modales y formularios
  const [modalAbierto, setModalAbierto] = useState(null);
  const [formVacacion, setFormVacacion] = useState({ fecha_inicio: '', fecha_fin: '', dias_usados: 0 });
  const [formDescanso, setFormDescanso] = useState({ fecha: '', dias: '', diagnostico: '' });
  const [formNovedad, setFormNovedad] = useState({ fecha: '', tardanza: false, justificacion: '' });

  useEffect(() => {
    supabase.from('empleados')
      .select('id, nombre, apellido, cargo, area')
      .order('nombre', { ascending: true })
      .then(({ data }) => setEmpleados(data || []));
  }, []);

  const cargarDatosEmpleado = async (emp) => {
    if (!emp) return;
    setCargando(true);
    const nombreCompleto = `${emp.nombre} ${emp.apellido}`;

    const [vac, des, eva, asis] = await Promise.all([
      supabase.from('vacaciones').select('*').eq('empleado_id', emp.id).order('fecha_inicio', { ascending: false }),
      supabase.from('descansos_medicos').select('*').eq('empleado_id', emp.id).order('fecha', { ascending: false }),
      supabase.from('evaluaciones').select('*').eq('empleado_id', emp.id).order('mes', { ascending: false }),
      supabase.from('asistencia').select('*').eq('empleado_nombre', nombreCompleto).order('fecha', { ascending: false })
    ]);

    setVacaciones(vac.data || []);
    setDescansos(des.data || []);
    setEvaluaciones(eva.data || []);
    setAsistencias(asis.data || []);
    setCargando(false);
  };

  useEffect(() => {
    if (empleadoSeleccionado) cargarDatosEmpleado(empleadoSeleccionado);
  }, [empleadoSeleccionado]);

  // Funciones de inserción (CRUD)
  const agregarRegistro = async (tabla, datos) => {
    const { error } = await supabase.from(tabla).insert([datos]);
    if (error) alert("Error al guardar: " + error.message);
    else {
      setModalAbierto(null);
      cargarDatosEmpleado(empleadoSeleccionado);
    }
  };

  const datosGrafico = evaluaciones
    .slice()
    .reverse()
    .map(e => ({ 
      mes: e.mes ? e.mes.substring(5) : '', 
      puntaje: e.punt_final || 0 
    }));

  return (
    <div className="space-y-6">
      {/* Selector de empleado - El Cerebro */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleccionar Colaborador</label>
          <select
            value={empleadoSeleccionado?.id || ''}
            onChange={(e) => {
              const emp = empleados.find(emp => emp.id === e.target.value);
              setEmpleadoSeleccionado(emp);
            }}
            className="w-full md:w-80 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Buscar por nombre...</option>
            {empleados.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
            ))}
          </select>
        </div>
        {empleadoSeleccionado && (
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-800">{empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}</h2>
            <p className="text-sm text-blue-600 font-medium">{empleadoSeleccionado.cargo} | {empleadoSeleccionado.area}</p>
          </div>
        )}
      </div>

      {empleadoSeleccionado ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Vacaciones" value={vacaciones.reduce((sum, v) => sum + (v.dias_usados || 0), 0)} unit="días" color="blue" />
            <StatCard label="Descansos" value={descansos.length} unit="reg." color="red" />
            <StatCard label="Evaluaciones" value={evaluaciones.length} unit="meses" color="green" />
            <StatCard label="Tardanzas" value={asistencias.filter(a => a.tardanza).length} unit="faltas" color="amber" />
          </div>

          {/* Gráfico de Desempeño */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase">Evolución de Desempeño (Score %)</h3>
            <div className="h-48">
              {datosGrafico.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="puntaje" stroke="#185FA5" strokeWidth={3} dot={{ r: 4, fill: '#185FA5' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">Sin datos de evaluación suficientes</div>
              )}
            </div>
          </div>

          {/* Acciones y Listados */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="flex bg-gray-50 border-b overflow-x-auto">
              {['Vacaciones', 'Descansos', 'Evaluaciones', 'Asistencias'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                    activeSubTab === tab ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-700 text-sm uppercase">Historial de {activeSubTab}</h4>
                <button 
                  onClick={() => setModalAbierto(activeSubTab.toLowerCase())}
                  className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  + Registrar {activeSubTab}
                </button>
              </div>

              {cargando ? <div className="py-10 text-center text-gray-500">Cargando datos...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      {activeSubTab === 'Vacaciones' && <tr><th className="p-2">Inicio</th><th className="p-2">Fin</th><th className="p-2">Días</th><th className="p-2">Estado</th></tr>}
                      {activeSubTab === 'Descansos' && <tr><th className="p-2">Fecha</th><th className="p-2">Días</th><th className="p-2">Diagnóstico</th></tr>}
                      {activeSubTab === 'Evaluaciones' && <tr><th className="p-2">Mes</th><th className="p-2">Puntaje</th><th className="p-2">Observaciones</th></tr>}
                      {activeSubTab === 'Asistencias' && <tr><th className="p-2">Fecha</th><th className="p-2">Tipo</th><th className="p-2">Justificación</th></tr>}
                    </thead>
                    <tbody className="divide-y">
                      {activeSubTab === 'Vacaciones' && vacaciones.map(v => <tr key={v.id}><td className="p-2">{v.fecha_inicio}</td><td className="p-2">{v.fecha_fin}</td><td className="p-2 font-bold">{v.dias_usados}</td><td className="p-2"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">{v.estado}</span></td></tr>)}
                      {activeSubTab === 'Descansos' && descansos.map(d => <tr key={d.id}><td className="p-2">{d.fecha}</td><td className="p-2 font-bold">{d.dias}</td><td className="p-2">{d.diagnostico}</td></tr>)}
                      {activeSubTab === 'Evaluaciones' && evaluaciones.map(e => <tr key={e.id}><td className="p-2">{e.mes}</td><td className="p-2 font-bold text-blue-600">{e.punt_final}%</td><td className="p-2">{e.comentarios || '-'}</td></tr>)}
                      {activeSubTab === 'Asistencias' && asistencias.map(a => <tr key={a.id}><td className="p-2">{a.fecha}</td><td className="p-2">{a.tardanza ? <span className="text-red-600 font-bold">Tardanza</span> : 'Puntual'}</td><td className="p-2 text-xs italic text-gray-500">{a.justificacion || 'Sin notas'}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed">
          <p className="text-gray-400">Selecciona un colaborador arriba para ver su información 360°</p>
        </div>
      )}

      {/* Reutilización de tus modales (Simplificados para limpieza) */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 capitalize">Registrar {modalAbierto}</h3>
            
            {modalAbierto === 'vacaciones' && (
               <div className="space-y-3">
                 <input type="date" value={formVacacion.fecha_inicio} onChange={e => setFormVacacion({...formVacacion, fecha_inicio: e.target.value})} className="w-full border p-2 rounded-lg" />
                 <input type="date" value={formVacacion.fecha_fin} onChange={e => setFormVacacion({...formVacacion, fecha_fin: e.target.value})} className="w-full border p-2 rounded-lg" />
                 <input type="number" placeholder="Días" value={formVacacion.dias_usados} onChange={e => setFormVacacion({...formVacacion, dias_usados: e.target.value})} className="w-full border p-2 rounded-lg" />
                 <button onClick={() => agregarRegistro('vacaciones', { ...formVacacion, empleado_id: empleadoSeleccionado.id, empleado_nombre: `${empleadoSeleccionado.nombre} ${empleadoSeleccionado.apellido}`, estado: 'pendiente' })} className="w-full bg-[#185FA5] text-white py-2 rounded-lg font-bold">Guardar Vacación</button>
               </div>
            )}
            {/* Aquí puedes seguir el mismo patrón para los otros formularios... */}
            <button onClick={() => setModalAbierto(null)} className="w-full mt-2 text-gray-500 text-sm">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente pequeño para las tarjetas de estadísticas
function StatCard({ label, value, unit, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={`p-4 rounded-xl border shadow-sm ${colors[color]}`}>
      <div className="text-2xl font-black">{value} <span className="text-xs font-normal opacity-70">{unit}</span></div>
      <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">{label}</div>
    </div>
  );
}