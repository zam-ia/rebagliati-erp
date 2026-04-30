// src/pages/marketing/TabProduccionCreativa.jsx
import { Palette, Clock, User, CheckCircle, AlertCircle, PenTool } from 'lucide-react';

export default function TabProduccionCreativa() {
  const tareas = [
    { 
      titulo: 'Flyer Diplomado Enfermería', 
      estado: 'En diseño', 
      estadoColor: 'bg-amber-100 text-amber-700 border-amber-200',
      icono: <PenTool size={14} />,
      responsable: 'Carlos Mendoza', 
      fecha: '28/04' 
    },
    { 
      titulo: 'Video TikTok Podología', 
      estado: 'Revisión', 
      estadoColor: 'bg-blue-100 text-blue-700 border-blue-200',
      icono: <AlertCircle size={14} />,
      responsable: 'Lucía Fernández', 
      fecha: '29/04' 
    },
    { 
      titulo: 'Carrusel Instagram Farmacia', 
      estado: 'Aprobado', 
      estadoColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icono: <CheckCircle size={14} />,
      responsable: 'Andrea Ruiz', 
      fecha: '30/04' 
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <Palette className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Producción Creativa</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Flujo de trabajo: solicitud → diseño → revisión → aprobado → publicado
            </p>
          </div>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="space-y-3">
        {tareas.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${item.estadoColor} bg-opacity-20 border`}>
                {item.icono}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm group-hover:text-[#185FA5] transition-colors">
                  {item.titulo}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <User size={12} className="text-gray-400" />
                  <span>{item.responsable}</span>
                  <span className="text-gray-300">·</span>
                  <Clock size={12} className="text-gray-400" />
                  <span>{item.fecha}</span>
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase border ${item.estadoColor} shadow-sm`}>
              {item.estado}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}