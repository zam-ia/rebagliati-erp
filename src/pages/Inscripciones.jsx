import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function Inscripciones() {
  const [participantes, setParticipantes] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [cargando, setCargando] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    participante_id: '',
    programa: '',
    tipo: 'diplomado',
    monto_total: '',
    monto_pagado: '',
    estado: 'pendiente',
    fecha_evento: ''
  });
  
  // Estado para nuevo participante (si no existe)
  const [nuevoParticipante, setNuevoParticipante] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    correo: '',
    grado_academico: ''
  });
  const [mostrarNuevoParticipante, setMostrarNuevoParticipante] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [filtroPrograma, filtroEstado]);

  const cargarDatos = async () => {
    setCargando(true);
    
    // Cargar participantes
    const { data: participantesData } = await supabase
      .from('participantes')
      .select('*')
      .order('apellido');
    setParticipantes(participantesData || []);
    
    // Cargar inscripciones con filtros
    let query = supabase
      .from('inscripciones')
      .select(`
        *,
        participantes (nombre, apellido, dni)
      `)
      .order('created_at', { ascending: false });
    
    if (filtroPrograma) {
      query = query.eq('programa', filtroPrograma);
    }
    if (filtroEstado) {
      query = query.eq('estado', filtroEstado);
    }
    
    const { data: inscripcionesData } = await query;
    setInscripciones(inscripcionesData || []);
    
    // Obtener programas únicos para el filtro
    const { data: programasData } = await supabase
      .from('inscripciones')
      .select('programa')
      .not('programa', 'is', null);
    
    const programasUnicos = [...new Set(programasData?.map(p => p.programa) || [])];
    setProgramas(programasUnicos);
    
    setCargando(false);
  };

  const buscarParticipantePorDNI = async (dni) => {
    const { data } = await supabase
      .from('participantes')
      .select('*')
      .eq('dni', dni)
      .single();
    
    if (data) {
      setFormData({ ...formData, participante_id: data.id });
      setMostrarNuevoParticipante(false);
    } else {
      setMostrarNuevoParticipante(true);
    }
  };

  const crearParticipante = async () => {
    const { data, error } = await supabase
      .from('participantes')
      .insert([{
        nombre: nuevoParticipante.nombre,
        apellido: nuevoParticipante.apellido,
        dni: nuevoParticipante.dni,
        telefono: nuevoParticipante.telefono,
        correo: nuevoParticipante.correo,
        grado_academico: nuevoParticipante.grado_academico
      }])
      .select()
      .single();
    
    if (data) {
      setFormData({ ...formData, participante_id: data.id });
      setMostrarNuevoParticipante(false);
      setNuevoParticipante({
        nombre: '', apellido: '', dni: '', telefono: '', correo: '', grado_academico: ''
      });
      cargarDatos();
      alert('Participante creado exitosamente');
    } else {
      alert('Error al crear participante: ' + error?.message);
    }
  };

  const guardarInscripcion = async () => {
    if (!formData.participante_id) {
      alert('Debes seleccionar un participante');
      return;
    }
    if (!formData.programa) {
      alert('Debes ingresar el programa');
      return;
    }
    
    const inscripcionData = {
      participante_id: parseInt(formData.participante_id),
      programa: formData.programa,
      tipo: formData.tipo,
      monto_total: parseFloat(formData.monto_total),
      monto_pagado: parseFloat(formData.monto_pagado) || 0,
      estado: formData.estado,
      fecha_evento: formData.fecha_evento || null
    };
    
    let error;
    if (editandoId) {
      const result = await supabase
        .from('inscripciones')
        .update(inscripcionData)
        .eq('id', editandoId);
      error = result.error;
    } else {
      const result = await supabase
        .from('inscripciones')
        .insert([inscripcionData]);
      error = result.error;
    }
    
    if (!error) {
      alert(editandoId ? 'Inscripción actualizada' : 'Inscripción registrada');
      setMostrarFormulario(false);
      setEditandoId(null);
      setFormData({
        participante_id: '', programa: '', tipo: 'diplomado',
        monto_total: '', monto_pagado: '', estado: 'pendiente', fecha_evento: ''
      });
      cargarDatos();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const editarInscripcion = (inscripcion) => {
    setFormData({
      participante_id: inscripcion.participante_id,
      programa: inscripcion.programa,
      tipo: inscripcion.tipo,
      monto_total: inscripcion.monto_total,
      monto_pagado: inscripcion.monto_pagado,
      estado: inscripcion.estado,
      fecha_evento: inscripcion.fecha_evento?.split('T')[0] || ''
    });
    setEditandoId(inscripcion.id);
    setMostrarFormulario(true);
  };

  const eliminarInscripcion = async (id) => {
    if (confirm('¿Eliminar esta inscripción?')) {
      const { error } = await supabase
        .from('inscripciones')
        .delete()
        .eq('id', id);
      if (!error) {
        alert('Eliminada');
        cargarDatos();
      }
    }
  };

  const obtenerNombreParticipante = (inscripcion) => {
    if (inscripcion.participantes) {
      return `${inscripcion.participantes.nombre} ${inscripcion.participantes.apellido}`;
    }
    return 'Cargando...';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inscripciones</h1>
        <button
          onClick={() => {
            setMostrarFormulario(true);
            setEditandoId(null);
            setFormData({
              participante_id: '', programa: '', tipo: 'diplomado',
              monto_total: '', monto_pagado: '', estado: 'pendiente', fecha_evento: ''
            });
            setMostrarNuevoParticipante(false);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          style={{ backgroundColor: '#185FA5' }}
        >
          + Nueva Inscripción
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Filtrar por programa</label>
          <select
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value)}
            className="border rounded-lg px-3 py-2 w-64"
          >
            <option value="">Todos</option>
            {programas.map((p, i) => <option key={i} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Filtrar por estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border rounded-lg px-3 py-2 w-40"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <button
          onClick={() => { setFiltroPrograma(''); setFiltroEstado(''); }}
          className="text-gray-500 hover:text-gray-700 mt-6"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Formulario de inscripción */}
      {mostrarFormulario && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{editandoId ? 'Editar' : 'Nueva'} Inscripción</h2>
          
          {/* Buscar participante por DNI */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Buscar participante por DNI</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="DNI del participante"
                onBlur={(e) => buscarParticipantePorDNI(e.target.value)}
                className="border rounded-lg px-3 py-2 flex-1"
              />
            </div>
          </div>

          {/* Formulario de nuevo participante */}
          {mostrarNuevoParticipante && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-3">Participante no encontrado - Crear nuevo</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nombre" value={nuevoParticipante.nombre}
                  onChange={(e) => setNuevoParticipante({...nuevoParticipante, nombre: e.target.value})}
                  className="border rounded-lg px-3 py-2" />
                <input type="text" placeholder="Apellido" value={nuevoParticipante.apellido}
                  onChange={(e) => setNuevoParticipante({...nuevoParticipante, apellido: e.target.value})}
                  className="border rounded-lg px-3 py-2" />
                <input type="text" placeholder="DNI" value={nuevoParticipante.dni}
                  onChange={(e) => setNuevoParticipante({...nuevoParticipante, dni: e.target.value})}
                  className="border rounded-lg px-3 py-2" />
                <input type="text" placeholder="Teléfono" value={nuevoParticipante.telefono}
                  onChange={(e) => setNuevoParticipante({...nuevoParticipante, telefono: e.target.value})}
                  className="border rounded-lg px-3 py-2" />
                <input type="email" placeholder="Correo" value={nuevoParticipante.correo}
                  onChange={(e) => setNuevoParticipante({...nuevoParticipante, correo: e.target.value})}
                  className="border rounded-lg px-3 py-2" />
                <input type="text" placeholder="Grado académico" value={nuevoParticipante.grado_academico}
                  onChange={(e) => setNuevoParticipante({...nuevoParticipante, grado_academico: e.target.value})}
                  className="border rounded-lg px-3 py-2" />
              </div>
              <button onClick={crearParticipante} className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg">
                Crear participante
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Programa *</label>
              <input type="text" value={formData.programa}
                onChange={(e) => setFormData({...formData, programa: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Tipo</label>
              <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full">
                <option value="diplomado">Diplomado</option>
                <option value="curso">Curso</option>
                <option value="congreso">Congreso</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Monto Total (S/)</label>
              <input type="number" step="0.01" value={formData.monto_total}
                onChange={(e) => setFormData({...formData, monto_total: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Monto Pagado (S/)</label>
              <input type="number" step="0.01" value={formData.monto_pagado}
                onChange={(e) => setFormData({...formData, monto_pagado: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Estado</label>
              <select value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full">
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="pagado">Pagado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Fecha del evento</label>
              <input type="date" value={formData.fecha_evento}
                onChange={(e) => setFormData({...formData, fecha_evento: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full" />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button onClick={guardarInscripcion} className="bg-primary text-white px-6 py-2 rounded-lg"
              style={{ backgroundColor: '#185FA5' }}>
              {editandoId ? 'Actualizar' : 'Guardar'}
            </button>
            <button onClick={() => { setMostrarFormulario(false); setEditandoId(null); }}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de inscripciones */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Participante</th>
                <th className="text-left p-3">Programa</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Monto Total</th>
                <th className="text-left p-3">Pagado</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Fecha Evento</th>
                <th className="text-left p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="8" className="text-center p-4">Cargando...</td></tr>
              ) : inscripciones.length === 0 ? (
                <tr><td colSpan="8" className="text-center p-4 text-gray-500">No hay inscripciones</td></tr>
              ) : (
                inscripciones.map((insc) => (
                  <tr key={insc.id} className="border-t">
                    <td className="p-3">{obtenerNombreParticipante(insc)}</td>
                    <td className="p-3">{insc.programa}</td>
                    <td className="p-3 capitalize">{insc.tipo}</td>
                    <td className="p-3">S/ {insc.monto_total}</td>
                    <td className="p-3">S/ {insc.monto_pagado}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        insc.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                        insc.estado === 'parcial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {insc.estado}
                      </span>
                    </td>
                    <td className="p-3">{insc.fecha_evento || '-'}</td>
                    <td className="p-3">
                      <button onClick={() => editarInscripcion(insc)} className="text-blue-500 hover:text-blue-700 mr-2">
                        Editar
                      </button>
                      <button onClick={() => eliminarInscripcion(insc.id)} className="text-red-500 hover:text-red-700">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Inscripciones;