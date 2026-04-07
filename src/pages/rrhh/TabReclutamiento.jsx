import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabReclutamiento() {
  const [vista, setVista] = useState('solicitudes'); // solicitudes | candidatos
  const [solicitudes, setSolicitudes] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [modal, setModal] = useState(null);
  const [modalCandidato, setModalCandidato] = useState(null);
  const [formSolicitud, setFormSolicitud] = useState({
    area: '', cargo: '', motivo: '', urgencia: 'media', cantidad: 1, fecha_requerida: ''
  });
  const [formCandidato, setFormCandidato] = useState({
    solicitud_id: '', nombre: '', apellido: '', dni: '', email: '', telefono: '',
    fuente: '', estado: 'postulado', puntaje_tecnico: '', puntaje_entrevista: '', comentarios: ''
  });

  // Cargar datos
  const cargarSolicitudes = async () => {
    const { data } = await supabase.from('solicitudes_personal').select('*').order('created_at', { ascending: false });
    setSolicitudes(data || []);
  };

  const cargarCandidatos = async () => {
    const { data } = await supabase.from('candidatos').select('*, solicitudes_personal(cargo, area)').order('created_at', { ascending: false });
    setCandidatos(data || []);
  };

  const cargarEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('id, nombre, apellido');
    setEmpleados(data || []);
  };

  useEffect(() => {
    cargarSolicitudes();
    cargarCandidatos();
    cargarEmpleados();
  }, []);

  // Guardar solicitud
  const guardarSolicitud = async () => {
    if (!formSolicitud.area || !formSolicitud.cargo) return alert('Área y cargo son requeridos');
    const codigo = `SOL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
    const { error } = await supabase.from('solicitudes_personal').insert([{
      ...formSolicitud, codigo, fecha_solicitud: new Date().toISOString().split('T')[0]
    }]);
    if (error) alert('Error: ' + error.message);
    else {
      setModal(null);
      setFormSolicitud({ area: '', cargo: '', motivo: '', urgencia: 'media', cantidad: 1, fecha_requerida: '' });
      cargarSolicitudes();
    }
  };

  // Guardar candidato
  const guardarCandidato = async () => {
    if (!formCandidato.nombre || !formCandidato.apellido) return alert('Nombre y apellido requeridos');
    const { error } = await supabase.from('candidatos').insert([formCandidato]);
    if (error) alert('Error: ' + error.message);
    else {
      setModalCandidato(null);
      setFormCandidato({ solicitud_id: '', nombre: '', apellido: '', dni: '', email: '', telefono: '', fuente: '', estado: 'postulado', puntaje_tecnico: '', puntaje_entrevista: '', comentarios: '' });
      cargarCandidatos();
    }
  };

  const cambiarEstadoCandidato = async (id, nuevoEstado) => {
    const { error } = await supabase.from('candidatos').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) cargarCandidatos();
  };

  const contratarCandidato = async (candidato) => {
    // Crear empleado a partir del candidato
    const nuevoEmpleado = {
      nombre: candidato.nombre,
      apellido: candidato.apellido,
      dni: candidato.dni,
      correo: candidato.email,
      telefono: candidato.telefono,
      estado: 'activo',
      tipo: 'planilla'
    };
    const { error } = await supabase.from('empleados').insert([nuevoEmpleado]);
    if (!error) {
      await supabase.from('candidatos').update({ estado: 'contratado' }).eq('id', candidato.id);
      cargarCandidatos();
      cargarEmpleados();
      alert('Candidato contratado exitosamente');
    }
  };

  const getUrgenciaColor = (urgencia) => {
    switch(urgencia) {
      case 'urgente': return 'bg-red-100 text-red-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'postulado': return 'bg-gray-100 text-gray-800';
      case 'preseleccionado': return 'bg-blue-100 text-blue-800';
      case 'entrevista': return 'bg-purple-100 text-purple-800';
      case 'prueba_tecnica': return 'bg-indigo-100 text-indigo-800';
      case 'ofertado': return 'bg-amber-100 text-amber-800';
      case 'contratado': return 'bg-green-100 text-green-800';
      case 'rechazado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div>
      {/* Pestañas principales */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setVista('solicitudes')}
          className={`px-4 py-2 text-sm font-medium ${vista === 'solicitudes' ? 'border-b-2 border-[#185FA5] text-[#185FA5]' : 'text-gray-500'}`}
        >
          📋 Solicitudes de Personal
        </button>
        <button
          onClick={() => setVista('candidatos')}
          className={`px-4 py-2 text-sm font-medium ${vista === 'candidatos' ? 'border-b-2 border-[#185FA5] text-[#185FA5]' : 'text-gray-500'}`}
        >
          👥 Candidatos
        </button>
      </div>

      {/* Vista de Solicitudes */}
      {vista === 'solicitudes' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setModal('solicitud')}
              className="bg-[#185FA5] text-white px-4 py-2 rounded-lg text-sm"
            >
              + Nueva Solicitud
            </button>
          </div>
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Código</th>
                  <th className="p-3 text-left">Área</th>
                  <th className="p-3 text-left">Cargo</th>
                  <th className="p-3 text-left">Cantidad</th>
                  <th className="p-3 text-left">Urgencia</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Fecha requerida</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{s.codigo}</td>
                    <td className="p-3">{s.area}</td>
                    <td className="p-3 font-medium">{s.cargo}</td>
                    <td className="p-3">{s.cantidad}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${getUrgenciaColor(s.urgencia)}`}>{s.urgencia}</span></td>
                    <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-gray-100">{s.estado}</span></td>
                    <td className="p-3">{s.fecha_requerida || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista de Candidatos */}
      {vista === 'candidatos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setModalCandidato('nuevo')}
              className="bg-[#185FA5] text-white px-4 py-2 rounded-lg text-sm"
            >
              + Nuevo Candidato
            </button>
          </div>
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">DNI</th>
                  <th className="p-3 text-left">Puesto solicitado</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Puntaje</th>
                  <th className="p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.nombre} {c.apellido}</td>
                    <td className="p-3">{c.dni || '—'}</td>
                    <td className="p-3">{c.solicitudes_personal?.cargo || '—'}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(c.estado)}`}>{c.estado}</span></td>
                    <td className="p-3">{c.puntaje_final || '—'}</td>
                    <td className="p-3 flex gap-2">
                      <select
                        value={c.estado}
                        onChange={(e) => cambiarEstadoCandidato(c.id, e.target.value)}
                        className="text-xs border rounded px-1 py-0.5"
                      >
                        <option value="postulado">Postulado</option>
                        <option value="preseleccionado">Preseleccionado</option>
                        <option value="entrevista">Entrevista</option>
                        <option value="prueba_tecnica">Prueba técnica</option>
                        <option value="ofertado">Ofertado</option>
                        <option value="contratado">Contratado</option>
                        <option value="rechazado">Rechazado</option>
                      </select>
                      {c.estado === 'ofertado' && (
                        <button onClick={() => contratarCandidato(c)} className="text-green-600 text-xs">Contratar</button>
                      )}
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nueva Solicitud */}
      {modal === 'solicitud' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Nueva Solicitud de Personal</h3>
            <div className="space-y-3">
              <input placeholder="Área *" value={formSolicitud.area} onChange={e => setFormSolicitud({...formSolicitud, area: e.target.value})} className="w-full border rounded-lg p-2" />
              <input placeholder="Cargo *" value={formSolicitud.cargo} onChange={e => setFormSolicitud({...formSolicitud, cargo: e.target.value})} className="w-full border rounded-lg p-2" />
              <textarea placeholder="Motivo" value={formSolicitud.motivo} onChange={e => setFormSolicitud({...formSolicitud, motivo: e.target.value})} className="w-full border rounded-lg p-2" rows="2" />
              <select value={formSolicitud.urgencia} onChange={e => setFormSolicitud({...formSolicitud, urgencia: e.target.value})} className="w-full border rounded-lg p-2">
                <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
              </select>
              <input type="number" placeholder="Cantidad" value={formSolicitud.cantidad} onChange={e => setFormSolicitud({...formSolicitud, cantidad: e.target.value})} className="w-full border rounded-lg p-2" />
              <input type="date" placeholder="Fecha requerida" value={formSolicitud.fecha_requerida} onChange={e => setFormSolicitud({...formSolicitud, fecha_requerida: e.target.value})} className="w-full border rounded-lg p-2" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardarSolicitud} className="bg-[#185FA5] text-white px-4 py-2 rounded-lg flex-1">Guardar</button>
              <button onClick={() => setModal(null)} className="border px-4 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Candidato */}
      {modalCandidato === 'nuevo' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Registrar Candidato</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nombre *" value={formCandidato.nombre} onChange={e => setFormCandidato({...formCandidato, nombre: e.target.value})} className="border rounded-lg p-2" />
              <input placeholder="Apellido *" value={formCandidato.apellido} onChange={e => setFormCandidato({...formCandidato, apellido: e.target.value})} className="border rounded-lg p-2" />
              <input placeholder="DNI" value={formCandidato.dni} onChange={e => setFormCandidato({...formCandidato, dni: e.target.value})} className="border rounded-lg p-2" />
              <input placeholder="Email" value={formCandidato.email} onChange={e => setFormCandidato({...formCandidato, email: e.target.value})} className="border rounded-lg p-2" />
              <input placeholder="Teléfono" value={formCandidato.telefono} onChange={e => setFormCandidato({...formCandidato, telefono: e.target.value})} className="border rounded-lg p-2" />
              <select value={formCandidato.solicitud_id} onChange={e => setFormCandidato({...formCandidato, solicitud_id: e.target.value})} className="border rounded-lg p-2">
                <option value="">Sin solicitud asociada</option>
                {solicitudes.map(s => <option key={s.id} value={s.id}>{s.cargo} - {s.area}</option>)}
              </select>
              <select value={formCandidato.fuente} onChange={e => setFormCandidato({...formCandidato, fuente: e.target.value})} className="border rounded-lg p-2">
                <option value="">Fuente</option><option value="linkedin">LinkedIn</option><option value="referido">Referido</option><option value="bolsa">Bolsa de trabajo</option><option value="otro">Otro</option>
              </select>
              <select value={formCandidato.estado} onChange={e => setFormCandidato({...formCandidato, estado: e.target.value})} className="border rounded-lg p-2">
                <option value="postulado">Postulado</option><option value="preseleccionado">Preseleccionado</option>
                <option value="entrevista">Entrevista</option><option value="prueba_tecnica">Prueba técnica</option>
                <option value="ofertado">Ofertado</option><option value="rechazado">Rechazado</option>
              </select>
              <input type="number" placeholder="Puntaje técnico (0-100)" value={formCandidato.puntaje_tecnico} onChange={e => setFormCandidato({...formCandidato, puntaje_tecnico: e.target.value})} className="border rounded-lg p-2" />
              <input type="number" placeholder="Puntaje entrevista (0-100)" value={formCandidato.puntaje_entrevista} onChange={e => setFormCandidato({...formCandidato, puntaje_entrevista: e.target.value})} className="border rounded-lg p-2" />
            </div>
            <textarea placeholder="Comentarios / Evaluación" value={formCandidato.comentarios} onChange={e => setFormCandidato({...formCandidato, comentarios: e.target.value})} className="w-full border rounded-lg p-2 mt-3" rows="3" />
            <div className="flex gap-3 mt-6">
              <button onClick={guardarCandidato} className="bg-[#185FA5] text-white px-4 py-2 rounded-lg flex-1">Guardar</button>
              <button onClick={() => setModalCandidato(null)} className="border px-4 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}