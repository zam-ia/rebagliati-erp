// src/pages/marketing/TabCalendarioContenido.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Edit, Trash2, X, Save, Loader2, CalendarDays,
  Filter, ChevronLeft, ChevronRight, Eye, Clock
} from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────
const PILARES = ['Valor', 'Ventas', 'Viral'];
const TIPOS_CONTENIDO = ['Post', 'Reel', 'Historia', 'Carrusel', 'Copy WhatsApp', 'Email', 'Banner'];
const REDES = ['Facebook', 'Instagram', 'TikTok', 'WhatsApp', 'Todos'];
const ESTADOS = ['Idea', 'En diseño', 'Aprobación', 'Programado', 'Publicado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const badgePilar = (pilar) => {
  const map = {
    Valor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Ventas: 'bg-red-100 text-red-800 border-red-200',
    Viral: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  return map[pilar] || 'bg-gray-100 text-gray-600 border-gray-200';
};

const badgeEstado = (estado) => {
  const map = {
    'Idea': 'bg-gray-100 text-gray-600 border-gray-200',
    'En diseño': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Aprobación': 'bg-blue-100 text-blue-800 border-blue-200',
    'Programado': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Publicado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return map[estado] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().split('T')[0];
const fmtFecha = (s) => {
  if (!s) return '—';
  try { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
  catch { return s; }
};

const FORM_VACIO = {
  fecha_publicacion: hoy(),
  hora: '09:00',
  tipo_contenido: 'Post',
  red_social: 'Facebook',
  pilar: 'Valor',
  titulo: '',
  descripcion: '',
  evento_asociado: '',
  estado: 'Idea',
  responsable: '',
  enlace: '',
  observaciones: '',
};

// ═══════════════════════════════════════════════════════════════════════════
export default function TabCalendarioContenido() {
  const [publicaciones, setPublicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('mensual');         // 'mensual' | 'lista'
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0,7));
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [filtroPilar, setFiltroPilar] = useState('Todos');

  // ─── Cargar publicaciones ───────────────────────────────────────────────
  const cargar = async () => {
    setLoading(true);
    const inicio = `${mesActual}-01`;
    const fin = new Date(mesActual.split('-')[0], mesActual.split('-')[1], 0).toISOString().slice(0,10);
    let query = supabase.from('calendario_contenido').select('*').gte('fecha_publicacion', inicio).lte('fecha_publicacion', fin);
    if (filtroPilar !== 'Todos') query = query.eq('pilar', filtroPilar);
    const { data, error } = await query.order('fecha_publicacion', { ascending: true });
    if (!error) setPublicaciones(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [mesActual, filtroPilar]);

  // ─── Navegación de mes ─────────────────────────────────────────────────
  const cambiarMes = (dir) => {
    const [y, m] = mesActual.split('-').map(Number);
    const date = new Date(y, m - 1 + dir, 1);
    setMesActual(date.toISOString().slice(0,7));
  };

  // ─── Abrir modal ────────────────────────────────────────────────────────
  const abrirModal = (item = null) => {
    if (item) {
      setEditandoId(item.id);
      setForm({
        fecha_publicacion: item.fecha_publicacion || hoy(),
        hora: item.hora || '09:00',
        tipo_contenido: item.tipo_contenido || 'Post',
        red_social: item.red_social || 'Facebook',
        pilar: item.pilar || 'Valor',
        titulo: item.titulo || '',
        descripcion: item.descripcion || '',
        evento_asociado: item.evento_asociado || '',
        estado: item.estado || 'Idea',
        responsable: item.responsable || '',
        enlace: item.enlace || '',
        observaciones: item.observaciones || '',
      });
    } else {
      setEditandoId(null);
      setForm(FORM_VACIO);
    }
    setShowModal(true);
  };

  // ─── Guardar ────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.titulo || !form.fecha_publicacion) {
      alert('El título y la fecha son obligatorios');
      return;
    }
    try {
      if (editandoId) {
        await supabase.from('calendario_contenido').update(form).eq('id', editandoId);
      } else {
        await supabase.from('calendario_contenido').insert([form]);
      }
      setShowModal(false);
      cargar();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  // ─── Eliminar ───────────────────────────────────────────────────────────
  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta publicación?')) return;
    await supabase.from('calendario_contenido').delete().eq('id', id);
    cargar();
  };

  // ─── Días del mes ───────────────────────────────────────────────────────
  const diasDelMes = (mesStr) => {
    const [y, m] = mesStr.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const dias = diasDelMes(mesActual);
  const primerDiaSemana = new Date(mesActual + '-01').getDay(); // 0=Dom

  // ─── Agrupar publicaciones por día ─────────────────────────────────────
  const pubPorDia = {};
  publicaciones.forEach(p => {
    const dia = parseInt(p.fecha_publicacion.split('-')[2], 10);
    if (!pubPorDia[dia]) pubPorDia[dia] = [];
    pubPorDia[dia].push(p);
  });

  // ─── RENDER ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-[#185FA5]" size={24} />
      <span className="text-gray-500 font-medium">Cargando calendario...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <CalendarDays className="w-5 h-5 text-[#185FA5]" />
          </div>
          <h2 className="text-xl font-black text-[#0B1527] uppercase tracking-tight">Calendario de Contenido</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"><ChevronLeft size={16}/></button>
          <span className="font-bold text-sm min-w-[140px] text-center text-gray-800">
            {MESES[parseInt(mesActual.split('-')[1])-1]} {mesActual.split('-')[0]}
          </span>
          <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"><ChevronRight size={16}/></button>
          <button onClick={() => setVista(v => v === 'mensual' ? 'lista' : 'mensual')}
            className="text-xs border-2 border-gray-100 px-3 py-1.5 rounded-xl font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-200 transition-all">
            {vista === 'mensual' ? 'Vista lista' : 'Vista mensual'}
          </button>
          <Filter size={14} className="text-gray-400 ml-2"/>
          {['Todos', ...PILARES].map(p => (
            <button key={p} onClick={() => setFiltroPilar(p)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                filtroPilar === p ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {p}
            </button>
          ))}
          <button onClick={() => abrirModal()}
            className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-[0.98]">
            <Plus size={14} /> Nueva Publicación
          </button>
        </div>
      </div>

      {/* Vista Mensual */}
      {vista === 'mensual' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
          <div className="grid grid-cols-7 text-center text-xs font-bold bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} className="p-3 text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {/* Espacios vacíos al inicio */}
            {Array.from({length: primerDiaSemana}).map((_, i) => (
              <div key={'empty'+i} className="border border-gray-50 min-h-[110px] p-1.5 bg-gray-50/30" />
            ))}
            {Array.from({length: dias}).map((_, i) => {
              const dia = i + 1;
              const pubs = pubPorDia[dia] || [];
              const esHoy = dia === new Date().getDate() && mesActual === new Date().toISOString().slice(0,7);
              return (
                <div key={dia} className={`border border-gray-50 min-h-[110px] p-1.5 hover:bg-blue-50/20 transition-colors cursor-pointer ${esHoy ? 'bg-blue-50/50 ring-1 ring-blue-200' : ''}`}>
                  <div className={`text-[10px] font-bold mb-1.5 ${esHoy ? 'text-[#185FA5]' : 'text-gray-500'}`}>
                    {dia}
                  </div>
                  <div className="space-y-0.5">
                    {pubs.slice(0,3).map(p => (
                      <div key={p.id}
                        onClick={(e) => { e.stopPropagation(); abrirModal(p); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded-lg cursor-pointer truncate font-bold border ${badgePilar(p.pilar)}`}
                        title={p.titulo}>
                        {p.titulo}
                      </div>
                    ))}
                    {pubs.length > 3 && <div className="text-[9px] text-gray-400 font-medium">+{pubs.length-3} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista Lista */}
      {vista === 'lista' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Título</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Pilar</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Red</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {publicaciones.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 text-xs font-mono text-gray-700">
                    <span className="block">{fmtFecha(p.fecha_publicacion)}</span>
                    <span className="text-[10px] text-gray-400">{p.hora}</span>
                  </td>
                  <td className="p-4 text-xs font-bold text-gray-800">{p.titulo}</td>
                  <td className="p-4 text-xs text-gray-600">{p.tipo_contenido}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${badgePilar(p.pilar)}`}>
                      {p.pilar}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-600 font-medium">{p.red_social}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${badgeEstado(p.estado)}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => abrirModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={14}/></button>
                      <button onClick={() => eliminar(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {publicaciones.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-medium">Sin publicaciones este mes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════════ MODAL ════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h3 className="text-lg font-black text-[#11284e]">{editandoId ? 'Editar' : 'Nueva'} Publicación</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
            </div>
            <div className="overflow-y-auto p-6 pt-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha *" type="date" value={form.fecha_publicacion} onChange={e => setForm({...form, fecha_publicacion: e.target.value})} />
                <Input label="Hora" type="time" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
              </div>
              <Input label="Título *" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ej: Tips de Enfermería - Prevención de úlceras" />
              <Textarea label="Descripción / Copy" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Tipo de contenido" value={form.tipo_contenido} onChange={e => setForm({...form, tipo_contenido: e.target.value})} options={TIPOS_CONTENIDO} />
                <Select label="Red social" value={form.red_social} onChange={e => setForm({...form, red_social: e.target.value})} options={REDES} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Pilar" value={form.pilar} onChange={e => setForm({...form, pilar: e.target.value})} options={PILARES} />
                <Select label="Estado" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} options={ESTADOS} />
              </div>
              <Input label="Evento asociado" value={form.evento_asociado} onChange={e => setForm({...form, evento_asociado: e.target.value})} placeholder="Ej: Micología Podológica" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Responsable" value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})} placeholder="Community Manager" />
                <Input label="Enlace (opcional)" value={form.enlace} onChange={e => setForm({...form, enlace: e.target.value})} placeholder="https://..." />
              </div>
              <Textarea label="Observaciones" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} />
            </div>
            <div className="p-6 pt-2 border-t border-gray-100">
              <button onClick={guardar}
                className="w-full bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-3.5 rounded-xl font-black text-sm hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
                <Save size={16} /> Guardar Publicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ──────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
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