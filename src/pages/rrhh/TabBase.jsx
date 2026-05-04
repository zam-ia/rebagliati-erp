// src/pages/rrhh/TabBase.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText, Upload, Trash2, Eye, Filter, X, ChevronDown, ChevronUp,
  ZoomIn, ZoomOut, RotateCw, Check, Camera, Users, UserCheck, UserX, TrendingUp, DollarSign
} from 'lucide-react';
import Cropper from 'react-easy-crop';

// ─── Helper para crear un blob recortado desde un canvas ────────────────────
const createCroppedImage = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('No se pudo crear la imagen'));
        else resolve(blob);
      }, 'image/jpeg', 0.95);
    };
    image.onerror = () => reject(new Error('Error al cargar la imagen'));
    image.src = imageSrc;
  });
};

// Listas predefinidas (igual que antes)
const AREAS_PREDEFINIDAS = [
  'Administración', 'Ventas', 'Académico', 'Marketing', 'Recursos Humanos', 'Tecnología', 'Operaciones', 'Finanzas'
];
const CARGOS_PREDEFINIDOS = [
  'Ejecutivo de ventas', 'Coordinador académico', 'Cajera', 'Analista', 'Supervisor', 'Gerente', 'Asistente', 'Practicante'
];
const TIPOS_CONTRATO = ['Indeterminado', 'Plazo fijo', 'Por demanda', 'Prácticas', 'Locación de servicios'];
const SITUACIONES_LABORALES = ['Activo', 'Inactivo', 'Vacaciones', 'Licencia'];
const MODALIDADES = ['Presencial', 'Remoto', 'Híbrido'];
const TURNOS = ['Mañana', 'Tarde', 'Noche', 'Rotativo'];
const TIPOS_SEGURO = ['Essalud', 'EPS (Seleccionar EPS)', 'Seguro privado'];
const SISTEMAS_PENSIONARIOS = ['ONP', 'AFP (Seleccionar AFP)', 'No aplica'];
const AFP_LIST = ['Prima', 'Habitat', 'Integra', 'Profuturo'];

// Opciones para estado civil
const ESTADOS_CIVILES = ['Soltero(a)', 'Casado(a)', 'Viudo(a)', 'Divorciado(a)'];

// Paleta de colores para áreas
const AREA_COLORS = {
  'Administración': { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-400' },
  'Ventas': { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  'Académico': { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-400' },
  'Marketing': { bg: 'bg-cyan-100', text: 'text-cyan-700', ring: 'ring-cyan-400' },
  'Recursos Humanos': { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-400' },
  'Tecnología': { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-400' },
  'Operaciones': { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-400' },
  'Finanzas': { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-400' },
};

const getAreaColor = (area) => AREA_COLORS[area] || { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-400' };

export default function TabBase() {
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({});
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  // Filtros avanzados
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroRangoSalarial, setFiltroRangoSalarial] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroEstadoKPI, setFiltroEstadoKPI] = useState(''); // 'activo' o 'inactivo'

  // Estados para documentos
  const [documentos, setDocumentos] = useState([]);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [mostrarSubirDoc, setMostrarSubirDoc] = useState(false);
  const [nuevoDoc, setNuevoDoc] = useState({
    tipo: 'memorandum',
    titulo: '',
    descripcion: '',
    archivo: null
  });

  // Listas dinámicas
  const [areasList, setAreasList] = useState([]);
  const [cargosList, setCargosList] = useState([]);
  const [horariosList, setHorariosList] = useState([]);
  
  // Complementando para migración (corregido nombre de estado)
  const [complementando, setComplementando] = useState([]);

  // ── Crop states ──────────────────────────────────────────────────────────
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc]   = useState(null);
  const [crop, setCrop]                   = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                   = useState(1);
  const [rotation, setRotation]            = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Cargar listas desde localStorage
  useEffect(() => {
    const storedAreas = localStorage.getItem('areasList');
    const storedCargos = localStorage.getItem('cargosList');
    setAreasList(storedAreas ? JSON.parse(storedAreas) : AREAS_PREDEFINIDAS);
    setCargosList(storedCargos ? JSON.parse(storedCargos) : CARGOS_PREDEFINIDOS);
  }, []);

  useEffect(() => {
    if (areasList.length) localStorage.setItem('areasList', JSON.stringify(areasList));
  }, [areasList]);
  useEffect(() => {
    if (cargosList.length) localStorage.setItem('cargosList', JSON.stringify(cargosList));
  }, [cargosList]);

  useEffect(() => {
    supabase.from('horarios').select('id, nombre, tipo').eq('activo', true).then(({ data }) => {
      setHorariosList(data || []);
    });
  }, []);

  // Cargar locadores activos para migración (CORREGIDO: setter correcto)
  useEffect(() => {
    supabase
      .from('locadores')
      .select('*')
      .eq('estado', 'activo')
      .order('apellido', { ascending: true })
      .then(({ data }) => setComplementando(data || [])); // ← ANTES era setLocadores, corregido
  }, []);

  // ═══ KPIs EN TIEMPO REAL ═══
  const kpis = useMemo(() => {
    const total = empleados.length;
    const activos = empleados.filter(e => e.situacion_laboral === 'Activo').length;
    const inactivos = empleados.filter(e => e.situacion_laboral === 'Inactivo').length;
    
    // Área con más colaboradores
    const areaCount = {};
    empleados.forEach(e => {
      if (e.area) areaCount[e.area] = (areaCount[e.area] || 0) + 1;
    });
    let areaMayor = { nombre: '—', count: 0 };
    Object.entries(areaCount).forEach(([nombre, count]) => {
      if (count > areaMayor.count) areaMayor = { nombre, count };
    });

    // Promedio salarial
    const sueldos = empleados.filter(e => e.sueldo_total > 0).map(e => e.sueldo_total);
    const promedio = sueldos.length ? Math.round(sueldos.reduce((a, b) => a + b, 0) / sueldos.length) : 0;

    return { total, activos, inactivos, areaMayor, promedio };
  }, [empleados]);

  const calcularAntiguedad = (fechaInicio) => {
    if (!fechaInicio) return '';
    const inicio = new Date(fechaInicio);
    const ahora = new Date();
    let años = ahora.getFullYear() - inicio.getFullYear();
    let meses = ahora.getMonth() - inicio.getMonth();
    if (meses < 0) {
      años--;
      meses += 12;
    }
    let dias = ahora.getDate() - inicio.getDate();
    if (dias < 0) {
      meses--;
      const ultimoDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0).getDate();
      dias += ultimoDiaMesAnterior;
      if (meses < 0) {
        años--;
        meses += 12;
      }
    }
    return `${años} años, ${meses} meses, ${dias} días`;
  };

  useEffect(() => {
    if (form.fecha_inicio) {
      setForm(prev => ({ ...prev, antiguedad: calcularAntiguedad(prev.fecha_inicio) }));
    } else {
      setForm(prev => ({ ...prev, antiguedad: '' }));
    }
  }, [form.fecha_inicio]);

  const handleCargoChange = (cargo) => {
    setForm(prev => ({ ...prev, cargo }));
    const descripciones = {
      'Ejecutivo de ventas': 'Responsable de ventas y atención al cliente.',
      'Coordinador académico': 'Coordinar programas académicos y docentes.',
      'Cajera': 'Manejo de caja y pagos.',
    };
    if (descripciones[cargo] && !form.descripcion_cargo) {
      setForm(prev => ({ ...prev, descripcion_cargo: descripciones[cargo] }));
    }
  };

  const agregarArea = () => {
    const nombre = prompt('Nueva área:');
    if (nombre && !areasList.includes(nombre)) {
      const nuevasAreas = [...areasList, nombre];
      setAreasList(nuevasAreas);
      setForm(prev => ({ ...prev, area: nombre }));
    } else if (nombre) alert('El área ya existe');
  };

  const agregarCargo = () => {
    const nombre = prompt('Nuevo cargo:');
    if (nombre && !cargosList.includes(nombre)) {
      const nuevosCargos = [...cargosList, nombre];
      setCargosList(nuevosCargos);
      setForm(prev => ({ ...prev, cargo: nombre }));
    } else if (nombre) alert('El cargo ya existe');
  };

  const cargar = async () => {
    const { data } = await supabase.from('empleados').select('*').order('apellido');
    setEmpleados(data || []);
  };

  useEffect(() => { cargar(); }, []);

  const cargarDocumentos = async (empleadoId) => {
    if (!empleadoId) return;
    const { data, error } = await supabase
      .from('documentos_empleados')
      .select('*')
      .eq('empleado_id', empleadoId)
      .order('fecha_subida', { ascending: false });
    if (!error) setDocumentos(data || []);
  };

  const verDetalle = (emp) => {
    setEmpleadoSeleccionado(emp);
    setForm({ ...emp });
    setModoEdicion(false);
    setModalAbierto(true);
    cargarDocumentos(emp.id);
  };

  const nuevoRegistro = () => {
    setEmpleadoSeleccionado(null);
    setForm({
      nombre: '', apellido: '', cargo: '', area: '', dni: '', correo: '', telefono: '',
      tipo_contrato: '', situacion_laboral: 'Activo', fecha_nacimiento: '', tiene_hijos: false,
      direccion: '', referencia_direccion: '', distrito: '', tipo_seguro: '',
      sistema_pensionario: '', sueldo_bruto: 0, comodato: 0, asignacion_familiar: 0,
      fecha_inicio: '', fecha_ingreso_planilla: '', modalidad_trabajo: 'Presencial',
      turno: '', banco_nombre: '', numero_cuenta: '', cci: '',
      talla_uniforme: '', datos_familiares_contacto: '', descripcion_cargo: '',
      inicio_contrato: '', fin_contrato: '', foto_url: '', antiguedad: '', horario_id: '',
      complementando_id: null,
      profesion: '',
      estado_civil: '',
      numero_hijos: 0
    });
    setDocumentos([]);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  // ── Subir foto (recibe Blob) ──────────────────────────────────────────────
  const subirFoto = async (blob) => {
    if (!blob) return null;
    setSubiendoFoto(true);
    const fileExt = 'jpg';
    const filePath = `empleados/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('empleados-fotos')
      .upload(filePath, blob, { contentType: 'image/jpeg' });
    if (uploadError) { alert('Error al subir imagen: ' + uploadError.message); setSubiendoFoto(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from('empleados-fotos').getPublicUrl(filePath);
    setSubiendoFoto(false);
    return publicUrl;
  };

  const guardar = async () => {
    if (!form.nombre || !form.apellido) {
      alert('Nombre y apellido son obligatorios');
      return;
    }

    const datosEnvio = { ...form };
    delete datosEnvio.antiguedad;
    const fechaCampos = ['fecha_nacimiento', 'fecha_inicio', 'fecha_ingreso_planilla', 'inicio_contrato', 'fin_contrato'];
    fechaCampos.forEach(campo => {
      if (datosEnvio[campo] === '') datosEnvio[campo] = null;
    });
    if (datosEnvio.tipo_contrato === 'Indeterminado') {
      datosEnvio.fin_contrato = null;
    }
    const s_bruto = Number(datosEnvio.sueldo_bruto) || 0;
    const s_comodato = Number(datosEnvio.comodato) || 0;
    const s_asig = datosEnvio.tiene_hijos ? (Number(datosEnvio.asignacion_familiar) || 102.5) : 0;
    datosEnvio.sueldo_total = s_bruto + s_comodato + s_asig;
    datosEnvio.asignacion_familiar = s_asig;
    delete datosEnvio.id;

    try {
      if (empleadoSeleccionado?.id) {
        const { error } = await supabase
          .from('empleados')
          .update(datosEnvio)
          .eq('id', empleadoSeleccionado.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('empleados').insert([datosEnvio]);
        if (error) throw error;

        // ✅ CORREGIDO: actualizar la tabla 'locadores', no 'complementando'
        if (datosEnvio.complementando_id) {
          await supabase
            .from('locadores')
            .update({ estado: 'migrado' })
            .eq('id', datosEnvio.complementando_id);
        }
      }
      await cargar();
      setModalAbierto(false);
      alert('Información guardada correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al guardar: ' + error.message);
    }
  };

  const eliminar = async () => {
    if (!empleadoSeleccionado?.id) return;
    if (confirm('¿Eliminar este colaborador permanentemente?')) {
      const { error } = await supabase
        .from('empleados')
        .delete()
        .eq('id', empleadoSeleccionado.id);
      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        await cargar();
        setModalAbierto(false);
      }
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
    const fileName = `${empleadoSeleccionado.id}_${Date.now()}.${fileExt}`;
    const filePath = `documentos/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('documentos-empleados')
      .upload(filePath, file);
    if (uploadError) {
      alert('Error al subir archivo: ' + uploadError.message);
      setSubiendoDoc(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('documentos-empleados')
      .getPublicUrl(filePath);
    const { error: dbError } = await supabase.from('documentos_empleados').insert({
      empleado_id: empleadoSeleccionado.id,
      tipo_documento: nuevoDoc.tipo,
      titulo: nuevoDoc.titulo,
      descripcion: nuevoDoc.descripcion,
      archivo_url: publicUrl,
    });
    if (dbError) alert('Error al guardar metadata: ' + dbError.message);
    else {
      alert('Documento subido correctamente');
      cargarDocumentos(empleadoSeleccionado.id);
      setMostrarSubirDoc(false);
      setNuevoDoc({ tipo: 'memorandum', titulo: '', descripcion: '', archivo: null });
    }
    setSubiendoDoc(false);
  };

  const eliminarDocumento = async (doc) => {
    if (!confirm('¿Eliminar este documento?')) return;
    const path = doc.archivo_url.split('/public/')[1];
    if (path) await supabase.storage.from('documentos-empleados').remove([path]);
    const { error } = await supabase.from('documentos_empleados').delete().eq('id', doc.id);
    if (!error) {
      alert('Documento eliminado');
      cargarDocumentos(empleadoSeleccionado.id);
    } else alert('Error: ' + error.message);
  };

  const getInitials = (nombre, apellido) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  };

  // ── Manejo de archivo de foto (abre modal de crop) ──────────────────────
  const manejarArchivo = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Limpiar input para permitir re-seleccionar el mismo archivo
    }
  };

  // ── Crop handlers ────────────────────────────────────────────────────────
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await createCroppedImage(cropImageSrc, croppedAreaPixels);
      const url = await subirFoto(croppedBlob);
      if (url) {
        setForm({ ...form, foto_url: url });
      }
    } catch (err) {
      alert('Error al recortar la imagen: ' + err.message);
    } finally {
      setShowCropModal(false);
      setCropImageSrc(null);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const CampoSelect = ({ label, value, options, edit, setForm, field, onAddNew }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2">
        <select
          value={value || ''}
          onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
          disabled={!edit}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#185FA5] disabled:bg-gray-100"
        >
          <option value="">Seleccionar...</option>
          {options.map((opt, idx) => {
            if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
              return <option key={opt.value || idx} value={opt.value}>{opt.label}</option>;
            }
            return <option key={opt || idx} value={opt}>{opt}</option>;
          })}
        </select>
        {edit && onAddNew && (
          <button type="button" onClick={onAddNew} className="px-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300" title="Agregar nuevo">+</button>
        )}
      </div>
    </div>
  );

  // Filtrado combinado (incluye KPI clickeable)
  const empleadosFiltrados = empleados.filter(emp => {
    const coincideBusqueda = `${emp.nombre} ${emp.apellido} ${emp.dni} ${emp.cargo}`.toLowerCase().includes(busqueda.toLowerCase());
    const coincideArea = !filtroArea || emp.area === filtroArea;
    const coincideCargo = !filtroCargo || emp.cargo === filtroCargo;
    let coincideRango = true;
    if (filtroRangoSalarial) {
      const [min, max] = filtroRangoSalarial.split('-').map(Number);
      const sueldo = emp.sueldo_total || 0;
      coincideRango = sueldo >= min && sueldo < max;
    }
    let coincideEstado = true;
    if (filtroEstadoKPI === 'activo') coincideEstado = emp.situacion_laboral === 'Activo';
    else if (filtroEstadoKPI === 'inactivo') coincideEstado = emp.situacion_laboral === 'Inactivo';
    return coincideBusqueda && coincideArea && coincideCargo && coincideRango && coincideEstado;
  });

  const toggleExpanded = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  // ── Helpers para KPIs clickeables ──────────────────────────────────────
  const handleKpiClick = (tipo) => {
    if (tipo === 'total') {
      setFiltroEstadoKPI('');
      setFiltroArea('');
      setFiltroCargo('');
      setFiltroRangoSalarial('');
      setBusqueda('');
    } else if (tipo === 'activo') {
      setFiltroEstadoKPI(prev => prev === 'activo' ? '' : 'activo');
    } else if (tipo === 'inactivo') {
      setFiltroEstadoKPI(prev => prev === 'inactivo' ? '' : 'inactivo');
    } else if (tipo === 'areaMayor') {
      setFiltroArea(prev => prev === kpis.areaMayor.nombre ? '' : kpis.areaMayor.nombre);
    }
    // promedio no hace nada
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-[#0B1527] tracking-tight">Directorio de Colaboradores</h2>
          <p className="text-gray-500 text-sm mt-1">Base de datos inteligente con filtros avanzados</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o cargo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-100 rounded-2xl text-sm bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
            <svg className="absolute left-3 top-2.5 text-gray-400" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`p-2.5 rounded-2xl border-2 transition-all ${mostrarFiltros ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'}`}
            title="Filtros avanzados"
          >
            <Filter size={18} />
          </button>
          <button onClick={nuevoRegistro} className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            + Nuevo Registro
          </button>
        </div>
      </div>

      {/* ═══ BLOQUE DE KPIs ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div
          onClick={() => handleKpiClick('total')}
          className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex items-center gap-3 ${!filtroEstadoKPI && !filtroArea && !filtroCargo && !filtroRangoSalarial ? 'ring-2 ring-blue-200' : ''}`}
        >
          <div className="p-2 bg-blue-50 rounded-xl"><Users size={20} className="text-blue-600"/></div>
          <div>
            <p className="text-2xl font-black text-gray-800">{kpis.total}</p>
            <p className="text-xs text-gray-500 font-medium">Total colaboradores</p>
          </div>
        </div>

        <div
          onClick={() => handleKpiClick('activo')}
          className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex items-center gap-3 ${filtroEstadoKPI === 'activo' ? 'ring-2 ring-emerald-200' : ''}`}
        >
          <div className="p-2 bg-emerald-50 rounded-xl"><UserCheck size={20} className="text-emerald-600"/></div>
          <div>
            <p className="text-2xl font-black text-gray-800">{kpis.activos}</p>
            <p className="text-xs text-gray-500 font-medium">Activos</p>
          </div>
        </div>

        <div
          onClick={() => handleKpiClick('inactivo')}
          className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex items-center gap-3 ${filtroEstadoKPI === 'inactivo' ? 'ring-2 ring-red-200' : ''}`}
        >
          <div className="p-2 bg-red-50 rounded-xl"><UserX size={20} className="text-red-500"/></div>
          <div>
            <p className="text-2xl font-black text-gray-800">{kpis.inactivos}</p>
            <p className="text-xs text-gray-500 font-medium">Inactivos</p>
          </div>
        </div>

        <div
          onClick={() => handleKpiClick('areaMayor')}
          className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex items-center gap-3 ${filtroArea === kpis.areaMayor.nombre ? 'ring-2 ring-purple-200' : ''}`}
        >
          <div className="p-2 bg-purple-50 rounded-xl"><TrendingUp size={20} className="text-purple-600"/></div>
          <div>
            <p className="text-2xl font-black text-gray-800">{kpis.areaMayor.count}</p>
            <p className="text-xs text-gray-500 font-medium truncate">{kpis.areaMayor.nombre}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl"><DollarSign size={20} className="text-amber-600"/></div>
          <div>
            <p className="text-2xl font-black text-gray-800">S/ {kpis.promedio}</p>
            <p className="text-xs text-gray-500 font-medium">Promedio salarial</p>
          </div>
        </div>
      </div>

      {/* Filtros avanzados desplegables */}
      {mostrarFiltros && (
        <div className="mb-6 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-50 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Área</label>
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Todas</option>
              {areasList.map(area => <option key={area} value={area}>{area}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Cargo</label>
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Todos</option>
              {cargosList.map(cargo => <option key={cargo} value={cargo}>{cargo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Rango Salarial</label>
            <select
              value={filtroRangoSalarial}
              onChange={(e) => setFiltroRangoSalarial(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Todos</option>
              <option value="0-1000">Hasta S/1000</option>
              <option value="1000-2000">S/1000 a S/2000</option>
              <option value="2000-5000">S/2000 a S/5000</option>
              <option value="5000-10000">S/5000 a S/10000</option>
              <option value="10000-999999">Más de S/10000</option>
            </select>
          </div>
        </div>
      )}

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {empleadosFiltrados.map((emp) => {
          const areaColor = getAreaColor(emp.area);
          const isExpanded = expandedCard === emp.id;
          return (
            <div
              key={emp.id}
              className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group cursor-pointer ${isExpanded ? 'ring-2 ring-blue-200' : ''}`}
              onMouseEnter={() => setExpandedCard(emp.id)}
              onMouseLeave={() => setExpandedCard(null)}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    {emp.foto_url ? (
                      <img src={emp.foto_url} alt="foto" className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-md" />
                    ) : (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${areaColor.bg} ${areaColor.text} ring-2 ring-white shadow-md`}>
                        {getInitials(emp.nombre, emp.apellido)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{emp.nombre} {emp.apellido}</h3>
                    <p className="text-xs text-[#185FA5] font-semibold truncate">{emp.cargo || 'Sin cargo'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${areaColor.bg} ${areaColor.text}`}>
                      {emp.area || 'Sin área'}
                    </span>
                  </div>
                </div>

                {/* Detalles expandibles en hover */}
                <div className={`grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-500 transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                  <div className="flex items-center gap-1"><span className="text-gray-400">📄</span> DNI: {emp.dni || '—'}</div>
                  <div className="flex items-center gap-1"><span className="text-gray-400">💰</span> S/ {emp.sueldo_total || 0}</div>
                  <div className="flex items-center gap-1"><span className="text-gray-400">📞</span> {emp.telefono || '—'}</div>
                  <div className="flex items-center gap-1"><span className="text-gray-400">✉️</span> {emp.correo?.split('@')[0] || '—'}</div>
                </div>
              </div>

              {/* Acciones rápidas (hover) */}
              <div className="px-5 pb-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => verDetalle(emp)}
                  className="flex-1 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  Ver perfil
                </button>
                <button
                  onClick={() => { verDetalle(emp); setModoEdicion(true); }}
                  className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
        {empleadosFiltrados.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <svg className="mx-auto mb-4 opacity-20" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <p className="font-medium">No se encontraron colaboradores con esos filtros</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL DE RECORTE DE FOTO (CROP)
      ═══════════════════════════════════════════════════════════════════ */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Camera size={20} className="text-[#185FA5]" />
                Recortar foto de perfil
              </h3>
              <button
                onClick={() => { setShowCropModal(false); setCropImageSrc(null); }}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative flex-1 min-h-[400px] bg-gray-900">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-center gap-6">
              <button onClick={handleZoomOut} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-100 transition" title="Alejar"><ZoomOut size={18} className="text-gray-600" /></button>
              <input type="range" min={0.5} max={5} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-48 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
              <button onClick={handleZoomIn} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-100 transition" title="Acercar"><ZoomIn size={18} className="text-gray-600" /></button>
              <button onClick={handleRotate} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-100 transition" title="Rotar 90°"><RotateCw size={18} className="text-gray-600" /></button>
            </div>

            <div className="px-6 py-4 bg-white border-t flex gap-3">
              <button onClick={() => { setShowCropModal(false); setCropImageSrc(null); }} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-all">Cancelar</button>
              <button onClick={handleCropConfirm} disabled={subiendoFoto} className="flex-1 py-3 bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-70">
                {subiendoFoto ? 'Subiendo...' : <><Check size={18} /> Recortar y guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de perfil (edición/detalle) */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#185FA5] text-white p-5 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold">
                {modoEdicion ? (empleadoSeleccionado ? 'Editar Colaborador' : 'Nuevo Colaborador') : 'Ficha del Colaborador'}
              </h3>
              <div className="flex gap-2">
                {!modoEdicion && <button onClick={() => setModoEdicion(true)} className="bg-white text-[#185FA5] px-4 py-1 rounded-lg text-sm font-bold hover:bg-gray-100">Editar</button>}
                {modoEdicion && <button onClick={guardar} className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm font-bold hover:bg-green-700">Guardar</button>}
                {empleadoSeleccionado && <button onClick={eliminar} className="bg-red-600 text-white px-4 py-1 rounded-lg text-sm font-bold hover:bg-red-700">Eliminar</button>}
                <button onClick={() => setModalAbierto(false)} className="bg-gray-300 text-gray-800 px-3 py-1 rounded-lg text-sm">Cerrar</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {!empleadoSeleccionado && modoEdicion && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <label className="block text-xs font-bold text-blue-700 mb-2">🚀 Migrar desde Complementando existente</label>
                  <select
                    onChange={async (e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const { data: loc } = await supabase.from('locadores').select('*').eq('id', id).single();
                      if (loc) {
                        setForm(prev => ({
                          ...prev,
                          nombre: loc.nombre || '', apellido: loc.apellido || '', dni: loc.dni || '',
                          correo: loc.correo || '', telefono: loc.telefono || '', direccion: loc.direccion || '',
                          distrito: loc.distrito || '', fecha_nacimiento: loc.fecha_nacimiento || '',
                          profesion: loc.profesion || '', estado_civil: loc.estado_civil || '',
                          tiene_hijos: loc.tiene_hijos || false, numero_hijos: loc.numero_hijos || 0,
                          banco_nombre: loc.banco || '', numero_cuenta: loc.numero_cuenta || '', cci: loc.cci || '',
                          complementando_id: loc.id,
                        }));
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                  >
                    <option value="">Seleccionar complementando...</option>
                    {complementando.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.nombre} {loc.apellido} - {loc.dni}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Foto de perfil (con botón de cambio que abre crop) */}
              {modoEdicion && (
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {form.foto_url ? (
                      <img src={form.foto_url} alt="foto" className="w-24 h-24 rounded-full object-cover border-2 border-gray-300" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl">
                        {getInitials(form.nombre, form.apellido)}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-[#185FA5] text-white p-1 rounded-full cursor-pointer text-xs">
                      <Camera size={16} />
                      <input type="file" accept="image/*" onChange={manejarArchivo} className="hidden" disabled={subiendoFoto} />
                    </label>
                  </div>
                </div>
              )}
              {!modoEdicion && form.foto_url && (
                <div className="flex justify-center mb-4">
                  <img src={form.foto_url} alt="foto" className="w-24 h-24 rounded-full object-cover border-2 border-gray-300" />
                </div>
              )}

              {/* Datos Personales */}
              <div className="border-b pb-3">
                <h4 className="font-bold text-[#185FA5] mb-3">📋 Datos Personales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Nombres" value={form.nombre} edit={modoEdicion} setForm={setForm} field="nombre" />
                  <Campo label="Apellidos" value={form.apellido} edit={modoEdicion} setForm={setForm} field="apellido" />
                  <Campo label="DNI" value={form.dni} edit={modoEdicion} setForm={setForm} field="dni" />
                  <Campo label="Fecha nacimiento" value={form.fecha_nacimiento} type="date" edit={modoEdicion} setForm={setForm} field="fecha_nacimiento" />
                  <CampoSelect label="Estado civil" value={form.estado_civil} options={ESTADOS_CIVILES} edit={modoEdicion} setForm={setForm} field="estado_civil" />
                  <Campo label="¿Tiene hijos?" value={form.tiene_hijos} type="checkbox" edit={modoEdicion} setForm={setForm} field="tiene_hijos" />
                  {form.tiene_hijos && (
                    <Campo label="Número de hijos" value={form.numero_hijos} type="number" edit={modoEdicion} setForm={setForm} field="numero_hijos" />
                  )}
                  <Campo label="Profesión" value={form.profesion} edit={modoEdicion} setForm={setForm} field="profesion" />
                  <Campo label="Dirección" value={form.direccion} edit={modoEdicion} setForm={setForm} field="direccion" />
                  <Campo label="Referencia" value={form.referencia_direccion} edit={modoEdicion} setForm={setForm} field="referencia_direccion" />
                  <Campo label="Distrito" value={form.distrito} edit={modoEdicion} setForm={setForm} field="distrito" />
                  <Campo label="Teléfono" value={form.telefono} edit={modoEdicion} setForm={setForm} field="telefono" />
                  <Campo label="Correo electrónico" value={form.correo} edit={modoEdicion} setForm={setForm} field="correo" />
                </div>
              </div>

              {/* Datos Laborales */}
              <div className="border-b pb-3">
                <h4 className="font-bold text-[#185FA5] mb-3">💼 Datos Laborales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CampoSelect label="Área" value={form.area} options={areasList} edit={modoEdicion} setForm={setForm} field="area" onAddNew={agregarArea} />
                  <CampoSelect label="Cargo" value={form.cargo} options={cargosList} edit={modoEdicion} setForm={setForm} field="cargo" onAddNew={agregarCargo} />
                  <Campo label="Descripción del cargo" value={form.descripcion_cargo} edit={modoEdicion} setForm={setForm} field="descripcion_cargo" />
                  <CampoSelect label="Tipo de contrato" value={form.tipo_contrato} options={TIPOS_CONTRATO} edit={modoEdicion} setForm={setForm} field="tipo_contrato" />
                  <CampoSelect label="Situación laboral" value={form.situacion_laboral} options={SITUACIONES_LABORALES} edit={modoEdicion} setForm={setForm} field="situacion_laboral" />
                  <CampoSelect label="Modalidad" value={form.modalidad_trabajo} options={MODALIDADES} edit={modoEdicion} setForm={setForm} field="modalidad_trabajo" />
                  <CampoSelect label="Turno" value={form.turno} options={TURNOS} edit={modoEdicion} setForm={setForm} field="turno" />
                  <Campo label="Fecha ingreso" value={form.fecha_inicio} type="date" edit={modoEdicion} setForm={setForm} field="fecha_inicio" />
                  <Campo label="Fecha ingreso planilla" value={form.fecha_ingreso_planilla} type="date" edit={modoEdicion} setForm={setForm} field="fecha_ingreso_planilla" />
                  <Campo label="Inicio contrato" value={form.inicio_contrato} type="date" edit={modoEdicion} setForm={setForm} field="inicio_contrato" />
                  <Campo label="Fin contrato" value={form.fin_contrato} type="date" edit={modoEdicion && form.tipo_contrato !== 'Indeterminado'} setForm={setForm} field="fin_contrato" />
                  <Campo label="Tiempo de antigüedad" value={form.antiguedad} edit={false} />
                  <CampoSelect label="Horario" value={form.horario_id} options={horariosList.map(h => ({ value: h.id, label: `${h.nombre} (${h.tipo})` }))} edit={modoEdicion} setForm={setForm} field="horario_id" />
                </div>
              </div>

              {/* Remuneración y Beneficios */}
              <div className="border-b pb-3">
                <h4 className="font-bold text-[#185FA5] mb-3">💰 Remuneración y Beneficios</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Sueldo Bruto (S/)" value={form.sueldo_bruto} type="number" edit={modoEdicion} setForm={setForm} field="sueldo_bruto" />
                  <Campo label="Comodato (S/)" value={form.comodato} type="number" edit={modoEdicion} setForm={setForm} field="comodato" />
                  <Campo label="Asignación Familiar (S/)" value={form.asignacion_familiar} type="number" edit={modoEdicion} setForm={setForm} field="asignacion_familiar" />
                  <Campo label="Sueldo Total (S/)" value={form.sueldo_total} type="number" edit={false} />
                  <CampoSelect label="Tipo de seguro" value={form.tipo_seguro} options={TIPOS_SEGURO} edit={modoEdicion} setForm={setForm} field="tipo_seguro" />
                  <CampoSelect label="Sistema pensionario" value={form.sistema_pensionario} options={SISTEMAS_PENSIONARIOS} edit={modoEdicion} setForm={setForm} field="sistema_pensionario" />
                  {form.sistema_pensionario === 'AFP (Seleccionar AFP)' && modoEdicion && (
                    <CampoSelect label="AFP específica" value={form.afp_entidad} options={AFP_LIST} edit={modoEdicion} setForm={setForm} field="afp_entidad" />
                  )}
                </div>
              </div>

              {/* Datos Bancarios */}
              <div className="border-b pb-3">
                <h4 className="font-bold text-[#185FA5] mb-3">🏦 Datos Bancarios y CTS</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Banco" value={form.banco_nombre} edit={modoEdicion} setForm={setForm} field="banco_nombre" />
                  <Campo label="Número de cuenta" value={form.numero_cuenta} edit={modoEdicion} setForm={setForm} field="numero_cuenta" />
                  <Campo label="CCI" value={form.cci} edit={modoEdicion} setForm={setForm} field="cci" />
                </div>
              </div>

              {/* Uniformes y Datos Familiares */}
              <div className="border-b pb-3">
                <h4 className="font-bold text-[#185FA5] mb-3">👕 Uniformes y Datos Familiares</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Campo label="Talla de uniforme" value={form.talla_uniforme} edit={modoEdicion} setForm={setForm} field="talla_uniforme" />
                  <Campo label="Datos familiares (contacto emergencia)" value={form.datos_familiares_contacto} edit={modoEdicion} setForm={setForm} field="datos_familiares_contacto" />
                </div>
              </div>

              {/* Documentos */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-[#185FA5]">📄 Documentos adjuntos</h4>
                  {modoEdicion && (
                    <button onClick={() => setMostrarSubirDoc(true)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                      <Upload size={14} /> Subir documento
                    </button>
                  )}
                </div>
                {documentos.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No hay documentos asociados</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {documentos.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-bold">{doc.titulo}</p>
                            <p className="text-xs text-gray-500">{doc.descripcion}</p>
                            <p className="text-[10px] text-gray-400">{new Date(doc.fecha_subida).toLocaleDateString()} · {doc.tipo_documento}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Ver"><Eye size={16} /></a>
                          {modoEdicion && (
                            <button onClick={() => eliminarDocumento(doc)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Eliminar"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {modoEdicion && (
              <div className="sticky bottom-0 bg-gray-50 p-4 flex justify-end gap-3 border-t">
                <button onClick={() => setModalAbierto(false)} className="px-5 py-2 border rounded-lg text-gray-600">Cancelar</button>
                <button onClick={guardar} className="bg-[#185FA5] text-white px-6 py-2 rounded-lg font-bold">Guardar Cambios</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para subir documento */}
      {mostrarSubirDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-gray-800 mb-4">Subir documento</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
                <select value={nuevoDoc.tipo} onChange={(e) => setNuevoDoc({...nuevoDoc, tipo: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="memorandum">Memorándum</option>
                  <option value="contrato">Contrato</option>
                  <option value="incidencia_planilla">Incidencia de planilla</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Título *</label>
                <input type="text" value={nuevoDoc.titulo} onChange={(e) => setNuevoDoc({...nuevoDoc, titulo: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej: Memorandum por tardanzas" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                <textarea rows="2" value={nuevoDoc.descripcion} onChange={(e) => setNuevoDoc({...nuevoDoc, descripcion: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Detalles adicionales..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Archivo (PDF, imagen)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setNuevoDoc({...nuevoDoc, archivo: e.target.files[0]})} className="w-full text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setMostrarSubirDoc(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button onClick={subirDocumento} disabled={subiendoDoc} className="bg-[#185FA5] text-white px-4 py-2 rounded-lg text-sm font-bold">
                {subiendoDoc ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Campo (mejorado para manejar el tipo number)
function Campo({ label, value, type = 'text', edit = false, setForm, field }) {
  if (!edit) {
    if (type === 'checkbox') {
      return (
        <div>
          <label className="block text-xs text-gray-500">{label}</label>
          <div className="text-gray-800">{value ? 'Sí' : 'No'}</div>
        </div>
      );
    }
    if (type === 'number') {
      return (
        <div>
          <label className="block text-xs text-gray-500">{label}</label>
          <div className="text-gray-800 font-medium">{value || '—'}</div>
        </div>
      );
    }
    return (
      <div>
        <label className="block text-xs text-gray-500">{label}</label>
        <div className="text-gray-800">{value || '—'}</div>
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={field}
          checked={value || false}
          onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.checked }))}
          className="w-4 h-4"
        />
        <label htmlFor={field} className="text-sm text-gray-700">{label}</label>
      </div>
    );
  }

  if (type === 'number') {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        <input
          type="number"
          min="0"
          value={value || ''}
          onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#185FA5]"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#185FA5]"
      />
    </div>
  );
}