import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabVacaciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  useEffect(() => {
    supabase.from('vacaciones').select('*').order('fecha_inicio').then(({ data }) => setSolicitudes(data || []));
    supabase.from('empleados').select('id, nombre, apellido').then(({ data }) => setEmpleados(data || []));
  }, []);

  return (
    <div>
      <button className="mb-4 bg-[#185FA5] text-white px-3 py-1.5 rounded-lg text-sm">+ Solicitar vacaciones</button>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="p-3">Empleado</th><th>Inicio</th><th>Fin</th><th>Días</th><th>Estado</th></tr></thead>
          <tbody>
            {solicitudes.map(s => {
              const emp = empleados.find(e => e.id === s.empleado_id);
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{emp?.nombre} {emp?.apellido}</td>
                  <td className="p-3">{s.fecha_inicio}</td>
                  <td className="p-3">{s.fecha_fin}</td>
                  <td className="p-3">{s.dias_usados}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${s.estado==='aprobada'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>{s.estado}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}