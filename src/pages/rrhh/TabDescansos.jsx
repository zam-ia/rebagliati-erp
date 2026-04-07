import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabDescansos() {
  const [descansos, setDescansos] = useState([]);
  useEffect(() => {
    supabase.from('descansos_medicos').select('*').order('fecha', { ascending: false }).then(({ data }) => setDescansos(data || []));
  }, []);

  return (
    <div>
      <button className="mb-4 bg-[#185FA5] text-white px-3 py-1.5 rounded-lg text-sm">+ Registrar descanso</button>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="p-3">Empleado</th><th>Fecha</th><th>Días</th><th>Diagnóstico</th></tr></thead>
          <tbody>
            {descansos.map(d => (
              <tr key={d.id} className="border-t"><td className="p-3">{d.empleado_nombre}</td><td className="p-3">{d.fecha}</td><td className="p-3">{d.dias}</td><td className="p-3">{d.diagnostico}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}