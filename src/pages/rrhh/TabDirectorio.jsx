import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabDirectorio() {
  const [empleados, setEmpleados] = useState([]);
  useEffect(() => {
    supabase.from('empleados').select('nombre, apellido, cargo, area, cumpleanos, telefono, correo').then(({ data }) => setEmpleados(data || []));
  }, []);

  const hoy = new Date();
  const proximos = [...empleados].filter(e => {
    if (!e.cumpleanos) return false;
    const mesDia = e.cumpleanos.slice(5);
    const hoyMesDia = `${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
    return mesDia >= hoyMesDia;
  }).sort((a,b) => a.cumpleanos.slice(5).localeCompare(b.cumpleanos.slice(5))).slice(0,5);

  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-5">
        <h3 className="font-semibold mb-2">🎂 Próximos cumpleaños</h3>
        <div className="flex gap-3 flex-wrap">
          {proximos.map(e => <span key={e.correo} className="bg-gray-100 px-3 py-1 rounded-full text-sm">{e.nombre} {e.apellido} ({e.cumpleanos?.slice(5)})</span>)}
        </div>
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="p-3">Nombre</th><th>Cargo</th><th>Área</th><th>Teléfono</th><th>Correo</th></tr></thead>
          <tbody>
            {empleados.map(e => (
              <tr key={e.correo} className="border-t"><td className="p-3">{e.nombre} {e.apellido}</td><td className="p-3">{e.cargo}</td><td className="p-3">{e.area}</td><td className="p-3">{e.telefono}</td><td className="p-3">{e.correo}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}