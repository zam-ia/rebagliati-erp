// src/pages/AdminUsuarios.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CAMBIOS vs versión anterior:
//   - Campo "Nombre para saludo" en crear y editar usuario
//   - Se guarda en perfiles_usuarios.nombre
//   - El Dashboard lo leerá de ahí para personalizar el saludo
//   - Función guardarCambios blindada con validación .select() y logs detallados
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Save, UserPlus, Lock, RefreshCw, Shield,
  Search, X, User
} from 'lucide-react';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios]                     = useState([]);
  const [modulos, setModulos]                       = useState([]);
  const [modulosDisponibles, setModulosDisponibles] = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [permisosTemp, setPermisosTemp]             = useState({});
  const [busqueda, setBusqueda]                     = useState('');

  // ── Estados Modal Crear ──────────────────────────────────────────────────
  const [modalNuevo, setModalNuevo]                         = useState(false);
  const [creando, setCreando]                               = useState(false);
  const [nuevoUsuario, setNuevoUsuario]                     = useState({
    email: '', password: '', confirmPassword: '', nombre: ''
  });
  const [permisosSeleccionados, setPermisosSeleccionados]   = useState({});

  // ── Estados Modal Editar ─────────────────────────────────────────────────
  const [modalEditar, setModalEditar]               = useState(false);
  const [editando, setEditando]                     = useState(false);
  const [usuarioEditando, setUsuarioEditando]       = useState(null);
  const [nombreEditando, setNombreEditando]         = useState('');
  const [permisosEditando, setPermisosEditando]     = useState({});
  const [nuevaPassword, setNuevaPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]       = useState('');

  // ── Carga de datos ───────────────────────────────────────────────────────
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: modulosData } = await supabase
        .from('modulos_sistema').select('*').order('orden');
      setModulos(modulosData || []);
      setModulosDisponibles(modulosData || []);

      const { data: permisos } = await supabase.from('permisos_usuarios').select('*');
      const permisosMap = {};
      permisos?.forEach(p => {
        if (!permisosMap[p.user_id]) permisosMap[p.user_id] = {};
        permisosMap[p.user_id][p.modulo] = p.puede_ver;
      });

      const { data: perfiles, error } = await supabase
        .from('perfiles_usuarios').select('*').order('email');
      if (error) throw error;

      setUsuarios(perfiles.map(perfil => ({
        id:      perfil.id,
        email:   perfil.email,
        nombre:  perfil.nombre || perfil.email?.split('@')[0],
        permisos: permisosMap[perfil.id] || {}
      })));
    } catch (err) {
      alert('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // ── Crear usuario ─────────────────────────────────────────────────────────
  const crearNuevoUsuario = async () => {
    if (!nuevoUsuario.email || !nuevoUsuario.password) {
      alert('Correo y contraseña son obligatorios'); return;
    }
    if (nuevoUsuario.password !== nuevoUsuario.confirmPassword) {
      alert('Las contraseñas no coinciden'); return;
    }
    setCreando(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        method: 'POST',
        body: { email: nuevoUsuario.email, password: nuevoUsuario.password }
      });
      if (error) throw error;

      const userId = data.user?.id;

      // Guardar nombre en perfiles_usuarios
      if (nuevoUsuario.nombre && userId) {
        await supabase
          .from('perfiles_usuarios')
          .update({ nombre: nuevoUsuario.nombre })
          .eq('id', userId);
      }

      // Guardar permisos
      const activos = Object.keys(permisosSeleccionados).filter(m => permisosSeleccionados[m]);
      for (const modulo of activos) {
        await supabase.from('permisos_usuarios').upsert(
          { user_id: userId, modulo, puede_ver: true },
          { onConflict: 'user_id,modulo' }
        );
      }

      alert('✅ Usuario creado correctamente');
      setModalNuevo(false);
      setNuevoUsuario({ email: '', password: '', confirmPassword: '', nombre: '' });
      setPermisosSeleccionados({});
      cargarDatos();
    } catch (err) {
      alert('❌ Error al crear usuario: ' + err.message);
    } finally {
      setCreando(false);
    }
  };

  // ── Abrir / cerrar modal edición ──────────────────────────────────────────
  const abrirEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setNombreEditando(usuario.nombre || '');
    setPermisosEditando(usuario.permisos || {});
    setNuevaPassword('');
    setConfirmPassword('');
    setModalEditar(true);
  };

  const cerrarEditar = () => {
    setModalEditar(false);
    setUsuarioEditando(null);
    setNombreEditando('');
    setNuevaPassword('');
    setConfirmPassword('');
    setPermisosEditando({});
  };

  // ── Guardar cambios de edición (Versión Blindada) ─────────────────────────
  const guardarCambios = async () => {
    if (nuevaPassword && nuevaPassword !== confirmPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }
    setEditando(true);
    try {
      // ── 1. Actualizar nombre en perfiles_usuarios ─────────────────────
      console.log(`[guardarCambios] Actualizando nombre para ${usuarioEditando.id} → "${nombreEditando}"`);
      const { data: perfilActualizado, error: errorPerfil } = await supabase
        .from('perfiles_usuarios')
        .update({ nombre: nombreEditando })
        .eq('id', usuarioEditando.id)
        .select(); // <-- importante: .select() para recibir las filas afectadas

      if (errorPerfil) {
        console.error('Error al actualizar perfil:', errorPerfil);
        throw new Error(`Error al guardar nombre: ${errorPerfil.message}`);
      }

      // Verificar que realmente se actualizó al menos una fila
      if (!perfilActualizado || perfilActualizado.length === 0) {
        throw new Error(
          `No se pudo actualizar el perfil. Posibles causas:\n` +
          `- El ID ${usuarioEditando.id} no existe en perfiles_usuarios.\n` +
          `- RLS bloqueó la actualización.\n` +
          `- La columna 'nombre' no existe.`
        );
      }
      console.log('[guardarCambios] Perfil actualizado:', perfilActualizado);

      // ── 2. Actualizar permisos ────────────────────────────────────────
      // Eliminar permisos anteriores
      const { error: errorDelete } = await supabase
        .from('permisos_usuarios')
        .delete()
        .eq('user_id', usuarioEditando.id);
      if (errorDelete) {
        console.error('Error al eliminar permisos:', errorDelete);
        throw new Error(`Error al limpiar permisos: ${errorDelete.message}`);
      }

      // Insertar nuevos permisos
      const activos = Object.keys(permisosEditando).filter(m => permisosEditando[m]);
      if (activos.length > 0) {
        const { error: errorInsert } = await supabase
          .from('permisos_usuarios')
          .insert(activos.map(modulo => ({
            user_id: usuarioEditando.id,
            modulo,
            puede_ver: true
          })));
        if (errorInsert) {
          console.error('Error al insertar permisos:', errorInsert);
          throw new Error(`Error al asignar módulos: ${errorInsert.message}`);
        }
      }
      console.log(`[guardarCambios] Permisos actualizados (${activos.length} módulos)`);

      // ── 3. Cambiar contraseña (opcional) ──────────────────────────────
      if (nuevaPassword) {
        console.log('[guardarCambios] Solicitando cambio de contraseña...');
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_user_password', {
          target_user_id: usuarioEditando.id,
          new_password: nuevaPassword
        });
        if (rpcError) {
          console.error('Error en RPC admin_update_user_password:', rpcError);
          throw new Error(`Error al cambiar contraseña: ${rpcError.message}`);
        }
        if (rpcData?.status === 'error') {
          throw new Error(rpcData.message);
        }
        console.log('[guardarCambios] Contraseña actualizada');
      }

      alert('✅ Usuario actualizado correctamente');
      cerrarEditar();
      cargarDatos(); // Refrescar lista
    } catch (err) {
      console.error('[guardarCambios] Error capturado:', err);
      alert(`❌ ${err.message}`);
    } finally {
      setEditando(false);
    }
  };

  // ── Permisos inline (toggle en la tabla) ─────────────────────────────────
  const togglePermiso = (userId, modulo, valorActual) => {
    setPermisosTemp(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [modulo]: valorActual === undefined ? true : !valorActual }
    }));
  };

  const guardarPermisosInline = async (userId) => {
    const cambios = permisosTemp[userId];
    if (!cambios) return;
    try {
      for (const [modulo, puedeVer] of Object.entries(cambios)) {
        await supabase.from('permisos_usuarios').upsert(
          { user_id: userId, modulo, puede_ver: puedeVer },
          { onConflict: 'user_id,modulo' }
        );
      }
      setPermisosTemp(prev => { const s = { ...prev }; delete s[userId]; return s; });
      cargarDatos();
    } catch (err) {
      alert('Error al guardar permisos: ' + err.message);
    }
  };

  const getPermiso = (userId, modulo) => {
    if (permisosTemp[userId]?.[modulo] !== undefined) return permisosTemp[userId][modulo];
    return usuarios.find(u => u.id === userId)?.permisos[modulo] || false;
  };

  const filteredUsers = usuarios.filter(u =>
    (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.email  || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-500 font-medium">Cargando usuarios...</p>
    </div>
  );

  return (
    <div className="p-4 animate-in fade-in duration-500">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-[#11284e] rounded-lg text-white"><Shield size={20} /></div>
            <h1 className="text-2xl font-bold text-[#11284e]">Control de Accesos</h1>
          </div>
          <p className="text-slate-500 text-sm">Gestiona identidades, nombres y permisos por módulo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar usuario..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-64 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <button
            onClick={() => setModalNuevo(true)}
            className="bg-[#185FA5] hover:bg-[#11284e] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-medium text-sm shadow-lg"
          >
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* ── TABLA ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Usuario
                </th>
                {modulos.map(m => (
                  <th key={m.id} className="px-3 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[90px]">
                    <span className="block text-lg mb-1">{m.icono}</span>
                    {m.nombre}
                  </th>
                ))}
                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => {
                const tieneCambios = permisosTemp[user.id] && Object.keys(permisosTemp[user.id]).length > 0;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#11284e] flex items-center justify-center text-white font-bold text-sm">
                          {(user.nombre || user.email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#11284e] text-sm">{user.nombre}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {modulos.map(modulo => {
                      const activo = getPermiso(user.id, modulo.nombre);
                      return (
                        <td key={modulo.id} className="px-3 py-4 text-center">
                          <button
                            onClick={() => togglePermiso(user.id, modulo.nombre, activo)}
                            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${activo ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow ${activo ? 'left-6' : 'left-1'}`} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {tieneCambios && (
                          <button
                            onClick={() => guardarPermisosInline(user.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-lg"
                            title="Guardar permisos"
                          >
                            <Save size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => abrirEditar(user)}
                          className="p-2 text-slate-400 hover:text-[#185FA5] hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar nombre y contraseña"
                        >
                          <Lock size={16} />
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

      {/* ══════════════════════════════════════════════════════════════════
          MODAL CREAR USUARIO
      ══════════════════════════════════════════════════════════════════ */}
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

            <div className="space-y-4">
              {/* ── Nombre para saludo ── */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  Nombre para saludo *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder='Ej: "Lic. Flores" o "Sara" o "Ing. Ramírez"'
                    value={nuevoUsuario.nombre}
                    onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#185FA5]/20 text-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Aparecerá en el Dashboard: "Buenos días, <em>{nuevoUsuario.nombre || 'Nombre'}</em>"
                </p>
              </div>

              <input
                type="email"
                placeholder="Email institucional *"
                value={nuevoUsuario.email}
                onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              />
              <input
                type="password"
                placeholder="Contraseña *"
                value={nuevoUsuario.password}
                onChange={e => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              />
              <input
                type="password"
                placeholder="Confirmar contraseña *"
                value={nuevoUsuario.confirmPassword}
                onChange={e => setNuevoUsuario({ ...nuevoUsuario, confirmPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              />

              {/* ── Módulos ── */}
              <div className="border-t pt-4">
                <p className="text-sm font-bold text-[#11284e] mb-3">Módulos accesibles:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-2xl">
                  {modulosDisponibles.map(mod => (
                    <label key={mod.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white/70 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permisosSeleccionados[mod.nombre] || false}
                        onChange={e => setPermisosSeleccionados(p => ({ ...p, [mod.nombre]: e.target.checked }))}
                        className="w-4 h-4 rounded text-[#185FA5]"
                      />
                      <span>{mod.icono} {mod.nombre}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Sin ningún módulo seleccionado, el usuario solo verá la pantalla de inicio.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={crearNuevoUsuario}
                disabled={creando}
                className="w-full bg-[#11284e] hover:bg-[#185FA5] text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {creando ? <RefreshCw className="animate-spin" size={20} /> : 'Crear Usuario y Asignar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL EDITAR USUARIO
      ══════════════════════════════════════════════════════════════════ */}
      {modalEditar && usuarioEditando && (
        <div className="fixed inset-0 bg-[#11284e]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-[#11284e]">Editar Usuario</h3>
                <p className="text-slate-500 text-sm">{usuarioEditando.email}</p>
              </div>
              <button onClick={cerrarEditar} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* ── Nombre para saludo ── */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                  Nombre para saludo en el Dashboard
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder='Ej: "Lic. Flores", "Sara", "Ing. Ramírez"'
                    value={nombreEditando}
                    onChange={e => setNombreEditando(e.target.value)}
                    className="w-full bg-blue-50 border border-blue-200 rounded-2xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-300/30 text-sm font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Aparecerá en el Dashboard: "Buenos días, <em>{nombreEditando || usuarioEditando.nombre}</em>"
                </p>
              </div>

              {/* ── Contraseña ── */}
              <div className="border p-5 rounded-2xl bg-amber-50">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={18} className="text-amber-600" />
                  <p className="font-bold text-sm text-[#11284e]">Cambiar contraseña (opcional)</p>
                </div>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
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

              {/* ── Módulos ── */}
              <div>
                <p className="text-sm font-bold text-[#11284e] mb-3">Módulos asignados:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {modulosDisponibles.map(mod => (
                    <label key={mod.id} className="flex items-center gap-3 p-3 hover:bg-white/60 rounded-xl cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permisosEditando[mod.nombre] || false}
                        onChange={e => setPermisosEditando(p => ({ ...p, [mod.nombre]: e.target.checked }))}
                        className="w-5 h-5 rounded text-[#185FA5]"
                      />
                      <span className="text-lg group-hover:scale-110 transition-transform">{mod.icono}</span>
                      <span className="font-medium text-sm text-slate-800">{mod.nombre}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  {Object.values(permisosEditando).filter(Boolean).length} módulos seleccionados
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button
                onClick={guardarCambios}
                disabled={editando}
                className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {editando
                  ? <><RefreshCw className="animate-spin" size={20} /> Guardando...</>
                  : <><Save size={20} /> Guardar cambios</>
                }
              </button>
              <button
                onClick={cerrarEditar}
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