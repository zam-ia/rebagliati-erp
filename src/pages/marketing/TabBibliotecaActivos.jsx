// src/pages/marketing/TabBibliotecaActivos.jsx
import { FolderOpen, FileImage, Video, FileText, Palette, Download } from 'lucide-react';

export default function TabBibliotecaActivos() {
  const categorias = [
    { nombre: 'Logos', icono: <Palette size={28} />, archivos: 24, color: 'from-blue-100 to-blue-200 text-blue-700' },
    { nombre: 'Flyers', icono: <FileImage size={28} />, archivos: 24, color: 'from-amber-100 to-amber-200 text-amber-700' },
    { nombre: 'Videos', icono: <Video size={28} />, archivos: 24, color: 'from-purple-100 to-purple-200 text-purple-700' },
    { nombre: 'Copys', icono: <FileText size={28} />, archivos: 24, color: 'from-emerald-100 to-emerald-200 text-emerald-700' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
          <FolderOpen className="w-5 h-5 text-[#185FA5]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Biblioteca de Activos</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Repositorio central de diseños, videos, logos y plantillas
          </p>
        </div>
      </div>

      {/* Grid de categorías */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categorias.map(cat => (
          <div
            key={cat.nombre}
            className="relative group cursor-pointer"
          >
            <div className="border border-gray-100 rounded-2xl p-6 text-center hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/30 transition-all duration-200 bg-white hover:scale-[1.02]">
              <div className={`w-16 h-16 bg-gradient-to-br ${cat.color} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all`}>
                {cat.icono}
              </div>
              <p className="font-bold text-gray-800 text-sm mb-1">{cat.nombre}</p>
              <p className="text-xs text-gray-400 font-medium">{cat.archivos} archivos</p>
            </div>
            <button 
              className="absolute top-3 right-3 p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-blue-600 hover:shadow-md"
              title="Descargar todo"
            >
              <Download size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}