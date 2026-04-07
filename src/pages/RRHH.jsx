import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Importación de componentes de pestañas
import TabBase from './rrhh/TabBase';
import TabDirectorio from './rrhh/TabDirectorio';
import TabContratos from './rrhh/TabContratos';
import TabPlanilla from './rrhh/TabPlanilla';
import TabEvaluacion from './rrhh/TabEvaluacion';
import TabVacaciones from './rrhh/TabVacaciones';
import TabDescansos from './rrhh/TabDescansos';
import TabPerfilEmpleado from './rrhh/TabPerfilEmpleado';
import TabReclutamiento from './rrhh/TabReclutamiento';
import TabCeses from './rrhh/TabCeses';
import TabLiquidacion from './rrhh/TabLiquidacion';
import TabLocadores from './rrhh/TabLocadores';
import TabPlanillaPagos from './rrhh/TabPlanillaPagos'; // <-- NUEVO IMPORT
import TabSimple from './rrhh/TabSimple';

const MENU_ITEMS = [
  { id: 'perfil',       icon: '👤', label: 'Perfil 360°' },
  { id: 'base',         icon: '👥', label: 'Base de datos' },
  { id: 'directorio',   icon: '🎂', label: 'Directorio' },
  { id: 'contratos',    icon: '🔔', label: 'Alertas contratos' },
  { id: 'planilla',     icon: '📋', label: 'Novedades planilla' },
  { id: 'vacaciones',   icon: '📅', label: 'Vacaciones' },
  { id: 'descansos',    icon: '🏥', label: 'Descansos médicos' },
  { id: 'evaluacion',   icon: '⭐', label: 'Evaluación' },
  { id: 'reclutamiento', icon: '🎯', label: 'Reclutamiento' },
  { id: 'locadores',    icon: '📁', label: 'Locadores' },
  { id: 'planillapagos', icon: '💰', label: 'Planilla y Pagos' }, // <-- NUEVO ÍTEM
  { id: 'historico',    icon: '📈', label: 'Histórico anual' },
  { id: 'gratif',       icon: '💰', label: 'Gratificaciones' },
  { id: 'cts',          icon: '💳', label: 'CTS' },
  { id: 'vidaley',      icon: '🔒', label: 'Vida Ley' },
  { id: 'ceses',        icon: '📊', label: 'Ceses' },
  { id: 'liquidacion',  icon: '🧾', label: 'Liquidaciones' },
  { id: 'sunafil',      icon: '🔍', label: 'SUNAFIL' },
  { id: 'herramientas', icon: '⏱', label: 'Herramientas' },
];

const componentMap = {
  perfil: TabPerfilEmpleado,
  base: TabBase,
  directorio: TabDirectorio,
  contratos: TabContratos,
  planilla: TabPlanilla,
  vacaciones: TabVacaciones,
  descansos: TabDescansos,
  evaluacion: TabEvaluacion,
  reclutamiento: TabReclutamiento,
  locadores: TabLocadores,
  planillapagos: TabPlanillaPagos, // <-- NUEVO MAPEO
  ceses: TabCeses,
  liquidacion: TabLiquidacion,
};

export default function RRHH() {
  const [activeTab, setActiveTab] = useState('perfil');
  const contentRef = useRef(null);
  
  // Si no existe en el mapa, usa TabSimple como fallback
  const ActiveComp = componentMap[activeTab] || TabSimple;

  const exportarPDF = () => {
    if (!contentRef.current) return;
    const tabla = contentRef.current.querySelector('table');
    if (!tabla) {
      alert('No hay una tabla visible para exportar en esta sección');
      return;
    }
    const doc = new jsPDF();
    const titulo = MENU_ITEMS.find(i => i.id === activeTab)?.label || activeTab;
    doc.text(`Reporte RRHH - ${titulo}`, 14, 15);
    autoTable(doc, { 
      html: tabla, 
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillStyle: [24, 95, 165] }
    });
    doc.save(`rrhh_${activeTab}.pdf`);
  };

  const handleNuevoRegistro = () => {
    if (!contentRef.current) return;
    let boton = contentRef.current.querySelector('.btn-nuevo-registro');
    if (!boton) {
      const botones = contentRef.current.querySelectorAll('button');
      boton = Array.from(botones).find(b => 
        b.innerText.toLowerCase().includes('nuevo') || 
        b.innerText.toLowerCase().includes('registrar') ||
        b.innerText.includes('+')
      );
    }
    if (boton) {
      boton.click();
    } else {
      alert('Por favor, usa los botones de registro dentro de la pestaña.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header Superior */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gestión de Talento Humano</h1>
          <p className="text-xs text-gray-500">Rebagliati Diplomados - Panel Administrativo</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleNuevoRegistro}
            className="flex items-center gap-2 text-sm border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
          >
            <span>+</span> Nuevo registro
          </button>
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 text-sm bg-[#185FA5] text-white px-5 py-2 rounded-lg hover:bg-blue-800 shadow-md transition-all"
          >
            📥 Exportar PDF
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Menú Lateral (Desktop) */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
          <nav className="p-3 space-y-1">
            {MENU_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-[#185FA5] shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={`text-lg ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Selector para móviles */}
          <div className="md:hidden p-4 bg-white border-b">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {MENU_ITEMS.map(item => (
                <option key={item.id} value={item.id}>
                  {item.icon} {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Área de Visualización */}
          <div 
            ref={contentRef} 
            className="flex-1 overflow-y-auto p-6"
          >
            <div className="max-w-7xl mx-auto">
              {/* Pasamos tabId por si el componente necesita filtrar algo internamente */}
              <ActiveComp tabId={activeTab} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}