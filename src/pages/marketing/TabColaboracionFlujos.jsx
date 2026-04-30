// src/pages/marketing/TabColaboracionFlujos.jsx
import { MessageSquare, Send, Paperclip, CheckCircle, Clock } from 'lucide-react';

export default function TabColaboracionFlujos() {
  const mensajes = [
    {
      iniciales: 'CM',
      nombre: 'Carlos Mendoza',
      rol: 'Coordinador Marketing',
      mensaje: 'Revisé el flyer de Enfermería, falta el precio promocional.',
      hora: '10:30 am',
      color: 'from-blue-100 to-blue-200 text-blue-700',
    },
    {
      iniciales: 'DG',
      nombre: 'Diana García',
      rol: 'Diseñadora Gráfica',
      mensaje: 'Corregido, ya está actualizado en la biblioteca.',
      hora: '11:15 am',
      color: 'from-emerald-100 to-emerald-200 text-emerald-700',
    },
    {
      iniciales: 'AR',
      nombre: 'Andrea Ruiz',
      rol: 'Community Manager',
      mensaje: 'Perfecto, lo programo para mañana en Instagram y Facebook.',
      hora: '11:45 am',
      color: 'from-purple-100 to-purple-200 text-purple-700',
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <MessageSquare className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Colaboración y Flujos</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Comentarios internos, aprobaciones y asignación de tareas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" />
            En línea
          </span>
        </div>
      </div>

      {/* Chat */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        {/* Mensajes */}
        <div className="p-5 space-y-5 max-h-[400px] overflow-y-auto bg-gray-50/50">
          {mensajes.map((msg, idx) => (
            <div key={idx} className="flex items-start gap-4 group">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${msg.color} flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0`}>
                {msg.iniciales}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-800">{msg.nombre}</p>
                  <span className="text-[10px] text-gray-400 font-medium">{msg.rol}</span>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-sm border border-gray-100 group-hover:border-blue-200 transition-all">
                  <p className="text-xs text-gray-600 leading-relaxed">{msg.mensaje}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 pt-1 flex-shrink-0">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} />
                  {msg.hora}
                </span>
                <CheckCircle size={12} className="text-emerald-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Input de mensaje */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
          <button className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            placeholder="Escribe un comentario..."
            className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
          />
          <button className="p-2.5 bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98]">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}