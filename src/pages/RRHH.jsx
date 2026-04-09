import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  UserCircle, Users, Cake, Bell, FileText, 
  Clock, Calendar, HeartPulse, Star, Target, 
  FolderOpen, CircleDollarSign, BarChart3, ShieldCheck, 
  Search, Plus, Download, ChevronRight 
} from 'lucide-react';

// Importación de componentes
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
import TabPlanillaPagos from './rrhh/TabPlanillaPagos';
import TabHorarios from './rrhh/TabHorarios';
import TabSimple from './rrhh/TabSimple';

const SECCIONES = [
  {
    titulo: 'Talento',
    items: [
      { id: 'perfil',       icon: UserCircle, label: 'Perfil 360°' },
      { id: 'base',         icon: Users,      label: 'Base de datos' },
      { id: 'directorio',   icon: Cake,       label: 'Directorio' },
      { id: 'reclutamiento', icon: Target,    label: 'Reclutamiento' },
    ]
  },
  {
    titulo: 'Operaciones',
    items: [
      { id: 'horarios',     icon: Clock,      label: 'Horarios' },
      { id: 'vacaciones',   icon: Calendar,   label: 'Vacaciones' },
      { id: 'descansos',     icon: HeartPulse, label: 'Descansos médicos' },
      { id: 'evaluacion',   icon: Star,       label: 'Evaluación' },
    ]
  },
  {
    titulo: 'Nómina y Legal',
    items: [
      { id: 'planillapagos', icon: CircleDollarSign, label: 'Planilla y Pagos' },
      { id: 'contratos',     icon: Bell,             label: 'Alertas contratos' },
      { id: 'locadores',     icon: FolderOpen,       label: 'Locadores' },
      { id: 'ceses',         icon: BarChart3,        label: 'Ceses' },
      { id: 'liquidacion',   icon: FileText,         label: 'Liquidaciones' },
      { id: 'sunafil',       icon: Search,           label: 'SUNAFIL' },
    ]
  }
];

const componentMap = {
  perfil: TabPerfilEmpleado,
  base: TabBase,
  directorio: TabDirectorio,
  contratos: TabContratos,
  planilla: TabPlanilla,
  horarios: TabHorarios,
  vacaciones: TabVacaciones,
  descansos: TabDescansos,
  evaluacion: TabEvaluacion,
  reclutamiento: TabReclutamiento,
  locadores: TabLocadores,
  planillapagos: TabPlanillaPagos, 
  ceses: TabCeses,
  liquidacion: TabLiquidacion,
};

export default function RRHH() {
  const [activeTab, setActiveTab] = useState('perfil');
  const contentRef = useRef(null);
  const ActiveComp = componentMap[activeTab] || TabSimple;

  const exportarPDF = () => {
    if (!contentRef.current) return;
    const tabla = contentRef.current.querySelector('table');
    if (!tabla) {
      alert('No hay una tabla visible para exportar.');
      return;
    }
    const doc = new jsPDF();
    const label = SECCIONES.flatMap(s => s.items).find(i => i.id === activeTab)?.label || activeTab;
    doc.text(`Reporte RRHH - ${label}`, 14, 15);
    autoTable(doc, { 
      html: tabla, 
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillStyle: [17, 40, 78] }
    });
    doc.save(`rrhh_${activeTab}.pdf`);
  };

  const handleNuevoRegistro = () => {
    if (!contentRef.current) return;
    const boton = contentRef.current.querySelector('.btn-nuevo-registro') || 
                  Array.from(contentRef.current.querySelectorAll('button')).find(b => 
                    b.innerText.toLowerCase().includes('nuevo') || b.innerText.includes('+')
                  );
    if (boton) boton.click();
    else alert('Usa los botones dentro de la pestaña activa.');
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      
      {/* Top Header VIP */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Gestión de Capital Humano</h1>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            <span>Rebagliati Diplomados</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-[#185FA5]">Panel de Control</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNuevoRegistro}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
          >
            <Plus size={16} /> Nuevo registro
          </button>
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold text-white bg-[#11284e] rounded-xl hover:bg-[#1e4280] shadow-sm transition-all active:scale-95"
          >
            <Download size={16} /> Exportar
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Menú Lateral Estilizado */}
        <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto hidden md:block custom-scrollbar">
          <nav className="p-4 space-y-7">
            {SECCIONES.map((seccion) => (
              <div key={seccion.titulo}>
                <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  {seccion.titulo}
                </h3>
                <div className="space-y-0.5">
                  {seccion.items.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-[13px] transition-all group
                          ${isActive 
                            ? 'bg-blue-50 text-[#185FA5] font-semibold' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#185FA5]' : 'text-slate-400 group-hover:text-slate-600'} />
                          {item.label}
                        </div>
                        {isActive && <ChevronRight size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
          {/* Mobile Selector */}
          <div className="md:hidden p-4 bg-white border-b border-slate-200">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {SECCIONES.flatMap(s => s.items).map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          {/* Viewport de Componentes */}
          <div 
            ref={contentRef} 
            className="flex-1 overflow-y-auto p-6 md:p-8"
          >
            <div className="max-w-[1400px] mx-auto animate-in fade-in duration-500">
              <ActiveComp tabId={activeTab} />
            </div>
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #cbd5e1; }
      `}} />
    </div>
  );
}