import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TabLocadores() {
  const [locadores, setLocadores] = useState([]);
  const [modal, setModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const initialForm = {
    nombre: '',
    apellido: '',
    dni: '',
    ruc: '',
    telefono: '',
    correo: '',
    direccion: '',
    distrito: '',
    modalidad: 'FULL TIME',
    sueldo_base: '',
    tipo_pago: 'honorarios',
    banco: '',
    numero_cuenta: '',
    cci: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo',
    observaciones: ''
  };

  const [form, setForm] = useState(initialForm);

  const cargarLocadores = async () => {
    setLoading(true);
    try {
      let query = supabase.from('locadores').select('*');

      if (busqueda.trim() !== '') {
        // Asegúrate de que estas columnas existan exactamente con estos nombres en Supabase
        query = query.or(`nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,dni.ilike.%${busqueda}%,ruc.ilike.%${busqueda}%`);
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

  const guardarLocador = async () => {
    if (!form.nombre || !form.apellido) {
      alert('Nombre y apellido son obligatorios');
      return;
    }

    setLoading(true);
    try {
      // Limpiamos el objeto para evitar enviar campos nulos o IDs incorrectos
      const registro = { ...form };
      if (!modoEdicion) delete registro.id; 

      let error;
      if (modoEdicion && editandoId) {
        const result = await supabase.from('locadores').update(registro).eq('id', editandoId);
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
  };

  const editarLocador = (locador) => {
    setModoEdicion(true);
    setEditandoId(locador.id);
    setForm(locador);
    setModal(true);
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
    const { error } = await supabase.from('locadores').update({ estado: nuevoEstado }).eq('id', id);
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
    switch(modalidad) {
      case 'FULL TIME': return 'bg-blue-100 text-blue-800';
      case 'PART TIME': return 'bg-yellow-100 text-yellow-800';
      case 'POR HORAS': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header con buscador */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Gestión de Locadores</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o RUC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 md:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={abrirModalNuevo}
            className="bg-[#185FA5] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + Nuevo Locador
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">Locador</th>
                <th className="p-4 text-left">Documento</th>
                <th className="p-4 text-left">Modalidad</th>
                <th className="p-4 text-left">Sueldo Base</th>
                <th className="p-4 text-left">Estado</th>
                <th className="p-4 text-left">Contacto</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && locadores.length === 0 ? (
                <tr><td colSpan="7" className="p-10 text-center text-gray-400">Cargando...</td></tr>
              ) : locadores.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                        {getInitials(loc.nombre, loc.apellido)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-700">{loc.nombre} {loc.apellido}</div>
                        <div className="text-xs text-gray-400">{loc.distrito || 'Sin distrito'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-600">DNI: {loc.dni || '—'}</div>
                    <div className="text-xs text-gray-400 font-mono">RUC: {loc.ruc || '—'}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getModalidadColor(loc.modalidad)}`}>
                      {loc.modalidad}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-700">S/ {Number(loc.sueldo_base || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleEstado(loc.id, loc.estado)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        loc.estado === 'activo' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {loc.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-600 text-xs">{loc.telefono || '—'}</div>
                    <div className="text-xs text-blue-500 truncate max-w-[120px]">{loc.correo || '—'}</div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => editarLocador(loc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200">
                        Editar
                      </button>
                      <button onClick={() => eliminarLocador(loc.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200">
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {locadores.length === 0 && !loading && (
                <tr><td colSpan="7" className="p-10 text-center text-gray-400">No se encontraron resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">{modoEdicion ? 'Editar Perfil del Locador' : 'Nuevo Registro de Locador'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-blue-700 font-bold text-sm uppercase tracking-wider">Información Personal</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Nombres *" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="border rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                  <input placeholder="Apellidos *" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} className="border rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="DNI" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} className="border rounded-lg p-2.5 text-sm" />
                  <input placeholder="RUC" value={form.ruc} onChange={e => setForm({...form, ruc: e.target.value})} className="border rounded-lg p-2.5 text-sm" />
                </div>
                <input placeholder="Correo Electrónico" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
                <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
                <input placeholder="Dirección Completa" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
              </div>

              <div className="space-y-4">
                <h4 className="text-blue-700 font-bold text-sm uppercase tracking-wider">Contrato y Pagos</h4>
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})} className="border rounded-lg p-2.5 text-sm">
                    <option value="FULL TIME">FULL TIME</option>
                    <option value="PART TIME">PART TIME</option>
                    <option value="POR HORAS">POR HORAS</option>
                  </select>
                  <input placeholder="Sueldo Base (S/)" type="number" value={form.sueldo_base} onChange={e => setForm({...form, sueldo_base: e.target.value})} className="border rounded-lg p-2.5 text-sm" />
                </div>
                <select value={form.tipo_pago} onChange={e => setForm({...form, tipo_pago: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm">
                  <option value="honorarios">Honorarios (RHE)</option>
                  <option value="factura">Factura</option>
                  <option value="boleta">Boleta</option>
                </select>
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                   <input placeholder="Banco" value={form.banco} onChange={e => setForm({...form, banco: e.target.value})} className="w-full border rounded p-2 text-xs" />
                   <input placeholder="N° Cuenta" value={form.numero_cuenta} onChange={e => setForm({...form, numero_cuenta: e.target.value})} className="w-full border rounded p-2 text-xs" />
                   <input placeholder="CCI" value={form.cci} onChange={e => setForm({...form, cci: e.target.value})} className="w-full border rounded p-2 text-xs" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={guardarLocador} 
                disabled={loading}
                className="flex-1 bg-[#185FA5] text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all"
              >
                {loading ? 'Procesando...' : (modoEdicion ? 'Guardar Cambios' : 'Crear Registro')}
              </button>
              <button 
                onClick={() => setModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-white transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}