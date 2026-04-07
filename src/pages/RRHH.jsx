import { useState } from 'react';
import TabBase from './rrhh/TabBase';
import TabDirectorio from './rrhh/TabDirectorio';
import TabContratos from './rrhh/TabContratos';
import TabPlanilla from './rrhh/TabPlanilla';
import TabEvaluacion from './rrhh/TabEvaluacion';
import TabVacaciones from './rrhh/TabVacaciones';
import TabDescansos from './rrhh/TabDescansos';
import TabSimple from './rrhh/TabSimple';

const MENU_ITEMS = [
  { id: 'base',         icon: '👥', label: 'Base de datos' },
  { id: 'directorio',   icon: '🎂', label: 'Directorio' },
  { id: 'contratos',    icon: '🔔', label: 'Alertas contratos' },
  { id: 'planilla',     icon: '📋', label: 'Novedades planilla' },
  { id: 'locadores',    icon: '👥', label: 'Locadores' },
  { id: 'historico',    icon: '📈', label: 'Histórico anual' },
  { id: 'vacaciones',   icon: '📅', label: 'Vacaciones' },
  { id: 'descansos',    icon: '🏥', label: 'Descansos médicos' },
  { id: 'gratif',       icon: '💰', label: 'Gratificaciones' },
  { id: 'cts',          icon: '💳', label: 'CTS' },
  { id: 'vidaley',      icon: '🔒', label: 'Vida Ley' },
  { id: 'ceses',        icon: '📊', label: 'Ceses' },
  { id: 'sunafil',      icon: '🔍', label: 'SUNAFIL' },
  { id: 'recluta',      icon: '🎯', label: 'Reclutamiento' },
  { id: 'evaluacion',   icon: '⭐', label: 'Evaluación' },
  { id: 'herramientas', icon: '⏱', label: 'Herramientas' },
];

const componentMap = {
  base: TabBase,
  directorio: TabDirectorio,
  contratos: TabContratos,
  planilla: TabPlanilla,
  vacaciones: TabVacaciones,
  descansos: TabDescansos,
  evaluacion: TabEvaluacion,
};

export default function RRHH() {
  const [activeTab, setActiveTab] = useState('base');
  const ActiveComp = componentMap[activeTab] || TabSimple;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold text-gray-800">Recursos Humanos</h1>
        <div className="flex gap-2">
          <button className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
            + Nuevo registro
          </button>
          <button className="text-sm bg-[#185FA5] text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Cuerpo con dos columnas: menú lateral + contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* Menú lateral izquierdo - scroll vertical propio */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0 hidden md:block">
          <div className="p-2">
            {MENU_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  activeTab === item.id
                    ? 'bg-[#185FA5] text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selector para móvil (visible solo en pantallas pequeñas) */}
        <div className="md:hidden w-full p-2 border-b border-gray-200 bg-white">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {MENU_ITEMS.map(item => (
              <option key={item.id} value={item.id}>
                {item.icon} {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Contenido principal - scroll vertical */}
        <div className="flex-1 overflow-y-auto p-4">
          <ActiveComp tabId={activeTab} />
        </div>
      </div>
    </div>
  );
}