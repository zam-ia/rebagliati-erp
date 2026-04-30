// src/pages/marketing/TabGestionMarca.jsx
import { Building2, Palette, Type, Download, ExternalLink } from 'lucide-react';

export default function TabGestionMarca() {
  const colores = [
    { nombre: 'Azul Corporativo', hex: '#11284e', clase: 'bg-[#11284e]' },
    { nombre: 'Azul Secundario', hex: '#185FA5', clase: 'bg-[#185FA5]' },
    { nombre: 'Fondo Claro', hex: '#F4F7FA', clase: 'bg-[#F4F7FA] border border-gray-200' },
    { nombre: 'Blanco', hex: '#FFFFFF', clase: 'bg-white border border-gray-200' },
  ];

  const tipografias = [
    { nombre: 'Inter', peso: 'Regular', tamaño: '16px', muestra: 'Ag' },
    { nombre: 'Inter', peso: 'Medium', tamaño: '14px', muestra: 'Ag' },
    { nombre: 'Inter', peso: 'Semibold', tamaño: '12px', muestra: 'Ag' },
    { nombre: 'Inter', peso: 'Bold', tamaño: '10px', muestra: 'Ag' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <Building2 className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Gestión de Marca</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Guía de estilo visual y tono de comunicación
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all">
          <Download size={14} /> Descargar Brandbook
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paleta de Colores */}
        <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl">
              <Palette size={16} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">Paleta de Colores</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {colores.map(color => (
              <div
                key={color.hex}
                className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 hover:shadow-sm transition-all group"
              >
                <div
                  className={`w-10 h-10 rounded-xl shadow-inner flex-shrink-0 group-hover:scale-110 transition-transform ${color.clase}`}
                  title={color.hex}
                />
                <div>
                  <p className="text-xs font-bold text-gray-700">{color.nombre}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{color.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipografía */}
        <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
              <Type size={16} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">Tipografía</h3>
          </div>
          <div className="space-y-3">
            {tipografias.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm shadow-inner ${
                      tip.peso === 'Bold' ? 'font-black' :
                      tip.peso === 'Semibold' ? 'font-bold' :
                      tip.peso === 'Medium' ? 'font-medium' : 'font-normal'
                    }`}
                  >
                    {tip.muestra}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{tip.nombre} · {tip.peso}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{tip.tamaño}</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-lg">
                  {tip.peso === 'Bold' ? '700' :
                   tip.peso === 'Semibold' ? '600' :
                   tip.peso === 'Medium' ? '500' : '400'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recursos adicionales */}
      <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50">
        <h3 className="font-bold text-gray-800 text-sm mb-4">Recursos de Marca</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { nombre: 'Logo Vectorial', formato: 'AI, SVG, PNG', icono: '🎨' },
            { nombre: 'Manual de Marca', formato: 'PDF', icono: '📖' },
            { nombre: 'Plantillas PPT', formato: 'PPTX', icono: '📊' },
          ].map(recurso => (
            <div
              key={recurso.nombre}
              className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl">
                {recurso.icono}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-700 truncate">{recurso.nombre}</p>
                <p className="text-[10px] text-gray-400 font-mono">{recurso.formato}</p>
              </div>
              <ExternalLink size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}