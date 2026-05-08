// src/pages/marketing/TabMetricasAnalytics.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Upload, FileText, X, Save, Loader2, PieChart, Radio, CheckCircle,
  Calendar, Filter, ChevronRight, Plus, PenLine, Eye
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(n);
const fmtInt = (n) => new Intl.NumberFormat('es-PE').format(n);

// ── Colores por red social ──────────────────────────────────────────────
const RED_COLORS = {
  'Facebook': '#1877F2',
  'Instagram': '#E4405F',
  'TikTok': '#000000',
  'WhatsApp': '#25D366',
};

const REDES = ['Facebook', 'Instagram', 'TikTok', 'WhatsApp'];
const PILARES = ['Valor', 'Ventas', 'Viral'];
const PORTAFOLIOS = ['Diplomados', 'Cursos', 'Talleres', 'Congresos', 'Certificaciones', 'General'];

// ── Componente gráfico de barras ────────────────────────────────────────
function BarChart({ data, height = 200 }) {
  const max = Math.max(...data.map(d => d.valor), 1);
  return (
    <div className="flex items-end justify-center gap-6 h-full px-4">
      {data.map((bar) => (
        <div key={bar.label} className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-gray-700">{fmtInt(bar.valor)}</span>
          <div
            className="w-12 rounded-lg shadow-sm"
            style={{
              height: `${(bar.valor / max) * height * 0.7}px`,
              backgroundColor: bar.color || '#185FA5',
              minHeight: '8px',
            }}
          />
          <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon, bg, text }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-50 shadow-md p-5 flex items-center gap-4 hover:shadow-xl hover:border-blue-100 transition-all">
      <div className={`p-3 rounded-xl ${bg} ${text} shadow-sm`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-black ${text} mt-0.5`}>{value}</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export default function TabMetricasAnalytics() {
  const [subTab, setSubTab] = useState('dashboard_cm');
  const [loading, setLoading] = useState(false);

  const [metricasResumen, setMetricasResumen] = useState({
    alcance_total: 0, engagement_promedio: 0, leads_organicos: 0, crecimiento_wa: 0,
  });
  const [metricasPublicaciones, setMetricasPublicaciones] = useState([]);
  const [metricasPorRed, setMetricasPorRed] = useState([]);

  // Filtros del dashboard
  const [filtroPagina, setFiltroPagina] = useState('todas');
  const [paginasDisponibles, setPaginasDisponibles] = useState([]);

  // CSV
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [importando, setImportando] = useState(false);

  // Formularios manuales
  const [formDiario, setFormDiario] = useState({
    fecha: new Date().toISOString().split('T')[0],
    red_social: 'Facebook',
    pagina_facebook: '',
    portafolio: 'General',
    alcance: '',
    interacciones: '',
    engagement_rate: '',
    leads_organicos: '',
    crecimiento_seguidores: '',
  });
  const [formPublicacion, setFormPublicacion] = useState({
    titulo: '',
    red_social: 'Facebook',
    pilar: 'Valor',
    pagina_facebook: '',
    portafolio: 'General',
    fecha_publicacion: new Date().toISOString().split('T')[0],
    alcance: '',
    interacciones: '',
    engagement_rate: '',
    leads_organicos: '',
    es_viral: false,
  });
  const [guardandoManual, setGuardandoManual] = useState(false);

  // ── Cargar métricas (resumen) ────────────────────────────────────────
  const cargarMetricas = async () => {
    setLoading(true);
    try {
      const fechaInicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Obtener páginas únicas para el filtro
      const { data: paginasData } = await supabase
        .from('metricas_organicas')
        .select('pagina_facebook')
        .not('pagina_facebook', 'is', null)
        .gte('fecha', fechaInicio);
      const paginasUnicas = [...new Set((paginasData || []).map(p => p.pagina_facebook).filter(Boolean))];
      setPaginasDisponibles(paginasUnicas);

      let query = supabase.from('metricas_organicas').select('*').gte('fecha', fechaInicio);
      if (filtroPagina !== 'todas') query = query.eq('pagina_facebook', filtroPagina);
      const { data: resumen, error: err1 } = await query;

      if (err1) throw err1;

      const totalAlcance = (resumen || []).reduce((s, r) => s + (r.alcance || 0), 0);
      const totalInteracciones = (resumen || []).reduce((s, r) => s + (r.interacciones || 0), 0);
      const engagementPromedio = totalAlcance > 0 ? (totalInteracciones / totalAlcance * 100).toFixed(2) : 0;
      const totalLeads = (resumen || []).reduce((s, r) => s + (r.leads_organicos || 0), 0);
      const crecimientoWA = (resumen || []).reduce((s, r) => s + (r.crecimiento_seguidores || 0), 0);

      setMetricasResumen({
        alcance_total: totalAlcance,
        engagement_promedio: engagementPromedio,
        leads_organicos: totalLeads,
        crecimiento_wa: crecimientoWA,
      });

      // Alcance por red (para el gráfico)
      const aggRed = {};
      (resumen || []).forEach(r => {
        if (!aggRed[r.red_social]) aggRed[r.red_social] = 0;
        aggRed[r.red_social] += r.alcance || 0;
      });
      const dataRed = Object.entries(aggRed).map(([label, valor]) => ({
        label, valor, color: RED_COLORS[label] || '#185FA5',
      }));
      setMetricasPorRed(dataRed);

      // Publicaciones recientes (también filtradas)
      let queryPub = supabase.from('metricas_publicaciones').select('*').order('fecha_publicacion', { ascending: false }).limit(10);
      if (filtroPagina !== 'todas') queryPub = queryPub.eq('pagina_facebook', filtroPagina);
      const { data: publicaciones, error: err2 } = await queryPub;
      if (err2) throw err2;
      setMetricasPublicaciones(publicaciones || []);
    } catch (err) {
      console.error('Error cargando métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'dashboard_cm') cargarMetricas();
  }, [subTab, filtroPagina]);

  // ── Parseo CSV ──────────────────────────────────────────────────────
  const parsearCSV = () => {
    setCsvError('');
    if (!csvText.trim()) {
      setCsvError('Pega el contenido CSV primero.');
      return;
    }
    const lineas = csvText.trim().split('\n');
    if (lineas.length < 2) {
      setCsvError('El CSV debe tener al menos una línea de encabezados y una de datos.');
      return;
    }
    const headers = lineas[0].split(',').map(h => h.trim());
    const datos = lineas.slice(1).map(linea => {
      const valores = linea.split(',');
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = valores[i]?.trim() || '';
      });
      return obj;
    });
    setCsvHeaders(headers);
    setCsvPreview(datos.slice(0, 5));
  };

  // ── Importar CSV ─────────────────────────────────────────────────────
  const importarDatos = async () => {
    if (csvPreview.length === 0) return alert('No hay datos para importar.');
    setImportando(true);
    try {
      const esPublicacion = csvHeaders.includes('titulo') || csvHeaders.includes('fecha_publicacion');
      const tabla = esPublicacion ? 'metricas_publicaciones' : 'metricas_organicas';
      const lineas = csvText.trim().split('\n');
      const headers = lineas[0].split(',').map(h => h.trim());
      const registros = lineas.slice(1).map(linea => {
        const valores = linea.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = valores[i]?.trim() || ''; });
        if (esPublicacion) {
          return {
            titulo: obj.titulo || '',
            red_social: obj.red_social || '',
            pilar: obj.pilar || null,
            pagina_facebook: obj.pagina_facebook || null,
            portafolio: obj.portafolio || null,
            fecha_publicacion: obj.fecha_publicacion || obj.fecha || '',
            alcance: parseInt(obj.alcance, 10) || 0,
            interacciones: parseInt(obj.interacciones, 10) || 0,
            engagement_rate: parseFloat(obj.engagement_rate) || 0,
            leads_organicos: parseInt(obj.leads_organicos, 10) || 0,
            es_viral: obj.es_viral?.toLowerCase() === 'true' || false,
          };
        } else {
          return {
            fecha: obj.fecha || '',
            red_social: obj.red_social || '',
            pagina_facebook: obj.pagina_facebook || null,
            portafolio: obj.portafolio || null,
            alcance: parseInt(obj.alcance, 10) || 0,
            interacciones: parseInt(obj.interacciones, 10) || 0,
            engagement_rate: parseFloat(obj.engagement_rate) || 0,
            leads_organicos: parseInt(obj.leads_organicos, 10) || 0,
            crecimiento_seguidores: parseInt(obj.crecimiento_seguidores, 10) || 0,
          };
        }
      });
      const { error } = await supabase.from(tabla).insert(registros);
      if (error) throw error;
      alert(`${registros.length} registros importados`);
      setCsvText('');
      setCsvPreview([]);
      cargarMetricas();
    } catch (err) {
      alert('Error al importar: ' + err.message);
    } finally {
      setImportando(false);
    }
  };

  // ── Guardar manual diario ────────────────────────────────────────────
  const guardarMetricaDiaria = async () => {
    if (!formDiario.fecha || !formDiario.red_social) {
      alert('Fecha y red social son obligatorios');
      return;
    }
    setGuardandoManual(true);
    const registro = {
      fecha: formDiario.fecha,
      red_social: formDiario.red_social,
      pagina_facebook: formDiario.pagina_facebook || null,
      portafolio: formDiario.portafolio || null,
      alcance: parseInt(formDiario.alcance, 10) || 0,
      interacciones: parseInt(formDiario.interacciones, 10) || 0,
      engagement_rate: parseFloat(formDiario.engagement_rate) || 0,
      leads_organicos: parseInt(formDiario.leads_organicos, 10) || 0,
      crecimiento_seguidores: parseInt(formDiario.crecimiento_seguidores, 10) || 0,
    };
    const { error } = await supabase.from('metricas_organicas').insert([registro]);
    setGuardandoManual(false);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Métrica diaria guardada');
      setFormDiario({ ...formDiario, alcance: '', interacciones: '', engagement_rate: '', leads_organicos: '', crecimiento_seguidores: '' });
      cargarMetricas();
    }
  };

  // ── Guardar manual publicación ────────────────────────────────────────
  const guardarMetricaPublicacion = async () => {
    if (!formPublicacion.titulo || !formPublicacion.fecha_publicacion) {
      alert('Título y fecha de publicación son obligatorios');
      return;
    }
    setGuardandoManual(true);
    const registro = {
      titulo: formPublicacion.titulo,
      red_social: formPublicacion.red_social,
      pilar: formPublicacion.pilar,
      pagina_facebook: formPublicacion.pagina_facebook || null,
      portafolio: formPublicacion.portafolio || null,
      fecha_publicacion: formPublicacion.fecha_publicacion,
      alcance: parseInt(formPublicacion.alcance, 10) || 0,
      interacciones: parseInt(formPublicacion.interacciones, 10) || 0,
      engagement_rate: parseFloat(formPublicacion.engagement_rate) || 0,
      leads_organicos: parseInt(formPublicacion.leads_organicos, 10) || 0,
      es_viral: formPublicacion.es_viral,
    };
    const { error } = await supabase.from('metricas_publicaciones').insert([registro]);
    setGuardandoManual(false);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Métrica de publicación guardada');
      setFormPublicacion({ ...formPublicacion, titulo: '', alcance: '', interacciones: '', engagement_rate: '', leads_organicos: '', es_viral: false });
      cargarMetricas();
    }
  };

  // ── KPIs generales ──────────────────────────────────────────────────
  const kpisGenerales = [
    { label: 'Leads Hoy', value: '12', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: <BarChart3 size={20} className="text-blue-700" />, cambio: '+18%', tendencia: 'up' },
    { label: 'Tasa Conversión', value: '8.5%', color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: <TrendingUp size={20} className="text-emerald-700" />, cambio: '+2.1%', tendencia: 'up' },
    { label: 'ROI Promedio', value: '280%', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: <TrendingUp size={20} className="text-purple-700" />, cambio: '+15%', tendencia: 'up' },
    { label: 'CPL Promedio', value: 'S/ 9.50', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: <TrendingDown size={20} className="text-amber-700" />, cambio: '-5.3%', tendencia: 'down' },
  ];

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header con subpestañas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <BarChart3 className="w-5 h-5 text-[#185FA5]" />
          </div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Métricas y Analytics</h2>
        </div>
        <div className="flex gap-1 bg-white/80 p-1 rounded-xl border border-blue-50 shadow-sm">
          {[
            { id: 'dashboard_cm', label: 'Dashboard CM' },
            { id: 'kpis_generales', label: 'KPIs Generales' },
            { id: 'importar', label: 'Importar CSV' },
            { id: 'agregar_manual', label: 'Agregar Manual' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`text-xs px-4 py-2 rounded-lg font-bold transition-all ${
                subTab === tab.id ? 'bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── DASHBOARD CM ────────────────────────────────────────────────── */}
      {subTab === 'dashboard_cm' && (
        <>
          {/* Filtro de página de Facebook */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-700">Fan Page:</span>
            <select
              value={filtroPagina}
              onChange={e => setFiltroPagina(e.target.value)}
              className="border-2 border-gray-100 rounded-xl px-4 py-2.5 text-xs bg-white font-bold text-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
            >
              <option value="todas">Todas las páginas</option>
              {paginasDisponibles.map(pg => (
                <option key={pg} value={pg}>{pg}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#185FA5]" size={32} /></div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Alcance Total (30d)" value={fmtInt(metricasResumen.alcance_total)} icon={<Eye size={20} />} bg="bg-blue-50" text="text-blue-700" />
                <KpiCard label="Engagement Rate" value={`${metricasResumen.engagement_promedio}%`} icon={<Radio size={20} />} bg="bg-emerald-50" text="text-emerald-700" />
                <KpiCard label="Leads Orgánicos" value={fmtInt(metricasResumen.leads_organicos)} icon={<CheckCircle size={20} />} bg="bg-purple-50" text="text-purple-700" />
                <KpiCard label="Crecimiento WhatsApp" value={`+${fmtInt(metricasResumen.crecimiento_wa)} seg.`} icon={<TrendingUp size={20} />} bg="bg-amber-50" text="text-amber-700" />
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl p-6">
                <h3 className="text-lg font-black text-gray-900 uppercase mb-4">Alcance por Red Social (últimos 30 días)</h3>
                {metricasPorRed.length > 0 ? <BarChart data={metricasPorRed} height={180} /> : <p className="text-center text-gray-600 py-8">Sin datos de métricas por red.</p>}
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 uppercase">Publicaciones Recientes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50/50">
                      <tr className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                        <th className="p-4 text-left">Título</th>
                        <th className="p-4 text-left">Fan Page</th>
                        <th className="p-4 text-left">Red</th>
                        <th className="p-4 text-left">Pilar</th>
                        <th className="p-4 text-right">Alcance</th>
                        <th className="p-4 text-right">Engagement</th>
                        <th className="p-4 text-right">Leads</th>
                        <th className="p-4 text-center">Viral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {metricasPublicaciones.map(p => (
                        <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4 font-bold text-gray-800">{p.titulo}</td>
                          <td className="p-4 text-xs text-gray-600">{p.pagina_facebook || '—'}</td>
                          <td className="p-4 text-gray-700">{p.red_social}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${p.pilar === 'Viral' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>{p.pilar}</span>
                          </td>
                          <td className="p-4 text-right font-mono text-gray-700">{fmtInt(p.alcance)}</td>
                          <td className="p-4 text-right font-mono text-gray-700">{p.engagement_rate}%</td>
                          <td className="p-4 text-right font-mono text-gray-700">{p.leads_organicos}</td>
                          <td className="p-4 text-center">
                            {p.es_viral ? <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-3 py-1 rounded-full border border-purple-200">SÍ</span> : '—'}
                          </td>
                        </tr>
                      ))}
                      {metricasPublicaciones.length === 0 && <tr><td colSpan="8" className="p-10 text-center text-gray-600">Sin publicaciones registradas.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── KPIs GENERALES ──────────────────────────────────────────────── */}
      {subTab === 'kpis_generales' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpisGenerales.map(kpi => (
            <div key={kpi.label} className="border border-gray-100 rounded-2xl p-5 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/20 transition-all group cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 ${kpi.bgColor} rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>{kpi.icon}</div>
                <div className={`flex items-center gap-0.5 text-[10px] font-bold ${kpi.tendencia === 'up' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {kpi.tendencia === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.cambio}
                </div>
              </div>
              <div className="space-y-1">
                <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── IMPORTAR CSV ───────────────────────────────────────────────── */}
      {subTab === 'importar' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl p-6 lg:p-8">
          <h3 className="text-lg font-black text-gray-900 uppercase mb-4 flex items-center gap-2"><Upload size={20} className="text-[#185FA5]" /> Importar Métricas desde CSV</h3>
          <p className="text-sm text-gray-600 mb-4">Exporta tus métricas e incluye opcionalmente las columnas <strong>pagina_facebook</strong> y <strong>portafolio</strong> para asociarlas a una fan page concreta.</p>
          <div className="space-y-4">
            <textarea rows="10" placeholder="fecha,red_social,pagina_facebook,portafolio,alcance,interacciones,engagement_rate,leads_organicos,crecimiento_seguidores" value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-mono" />
            <div className="flex gap-3">
              <button onClick={parsearCSV} className="bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-2"><FileText size={16} /> Previsualizar</button>
              <button onClick={() => { setCsvText(''); setCsvPreview([]); setCsvHeaders([]); setCsvError(''); }} className="border-2 border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">Limpiar</button>
            </div>
            {csvError && <p className="text-red-600 text-sm font-bold">{csvError}</p>}
            {csvPreview.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold text-gray-900 mb-3">Vista previa (primeros 5 registros)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                    <thead className="bg-gray-50"><tr>{csvHeaders.map(h => <th key={h} className="p-3 text-left font-black text-gray-700 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">{csvPreview.map((row, i) => <tr key={i}>{csvHeaders.map(h => <td key={h} className="p-3 text-gray-800">{row[h]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <button onClick={importarDatos} disabled={importando} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-70">
                  {importando ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {importando ? 'Importando...' : 'Importar Datos'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── AGREGAR MANUAL ─────────────────────────────────────────────── */}
      {subTab === 'agregar_manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Métrica diaria */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl p-6 lg:p-8">
            <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2 mb-6"><PenLine size={20} className="text-[#185FA5]" /> Métrica Diaria por Red</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Fecha *" type="date" value={formDiario.fecha} onChange={e => setFormDiario({...formDiario, fecha: e.target.value})} />
                <Select label="Red Social *" value={formDiario.red_social} onChange={e => setFormDiario({...formDiario, red_social: e.target.value})} options={REDES} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Fan Page" value={formDiario.pagina_facebook} onChange={e => setFormDiario({...formDiario, pagina_facebook: e.target.value})} placeholder="Ej. Rebagliati Diplomados" />
                <Select label="Portafolio" value={formDiario.portafolio} onChange={e => setFormDiario({...formDiario, portafolio: e.target.value})} options={PORTAFOLIOS} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Alcance" type="number" value={formDiario.alcance} onChange={e => setFormDiario({...formDiario, alcance: e.target.value})} />
                <Input label="Interacciones" type="number" value={formDiario.interacciones} onChange={e => setFormDiario({...formDiario, interacciones: e.target.value})} />
                <Input label="Engagement Rate" value={formDiario.engagement_rate} onChange={e => setFormDiario({...formDiario, engagement_rate: e.target.value})} placeholder="Ej: 3.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Leads Orgánicos" type="number" value={formDiario.leads_organicos} onChange={e => setFormDiario({...formDiario, leads_organicos: e.target.value})} />
                <Input label="Crecimiento Seguidores" type="number" value={formDiario.crecimiento_seguidores} onChange={e => setFormDiario({...formDiario, crecimiento_seguidores: e.target.value})} />
              </div>
              <button onClick={guardarMetricaDiaria} disabled={guardandoManual} className="w-full bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-3 rounded-xl font-black text-sm hover:from-[#185FA5] hover:to-[#1a6ab8] transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70">
                {guardandoManual ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar Métrica Diaria
              </button>
            </div>
          </div>

          {/* Métrica de publicación */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl p-6 lg:p-8">
            <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2 mb-6"><PenLine size={20} className="text-[#185FA5]" /> Métrica por Publicación</h3>
            <div className="space-y-4">
              <Input label="Título de la publicación *" value={formPublicacion.titulo} onChange={e => setFormPublicacion({...formPublicacion, titulo: e.target.value})} />
              <div className="grid grid-cols-3 gap-3">
                <Select label="Red Social *" value={formPublicacion.red_social} onChange={e => setFormPublicacion({...formPublicacion, red_social: e.target.value})} options={REDES} />
                <Select label="Pilar" value={formPublicacion.pilar} onChange={e => setFormPublicacion({...formPublicacion, pilar: e.target.value})} options={PILARES} />
                <Input label="Fecha Pub. *" type="date" value={formPublicacion.fecha_publicacion} onChange={e => setFormPublicacion({...formPublicacion, fecha_publicacion: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Fan Page" value={formPublicacion.pagina_facebook} onChange={e => setFormPublicacion({...formPublicacion, pagina_facebook: e.target.value})} placeholder="Ej. Rebagliati Diplomados" />
                <Select label="Portafolio" value={formPublicacion.portafolio} onChange={e => setFormPublicacion({...formPublicacion, portafolio: e.target.value})} options={PORTAFOLIOS} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Alcance" type="number" value={formPublicacion.alcance} onChange={e => setFormPublicacion({...formPublicacion, alcance: e.target.value})} />
                <Input label="Interacciones" type="number" value={formPublicacion.interacciones} onChange={e => setFormPublicacion({...formPublicacion, interacciones: e.target.value})} />
                <Input label="Engagement Rate" value={formPublicacion.engagement_rate} onChange={e => setFormPublicacion({...formPublicacion, engagement_rate: e.target.value})} placeholder="Ej: 3.5" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Input label="Leads Orgánicos" type="number" value={formPublicacion.leads_organicos} onChange={e => setFormPublicacion({...formPublicacion, leads_organicos: e.target.value})} />
                <label className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 cursor-pointer hover:border-blue-300 transition-colors">
                  <input type="checkbox" checked={formPublicacion.es_viral} onChange={e => setFormPublicacion({...formPublicacion, es_viral: e.target.checked})} className="w-4 h-4 rounded accent-purple-600" />
                  <span className="text-xs font-bold text-gray-600 uppercase">¿Viral?</span>
                </label>
              </div>
              <button onClick={guardarMetricaPublicacion} disabled={guardandoManual} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-black text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70">
                {guardandoManual ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar Métrica de Publicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componentes reutilizables ─────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-800" />
    </div>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e)} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-800 font-medium">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}