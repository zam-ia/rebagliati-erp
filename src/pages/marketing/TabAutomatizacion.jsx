// src/pages/marketing/TabAutomatizacion.jsx
import { Zap, ArrowRight, Bell, RefreshCw, Calendar } from 'lucide-react';

export default function TabAutomatizacion() {
  const reglas = [
    { 
      icon: <Bell size={18} />, 
      texto: 'Lead sin contacto > 24h → alerta al asesor', 
      estado: 'Activo',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    { 
      icon: <RefreshCw size={18} />, 
      texto: 'Campaña activa → crea tareas de seguimiento', 
      estado: 'Activo',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    { 
      icon: <Calendar size={18} />, 
      texto: 'Evento próximo → genera contenido sugerido', 
      estado: 'Activo',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
          <Zap className="w-5 h-5 text-[#185FA5]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Automatización</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Reglas automáticas para leads, recordatorios y alertas
          </p>
        </div>
      </div>

      {/* Lista de reglas */}
      <div className="space-y-3">
        {reglas.map((regla, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 border border-gray-100 rounded-2xl p-5 bg-gray-50/50 hover:bg-blue-50/30 hover:border-blue-200 transition-all group"
          >
            <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
              {regla.icon}
            </div>
            <span className="text-sm font-semibold text-gray-700 flex-1">{regla.texto}</span>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors mx-2" />
            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border ${regla.color} shadow-sm`}>
              {regla.estado}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}