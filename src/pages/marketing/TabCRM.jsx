// src/pages/marketing/TabCRM.jsx
import { Users, Plus, MoreHorizontal, Phone, Mail, MessageCircle } from 'lucide-react';

export default function TabCRM() {
  const etapas = [
    { nombre: 'Nuevo Lead', color: 'bg-gray-100 text-gray-600', borderColor: 'border-gray-200' },
    { nombre: 'Contactado', color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-200' },
    { nombre: 'Interesado', color: 'bg-amber-100 text-amber-700', borderColor: 'border-amber-200' },
    { nombre: 'Seguimiento', color: 'bg-purple-100 text-purple-700', borderColor: 'border-purple-200' },
    { nombre: 'Cerrado', color: 'bg-emerald-100 text-emerald-700', borderColor: 'border-emerald-200' },
    { nombre: 'Perdido', color: 'bg-red-100 text-red-700', borderColor: 'border-red-200' },
  ];

  const leads = [
    { nombre: 'María López', programa: 'Diplomado Enfermería', fuente: 'Facebook', color: 'bg-blue-100 text-blue-800' },
    { nombre: 'Juan Torres', programa: 'Micología Podológica', fuente: 'WhatsApp', color: 'bg-emerald-100 text-emerald-800' },
    { nombre: 'Ana Sánchez', programa: 'Diplomado General', fuente: 'Instagram', color: 'bg-purple-100 text-purple-800' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <Users className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">CRM Integrado</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Gestión de leads con pipeline Kanban · Integración con Kommo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all">
            <Plus size={14} /> Nuevo Lead
          </button>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map(etapa => (
          <div key={etapa.nombre} className="min-w-[220px] max-w-[220px] flex-shrink-0">
            {/* Cabecera de columna */}
            <div className={`rounded-2xl p-3 mb-3 ${etapa.color} border ${etapa.borderColor}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wide">{etapa.nombre}</h3>
                <span className="text-[10px] font-black bg-white/60 rounded-full px-2 py-0.5">
                  {etapa.nombre === 'Nuevo Lead' ? leads.length : 0}
                </span>
              </div>
            </div>

            {/* Cards de leads */}
            <div className="space-y-3">
              {etapa.nombre === 'Nuevo Lead' && leads.map((lead, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/20 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                      {lead.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <p className="font-bold text-gray-800 text-xs mb-1">{lead.nombre}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mb-3">{lead.programa}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead.color}`}>
                      {lead.fuente}
                    </span>
                    <div className="flex gap-1">
                      <button className="p-1 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600">
                        <Phone size={12} />
                      </button>
                      <button className="p-1 hover:bg-emerald-50 rounded-lg transition-colors text-gray-400 hover:text-emerald-600">
                        <MessageCircle size={12} />
                      </button>
                      <button className="p-1 hover:bg-purple-50 rounded-lg transition-colors text-gray-400 hover:text-purple-600">
                        <Mail size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Botón agregar */}
              <button className="w-full text-xs text-gray-400 hover:text-[#185FA5] hover:bg-blue-50 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all font-medium flex items-center justify-center gap-1.5">
                <Plus size={12} /> Agregar lead
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}