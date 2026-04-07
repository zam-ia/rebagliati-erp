import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

function diasParaVencer(fecha) {
  if (!fecha) return 999;
  return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function TabContratos() {
  const [empleados, setEmpleados] = useState([]);
  useEffect(() => {
    supabase.from('empleados').select('*').eq('estado', 'activo').then(({ data }) => setEmpleados(data || []));
  }, []);

  const semaforo = (dias) => {
    if (dias < 0) return { bg: 'bg-red-700', text: 'text-white', label: 'Vencido' };
    if (dias <= 30) return { bg: 'bg-red-500', text: 'text-white', label: 'Urgente' };
    if (dias <= 90) return { bg: 'bg-amber-400', text: 'text-amber-800', label: 'Próximo' };
    return { bg: 'bg-green-500', text: 'text-white', label: 'Vigente' };
  };

  return (
    <div>
      <div className="flex gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> &lt;30 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> 30-90 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> &gt;90 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-700"></span> Vencido</span>
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Colaborador</th><th>Cargo</th><th>Vencimiento</th><th>Días rest.</th><th>Acción</th></tr></thead>
          <tbody>
            {empleados.map(e => {
              const dias = diasParaVencer(e.fecha_vence_contrato);
              const s = semaforo(dias);
              return (
                <tr key={e.id} className="border-t">
                  <td className="p-3">{e.nombre} {e.apellido}</td>
                  <td className="p-3">{e.cargo}</td>
                  <td className="p-3">{e.fecha_vence_contrato || '—'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{dias} días</span></td>
                  <td className="p-3">{dias <= 90 && <button className="text-xs text-[#185FA5] border px-2 py-1 rounded">Renovar</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}