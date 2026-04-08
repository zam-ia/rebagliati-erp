// src/pages/Logistica.jsx
import { useState } from 'react';

// Importaciones de los componentes (algunos aún no existen, los crearemos después)
import DashboardLogistica from './logistica/DashboardLogistica';
import Productos from './logistica/Productos';
import Familias from './logistica/Familias';
import Almacenes from './logistica/Almacenes';
import Kardex from './logistica/Kardex';
import Lotes from './logistica/Lotes';
import Requerimientos from './logistica/Requerimientos';
import Compras from './logistica/Compras';
import Proveedores from './logistica/Proveedores';
import Despachos from './logistica/Despachos';
import Auditorias from './logistica/Auditorias';
import ReportesLogistica from './logistica/ReportesLogistica';

const MENU_LOGISTICA = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'productos', icon: '📦', label: 'Maestro de Productos' },
  { id: 'familias', icon: '🏷️', label: 'Familias / Categorías' },
  { id: 'almacenes', icon: '🏢', label: 'Almacenes' },
  { id: 'kardex', icon: '📜', label: 'Kardex / Movimientos' },
  { id: 'lotes', icon: '🔢', label: 'Lotes y Vencimientos' },
  { id: 'requerimientos', icon: '📋', label: 'Requerimientos' },
  { id: 'compras', icon: '🛒', label: 'Compras' },
  { id: 'proveedores', icon: '🤝', label: 'Proveedores' },
  { id: 'despachos', icon: '🚚', label: 'Despachos' },
  { id: 'auditorias', icon: '🔍', label: 'Auditorías' },
  { id: 'reportes', icon: '📈', label: 'Reportes' },
];

const componentMap = {
  dashboard: DashboardLogistica,
  productos: Productos,
  familias: Familias,
  almacenes: Almacenes,
  kardex: Kardex,
  lotes: Lotes,
  requerimientos: Requerimientos,
  compras: Compras,
  proveedores: Proveedores,
  despachos: Despachos,
  auditorias: Auditorias,
  reportes: ReportesLogistica,
};

export default function Logistica() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const ActiveComp = componentMap[activeTab];

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#11284e] text-white flex-shrink-0">
        <div className="p-4 border-b border-blue-800">
          <h2 className="text-lg font-bold">Logística</h2>
        </div>
        <nav className="p-2 space-y-1">
          {MENU_LOGISTICA.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === item.id ? 'bg-blue-700' : 'hover:bg-blue-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto p-6">
        {ActiveComp ? <ActiveComp /> : <div className="text-center py-10">Sección en construcción</div>}
      </main>
    </div>
  );
}