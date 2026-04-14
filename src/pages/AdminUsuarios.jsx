// src/pages/AdminUsuarios.jsx - CÓDIGO COMPLETO ✅ PRODUCTION READY
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Save, UserPlus, Mail, Lock, 
  RefreshCw, Shield, Search, Info, X, 
  Edit3, Key, CheckCircle // Asegúrate de que Lock esté aquí
} from 'lucide-react';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [modulosDisponibles, setModulosDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permisosTemp, setPermisosTemp] = useState({});
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({ email: '', password: '', confirmPassword: '' });
  const [permisosSeleccionados, setPermisosSeleccionados] = useState({});
  const [permisosEditando, setPermisosEditando] = useState({});
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: modulosData } = await supabase.from('modulos_sistema').select('*').order('orden');
      setModulos(modulosData || []);
      setModulosDisponibles(modulosData || []);

      const { data: permisos } = await supabase.from('permisos_usuarios').select('*');
      const permisosMap = {};
      permisos?.forEach(p => {
        if (!permisosMap[p.user_id]) permisosMap[p.user_id] = {};
        permisosMap[p.user_id][p.modulo] = p.puede_ver;
      });

      const { data: perfiles, error } = await supabase.from('perfiles_usuarios').select('*').order('email');
      if (error) throw error;

      const usuariosConPermisos = perfiles.map(perfil => ({
        id: perfil.id,
        email: perfil.email,
        nombre: perfil.nombre || perfil.email?.split('@')[0],
        permisos: permisosMap[perfil.id] || {}
      }));

      setUsuarios(usuariosConPermisos);
    } catch (error) {
      console.error(error);
      alert('Error al cargar usuarios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const crearNuevoUsuario = async () => {
    if (!nuevoUsuario.email || !nuevoUsuario.password) {
      alert('Correo y contraseña son obligatorios');
      return;
    }
    if (nuevoUsuario.password !== nuevoUsuario.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setCreando(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        method: 'POST',
        body: { email: nuevoUsuario.email, password: nuevoUsuario.password }
      });

      if (error) throw error;

      const permisosActivos = Object.keys(permisosSeleccionados).filter(mod => permisosSeleccionados[mod]);
      for (const modulo of permisosActivos) {
        await supabase.from('permisos_usuarios').upsert({
          user_id: data.user.id,
          modulo,
          puede_ver: true
        }, { onConflict: 'user_id,modulo' });
      }

      alert('✅ Usuario creado con permisos asignados');
      setModalNuevo(false);
      setNuevoUsuario({ email: '', password: '', confirmPassword: '' });
      setPermisosSeleccionados({});
      cargarDatos();
    } catch (error) {
      alert('❌ Error al crear usuario: ' + error.message);
    } finally {
      setCreando(false);
    }
  };

  // ✅ NUEVA: Abrir modal de edición
  const abrirEditarUsuario = (usuario) => {
    setUsuarioEditando(usuario);
    setPermisosEditando(usuario.permisos || {});
    setNuevaPassword('');
    setConfirmPassword('');
    setModalEditar(true);
  };

  // ✅ NUEVA: Limpiar modal (UX perfecto)
  const cerrarModalEdicion = () => {
    setModalEditar(false);
    setUsuarioEditando(null);
    setNuevaPassword('');
    setConfirmPassword('');
    setPermisosEditando({});
  };

  // ✅ CORREGIDA: Guardar cambios con RPC SEGURO
  const guardarCambiosUsuario = async () => {
    if (nuevaPassword && nuevaPassword !== confirmPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }

    setEditando(true);
    try {
      // 1. Actualizar permisos
      const permisosActivos = Object.keys(permisosEditando).filter(mod => permisosEditando[mod]);
      
      // Eliminar permisos antiguos
      await supabase.from('permisos_usuarios').delete().eq('user_id', usuarioEditando.id);
      
      // Insertar nuevos permisos
      for (const modulo of permisosActivos) {
        await supabase.from('permisos_usuarios').insert({
          user_id: usuarioEditando.id,
          modulo,
          puede_ver: true
        });
      }

      // 2. Cambiar contraseña CON RPC SEGURO
      if (nuevaPassword) {
        const { data, error: rpcError } = await supabase.rpc('admin_update_user_password', {
          target_user_id: usuarioEditando.id,
          new_password: nuevaPassword
        });

        if (rpcError) throw rpcError;
        if (data.status === 'error') throw new Error(data.message);
      }

      alert('✅ Usuario actualizado correctamente');
      cerrarModalEdicion();
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al actualizar: ' + error.message);
    } finally {
      setEditando(false);
    }
  };

  const togglePermiso = (userId, modulo, valorActual) => {
    setPermisosTemp(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [modulo]: valorActual === undefined ? true : !valorActual
      }
    }));
  };

  const guardarPermisos = async (userId) => {
    const cambios = permisosTemp[userId];
    if (!cambios) return;

    try {
      for (const [modulo, puedeVer] of Object.entries(cambios)) {
        await supabase.from('permisos_usuarios').upsert({
          user_id: userId,
          modulo,
          puede_ver: puedeVer
        }, { onConflict: 'user_id,modulo' });
      }
      setPermisosTemp(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
      cargarDatos();
    } catch (error) {
      alert('Error al guardar permisos: ' + error.message);
    }
  };

  const getPermisoUsuario = (userId, modulo) => {
    if (permisosTemp[userId]?.[modulo] !== undefined) return permisosTemp[userId][modulo];
    const usuario = usuarios.find(u => u.id === userId);
    return usuario?.permisos[modulo] || false;
  };

  const filteredUsers = usuarios.filter(u => 
    (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500 font-medium">Cargando usuarios...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 p-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-[#11284e] rounded-lg text-white"><Shield size={20} /></div>
            <h1 className="text-2xl font-bold text-[#11284e]">Control de Accesos</h1>
          </div>
          <p className="text-slate-500 text-sm">Gestiona identidades y permisos</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por correo o nombre..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-64 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <button onClick={() => setModalNuevo(true)} className="bg-[#185FA5] hover:bg-[#11284e] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-medium text-sm shadow-lg shadow-blue-900/10">
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
                {modulos.map(m => (
                  <th key={m.id} className="px-3 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[100px]">
                    <span className="block text-lg mb-1">{m.icono}</span>
                    {m.nombre}
                  </th>
                ))}
                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => {
                const tieneCambios = permisosTemp[user.id] && Object.keys(permisosTemp[user.id]).length > 0;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#11284e] font-bold border uppercase">
                          {user.email?.slice(0,2) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-[#11284e] text-sm">{user.nombre}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {modulos.map(modulo => {
                      const activo = getPermisoUsuario(user.id, modulo.nombre);
                      return (
                        <td key={modulo.id} className="px-3 py-4 text-center">
                          <button
                            onClick={() => togglePermiso(user.id, modulo.nombre, activo)}
                            className={`w-10 h-5 rounded-full relative transition-all duration-300
                              ${activo ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all
                              ${activo ? 'left-6' : 'left-1'}`} 
                            />
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {tieneCambios && (
                          <button onClick={() => guardarPermisos(user.id)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-lg" title="Guardar permisos">
                            <Save size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => abrirEditarUsuario(user)} 
                          className="p-2 text-slate-400 hover:text-[#185FA5] rounded-lg group relative" 
                          title="Editar usuario completo"
                        >
                          <Lock size={16} />
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-10">
                            Editar usuario
                          </div>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={modulos.length + 2} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVO USUARIO */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-[#11284e]">Alta de Usuario</h3>
                <p className="text-slate-500 text-sm">Crear acceso y asignar módulos</p>
              </div>
              <button onClick={() => setModalNuevo(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <input
                type="email"
                placeholder="Email institucional *"
                value={nuevoUsuario.email}
                onChange={e => setNuevoUsuario({...nuevoUsuario, email: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              />
              <input
                type="password"
                placeholder="Contraseña *"
                value={nuevoUsuario.password}
                onChange={e => setNuevoUsuario({...nuevoUsuario, password: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              />
              <input
                type="password"
                placeholder="Confirmar contraseña *"
                value={nuevoUsuario.confirmPassword}
                onChange={e => setNuevoUsuario({...nuevoUsuario, confirmPassword: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              />

              <div className="border-t pt-4">
                <p className="text-sm font-bold text-[#11284e] mb-3">Módulos a los que tendrá acceso:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-2xl">
                  {modulosDisponibles.map(mod => (
                    <label key={mod.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white/50 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permisosSeleccionados[mod.nombre] || false}
                        onChange={e => setPermisosSeleccionados(prev => ({ ...prev, [mod.nombre]: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-[#185FA5] focus:ring-[#185FA5]"
                      />
                      <span>{mod.icono} {mod.nombre}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">* Si no selecciona ninguno, el usuario no podrá ver ningún módulo.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button 
                onClick={crearNuevoUsuario} 
                disabled={creando} 
                className="w-full bg-[#11284e] hover:bg-[#185FA5] text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all"
              >
                {creando ? <RefreshCw className="animate-spin" size={20} /> : 'Crear Usuario y Asignar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR USUARIO - MEJORADO */}
      {modalEditar && usuarioEditando && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-[#11284e]">Editar {usuarioEditando.nombre}</h3>
                <p className="text-slate-500 text-sm">{usuarioEditando.email}</p>
              </div>
              {/* ✅ CAMBIADO: Usa función de limpieza */}
              <button onClick={cerrarModalEdicion} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* CONTRASEÑA OPCIONAL - MEJORADA */}
              <div className="border p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={18} className="text-amber-600" />
                  <p className="font-bold text-sm text-[#11284e]">Cambiar contraseña (opcional)</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="password"
                    placeholder="Nueva contraseña (mínimo 6 caracteres)"
                    value={nuevaPassword}
                    onChange={e => setNuevaPassword(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400/30 text-sm"
                  />
                  {nuevaPassword && (
                    <input
                      type="password"
                      placeholder="Confirmar nueva contraseña"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400/30 text-sm"
                    />
                  )}
                </div>
              </div>

              {/* MÓDULOS */}
              <div>
                <p className="text-sm font-bold text-[#11284e] mb-4">Módulos asignados:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-72 overflow-y-auto p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                  {modulosDisponibles.map(mod => (
                    <label key={mod.id} className="flex items-center gap-3 p-3 hover:bg-white/60 rounded-xl cursor-pointer transition-all group">
                      <input
                        type="checkbox"
                        checked={permisosEditando[mod.nombre] || false}
                        onChange={e => setPermisosEditando(prev => ({ ...prev, [mod.nombre]: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-300 text-[#185FA5] focus:ring-[#185FA5] shadow-sm"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-lg group-hover:scale-110 transition-transform">{mod.icono}</span>
                        <span className="font-medium text-sm text-slate-800">{mod.nombre}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  {Object.keys(permisosEditando).filter(m => permisosEditando[m]).length} módulos seleccionados
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button 
                onClick={guardarCambiosUsuario} 
                disabled={editando} 
                className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] hover:from-[#185FA5] hover:to-[#11284e] text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editando ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Guardar cambios
                  </>
                )}
              </button>
              <button 
                onClick={cerrarModalEdicion}
                disabled={editando}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-medium transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}