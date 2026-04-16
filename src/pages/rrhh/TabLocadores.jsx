// src/pages/rrhh/TabLocadores.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  PlusCircle, ArrowRightCircle, FileText, Upload, Trash2, Eye, UserCircle, Camera
} from 'lucide-react';

const BANCOS_INICIALES = ['BCP', 'BBVA', 'Interbank'];
const ESTADOS_CIVILES = ['Soltero(a)', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)'];

export default function TabLocadores({ onMigrarAPlanilla }) {
  const [locadores, setLocadores] = useState([]);
  const [modal, setModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [bancos, setBancos] = useState(BANCOS_INICIALES);

  // Documentos
  const [documentos, setDocumentos] = useState([]);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [mostrarSubirDoc, setMostrarSubirDoc] = useState(false);
  const [nuevoDoc, setNuevoDoc] = useState({
    tipo: 'contrato_locacion',
    titulo: '',
    descripcion: '',
    archivo: null
  });

  // Foto de perfil
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const initialForm = {
    nombre: '',
    apellido: '',
    dni: '',
    ruc: '',
    telefono: '',
    correo: '',
    direccion: '',
    distrito: '',
    fecha_nacimiento: '',
    profesion: '',
    estado_civil: '',
    tiene_hijos: false,
    numero_hijos: '',
    modalidad: 'FULL TIME',
    sueldo_base: '',
    tipo_pago: 'honorarios',
    banco: '',
    numero_cuenta: '',
    cci: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo',
    observaciones: '',
    foto_url: ''
  };

  const [form, setForm] = useState(initialForm);

  const cargarLocadores = async () => {
    setLoading(true);
    try {
      let query = supabase.from('locadores').select('*');
      if (busqueda.trim() !== '') {
        query = query.or(
          `nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,dni.ilike.%${busqueda}%,ruc.ilike.%${busqueda}%`
        );
      }
      const { data, error } = await query.order('apellido', { ascending: true });
      if (error) throw error;
      setLocadores(data || []);
    } catch (error) {
      console.error('Error cargando locadores:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLocadores();
  }, [busqueda]);

  const cargarDocumentos = async (locadorId) => {
    if (!locadorId) return;
    const { data, error } = await supabase
      .from('documentos_locadores')
      .select('*')
      .eq('locador_id', locadorId)
      .order('fecha_subida', { ascending: false });
    if (!error) setDocumentos(data || []);
  };

  const validarFormulario = () => {
    if (!form.nombre || !form.apellido) {
      alert('Nombre y apellido son obligatorios');
      return false;
    }
    if (!form.dni) {
      alert('El DNI es obligatorio');
      return false;
    }
    if (!form.correo) {
      alert('El correo electrónico es obligatorio');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.correo)) {
      alert('Ingrese un correo electrónico válido');
      return false;
    }
    if (!form.telefono) {
      alert('El teléfono es obligatorio');
      return false;
    }
    if (!form.direccion) {
      alert('La dirección es obligatoria');
      return false;
    }
    if (!form.distrito) {
      alert('El distrito es obligatorio');
      return false;
    }
    if (!form.sueldo_base || Number(form.sueldo_base) <= 0) {
      alert('El sueldo base es obligatorio y debe ser mayor a 0');
      return false;
    }
    if (form.tiene_hijos && (!form.numero_hijos || Number(form.numero_hijos) < 0)) {
      alert('Si tiene hijos, debe indicar una cantidad válida');
      return false;
    }
    return true;
  };

  // Subir foto de perfil
  const subirFoto = async (file) => {
    if (!file) return null;
    setSubiendoFoto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `locadores/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('locadores-fotos')
      .upload(filePath, file);
    if (uploadError) {
      alert('Error al subir imagen: ' + uploadError.message);
      setSubiendoFoto(false);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('locadores-fotos')
      .getPublicUrl(filePath);
    setSubiendoFoto(false);
    return publicUrl;
  };

  const guardarLocador = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const registro = { ...form };

      // Convertir fechas vacías a null
      if (registro.fecha_inicio === '') registro.fecha_inicio = null;
      if (registro.fecha_fin === '') registro.fecha_fin = null;
      if (registro.fecha_nacimiento === '') registro.fecha_nacimiento = null;

      registro.sueldo_base = Number(registro.sueldo_base);

      if (registro.tiene_hijos) {
        registro.numero_hijos = parseInt(registro.numero_hijos, 10) || 0;
      } else {
        registro.numero_hijos = 0;
      }

      if (!modoEdicion) delete registro.id;

      let error;
      if (modoEdicion && editandoId) {
        const result = await supabase
          .from('locadores')
          .update(registro)
          .eq('id', editandoId);
        error = result.error;
      } else {
        const result = await supabase.from('locadores').insert([registro]);
        error = result.error;
      }

      if (error) throw error;

      alert(modoEdicion ? 'Actualizado correctamente' : 'Registrado correctamente');
      setModal(false);
      resetForm();
      cargarLocadores();
    } catch (error) {
      alert('Error en la base de datos: ' + error.message);
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
    const locadorForm = {
      ...locador,
      fecha_inicio: locador.fecha_inicio || '',
      fecha_fin: locador.fecha_fin || '',
      fecha_nacimiento: locador.fecha_nacimiento || '',
      tiene_hijos: locador.tiene_hijos || false,
      numero_hijos: locador.numero_hijos || '',
      foto_url: locador.foto_url || ''
    };
    setForm(locadorForm);
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

  const toggleEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    const { error } = await supabase
      .from('locadores')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    if (!error) cargarLocadores();
  };

  const abrirModalNuevo = () => {
    resetForm();
    setModal(true);
  };

  const getInitials = (nombre, apellido) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  };

  const getModalidadColor = (modalidad) => {
    switch (modalidad) {
      case 'FULL TIME': return 'bg-blue-600 text-white';
      case 'PART TIME': return 'bg-amber-500 text-white';
      case 'POR HORAS': return 'bg-emerald-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const agregarBanco = () => {
    const nuevo = prompt('Nombre del nuevo banco:');
    if (nuevo && nuevo.trim() !== '') {
      const nombre = nuevo.trim();
      if (!bancos.includes(nombre)) {
        setBancos([...bancos, nombre]);
        setForm({ ...form, banco: nombre });
      } else {
        alert('Ese banco ya existe en la lista');
      }
    }
  };

  const manejarArchivoFoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await subirFoto(file);
      if (url) setForm({ ...form, foto_url: url });
    }
  };

  const subirDocumento = async () => {
    if (!nuevoDoc.archivo || !nuevoDoc.titulo) {
      alert('Selecciona un archivo y escribe un título');
      return;
    }
    setSubiendoDoc(true);
    const file = nuevoDoc.archivo;
    const fileExt = file.name.split('.').pop();
    const fileName = `${editandoId}_${Date.now()}.${fileExt}`;
    const filePath = `locadores/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('documentos-locadores')
      .upload(filePath, file);
    if (uploadError) {
      alert('Error al subir archivo: ' + uploadError.message);
      setSubiendoDoc(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('documentos-locadores')
      .getPublicUrl(filePath);
    const { error: dbError } = await supabase.from('documentos_locadores').insert({
      locador_id: editandoId,
      tipo_documento: nuevoDoc.tipo,
      titulo: nuevoDoc.titulo,
      descripcion: nuevoDoc.descripcion,
      archivo_url: publicUrl,
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
    if (!confirm('¿Eliminar este documento?')) return;
    const path = doc.archivo_url.split('/public/')[1];
    if (path) await supabase.storage.from('documentos-locadores').remove([path]);
    const { error } = await supabase.from('documentos_locadores').delete().eq('id', doc.id);
    if (!error) {
      alert('Documento eliminado');
      cargarDocumentos(editandoId);
    } else alert('Error: ' + error.message);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Header con buscador */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#185FA5] to-blue-700 rounded-2xl flex items-center justify-center shadow-inner">
            <UserCircle size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Gestión de Locadores</h2>
            <p className="text-sm text-gray-500">Administración profesional de personal por locación</p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-96">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, DNI o RUC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
          </div>
          <button
            onClick={abrirModalNuevo}
            className="bg-gradient-to-r from-[#185FA5] to-blue-700 hover:from-blue-700 hover:to-[#185FA5] text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-200/50 flex items-center gap-2 transition-all active:scale-[0.985]"
          >
            <PlusCircle size={18} />
            Nuevo Locador
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xl shadow-gray-100/80">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <th className="p-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-widest">Locador</th>
                <th className="p-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-widest">Documento</th>
                <th className="p-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-widest">Modalidad</th>
                <th className="p-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-widest">Sueldo Base</th>
                <th className="p-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-widest">Estado</th>
                <th className="p-6 text-left font-semibold text-gray-500 text-xs uppercase tracking-widest">Contacto</th>
                <th className="p-6 text-center font-semibold text-gray-500 text-xs uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && locadores.length === 0 ? (
                <tr><td colSpan="7" className="p-16 text-center text-gray-400">Cargando información...</td></tr>
              ) : locadores.map((loc) => (
                <tr key={loc.id} className="hover:bg-blue-50/50 transition-all duration-200 group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      {loc.foto_url ? (
                        <img src={loc.foto_url} alt="foto" className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-semibold shadow-inner text-lg flex-shrink-0">
                          {getInitials(loc.nombre, loc.apellido)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900 text-base">{loc.nombre} {loc.apellido}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{loc.distrito || 'Sin distrito especificado'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-gray-700 font-medium">DNI: {loc.dni || '—'}</div>
                    <div className="text-xs text-gray-500 font-mono tracking-tight">RUC: {loc.ruc || '—'}</div>
                  </td>
                  <td className="p-6">
                    <span className={`inline-block px-4 py-1.5 rounded-2xl text-xs font-semibold tracking-wide shadow-sm ${getModalidadColor(loc.modalidad)}`}>
                      {loc.modalidad}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="font-semibold text-emerald-700 text-lg">S/ {Number(loc.sueldo_base || 0).toLocaleString('es-PE')}</div>
                  </td>
                  <td className="p-6">
                    <button
                      onClick={() => toggleEstado(loc.id, loc.estado)}
                      className={`px-5 py-1.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                        loc.estado === 'activo' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {loc.estado === 'activo' ? '● Activo' : '○ Inactivo'}
                    </button>
                  </td>
                  <td className="p-6">
                    <div className="text-sm text-gray-700">{loc.telefono || '—'}</div>
                    <div className="text-xs text-blue-600 truncate max-w-[160px] font-medium">{loc.correo || '—'}</div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => editarLocador(loc)} className="px-4 py-2 text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-2xl text-sm font-medium transition-all active:scale-95">Editar</button>
                      <button onClick={() => eliminarLocador(loc.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-2xl text-sm font-medium transition-all active:scale-95">Eliminar</button>
                      {onMigrarAPlanilla && (
                        <button onClick={() => onMigrarAPlanilla(loc)} className="p-2 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-2xl transition-all active:scale-95" title="Migrar a Planilla">
                          <ArrowRightCircle size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {locadores.length === 0 && !loading && <tr><td colSpan="7" className="p-16 text-center text-gray-400">No se encontraron locadores con los criterios de búsqueda</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Principal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100">
            <div className="px-8 py-6 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <UserCircle size={22} className="text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">{modoEdicion ? 'Editar Perfil del Locador' : 'Nuevo Registro de Locador'}</h3>
              </div>
              <button onClick={() => setModal(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors text-2xl leading-none">✕</button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              {/* Foto de perfil (solo en edición) */}
              {modoEdicion && (
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {form.foto_url ? (
                      <img src={form.foto_url} alt="foto" className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-lg" />
                    ) : (
                      <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-blue-700 font-bold text-3xl shadow-inner">
                        {getInitials(form.nombre, form.apellido)}
                      </div>
                    )}
                    <label className="absolute bottom-1 right-1 bg-[#185FA5] text-white p-2.5 rounded-2xl cursor-pointer shadow-md hover:bg-blue-700 transition-all">
                      <Camera size={18} />
                      <input type="file" accept="image/*" onChange={manejarArchivoFoto} className="hidden" disabled={subiendoFoto} />
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna izquierda */}
                <div className="space-y-6">
                  <h4 className="text-[#185FA5] font-semibold text-sm uppercase tracking-[1px]">Información Personal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Nombres *" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    <input placeholder="Apellidos *" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} className="border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="DNI *" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} className="border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    <input placeholder="RUC (opcional)" value={form.ruc} onChange={e => setForm({...form, ruc: e.target.value})} className="border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Fecha de nacimiento</label>
                    <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <input placeholder="Carrera / Profesión" value={form.profesion} onChange={e => setForm({...form, profesion: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  <select value={form.estado_civil} onChange={e => setForm({...form, estado_civil: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                    <option value="">Estado civil (opcional)</option>
                    {ESTADOS_CIVILES.map(ec => <option key={ec} value={ec}>{ec}</option>)}
                  </select>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.tiene_hijos} onChange={e => setForm({...form, tiene_hijos: e.target.checked, numero_hijos: e.target.checked ? form.numero_hijos : ''})} className="w-5 h-5 rounded-xl border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700 font-medium">¿Tiene hijos?</span>
                    </label>
                    {form.tiene_hijos && <input type="number" min="0" placeholder="Número de hijos" value={form.numero_hijos} onChange={e => setForm({...form, numero_hijos: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />}
                  </div>
                  <input placeholder="Correo Electrónico *" type="email" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  <input placeholder="Teléfono *" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  <input placeholder="Dirección *" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  <input placeholder="Distrito *" value={form.distrito} onChange={e => setForm({...form, distrito: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                </div>

                {/* Columna derecha */}
                <div className="space-y-6">
                  <h4 className="text-[#185FA5] font-semibold text-sm uppercase tracking-[1px]">Contrato y Pagos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <select value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})} className="border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                      <option value="FULL TIME">FULL TIME</option>
                      <option value="PART TIME">PART TIME</option>
                      <option value="POR HORAS">POR HORAS</option>
                    </select>
                    <input placeholder="Sueldo Base (S/) *" type="number" min="0" step="0.01" value={form.sueldo_base} onChange={e => setForm({...form, sueldo_base: e.target.value})} className="border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <select value={form.tipo_pago} onChange={e => setForm({...form, tipo_pago: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                    <option value="honorarios">Honorarios (RHE)</option>
                    <option value="factura">Factura</option>
                    <option value="boleta">Boleta</option>
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-medium">Fecha de inicio</label>
                      <input type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-medium">Fecha de fin (opcional)</label>
                      <input type="date" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl space-y-4">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium">Banco</label>
                        <select value={form.banco} onChange={e => setForm({...form, banco: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                          <option value="">Seleccionar banco...</option>
                          {bancos.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={agregarBanco} className="p-3 text-blue-600 hover:bg-blue-100 rounded-2xl border border-blue-200 hover:border-blue-300 transition-all" title="Agregar nuevo banco"><PlusCircle size={20} /></button>
                    </div>
                    <input placeholder="Número de Cuenta (opcional)" value={form.numero_cuenta} onChange={e => setForm({...form, numero_cuenta: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                    <input placeholder="CCI (opcional)" value={form.cci} onChange={e => setForm({...form, cci: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <textarea placeholder="Observaciones adicionales" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} className="w-full border border-gray-200 rounded-3xl px-5 py-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y min-h-[100px]" rows="3" />
                </div>
              </div>

              {/* Documentos (solo en edición) */}
              {modoEdicion && (
                <div className="border-t pt-8">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="font-semibold text-xl text-gray-900 flex items-center gap-3"><FileText className="text-[#185FA5]" size={26} />Documentos Adjuntos</h4>
                    <button onClick={() => setMostrarSubirDoc(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"><Upload size={18} />Subir Nuevo Documento</button>
                  </div>
                  {documentos.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-12 text-center"><p className="text-gray-400">Aún no hay documentos asociados a este locador</p></div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {documentos.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-100 p-5 rounded-2xl hover:shadow-sm transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0"><FileText size={22} className="text-blue-600" /></div>
                            <div>
                              <p className="font-semibold text-gray-900">{doc.titulo}</p>
                              <p className="text-sm text-gray-500 line-clamp-1">{doc.descripcion || 'Sin descripción'}</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date(doc.fecha_subida).toLocaleDateString('es-PE')} · {doc.tipo_documento}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition-all">
                            <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer" className="p-3 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors" title="Ver documento"><Eye size={20} /></a>
                            <button onClick={() => eliminarDocumento(doc)} className="p-3 hover:bg-red-50 text-red-500 rounded-xl transition-colors" title="Eliminar documento"><Trash2 size={20} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-gray-50 border-t flex gap-4">
              <button onClick={guardarLocador} disabled={loading} className="flex-1 bg-gradient-to-r from-[#185FA5] to-blue-700 hover:from-blue-700 hover:to-[#185FA5] text-white py-4 rounded-2xl font-semibold text-base shadow-xl shadow-blue-200/60 transition-all disabled:opacity-70 active:scale-[0.985]">{loading ? 'Procesando...' : modoEdicion ? 'Guardar Cambios' : 'Crear Registro'}</button>
              <button onClick={() => setModal(false)} className="px-10 py-4 border border-gray-300 rounded-2xl text-gray-600 font-semibold hover:bg-white hover:border-gray-400 transition-all active:scale-95">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal subir documento */}
      {mostrarSubirDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Subir Documento</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Tipo de documento</label>
                <select value={nuevoDoc.tipo} onChange={e => setNuevoDoc({...nuevoDoc, tipo: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                  <option value="contrato_locacion">Contrato de Locación</option>
                  <option value="memorandum">Memorándum</option>
                  <option value="incidencia">Incidencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Título del documento *</label>
                <input type="text" value={nuevoDoc.titulo} onChange={e => setNuevoDoc({...nuevoDoc, titulo: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Ej: Contrato de locación 2026" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Descripción (opcional)</label>
                <textarea rows="3" value={nuevoDoc.descripcion} onChange={e => setNuevoDoc({...nuevoDoc, descripcion: e.target.value})} className="w-full border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y" placeholder="Detalles adicionales del documento..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Archivo (PDF, JPG, PNG)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNuevoDoc({...nuevoDoc, archivo: e.target.files[0]})} className="w-full text-sm file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all border border-gray-200 rounded-2xl py-3 px-4" />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button onClick={() => setMostrarSubirDoc(false)} className="px-8 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-2xl transition-all">Cancelar</button>
              <button onClick={subirDocumento} disabled={subiendoDoc} className="bg-[#185FA5] hover:bg-blue-700 text-white px-8 py-3 rounded-2xl text-sm font-semibold transition-all disabled:opacity-70">{subiendoDoc ? 'Subiendo...' : 'Subir Documento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}