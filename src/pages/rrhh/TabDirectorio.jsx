import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabDirectorio() {
  const [empleados, setEmpleados] = useState([]);

  useEffect(() => {
    supabase.from('empleados').select('*').order('apellido').then(({ data }) => setEmpleados(data || []));
  }, []);

  const getInitials = (nombre, apellido) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Foto</th>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Cargo</th>
              <th className="p-3 text-left">Área</th>
              <th className="p-3 text-left">Teléfono</th>
              <th className="p-3 text-left">Correo</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map(emp => (
              <tr key={emp.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  {emp.foto_url ? (
                    <img src={emp.foto_url} alt="foto" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                      {getInitials(emp.nombre, emp.apellido)}
                    </div>
                  )}
                </td>
                <td className="p-3 font-medium">{emp.nombre} {emp.apellido}</td>
                <td className="p-3">{emp.cargo}</td>
                <td className="p-3">{emp.area}</td>
                <td className="p-3">{emp.telefono}</td>
                <td className="p-3">{emp.correo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}