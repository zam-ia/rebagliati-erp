// src/pages/rrhh/TabBase.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Upload, Trash2, Eye } from 'lucide-react';

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

export default function TabBase() {
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({});
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  
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
      inicio_contrato: '', fin_contrato: '', foto_url: '', antiguedad: '', horario_id: ''
    });
    setDocumentos([]);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const subirFoto = async (file) => {
    if (!file) return;
    setSubiendoFoto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `empleados/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('empleados-fotos')
      .upload(filePath, file);
    if (uploadError) {
      alert('Error al subir imagen: ' + uploadError.message);
      setSubiendoFoto(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('empleados-fotos')
      .getPublicUrl(filePath);
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

  const avatarColors = [
    'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800', 'bg-pink-100 text-pink-800', 'bg-indigo-100 text-indigo-800'
  ];

  const manejarArchivo = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await subirFoto(file);
      if (url) setForm({ ...form, foto_url: url });
    }
  };

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

  const empleadosFiltrados = empleados.filter(emp =>
    `${emp.nombre} ${emp.apellido} ${emp.dni} ${emp.cargo}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Directorio de Colaboradores</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o cargo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 md:w-64 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
          />
          <button onClick={nuevoRegistro} className="bg-[#185FA5] text-white px-5 py-2 rounded-lg font-bold text-sm whitespace-nowrap hover:bg-blue-700">
            + Nuevo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {empleadosFiltrados.map((emp, idx) => (
          <div key={emp.id} onClick={() => verDetalle(emp)} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                {emp.foto_url ? (
                  <img src={emp.foto_url} alt="foto" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${avatarColors[idx % avatarColors.length]}`}>
                    {getInitials(emp.nombre, emp.apellido)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{emp.nombre} {emp.apellido}</h3>
                  <p className="text-sm text-[#185FA5] font-medium">{emp.cargo}</p>
                  <p className="text-xs text-gray-500">{emp.area}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>📄 DNI: {emp.dni || '—'}</div>
                <div>💰 S/ {emp.sueldo_total || 0}</div>
                <div>📞 {emp.telefono || '—'}</div>
                <div>✉️ {emp.correo?.split('@')[0] || '—'}</div>
              </div>
            </div>
          </div>
        ))}
        {empleadosFiltrados.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-400">No se encontraron colaboradores</div>
        )}
      </div>

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
              {/* Foto de perfil */}
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
                      📷 <input type="file" accept="image/*" onChange={manejarArchivo} className="hidden" disabled={subiendoFoto} />
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
                  <Campo label="¿Tiene hijos?" value={form.tiene_hijos} type="checkbox" edit={modoEdicion} setForm={setForm} field="tiene_hijos" />
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

              {/* 📄 DOCUMENTOS ADJUNTOS (MEMORÁNDUMS) */}
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
                <select
                  value={nuevoDoc.tipo}
                  onChange={(e) => setNuevoDoc({...nuevoDoc, tipo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="memorandum">Memorándum</option>
                  <option value="contrato">Contrato</option>
                  <option value="incidencia_planilla">Incidencia de planilla</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Título *</label>
                <input
                  type="text"
                  value={nuevoDoc.titulo}
                  onChange={(e) => setNuevoDoc({...nuevoDoc, titulo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Memorandum por tardanzas"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                <textarea
                  rows="2"
                  value={nuevoDoc.descripcion}
                  onChange={(e) => setNuevoDoc({...nuevoDoc, descripcion: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Detalles adicionales..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Archivo (PDF, imagen)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setNuevoDoc({...nuevoDoc, archivo: e.target.files[0]})}
                  className="w-full text-sm"
                />
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

// Componente Campo (igual que antes)
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
        <input type="checkbox" id={field} checked={value || false} onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.checked }))} className="w-4 h-4" />
        <label htmlFor={field} className="text-sm text-gray-700">{label}</label>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#185FA5]" />
    </div>
  );
}