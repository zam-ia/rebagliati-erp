// src/pages/marketing/TabCampanas.jsx
import { Megaphone, Plus, Target, Calendar, Users, ExternalLink } from 'lucide-react';

export default function TabCampanas() {
  const campanas = [
    {
      nombre: 'Lanzamiento Podología',
      objetivo: 'Leads',
      objetivoColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      plataforma: 'Facebook + TikTok',
      programa: 'Micología Podológica',
      fechas: '01/05 - 15/06',
      responsable: 'Andrea Ruiz',
      estado: 'Activa',
      estadoColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      nombre: 'Campaña CRM Fidelización',
      objetivo: 'Retención',
      objetivoColor: 'bg-purple-100 text-purple-800 border-purple-200',
      plataforma: 'Email + WhatsApp',
      programa: 'Diplomado General',
      fechas: '10/05 - 30/06',
      responsable: 'Carlos Mendoza',
      estado: 'Programada',
      estadoColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      nombre: 'Remarketing Leads Fríos',
      objetivo: 'Conversión',
      objetivoColor: 'bg-orange-100 text-orange-800 border-orange-200',
      plataforma: 'Google Ads',
      programa: 'Todos los programas',
      fechas: '15/05 - 15/07',
      responsable: 'Lucía Fernández',
      estado: 'Activa',
      estadoColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <Megaphone className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Gestión de Campañas</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Organiza todas las campañas publicitarias y de contenido
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all">
          <Plus size={14} /> Nueva campaña
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Campaña</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Objetivo</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Plataforma</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Programa</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Fechas</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Responsable</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campanas.map((camp, idx) => (
              <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                <td className="p-4">
                  <p className="font-bold text-gray-800 text-xs">{camp.nombre}</p>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${camp.objetivoColor}`}>
                    <Target size={10} className="flex-shrink-0" />
                    {camp.objetivo}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-xs text-gray-600 font-medium">{camp.plataforma}</span>
                </td>
                <td className="p-4">
                  <span className="text-xs text-gray-600 font-medium">{camp.programa}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Calendar size={12} className="text-gray-400" />
                    {camp.fechas}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                    <Users size={12} className="text-gray-400" />
                    {camp.responsable}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase ${camp.estadoColor}`}>
                    {camp.estado}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button className="p-2 hover:bg-blue-100 rounded-xl transition-colors text-gray-400 hover:text-[#185FA5]">
                    <ExternalLink size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}