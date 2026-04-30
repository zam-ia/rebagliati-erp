// src/pages/marketing/TabPlaneacionEstrategica.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Edit, Trash2, Target, Users, UserCheck, X,
  Save, Loader2, TrendingUp, DollarSign, BarChart3,
  Calendar, Flag, PieChart, Radio, Lightbulb, Eye,
  ChevronDown, ChevronRight
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────
const mesActual = () => new Date().toISOString().slice(0, 7);
const fmt = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('es-PE').format(num);
};

// ─── Secciones del módulo ─────────────────────────────────────────────────
const SECCIONES = [
  { id: 'periodos',        label: 'Periodos',          icon: <Calendar size={15} /> },
  { id: 'objetivos',       label: 'Objetivos',         icon: <Flag size={15} /> },
  { id: 'kpis',            label: 'Metas KPIs',        icon: <PieChart size={15} /> },
  { id: 'segmentos',       label: 'Segmentos',         icon: <BarChart3 size={15} /> },
  { id: 'buyer_personas',  label: 'Buyer Personas',    icon: <UserCheck size={15} /> },
  { id: 'propuesta_valor', label: 'Propuesta de Valor',icon: <Lightbulb size={15} /> },
  { id: 'estrategias',     label: 'Estrategias',       icon: <Radio size={15} /> },
  { id: 'roi',             label: 'Proyección ROI',    icon: <TrendingUp size={15} /> },
];

// ─── Constantes de tipos ──────────────────────────────────────────────────
const TIPOS_META = ['leads','ventas','ingresos','conversion','CPL','CPA','ROI'];
const CANALES = ['Facebook Ads','Instagram','TikTok','WhatsApp','Email'];
const PRIORIDADES = ['alta','media','baja'];

// ═════════════════════════════════════════════════════════════════════════
export default function TabPlaneacionEstrategica() {
  // ── Estados ──────────────────────────────────────────────────────────
  const [seccionActiva, setSeccionActiva] = useState('periodos');
  const [loading, setLoading] = useState(true);

  // Datos
  const [periodos, setPeriodos] = useState([]);
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [objetivos, setObjetivos] = useState([]);
  const [metas, setMetas] = useState([]);
  const [segmentos, setSegmentos] = useState([]);
  const [buyerPersonas, setBuyerPersonas] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [estrategias, setEstrategias] = useState([]);
  const [roiData, setRoiData] = useState([]);

  // Modal genérico
  const [showModal, setShowModal] = useState(false);
  const [modalTipo, setModalTipo] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({});

  // ── Carga inicial ─────────────────────────────────────────────────────
  useEffect(() => { cargarPeriodos(); }, []);

  const cargarPeriodos = async () => {
    setLoading(true);
    const { data } = await supabase.from('periodos_planificacion').select('*').order('fecha_inicio', { ascending: false });
    setPeriodos(data || []);
    const activo = data?.find(p => p.estado === 'activo') || data?.[0];
    setPeriodoActivo(activo);
    if (activo) await cargarDatosDePeriodo(activo.id);
    setLoading(false);
  };

  // CORREGIDO: se usa periodo_id en todas las consultas
  const cargarDatosDePeriodo = async (periodoId) => {
    try {
      const [
        { data: obj, error: errObj },
        { data: met, error: errMet },
        { data: seg, error: errSeg },
        { data: buy, error: errBuy },
        { data: prop, error: errProp },
        { data: est, error: errEst },
        { data: roi, error: errRoi }
      ] = await Promise.all([
        supabase.from('objetivos_generales').select('*').eq('periodo_id', periodoId),
        supabase.from('metas_kpi').select('*').eq('periodo_id', periodoId),
        supabase.from('segmentos_cliente').select('*').eq('periodo_id', periodoId),
        supabase.from('buyer_personas').select('*'),
        supabase.from('propuesta_valor').select('*'),
        supabase.from('estrategias_canal').select('*').eq('periodo_id', periodoId),
        supabase.from('proyeccion_roi').select('*').eq('periodo_id', periodoId),
      ]);

      if (errObj) console.error('Error cargando objetivos:', errObj);
      if (errMet) console.error('Error cargando metas:', errMet);
      if (errSeg) console.error('Error cargando segmentos:', errSeg);
      if (errBuy) console.error('Error cargando buyer personas:', errBuy);
      if (errProp) console.error('Error cargando propuestas:', errProp);
      if (errEst) console.error('Error cargando estrategias:', errEst);
      if (errRoi) console.error('Error cargando ROI:', errRoi);

      setObjetivos(obj || []);
      setMetas(met || []);
      setSegmentos(seg || []);
      setBuyerPersonas(buy || []);
      setPropuestas(prop || []);
      setEstrategias(est || []);
      setRoiData(roi || []);

      console.log(`Datos recargados para periodo ${periodoId}:`, {
        objetivos: obj?.length || 0,
        metas: met?.length || 0,
        segmentos: seg?.length || 0,
      });
    } catch (err) {
      console.error('Error al cargar datos del periodo:', err);
    }
  };

  const cambiarPeriodoActivo = async (periodo) => {
    setPeriodoActivo(periodo);
    await cargarDatosDePeriodo(periodo.id);
  };

  // ─── Abrir modal ──────────────────────────────────────────────────────
  const abrirModal = (tipo, item = null) => {
    setModalTipo(tipo);
    setEditandoId(item?.id || null);
    setFormData(item || valoresDefault(tipo));
    setShowModal(true);
  };

  const valoresDefault = (tipo) => {
    switch (tipo) {
      case 'periodo':     return { nombre: '', fecha_inicio: '', fecha_fin: '', estado: 'activo' };
      // CORREGIDO: se usa periodo_id en lugar de period_id
      case 'objetivo':    return { periodo_id: periodoActivo?.id, nombre: '', descripcion: '', prioridad: 'media', estado: 'activo' };
      case 'kpi':         return { periodo_id: periodoActivo?.id, tipo_meta: 'leads', valor_objetivo: 0, valor_real: 0 };
      case 'segmento':    return { periodo_id: periodoActivo?.id, nombre: '', descripcion: '', profesion: '', edad_min: 0, edad_max: 0, ubicacion: '', nivel_educativo: '', problema_principal: '' };
      case 'buyer':       return { id_segmento: '', nombre_ficticio: '', edad: 0, profesion: '', objetivo: '', frustraciones: '', motivaciones: '', objeciones: '', canales_preferidos: '', tipo_contenido: '' };
      case 'propuesta':   return { id_segmento: '', problema: '', solucion: '', diferenciador: '', mensaje_clave: '' };
      case 'estrategia':  return { periodo_id: periodoActivo?.id, canal: 'Facebook Ads', objetivo: '', tipo_contenido: '', frecuencia: '', presupuesto: 0 };
      case 'roi':         return { periodo_id: periodoActivo?.id, inversion_total: 0, leads_estimados: 0, ventas_estimadas: 0, ingreso_estimado: 0 };
      default: return {};
    }
  };

  // ─── Guardar (con manejo de errores y recarga total) ───────────────────
  const guardar = async () => {
    const tabla = mapearTabla(modalTipo);
    if (!tabla) return;
    try {
      if (editandoId) {
        const { error } = await supabase.from(tabla).update(formData).eq('id', editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tabla).insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      // Recarga completa: vuelve a consultar todos los periodos y el periodo activo
      await cargarPeriodos();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const eliminar = async (tipo, id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const tabla = mapearTabla(tipo);
    await supabase.from(tabla).delete().eq('id', id);
    if (tipo === 'periodo') await cargarPeriodos();
    else await cargarDatosDePeriodo(periodoActivo.id);
  };

  const mapearTabla = (tipo) => {
    const map = {
      periodo: 'periodos_planificacion', objetivo: 'objetivos_generales', kpi: 'metas_kpi',
      segmento: 'segmentos_cliente', buyer: 'buyer_personas', propuesta: 'propuesta_valor',
      estrategia: 'estrategias_canal', roi: 'proyeccion_roi'
    };
    return map[tipo] || null;
  };

  // ─── Render de cada sección ───────────────────────────────────────────
  const renderSeccion = () => {
    if (!periodoActivo && seccionActiva !== 'periodos') {
      return (
        <div className="text-center py-16 text-gray-400 bg-white/60 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-sm">
          <Calendar size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg text-gray-600">No hay un periodo activo</p>
          <p className="text-sm mt-1">Crea un periodo en la sección "Periodos" para comenzar.</p>
        </div>
      );
    }

    switch (seccionActiva) {
      case 'periodos':        return renderPeriodos();
      case 'objetivos':       return renderTabla('objetivos_generales', 'objetivo', ['nombre','descripcion','prioridad','estado']);
      case 'kpis':            return renderKPIs();
      case 'segmentos':       return renderTabla('segmentos_cliente', 'segmento', ['nombre','profesion','edad_min','edad_max','ubicacion']);
      case 'buyer_personas':  return renderBuyerPersonas();
      case 'propuesta_valor': return renderTabla('propuesta_valor', 'propuesta', ['problema','solucion','diferenciador','mensaje_clave']);
      case 'estrategias':     return renderEstrategias();
      case 'roi':             return renderROI();
      default: return null;
    }
  };

  // ─── Render Periodos ──────────────────────────────────────────────────
  const renderPeriodos = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-gray-800 text-sm uppercase flex items-center gap-2">
          <Calendar size={18} className="text-[#185FA5]" /> Periodos de Planificación
        </h3>
        <button onClick={() => abrirModal('periodo')}
          className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 hover:shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
          <Plus size={14} /> Nuevo Periodo
        </button>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Inicio</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Fin</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {periodos.map(p => (
              <tr key={p.id} className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${periodoActivo?.id === p.id ? 'bg-blue-50/50' : ''}`}
                onClick={() => cambiarPeriodoActivo(p)}>
                <td className="p-4 font-bold text-gray-700 text-xs">{p.nombre}</td>
                <td className="p-4 text-xs text-gray-600">{p.fecha_inicio}</td>
                <td className="p-4 text-xs text-gray-600">{p.fecha_fin}</td>
                <td className="p-4 text-center">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${p.estado === 'activo' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{p.estado}</span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); abrirModal('periodo', p); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); eliminar('periodo', p.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {periodos.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">Sin periodos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Render KPIs ──────────────────────────────────────────────────────
  const renderKPIs = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-gray-800 text-sm uppercase flex items-center gap-2">
          <PieChart size={18} className="text-[#185FA5]" /> Metas Cuantitativas (KPIs)
        </h3>
        <button onClick={() => abrirModal('kpi')}
          className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 hover:shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
          <Plus size={14} /> Nueva Meta
        </button>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Tipo</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Objetivo</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Real</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">% Cumpl.</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {metas.map(m => (
              <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-4 font-bold text-xs uppercase text-gray-700">{m.tipo_meta}</td>
                <td className="p-4 text-right font-mono text-xs text-gray-600">{fmt(m.valor_objetivo)}</td>
                <td className="p-4 text-right font-mono text-xs text-gray-600">{fmt(m.valor_real)}</td>
                <td className="p-4 text-right font-bold text-xs text-[#185FA5]">{m.porcentaje_cumplimiento?.toFixed(1)}%</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => abrirModal('kpi', m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={14}/></button>
                    <button onClick={() => eliminar('kpi', m.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {metas.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">Sin KPIs definidos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Tablas genéricas ─────────────────────────────────────────────────
  const renderTabla = (tabla, tipo, campos) => {
    const datos = tipo === 'objetivo' ? objetivos : tipo === 'segmento' ? segmentos : tipo === 'propuesta' ? propuestas : [];
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-gray-800 text-sm uppercase flex items-center gap-2">
            {tipo === 'objetivo' ? <Flag size={18} className="text-[#185FA5]" /> : tipo === 'segmento' ? <BarChart3 size={18} className="text-[#185FA5]" /> : <Lightbulb size={18} className="text-[#185FA5]" />}
            {tipo === 'objetivo' ? 'Objetivos Generales' : tipo === 'segmento' ? 'Segmentos de Cliente' : 'Propuesta de Valor'}
          </h3>
          <button onClick={() => abrirModal(tipo)}
            className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 hover:shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
            <Plus size={14} /> Nuevo
          </button>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                {campos.map(c => <th key={c} className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">{c}</th>)}
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  {campos.map(c => <td key={c} className="p-4 text-xs text-gray-700 truncate max-w-[200px]">{item[c] || '—'}</td>)}
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => abrirModal(tipo, item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={14}/></button>
                      <button onClick={() => eliminar(tipo, item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {datos.length === 0 && <tr><td colSpan={campos.length + 1} className="p-10 text-center text-gray-400">Sin registros</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Buyer Personas ───────────────────────────────────────────────────
  const renderBuyerPersonas = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-gray-800 text-sm uppercase flex items-center gap-2">
          <UserCheck size={18} className="text-[#185FA5]" /> Buyer Personas
        </h3>
        <button onClick={() => abrirModal('buyer')}
          className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 hover:shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
          <Plus size={14} /> Nuevo Buyer
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buyerPersonas.map(bp => (
          <div key={bp.id} className="bg-white/80 backdrop-blur-sm border border-blue-50 rounded-2xl p-5 hover:shadow-lg hover:border-blue-200 transition-all group">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {bp.nombre_ficticio?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{bp.nombre_ficticio}</p>
                  <p className="text-xs text-gray-500">{bp.profesion} · {bp.edad} años</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => abrirModal('buyer', bp)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14}/></button>
                <button onClick={() => eliminar('buyer', bp.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-600"><strong className="text-gray-800">Objetivo:</strong> {bp.objetivo}</p>
              <p className="text-xs text-gray-600"><strong className="text-gray-800">Frustraciones:</strong> {bp.frustraciones}</p>
              <p className="text-xs text-gray-600"><strong className="text-gray-800">Canales:</strong> {bp.canales_preferidos}</p>
            </div>
          </div>
        ))}
        {buyerPersonas.length === 0 && <div className="col-span-2 p-10 text-center text-gray-400 bg-white/60 rounded-3xl">Sin buyer personas definidos</div>}
      </div>
    </div>
  );

  // ─── Estrategias ──────────────────────────────────────────────────────
  const renderEstrategias = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-gray-800 text-sm uppercase flex items-center gap-2">
          <Radio size={18} className="text-[#185FA5]" /> Estrategias por Canal
        </h3>
        <button onClick={() => abrirModal('estrategia')}
          className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 hover:shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
          <Plus size={14} /> Nueva Estrategia
        </button>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Canal</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Objetivo</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Contenido</th>
              <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Frecuencia</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Presupuesto</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {estrategias.map(e => (
              <tr key={e.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-4 font-bold text-xs text-gray-700">{e.canal}</td>
                <td className="p-4 text-xs text-gray-600">{e.objetivo}</td>
                <td className="p-4 text-xs text-gray-600">{e.tipo_contenido}</td>
                <td className="p-4 text-xs text-gray-600">{e.frecuencia}</td>
                <td className="p-4 text-right font-mono text-xs text-gray-700">S/ {fmt(e.presupuesto)}</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => abrirModal('estrategia', e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={14}/></button>
                    <button onClick={() => eliminar('estrategia', e.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {estrategias.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-gray-400">Sin estrategias definidas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── ROI ──────────────────────────────────────────────────────────────
  const renderROI = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-gray-800 text-sm uppercase flex items-center gap-2">
          <TrendingUp size={18} className="text-[#185FA5]" /> Proyección de ROI
        </h3>
        <button onClick={() => abrirModal('roi')}
          className="bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 hover:shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
          <Plus size={14} /> Nueva Proyección
        </button>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Inversión</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Leads Est.</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Ventas Est.</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Ingreso Est.</th>
              <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">ROI Est.</th>
              <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {roiData.map(r => (
              <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-4 text-right font-mono text-xs text-gray-700">S/ {fmt(r.inversion_total)}</td>
                <td className="p-4 text-right font-mono text-xs text-gray-700">{fmt(r.leads_estimados)}</td>
                <td className="p-4 text-right font-mono text-xs text-gray-700">{fmt(r.ventas_estimadas)}</td>
                <td className="p-4 text-right font-mono text-xs text-gray-700">S/ {fmt(r.ingreso_estimado)}</td>
                <td className="p-4 text-right font-bold text-xs text-emerald-600">{r.roi_estimado?.toFixed(1)}%</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => abrirModal('roi', r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={14}/></button>
                    <button onClick={() => eliminar('roi', r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {roiData.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-gray-400">Sin proyecciones</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── MODAL DINÁMICO ───────────────────────────────────────────────────
  const renderModalContent = () => {
    const inputClass = "w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all";
    const labelClass = "text-xs font-bold text-gray-500 uppercase block mb-1.5";
    switch (modalTipo) {
      case 'periodo':
        return (
          <>
            <label className={labelClass}>Nombre</label>
            <input type="text" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} className={`${inputClass} mb-4`} />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={labelClass}>Inicio</label>
                <input type="date" value={formData.fecha_inicio || ''} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fin</label>
                <input type="date" value={formData.fecha_fin || ''} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} className={inputClass} />
              </div>
            </div>
            <label className={labelClass}>Estado</label>
            <select value={formData.estado || 'activo'} onChange={e => setFormData({...formData, estado: e.target.value})} className={`${inputClass} mb-4`}>
              <option value="activo">Activo</option><option value="cerrado">Cerrado</option>
            </select>
          </>
        );
      case 'objetivo':
        return (
          <>
            <input type="text" placeholder="Nombre del objetivo" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} className={`${inputClass} mb-4`} />
            <textarea placeholder="Descripción" value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} className={`${inputClass} h-24 resize-y mb-4`} />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={labelClass}>Prioridad</label>
                <select value={formData.prioridad || 'media'} onChange={e => setFormData({...formData, prioridad: e.target.value})} className={inputClass}>
                  {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select value={formData.estado || 'activo'} onChange={e => setFormData({...formData, estado: e.target.value})} className={inputClass}>
                  <option value="activo">Activo</option><option value="logrado">Logrado</option>
                </select>
              </div>
            </div>
          </>
        );
      case 'kpi':
        return (
          <>
            <label className={labelClass}>Tipo de Meta</label>
            <select value={formData.tipo_meta || 'leads'} onChange={e => setFormData({...formData, tipo_meta: e.target.value})} className={`${inputClass} mb-4`}>
              {TIPOS_META.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={labelClass}>Valor Objetivo</label>
                <input type="number" value={formData.valor_objetivo || 0} onChange={e => setFormData({...formData, valor_objetivo: Number(e.target.value)})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Valor Real</label>
                <input type="number" value={formData.valor_real || 0} onChange={e => setFormData({...formData, valor_real: Number(e.target.value)})} className={inputClass} />
              </div>
            </div>
          </>
        );
      case 'segmento':
        return (
          <>
            <input type="text" placeholder="Nombre" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} className={`${inputClass} mb-4`} />
            <textarea placeholder="Descripción" value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} className={`${inputClass} h-24 resize-y mb-4`} />
            <input type="text" placeholder="Profesión" value={formData.profesion || ''} onChange={e => setFormData({...formData, profesion: e.target.value})} className={`${inputClass} mb-4`} />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input type="number" placeholder="Edad mín" value={formData.edad_min || 0} onChange={e => setFormData({...formData, edad_min: Number(e.target.value)})} className={inputClass} />
              <input type="number" placeholder="Edad máx" value={formData.edad_max || 0} onChange={e => setFormData({...formData, edad_max: Number(e.target.value)})} className={inputClass} />
            </div>
            <input type="text" placeholder="Ubicación" value={formData.ubicacion || ''} onChange={e => setFormData({...formData, ubicacion: e.target.value})} className={`${inputClass} mb-4`} />
            <input type="text" placeholder="Problema principal" value={formData.problema_principal || ''} onChange={e => setFormData({...formData, problema_principal: e.target.value})} className={inputClass} />
          </>
        );
      case 'buyer':
        return (
          <div className="space-y-4">
            <input type="text" placeholder="Nombre ficticio *" value={formData.nombre_ficticio || ''} onChange={e => setFormData({...formData, nombre_ficticio: e.target.value})} className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Edad" value={formData.edad || ''} onChange={e => setFormData({...formData, edad: Number(e.target.value)})} className={inputClass} />
              <input type="text" placeholder="Profesión" value={formData.profesion || ''} onChange={e => setFormData({...formData, profesion: e.target.value})} className={inputClass} />
            </div>
            <textarea placeholder="Objetivo" value={formData.objetivo || ''} onChange={e => setFormData({...formData, objetivo: e.target.value})} className={`${inputClass} h-20 resize-y`} />
            <textarea placeholder="Frustraciones" value={formData.frustraciones || ''} onChange={e => setFormData({...formData, frustraciones: e.target.value})} className={`${inputClass} h-20 resize-y`} />
            <textarea placeholder="Motivaciones" value={formData.motivaciones || ''} onChange={e => setFormData({...formData, motivaciones: e.target.value})} className={`${inputClass} h-20 resize-y`} />
            <textarea placeholder="Objeciones" value={formData.objeciones || ''} onChange={e => setFormData({...formData, objeciones: e.target.value})} className={`${inputClass} h-20 resize-y`} />
            <input type="text" placeholder="Canales preferidos" value={formData.canales_preferidos || ''} onChange={e => setFormData({...formData, canales_preferidos: e.target.value})} className={inputClass} />
            <input type="text" placeholder="Tipo de contenido" value={formData.tipo_contenido || ''} onChange={e => setFormData({...formData, tipo_contenido: e.target.value})} className={inputClass} />
          </div>
        );
      case 'propuesta':
        return (
          <div className="space-y-4">
            <select value={formData.id_segmento || ''} onChange={e => setFormData({...formData, id_segmento: e.target.value})} className={inputClass}>
              <option value="">Seleccionar segmento...</option>
              {segmentos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <textarea placeholder="Problema" value={formData.problema || ''} onChange={e => setFormData({...formData, problema: e.target.value})} className={`${inputClass} h-20 resize-y`} />
            <textarea placeholder="Solución" value={formData.solucion || ''} onChange={e => setFormData({...formData, solucion: e.target.value})} className={`${inputClass} h-20 resize-y`} />
            <input type="text" placeholder="Diferenciador" value={formData.diferenciador || ''} onChange={e => setFormData({...formData, diferenciador: e.target.value})} className={inputClass} />
            <input type="text" placeholder="Mensaje clave" value={formData.mensaje_clave || ''} onChange={e => setFormData({...formData, mensaje_clave: e.target.value})} className={inputClass} />
          </div>
        );
      case 'estrategia':
        return (
          <div className="space-y-4">
            <label className={labelClass}>Canal</label>
            <select value={formData.canal || 'Facebook Ads'} onChange={e => setFormData({...formData, canal: e.target.value})} className={inputClass}>
              {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Objetivo" value={formData.objetivo || ''} onChange={e => setFormData({...formData, objetivo: e.target.value})} className={inputClass} />
            <input type="text" placeholder="Tipo de contenido" value={formData.tipo_contenido || ''} onChange={e => setFormData({...formData, tipo_contenido: e.target.value})} className={inputClass} />
            <input type="text" placeholder="Frecuencia" value={formData.frecuencia || ''} onChange={e => setFormData({...formData, frecuencia: e.target.value})} className={inputClass} />
            <input type="number" placeholder="Presupuesto S/" value={formData.presupuesto || 0} onChange={e => setFormData({...formData, presupuesto: Number(e.target.value)})} className={inputClass} />
          </div>
        );
      case 'roi':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Inversión Total</label>
                <input type="number" value={formData.inversion_total || 0} onChange={e => setFormData({...formData, inversion_total: Number(e.target.value)})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Leads Estimados</label>
                <input type="number" value={formData.leads_estimados || 0} onChange={e => setFormData({...formData, leads_estimados: Number(e.target.value)})} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ventas Estimadas</label>
                <input type="number" value={formData.ventas_estimadas || 0} onChange={e => setFormData({...formData, ventas_estimadas: Number(e.target.value)})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ingreso Estimado</label>
                <input type="number" value={formData.ingreso_estimado || 0} onChange={e => setFormData({...formData, ingreso_estimado: Number(e.target.value)})} className={inputClass} />
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 className="animate-spin text-[#185FA5]" size={24} />
      <span className="text-gray-500 font-medium">Cargando planeación...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Selector de periodo ────────────────────────────────────────── */}
      {periodos.length > 0 && (
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-blue-50 shadow-lg shadow-blue-100/20">
          <Calendar size={16} className="text-[#185FA5] ml-2" />
          <span className="text-xs font-bold text-gray-500">Periodo activo:</span>
          <select
            value={periodoActivo?.id || ''}
            onChange={(e) => {
              const seleccionado = periodos.find(p => p.id === e.target.value);
              if (seleccionado) cambiarPeriodoActivo(seleccionado);
            }}
            className="flex-1 text-sm font-bold border-2 border-gray-100 rounded-xl px-4 py-2.5 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
          >
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} ({p.estado})</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Sub-pestañas ────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-blue-50 overflow-x-auto shadow-lg shadow-blue-100/20">
        {SECCIONES.map(sec => (
          <button
            key={sec.id}
            onClick={() => setSeccionActiva(sec.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${
              seccionActiva === sec.id
                ? 'bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white shadow-lg shadow-blue-500/25'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {sec.icon} {sec.label}
          </button>
        ))}
      </div>

      {/* ── Contenido de la sección ──────────────────────────────────────── */}
      {renderSeccion()}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL GENÉRICO (con scroll y cabecera sticky)
      ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Cabecera sticky */}
            <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h3 className="text-lg font-black text-[#11284e]">
                {editandoId ? 'Editar' : 'Nuevo'} {modalTipo.charAt(0).toUpperCase() + modalTipo.slice(1)}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            {/* Contenido scrolleable */}
            <div className="overflow-y-auto p-6 pt-4 custom-scrollbar">
              {renderModalContent()}
            </div>
            {/* Botón guardar */}
            <div className="p-6 pt-2 border-t border-gray-100">
              <button onClick={guardar}
                className="w-full bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-3.5 rounded-xl font-black text-sm hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 20px; }
      `}} />
    </div>
  );
}