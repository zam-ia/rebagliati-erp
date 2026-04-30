// src/pages/marketing/TabBriefingContenido.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Edit, Trash2, X, Save, Loader2, ClipboardList,
  CheckCircle, Clock, AlertTriangle, Eye
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────
const fmtFecha = (s) => {
  if (!s) return '—';
  try { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
  catch { return s; }
};

const hoy = () => new Date().toISOString().split('T')[0];

const TIPOS_CONTENIDO = ['Post', 'Historia', 'Reel', 'Carrusel', 'Copy WhatsApp', 'Email', 'Banner', 'Otro'];
const REDES_SOCIALES  = ['Facebook', 'Instagram', 'TikTok', 'WhatsApp', 'Todos'];
const OBJETIVOS       = ['Informar', 'Vender', 'Viralizar', 'Fidelizar', 'Otro'];
const ESTADOS         = ['pendiente', 'en_proceso', 'completado', 'rechazado'];

const badgeEstado = (estado) => {
  const map = {
    pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
    en_proceso: 'bg-blue-100 text-blue-700 border-blue-200',
    completado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rechazado: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[estado] || 'bg-gray-100 text-gray-600 border-gray-200';
};

const FORM_VACIO = {
  area_solicitante: '',
  nombre_solicitante: '',
  fecha_solicitud: hoy(),
  fecha_limite_entrega: '',
  tipo_contenido: 'Post',
  red_social: 'Facebook',
  objetivo: 'Informar',
  nombre_evento: '',
  fecha_evento: '',
  precio_oferta: '',
  mensaje_principal: '',
  publico_objetivo: '',
  ponente: '',
  beneficio_principal: '',
  cta: '',
  material_grafico: '',
  plantilla_definida: '',
  referencias_visuales: '',
  requiere_aprobacion: false,
  aprobado_jefatura: false,
  observaciones: '',
  estado: 'pendiente',
};

// ════════════════════════════════════════════════════════════════════════
export default function TabBriefingContenido() {
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);

  // ─── Cargar briefings ─────────────────────────────────────────────────
  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('briefings_contenido')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setBriefings(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  // ─── Abrir modal ──────────────────────────────────────────────────────
  const abrirModal = (item = null) => {
    if (item) {
      setEditandoId(item.id);
      setForm({
        area_solicitante: item.area_solicitante || '',
        nombre_solicitante: item.nombre_solicitante || '',
        fecha_solicitud: item.fecha_solicitud || hoy(),
        fecha_limite_entrega: item.fecha_limite_entrega || '',
        tipo_contenido: item.tipo_contenido || 'Post',
        red_social: item.red_social || 'Facebook',
        objetivo: item.objetivo || 'Informar',
        nombre_evento: item.nombre_evento || '',
        fecha_evento: item.fecha_evento || '',
        precio_oferta: item.precio_oferta || '',
        mensaje_principal: item.mensaje_principal || '',
        publico_objetivo: item.publico_objetivo || '',
        ponente: item.ponente || '',
        beneficio_principal: item.beneficio_principal || '',
        cta: item.cta || '',
        material_grafico: item.material_grafico || '',
        plantilla_definida: item.plantilla_definida || '',
        referencias_visuales: item.referencias_visuales || '',
        requiere_aprobacion: item.requiere_aprobacion || false,
        aprobado_jefatura: item.aprobado_jefatura || false,
        observaciones: item.observaciones || '',
        estado: item.estado || 'pendiente',
      });
    } else {
      setEditandoId(null);
      setForm(FORM_VACIO);
    }
    setShowModal(true);
  };

  // ─── Guardar ──────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.area_solicitante || !form.nombre_solicitante || !form.fecha_limite_entrega ||
        !form.mensaje_principal || !form.publico_objetivo || !form.beneficio_principal || !form.cta) {
      alert('Completa todos los campos obligatorios (marcados con *)');
      return;
    }
    try {
      if (editandoId) {
        await supabase.from('briefings_contenido').update(form).eq('id', editandoId);
      } else {
        await supabase.from('briefings_contenido').insert([form]);
      }
      setShowModal(false);
      cargar();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  // ─── Eliminar ─────────────────────────────────────────────────────────
  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este briefing?')) return;
    await supabase.from('briefings_contenido').delete().eq('id', id);
    cargar();
  };

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-[#185FA5]" size={24} />
      <span className="text-gray-500 font-medium">Cargando briefings...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <ClipboardList className="w-5 h-5 text-[#185FA5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Briefing de Contenido</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Formulario obligatorio antes de solicitar contenido al CM
            </p>
          </div>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all flex items-center gap-2">
          <Plus size={14} /> Nuevo Briefing
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Solicitante</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Tipo</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Objetivo</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Entrega</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {briefings.map(b => (
              <tr key={b.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-4">
                  <p className="font-bold text-gray-800 text-xs">{b.nombre_solicitante}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{b.area_solicitante}</p>
                </td>
                <td className="p-4 text-xs text-gray-600 font-medium">{b.tipo_contenido} · {b.red_social}</td>
                <td className="p-4 text-xs text-gray-600 font-medium">{b.objetivo}</td>
                <td className="p-4 text-xs text-gray-600 font-mono">{fmtFecha(b.fecha_limite_entrega)}</td>
                <td className="p-4 text-center">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${badgeEstado(b.estado)}`}>
                    {b.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => abrirModal(b)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={14}/></button>
                    <button onClick={() => eliminar(b.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {briefings.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-medium">Sin briefings registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ════════════════════ MODAL ════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Cabecera sticky */}
            <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h3 className="text-lg font-black text-[#11284e]">
                {editandoId ? 'Editar Briefing' : 'Nuevo Briefing de Contenido'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
            </div>
            {/* Contenido scrolleable */}
            <div className="overflow-y-auto p-6 pt-4 space-y-5">
              <Input label="Área solicitante *" value={form.area_solicitante} onChange={e => setForm({...form, area_solicitante: e.target.value})} />
              <Input label="Nombre del solicitante *" value={form.nombre_solicitante} onChange={e => setForm({...form, nombre_solicitante: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha de solicitud" type="date" value={form.fecha_solicitud} onChange={e => setForm({...form, fecha_solicitud: e.target.value})} />
                <Input label="Fecha límite de entrega *" type="date" value={form.fecha_limite_entrega} onChange={e => setForm({...form, fecha_limite_entrega: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Tipo de contenido *" value={form.tipo_contenido} onChange={e => setForm({...form, tipo_contenido: e.target.value})} options={TIPOS_CONTENIDO} />
                <Select label="Red social / Canal *" value={form.red_social} onChange={e => setForm({...form, red_social: e.target.value})} options={REDES_SOCIALES} />
              </div>
              <Select label="Objetivo *" value={form.objetivo} onChange={e => setForm({...form, objetivo: e.target.value})} options={OBJETIVOS} />
              <Input label="Nombre del evento o producto" value={form.nombre_evento} onChange={e => setForm({...form, nombre_evento: e.target.value})} />
              <Input label="Fecha del evento" type="date" value={form.fecha_evento} onChange={e => setForm({...form, fecha_evento: e.target.value})} />
              <Input label="Precio / Oferta activa" value={form.precio_oferta} onChange={e => setForm({...form, precio_oferta: e.target.value})} />
              <Textarea label="Mensaje principal *" value={form.mensaje_principal} onChange={e => setForm({...form, mensaje_principal: e.target.value})} />
              <Input label="Público objetivo *" value={form.publico_objetivo} onChange={e => setForm({...form, publico_objetivo: e.target.value})} />
              <Input label="Ponente / Especialista" value={form.ponente} onChange={e => setForm({...form, ponente: e.target.value})} />
              <Input label="Beneficio principal *" value={form.beneficio_principal} onChange={e => setForm({...form, beneficio_principal: e.target.value})} />
              <Input label="CTA (llamado a acción) *" value={form.cta} onChange={e => setForm({...form, cta: e.target.value})} />
              <Input label="Material gráfico disponible" value={form.material_grafico} onChange={e => setForm({...form, material_grafico: e.target.value})} />
              <Input label="Plantilla definida" value={form.plantilla_definida} onChange={e => setForm({...form, plantilla_definida: e.target.value})} />
              <Input label="Referencias visuales" value={form.referencias_visuales} onChange={e => setForm({...form, referencias_visuales: e.target.value})} />
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.requiere_aprobacion} onChange={e => setForm({...form, requiere_aprobacion: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">¿Requiere aprobación previa?</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.aprobado_jefatura} onChange={e => setForm({...form, aprobado_jefatura: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Aprobado por jefatura</span>
                </label>
              </div>
              <Textarea label="Observaciones" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} />
              <Select label="Estado" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} options={ESTADOS} />
            </div>
            <div className="p-6 pt-2 border-t border-gray-100">
              <button onClick={guardar}
                className="w-full bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-3.5 rounded-xl font-black text-sm hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
                <Save size={16} /> Guardar Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ─────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange}
        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" />
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">{label}</label>
      <textarea value={value} onChange={onChange} rows={2}
        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-y" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">{label}</label>
      <select value={value} onChange={onChange}
        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}