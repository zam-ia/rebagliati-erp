// src/pages/rrhh/TabLocadores.jsx
// MEJORAS v3 (VIP/Figma):
// · Diseño glass morphism consistente
// · Tabla refinada con columnas equilibradas
// · Modales premium con fondo difuminado
// · Formulario con inputs redondeados y focus rings
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  PlusCircle, ArrowRightCircle, FileText, Upload, Trash2, Eye, Camera,
  AlertCircle, XCircle, CheckCircle, Info, CalendarDays, Search,
  UserPlus, Briefcase, MapPin, Mail, Phone, CreditCard, Building2
} from 'lucide-react';

const BANCOS_INICIALES = ['BCP', 'BBVA', 'Interbank'];
const ESTADOS_CIVILES  = ['Soltero(a)', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)'];
const MOTIVOS_CESE = [
  'Renuncia voluntaria',
  'Baja productividad',
  'Problemas de conducta',
  'Incumplimiento de contrato',
  'Finalización de proyecto',
  'Falta de presupuesto',
  'Otro',
];

// ─── Helpers de fecha ────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().split('T')[0];

const formatFecha = (s) => {
  if (!s) return '—';
  try {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  } catch { return s; }
};

// ═════════════════════════════════════════════════════════════════════════════
export default function TabLocadores({ onMigrarAPlanilla }) {
  const [locadores, setLocadores]     = useState([]);
  const [modal, setModal]             = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [busqueda, setBusqueda]       = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [bancos, setBancos]           = useState(BANCOS_INICIALES);

  // ── Estado modal de cese ──────────────────────────────────────────────────
  const [showCeseModal, setShowCeseModal]       = useState(false);
  const [locadorCese, setLocadorCese]           = useState(null);
  const [motivoCese, setMotivoCese]             = useState('');
  const [observacionesCese, setObservacionesCese] = useState('');
  const [fechaCese, setFechaCese] = useState('');

  // ── Documentos ────────────────────────────────────────────────────────────
  const [documentos, setDocumentos]           = useState([]);
  const [subiendoDoc, setSubiendoDoc]         = useState(false);
  const [mostrarSubirDoc, setMostrarSubirDoc] = useState(false);
  const [nuevoDoc, setNuevoDoc] = useState({
    tipo: 'contrato_locacion', titulo: '', descripcion: '', archivo: null,
  });

  // ── Foto de perfil ────────────────────────────────────────────────────────
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // ── Formulario principal ──────────────────────────────────────────────────
  const initialForm = {
    nombre: '', apellido: '', dni: '', ruc: '', telefono: '', correo: '',
    direccion: '', distrito: '', fecha_nacimiento: '', profesion: '',
    estado_civil: '', tiene_hijos: false, numero_hijos: '',
    modalidad: 'FULL TIME', sueldo_base: '', tipo_pago: 'honorarios',
    modalidad_pago: 'RHE', banco: '', numero_cuenta: '', cci: '',
    fecha_inicio: '', fecha_fin: '', estado: 'activo', observaciones: '',
    foto_url: '',
    motivo_cese: '', observaciones_cese: '', fecha_cese: null,
  };
  const [form, setForm] = useState(initialForm);

  // ── Carga de datos ────────────────────────────────────────────────────────
  const cargarLocadores = async () => {
    setLoading(true);
    try {
      let query = supabase.from('locadores').select('*');
      if (busqueda.trim() !== '') {
        query = query.or(
          `nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,` +
          `dni.ilike.%${busqueda}%,ruc.ilike.%${busqueda}%`
        );
      }
      if (filtroEstado === 'activos')   query = query.eq('estado', 'activo');
      if (filtroEstado === 'inactivos') query = query.eq('estado', 'inactivo');
      const { data, error } = await query.order('apellido', { ascending: true });
      if (error) throw error;
      setLocadores(data || []);
    } catch (err) {
      console.error('Error cargando locadores:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarLocadores(); }, [busqueda, filtroEstado]);

  const cargarDocumentos = async (locadorId) => {
    if (!locadorId) return;
    const { data, error } = await supabase
      .from('documentos_locadores')
      .select('*')
      .eq('locador_id', locadorId)
      .order('fecha_subida', { ascending: false });
    if (!error) setDocumentos(data || []);
  };

  // ── Validación ────────────────────────────────────────────────────────────
  const validarFormulario = () => {
    if (!form.nombre || !form.apellido) { alert('Nombre y apellido son obligatorios'); return false; }
    if (!form.dni)      { alert('El DNI es obligatorio'); return false; }
    if (!form.correo)   { alert('El correo electrónico es obligatorio'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) { alert('Ingrese un correo válido'); return false; }
    if (!form.telefono) { alert('El teléfono es obligatorio'); return false; }
    if (!form.direccion){ alert('La dirección es obligatoria'); return false; }
    if (!form.distrito) { alert('El distrito es obligatorio'); return false; }
    if (!form.sueldo_base || Number(form.sueldo_base) <= 0) {
      alert('El sueldo base es obligatorio y debe ser mayor a 0'); return false;
    }
    if (form.tiene_hijos && (!form.numero_hijos || Number(form.numero_hijos) < 0)) {
      alert('Si tiene hijos, indique una cantidad válida'); return false;
    }
    return true;
  };

  // ── Subir foto ────────────────────────────────────────────────────────────
  const subirFoto = async (file) => {
    if (!file) return null;
    setSubiendoFoto(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `locadores/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('locadores-fotos').upload(filePath, file);
    if (uploadError) { alert('Error al subir imagen: ' + uploadError.message); setSubiendoFoto(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from('locadores-fotos').getPublicUrl(filePath);
    setSubiendoFoto(false);
    return publicUrl;
  };

  // ── Guardar locador (crear / editar) ──────────────────────────────────────
  const guardarLocador = async () => {
    if (!validarFormulario()) return;
    setLoading(true);
    try {
      const registro = { ...form };
      if (registro.fecha_inicio === '')    registro.fecha_inicio = null;
      if (registro.fecha_fin === '')       registro.fecha_fin    = null;
      if (registro.fecha_nacimiento === '') registro.fecha_nacimiento = null;
      registro.sueldo_base   = Number(registro.sueldo_base);
      registro.numero_hijos  = registro.tiene_hijos
        ? parseInt(registro.numero_hijos, 10) || 0
        : 0;
      if (registro.estado === 'activo') {
        registro.motivo_cese       = null;
        registro.observaciones_cese = null;
        registro.fecha_cese        = null;
      }
      if (!modoEdicion) delete registro.id;

      let error;
      if (modoEdicion && editandoId) {
        ({ error } = await supabase.from('locadores').update(registro).eq('id', editandoId));
      } else {
        ({ error } = await supabase.from('locadores').insert([registro]));
      }
      if (error) throw error;
      alert(modoEdicion ? 'Actualizado correctamente' : 'Registrado correctamente');
      setModal(false);
      resetForm();
      cargarLocadores();
    } catch (err) {
      alert('Error en la base de datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setModoEdicion(false);
    setEditandoId(null);
    setDocumentos([]);
  };

  const editarLocador = (locador) => {
    setModoEdicion(true);
    setEditandoId(locador.id);
    setForm({
      ...locador,
      fecha_inicio:     locador.fecha_inicio     || '',
      fecha_fin:        locador.fecha_fin        || '',
      fecha_nacimiento: locador.fecha_nacimiento || '',
      tiene_hijos:      locador.tiene_hijos      || false,
      numero_hijos:     locador.numero_hijos     || '',
      foto_url:         locador.foto_url         || '',
      modalidad_pago:   locador.modalidad_pago   || 'RHE',
      motivo_cese:      locador.motivo_cese      || '',
      observaciones_cese: locador.observaciones_cese || '',
      fecha_cese:       locador.fecha_cese       || null,
    });
    setModal(true);
    cargarDocumentos(locador.id);
  };

  const eliminarLocador = async (id) => {
    if (window.confirm('¿Eliminar este locador permanentemente?')) {
      const { error } = await supabase.from('locadores').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else cargarLocadores();
    }
  };

  // ── Cambio de estado (activo ↔ inactivo) ──────────────────────────────────
  const iniciarCambioEstado = (locador) => {
    if (locador.estado === 'activo') {
      setLocadorCese(locador);
      setMotivoCese('');
      setObservacionesCese('');
      setFechaCese(hoy());
      setShowCeseModal(true);
    } else {
      if (window.confirm(
        '¿Reactivar este locador? Se eliminarán los datos de cese registrados.'
      )) confirmarReactivacion(locador.id);
    }
  };

  const confirmarReactivacion = async (id) => {
    setLoading(true);
    const { error } = await supabase.from('locadores')
      .update({ estado: 'activo', motivo_cese: null, observaciones_cese: null, fecha_cese: null })
      .eq('id', id);
    if (error) alert('Error al reactivar: ' + error.message);
    else { alert('Locador reactivado correctamente'); cargarLocadores(); }
    setLoading(false);
  };

  const guardarCese = async () => {
    if (!motivoCese) { alert('Debe seleccionar un motivo de cese'); return; }
    if (!fechaCese)  { alert('Debe indicar la fecha de cese'); return; }
    setLoading(true);
    const { error } = await supabase.from('locadores')
      .update({
        estado:             'inactivo',
        motivo_cese:        motivoCese,
        observaciones_cese: observacionesCese,
        fecha_cese:         fechaCese,
      })
      .eq('id', locadorCese.id);
    if (error) {
      alert('Error al actualizar estado: ' + error.message);
    } else {
      alert(`Locador marcado como inactivo con fecha de cese ${formatFecha(fechaCese)}`);
      setShowCeseModal(false);
      cargarLocadores();
    }
    setLoading(false);
  };

  const abrirModalNuevo = () => { resetForm(); setModal(true); };

  // ── Helpers visuales ──────────────────────────────────────────────────────
  const getInitials = (nombre, apellido) =>
    `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

  const getModalidadColor = (modalidad) => {
    switch (modalidad) {
      case 'FULL TIME': return 'bg-blue-600 text-white';
      case 'PART TIME': return 'bg-amber-500 text-white';
      case 'POR HORAS': return 'bg-emerald-600 text-white';
      default:          return 'bg-gray-500 text-white';
    }
  };

  const agregarBanco = () => {
    const nuevo = prompt('Nombre del nuevo banco:');
    if (nuevo?.trim() && !bancos.includes(nuevo.trim())) {
      setBancos([...bancos, nuevo.trim()]);
      setForm({ ...form, banco: nuevo.trim() });
    } else if (nuevo?.trim()) alert('Ese banco ya existe en la lista');
  };

  const manejarArchivoFoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await subirFoto(file);
      if (url) setForm({ ...form, foto_url: url });
    }
  };

  // ── Documentos ────────────────────────────────────────────────────────────
  const subirDocumento = async () => {
    if (!nuevoDoc.archivo || !nuevoDoc.titulo) {
      alert('Selecciona un archivo y escribe un título'); return;
    }
    setSubiendoDoc(true);
    const file    = nuevoDoc.archivo;
    const fileExt = file.name.split('.').pop();
    const filePath = `locadores/${editandoId}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('documentos-locadores').upload(filePath, file);
    if (uploadError) { alert('Error al subir archivo: ' + uploadError.message); setSubiendoDoc(false); return; }
    const { data: { publicUrl } } = supabase.storage
      .from('documentos-locadores').getPublicUrl(filePath);
    const { error: dbError } = await supabase.from('documentos_locadores').insert({
      locador_id: editandoId, tipo_documento: nuevoDoc.tipo,
      titulo: nuevoDoc.titulo, descripcion: nuevoDoc.descripcion, archivo_url: publicUrl,
    });
    if (dbError) alert('Error al guardar metadata: ' + dbError.message);
    else {
      alert('Documento subido correctamente');
      cargarDocumentos(editandoId);
      setMostrarSubirDoc(false);
      setNuevoDoc({ tipo: 'contrato_locacion', titulo: '', descripcion: '', archivo: null });
    }
    setSubiendoDoc(false);
  };

  const eliminarDocumento = async (doc) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    const path = doc.archivo_url.split('/public/')[1];
    if (path) await supabase.storage.from('documentos-locadores').remove([path]);
    const { error } = await supabase.from('documentos_locadores').delete().eq('id', doc.id);
    if (!error) { alert('Documento eliminado'); cargarDocumentos(editandoId); }
    else alert('Error: ' + error.message);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
              <Briefcase className="w-6 h-6 text-[#185FA5]" />
            </div>
            <h2 className="text-3xl font-black text-[#0B1527] tracking-tight">Gestión de Locadores</h2>
          </div>
          <p className="text-gray-500 text-sm font-medium ml-12">Administración profesional de personal por locación</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o RUC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm
                         focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-sm transition-all"
            />
          </div>
          <button
            onClick={abrirModalNuevo}
            className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c]
                       text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25
                       hover:shadow-blue-500/40 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <UserPlus size={18} /> Nuevo Locador
          </button>
        </div>
      </div>

      {/* ── Filtro de estado ────────────────────────────────────────────────── */}
      <div className="mb-6 flex gap-3">
        {[
          { id: 'activos',   icon: <CheckCircle size={14} />, label: 'Activos',   activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-emerald-100/50' },
          { id: 'inactivos', icon: <XCircle size={14} />,     label: 'Inactivos', activeClass: 'bg-red-100 text-red-700 border-red-200 shadow-red-100/50' },
          { id: 'todos',     icon: null,                      label: 'Todos',     activeClass: 'bg-gray-800 text-white border-gray-800 shadow-gray-800/20' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFiltroEstado(f.id)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all border flex items-center gap-2 ${
              filtroEstado === f.id
                ? f.activeClass + ' shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* ── Tabla ──────────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                {['Locador', 'Documento', 'Modalidad', 'Sueldo', 'Estado', 'F. Cese', 'Motivo / Obs.', 'Contacto', 'Acciones'].map(h => (
                  <th key={h} className="p-4 text-left font-bold text-gray-400 text-[11px] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && locadores.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-14 text-center text-gray-400">
                    <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Cargando información...</p>
                  </td>
                </tr>
              ) : locadores.map((loc) => (
                <tr key={loc.id} className="hover:bg-blue-50/30 transition-all duration-200 group">

                  {/* Nombre */}
                  <td className="p-4 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      {loc.foto_url ? (
                        <img src={loc.foto_url} alt="foto"
                          className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-md" />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100
                                        flex items-center justify-center text-blue-700 font-bold text-sm shadow-inner flex-shrink-0">
                          {getInitials(loc.nombre, loc.apellido)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{loc.nombre} {loc.apellido}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {loc.distrito || 'Sin distrito'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Documento */}
                  <td className="p-4 min-w-[120px]">
                    <div className="text-gray-700 font-medium text-xs">DNI: {loc.dni || '—'}</div>
                    <div className="text-[11px] text-gray-400 font-mono tracking-tight">RUC: {loc.ruc || '—'}</div>
                  </td>

                  {/* Modalidad */}
                  <td className="p-4 min-w-[100px]">
                    <span className={`inline-block px-3 py-1 rounded-2xl text-[11px] font-semibold tracking-wide shadow-sm ${getModalidadColor(loc.modalidad)}`}>
                      {loc.modalidad}
                    </span>
                  </td>

                  {/* Sueldo */}
                  <td className="p-4 min-w-[110px]">
                    <div className="font-bold text-emerald-700 text-sm">
                      S/ {Number(loc.sueldo_base || 0).toLocaleString('es-PE')}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="p-4 text-center min-w-[90px]">
                    <button
                      onClick={() => iniciarCambioEstado(loc)}
                      className={`px-3 py-1.5 rounded-2xl text-[11px] font-semibold transition-all duration-200 ${
                        loc.estado === 'activo'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {loc.estado === 'activo' ? '● Activo' : '○ Inactivo'}
                    </button>
                  </td>

                  {/* Fecha Cese */}
                  <td className="p-4 min-w-[100px]">
                    {loc.estado === 'inactivo' && loc.fecha_cese ? (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                        <CalendarDays size={12} className="flex-shrink-0" />
                        <span>{formatFecha(loc.fecha_cese)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Motivo / Observaciones */}
                  <td className="p-4 max-w-[150px]">
                    {loc.estado === 'inactivo' && (loc.motivo_cese || loc.observaciones_cese) ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-700 font-medium truncate">
                          {loc.motivo_cese || 'Sin motivo'}
                        </span>
                        {loc.observaciones_cese && (
                          <div className="group/tip relative cursor-help flex-shrink-0">
                            <Info size={12} className="text-gray-400 hover:text-gray-600" />
                            <div className="absolute left-0 top-4 z-20 hidden group-hover/tip:block
                                            bg-gray-800 text-white text-xs rounded-xl p-3
                                            whitespace-pre-wrap max-w-xs shadow-2xl min-w-[200px]">
                              <p className="font-semibold mb-1">Observaciones:</p>
                              <p className="text-gray-300">{loc.observaciones_cese}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Contacto */}
                  <td className="p-4 min-w-[140px]">
                    <div className="flex items-center gap-1.5 text-xs text-gray-700 mb-1">
                      <Phone size={11} className="text-gray-400" />
                      {loc.telefono || '—'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 truncate max-w-[160px] font-medium">
                      <Mail size={11} className="text-blue-400" />
                      {loc.correo || '—'}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="p-4 min-w-[180px]">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => editarLocador(loc)}
                        className="px-3 py-2 text-blue-700 hover:bg-blue-50 border border-blue-200
                                   hover:border-blue-300 rounded-2xl text-xs font-medium transition-all active:scale-95"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarLocador(loc.id)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200
                                   hover:border-red-300 rounded-2xl text-xs font-medium transition-all active:scale-95"
                      >
                        Eliminar
                      </button>
                      {onMigrarAPlanilla && (
                        <button
                          onClick={() => onMigrarAPlanilla(loc)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 border border-emerald-200
                                     hover:border-emerald-300 rounded-2xl transition-all active:scale-95"
                          title="Migrar a Planilla"
                        >
                          <ArrowRightCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {locadores.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" className="p-14 text-center text-gray-400">
                    <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No se encontraron locadores con los criterios seleccionados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL DE CESE (Inactivación)
      ═══════════════════════════════════════════════════════════════════ */}
      {showCeseModal && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-red-50 rounded-2xl">
                <AlertCircle className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Registrar cese del locador</h3>
                <p className="text-sm text-gray-500 mt-0.5">Inactivación con fecha personalizada</p>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-2xl p-4 mb-6 border border-red-100">
              <p className="text-sm text-red-700">
                Vas a marcar como <strong>INACTIVO</strong> a{' '}
                <strong>{locadorCese?.nombre} {locadorCese?.apellido}</strong>.{' '}
                La fecha de cese se usará para calcular el pago proporcional en la planilla.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <CalendarDays size={16} className="text-red-400" />
                  Fecha de cese *
                </label>
                <input
                  type="date"
                  value={fechaCese}
                  onChange={(e) => setFechaCese(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm
                             focus:border-red-400 focus:ring-4 focus:ring-red-400/20 outline-none transition-all bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Por defecto es el día de hoy. Si la fecha cae dentro del mes vigente, la planilla calculará el monto proporcional.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo del cese *</label>
                <select
                  value={motivoCese}
                  onChange={(e) => setMotivoCese(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm bg-gray-50
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                >
                  <option value="">Seleccionar motivo...</option>
                  {MOTIVOS_CESE.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  rows="4"
                  value={observacionesCese}
                  onChange={(e) => setObservacionesCese(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-y bg-gray-50"
                  placeholder="Detalles adicionales (conducta, productividad, etc.)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowCeseModal(false)}
                className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-2xl transition-all border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCese}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-2xl
                           text-sm font-semibold transition-all disabled:opacity-70 shadow-lg shadow-red-500/25 active:scale-[0.98]"
              >
                {loading ? 'Procesando...' : 'Confirmar Inactivación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL PRINCIPAL (Crear / Editar)
      ═══════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-5 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">
                {modoEdicion ? 'Editar Perfil del Locador' : 'Nuevo Registro de Locador'}
              </h3>
              <button
                onClick={() => setModal(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400
                           hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors"
              >✕</button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              {/* Foto (solo edición) */}
              {modoEdicion && (
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {form.foto_url ? (
                      <img src={form.foto_url} alt="foto"
                        className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl" />
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-200
                                      flex items-center justify-center text-blue-700 font-bold text-3xl shadow-inner">
                        {getInitials(form.nombre, form.apellido)}
                      </div>
                    )}
                    <label className="absolute bottom-1 right-1 bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white p-2.5 rounded-2xl
                                      cursor-pointer shadow-lg hover:shadow-xl transition-all hover:scale-105">
                      <Camera size={18} />
                      <input type="file" accept="image/*" onChange={manejarArchivoFoto}
                        className="hidden" disabled={subiendoFoto} />
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Columna izquierda: datos personales ─────────────────── */}
                <div className="space-y-5">
                  <h4 className="text-[#185FA5] font-bold text-sm uppercase tracking-[1px] flex items-center gap-2">
                    <UserPlus size={16} /> Información Personal
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Nombres *" value={form.nombre}
                      onChange={e => setForm({...form, nombre: e.target.value})}
                      className="border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                    <input placeholder="Apellidos *" value={form.apellido}
                      onChange={e => setForm({...form, apellido: e.target.value})}
                      className="border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="DNI *" value={form.dni}
                      onChange={e => setForm({...form, dni: e.target.value})}
                      className="border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                    <input placeholder="RUC (opcional)" value={form.ruc}
                      onChange={e => setForm({...form, ruc: e.target.value})}
                      className="border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-semibold">Fecha de nacimiento</label>
                    <input type="date" value={form.fecha_nacimiento}
                      onChange={e => setForm({...form, fecha_nacimiento: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  </div>
                  <input placeholder="Carrera / Profesión" value={form.profesion}
                    onChange={e => setForm({...form, profesion: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  <select value={form.estado_civil}
                    onChange={e => setForm({...form, estado_civil: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white">
                    <option value="">Estado civil (opcional)</option>
                    {ESTADOS_CIVILES.map(ec => <option key={ec} value={ec}>{ec}</option>)}
                  </select>
                  <div className="space-y-3 bg-gray-50 rounded-2xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.tiene_hijos}
                        onChange={e => setForm({...form, tiene_hijos: e.target.checked, numero_hijos: e.target.checked ? form.numero_hijos : ''})}
                        className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700 font-semibold">¿Tiene hijos?</span>
                    </label>
                    {form.tiene_hijos && (
                      <input type="number" min="0" placeholder="Número de hijos" value={form.numero_hijos}
                        onChange={e => setForm({...form, numero_hijos: e.target.value})}
                        className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white" />
                    )}
                  </div>
                  <input placeholder="Correo Electrónico *" type="email" value={form.correo}
                    onChange={e => setForm({...form, correo: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  <input placeholder="Teléfono *" value={form.telefono}
                    onChange={e => setForm({...form, telefono: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  <input placeholder="Dirección *" value={form.direccion}
                    onChange={e => setForm({...form, direccion: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  <input placeholder="Distrito *" value={form.distrito}
                    onChange={e => setForm({...form, distrito: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                </div>

                {/* ── Columna derecha: contrato, pagos, cese ──────────────── */}
                <div className="space-y-5">
                  <h4 className="text-[#185FA5] font-bold text-sm uppercase tracking-[1px] flex items-center gap-2">
                    <CreditCard size={16} /> Contrato y Pagos
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <select value={form.modalidad}
                      onChange={e => setForm({...form, modalidad: e.target.value})}
                      className="border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white">
                      <option value="FULL TIME">FULL TIME</option>
                      <option value="PART TIME">PART TIME</option>
                      <option value="POR HORAS">POR HORAS</option>
                    </select>
                    <input placeholder="Sueldo Base (S/) *" type="number" min="0" step="0.01"
                      value={form.sueldo_base}
                      onChange={e => setForm({...form, sueldo_base: e.target.value})}
                      className="border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                  </div>
                  <select value={form.tipo_pago}
                    onChange={e => setForm({...form, tipo_pago: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white">
                    <option value="honorarios">Honorarios (RHE)</option>
                    <option value="factura">Factura</option>
                    <option value="boleta">Boleta</option>
                  </select>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-semibold">Modalidad de Pago</label>
                    <select value={form.modalidad_pago}
                      onChange={e => setForm({...form, modalidad_pago: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white">
                      <option value="RHE">Recibo por Honorarios (RHE)</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-semibold">Fecha de inicio</label>
                      <input type="date" value={form.fecha_inicio}
                        onChange={e => setForm({...form, fecha_inicio: e.target.value})}
                        className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-semibold">Fecha de fin</label>
                      <input type="date" value={form.fecha_fin}
                        onChange={e => setForm({...form, fecha_fin: e.target.value})}
                        className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50" />
                    </div>
                  </div>

                  {/* Banco */}
                  <div className="bg-gray-50 border border-gray-100 p-5 rounded-3xl space-y-4">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1.5 font-semibold">Banco</label>
                        <select value={form.banco}
                          onChange={e => setForm({...form, banco: e.target.value})}
                          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white">
                          <option value="">Seleccionar banco...</option>
                          {bancos.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={agregarBanco}
                        className="p-3 text-blue-600 hover:bg-blue-100 rounded-2xl border-2 border-blue-200
                                   hover:border-blue-300 transition-all" title="Agregar nuevo banco">
                        <PlusCircle size={20} />
                      </button>
                    </div>
                    <input placeholder="Número de Cuenta" value={form.numero_cuenta}
                      onChange={e => setForm({...form, numero_cuenta: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white" />
                    <input placeholder="CCI" value={form.cci}
                      onChange={e => setForm({...form, cci: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white" />
                  </div>

                  {/* Datos de cese */}
                  {form.estado === 'inactivo' && (
                    <div className="border-l-4 border-red-400 bg-red-50 p-4 rounded-2xl">
                      <h5 className="font-bold text-red-700 flex items-center gap-2 mb-3">
                        <AlertCircle size={16} /> Datos de cese registrados
                      </h5>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="flex items-center gap-2">
                          <CalendarDays size={14} className="text-red-400" />
                          <strong>Fecha:</strong>
                          <span className="font-mono font-semibold">{formatFecha(form.fecha_cese) || '—'}</span>
                        </p>
                        <p><strong>Motivo:</strong> {form.motivo_cese || '—'}</p>
                        <p><strong>Observaciones:</strong> {form.observaciones_cese || '—'}</p>
                      </div>
                    </div>
                  )}

                  <textarea
                    placeholder="Observaciones adicionales (generales)"
                    value={form.observaciones}
                    onChange={e => setForm({...form, observaciones: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-3xl px-4 py-3 text-sm
                               focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none
                               transition-all resize-y min-h-[80px] bg-gray-50"
                    rows="3"
                  />
                </div>
              </div>

              {/* Documentos (solo edición) */}
              {modoEdicion && (
                <div className="border-t pt-8">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="font-bold text-lg text-gray-900 flex items-center gap-3">
                      <FileText className="text-[#185FA5]" size={24} /> Documentos Adjuntos
                    </h4>
                    <button
                      onClick={() => setMostrarSubirDoc(true)}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-5 py-2.5 rounded-2xl
                                 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/25
                                 transition-all active:scale-[0.98]"
                    >
                      <Upload size={16} /> Subir Documento
                    </button>
                  </div>
                  {documentos.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
                      <FileText size={32} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-400 font-medium">Aún no hay documentos asociados</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                      {documentos.map(doc => (
                        <div key={doc.id}
                          className="flex items-center justify-between bg-white border border-gray-100
                                     p-4 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                              <FileText size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{doc.titulo}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{doc.descripcion || 'Sin descripción'}</p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {new Date(doc.fecha_subida).toLocaleDateString('es-PE')} · {doc.tipo_documento}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer"
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors"
                              title="Ver documento">
                              <Eye size={18} />
                            </a>
                            <button onClick={() => eliminarDocumento(doc)}
                              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                              title="Eliminar documento">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t flex gap-3">
              <button
                onClick={guardarLocador}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c]
                           text-white py-3.5 rounded-2xl font-semibold text-sm shadow-lg shadow-blue-500/25
                           hover:shadow-blue-500/40 transition-all disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? 'Procesando...' : modoEdicion ? 'Guardar Cambios' : 'Crear Registro'}
              </button>
              <button
                onClick={() => setModal(false)}
                className="px-8 py-3.5 border-2 border-gray-200 rounded-2xl text-gray-600 font-semibold
                           hover:bg-white hover:border-gray-300 transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL SUBIR DOCUMENTO
      ═══════════════════════════════════════════════════════════════════ */}
      {mostrarSubirDoc && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <Upload className="text-emerald-600" size={22} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Subir Documento</h3>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Tipo de documento</label>
                <select value={nuevoDoc.tipo}
                  onChange={e => setNuevoDoc({...nuevoDoc, tipo: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50">
                  <option value="contrato_locacion">Contrato de Locación</option>
                  <option value="memorandum">Memorándum</option>
                  <option value="incidencia">Incidencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Título del documento *</label>
                <input type="text" value={nuevoDoc.titulo}
                  onChange={e => setNuevoDoc({...nuevoDoc, titulo: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50"
                  placeholder="Ej: Contrato de locación 2026" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Descripción</label>
                <textarea rows="3" value={nuevoDoc.descripcion}
                  onChange={e => setNuevoDoc({...nuevoDoc, descripcion: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-y bg-gray-50"
                  placeholder="Detalles adicionales..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Archivo (PDF, JPG, PNG)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-blue-300 transition cursor-pointer bg-gray-50">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setNuevoDoc({...nuevoDoc, archivo: e.target.files[0]})}
                    className="w-full text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0
                               file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button onClick={() => setMostrarSubirDoc(false)}
                className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-2xl transition-all border border-gray-200">
                Cancelar
              </button>
              <button onClick={subirDocumento} disabled={subiendoDoc}
                className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-6 py-3 rounded-2xl
                           text-sm font-semibold transition-all disabled:opacity-70 shadow-lg shadow-blue-500/25 active:scale-[0.98]">
                {subiendoDoc ? 'Subiendo...' : 'Subir Documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 20px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
      `}} />
    </div>
  );
}