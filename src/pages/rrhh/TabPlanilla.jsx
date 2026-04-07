import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabPlanilla() {
  const [novedades, setNovedades] = useState([]);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('asistencia')
        .select('empleado_nombre, fecha, tardanza, justificacion')
        .gte('fecha', `${mes}-01`)
        .lt('fecha', `${mes}-31`);
      setNovedades(data || []);
    };
    fetchData();
  }, [mes]);

  const resumen = novedades.reduce((acc, n) => {
    if (n.tardanza && !n.justificacion) acc.tardanzas++;
    if (n.tardanza && n.justificacion) acc.justificadas++;
    if (!n.tardanza) acc.presentes++;
    return acc;
  }, { tardanzas: 0, justificadas: 0, presentes: 0 });

  return (
    <div>
      <div className="flex gap-4 mb-4 items-center">
        <label className="text-sm">Periodo:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="border rounded px-2 py-1" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-red-50 p-3 rounded-lg text-center"><div className="text-2xl font-bold text-red-700">{resumen.tardanzas}</div><div className="text-xs">Tardanzas sin justif.</div></div>
        <div className="bg-amber-50 p-3 rounded-lg text-center"><div className="text-2xl font-bold text-amber-700">{resumen.justificadas}</div><div className="text-xs">Tardanzas justificadas</div></div>
        <div className="bg-green-50 p-3 rounded-lg text-center"><div className="text-2xl font-bold text-green-700">{resumen.presentes}</div><div className="text-xs">Días con asistencia</div></div>
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="p-3">Empleado</th><th>Fecha</th><th>Tardanza</th><th>Justificación</th></tr></thead>
          <tbody>
            {novedades.map((n, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{n.empleado_nombre}</td>
                <td className="p-3">{n.fecha}</td>
                <td className="p-3">{n.tardanza ? '✅ Sí' : '❌ No'}</td>
                <td className="p-3">{n.justificacion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}