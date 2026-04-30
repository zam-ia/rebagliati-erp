// src/pages/AdminUsuarios.jsx
// ─────────────────────────────────────────────────────────────────────────────
// VERSIÓN CON SOPORTE DE MÓDULOS JERÁRQUICOS (COMPLETOS / PARCIALES)
//   - Se basa en la columna parent_id de modulos_sistema.
//   - Los módulos raíz (sin padre) se muestran en la tabla con toggle rápido.
//   - En creación/edición se muestra un árbol: check padre activa todos sus
//     hijos; si se desmarca el padre se pueden seleccionar submódulos
//     individualmente (acceso parcial).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Save, UserPlus, Lock, RefreshCw, Shield,
  Search, X, User
} from 'lucide-react';

// ─── Helpers para el árbol de módulos ────────────────────────────────────────
const buildModuleTree = (flatList) => {
  const roots = [];
  const map = {};

  flatList.forEach(m => {
    map[m.id] = { ...m, children: [] };
  });

  flatList.forEach(m => {
    if (m.parent_id && map[m.parent_id]) {
      map[m.parent_id].children.push(map[m.id]);
    } else if (!m.parent_id) {
      roots.push(map[m.id]);
    }
    // Si tiene parent_id pero el padre no existe, lo tratamos como raíz
    else {
      roots.push(map[m.id]);
    }
  });

  // Ordenar hijos por orden
  roots.forEach(r => r.children.sort((a, b) => a.orden - b.orden));
  roots.sort((a, b) => a.orden - b.orden);
  return roots;
};

// Convierte un objeto de permisos planos { modulo: true/false } a un estado de árbol
const flatPermisosToTree = (modulosTree, permisosFlat) => {
  const treeState = {};
  modulosTree.forEach(mod => {
    const hasParent = permisosFlat[mod.nombre] === true;
    const children = {};
    mod.children?.forEach(child => {
      children[child.nombre] = hasParent ? true : (permisosFlat[child.nombre] || false);
    });
    treeState[mod.nombre] = {
      checked: hasParent,
      children
    };
  });
  return treeState;
};

// Convierte el estado del árbol a un objeto plano de permisos a insertar
const treePermisosToFlat = (treeState) => {
  const flat = {};
  Object.entries(treeState).forEach(([modName, state]) => {
    if (state.checked) {
      flat[modName] = true;
      // Si el padre está chequeado, no guardamos hijos (no hacen falta)
    } else {
      Object.entries(state.children || {}).forEach(([childName, checked]) => {
        if (checked) flat[childName] = true;
      });
    }
  });
  return flat;
};

export default function AdminUsuarios() {
  const [usuarios, setUsuarios]              = useState([]);
  const [modulosTree, setModulosTree]        = useState([]);   // árbol de módulos
  const [loading, setLoading]                = useState(true);
  const [permisosTemp, setPermisosTemp]      = useState({});
  const [busqueda, setBusqueda]              = useState('');

  // ── Estados Modal Crear ──────────────────────────────────────────────────
  const [modalNuevo, setModalNuevo]                     = useState(false);
  const [creando, setCreando]                           = useState(false);
  const [nuevoUsuario, setNuevoUsuario]                 = useState({
    email: '', password: '', confirmPassword: '', nombre: ''
  });
  // Ahora usamos un estado de árbol para los permisos en creación
  const [permisosTreeCrear, setPermisosTreeCrear]       = useState({});

  // ── Estados Modal Editar ─────────────────────────────────────────────────
  const [modalEditar, setModalEditar]                   = useState(false);
  const [editando, setEditando]                         = useState(false);
  const [usuarioEditando, setUsuarioEditando]           = useState(null);
  const [nombreEditando, setNombreEditando]             = useState('');
  const [permisosTreeEditar, setPermisosTreeEditar]     = useState({});
  const [nuevaPassword, setNuevaPassword]               = useState('');
  const [confirmPassword, setConfirmPassword]           = useState('');

  // ── Carga de datos ───────────────────────────────────────────────────────
  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Obtener todos los módulos (padres e hijos) ordenados
      const { data: modulosData } = await supabase
        .from('modulos_sistema')
        .select('*')
        .order('orden');

      const tree = buildModuleTree(modulosData || []);
      setModulosTree(tree);

      // 2. Permisos actuales
      const { data: permisos } = await supabase
        .from('permisos_usuarios')
        .select('*');
      const permisosMap = {};
      permisos?.forEach(p => {
        if (!permisosMap[p.user_id]) permisosMap[p.user_id] = {};
        permisosMap[p.user_id][p.modulo] = p.puede_ver;
      });

      // 3. Perfiles de usuario
      const { data: perfiles, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .order('email');
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

  // ── Inicializar árbol de creación cada vez que se abra el modal ──────────
  const abrirModalNuevo = () => {
    const initialTree = {};
    modulosTree.forEach(mod => {
      const children = {};
      mod.children?.forEach(child => { children[child.nombre] = false; });
      initialTree[mod.nombre] = { checked: false, children };
    });
    setPermisosTreeCrear(initialTree);
    setModalNuevo(true);
  };

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

      // Convertir árbol a plano y asignar permisos
      const permisosFlat = treePermisosToFlat(permisosTreeCrear);
      const modulosActivos = Object.keys(permisosFlat);
      for (const modulo of modulosActivos) {
        await supabase.from('permisos_usuarios').upsert(
          { user_id: userId, modulo, puede_ver: true },
          { onConflict: 'user_id,modulo' }
        );
      }

      alert('✅ Usuario creado correctamente');
      setModalNuevo(false);
      setNuevoUsuario({ email: '', password: '', confirmPassword: '', nombre: '' });
      setPermisosTreeCrear({});
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
    const treeState = flatPermisosToTree(modulosTree, usuario.permisos);
    setPermisosTreeEditar(treeState);
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
    setPermisosTreeEditar({});
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
      const { data: perfilActualizado, error: errorPerfil } = await supabase
        .from('perfiles_usuarios')
        .update({ nombre: nombreEditando })
        .eq('id', usuarioEditando.id)
        .select();
      if (errorPerfil) throw new Error(`Error al guardar nombre: ${errorPerfil.message}`);
      if (!perfilActualizado || perfilActualizado.length === 0) {
        throw new Error(`No se pudo actualizar el perfil. Verifica el ID y RLS.`);
      }

      // ── 2. Actualizar permisos ────────────────────────────────────────
      const permisosFlat = treePermisosToFlat(permisosTreeEditar);
      // Eliminar permisos anteriores
      const { error: errorDelete } = await supabase
        .from('permisos_usuarios')
        .delete()
        .eq('user_id', usuarioEditando.id);
      if (errorDelete) throw new Error(`Error al limpiar permisos: ${errorDelete.message}`);

      // Insertar nuevos permisos
      const modulosActivos = Object.keys(permisosFlat);
      if (modulosActivos.length > 0) {
        const { error: errorInsert } = await supabase
          .from('permisos_usuarios')
          .insert(modulosActivos.map(modulo => ({
            user_id: usuarioEditando.id,
            modulo,
            puede_ver: true
          })));
        if (errorInsert) throw new Error(`Error al asignar módulos: ${errorInsert.message}`);
      }

      // ── 3. Cambiar contraseña (opcional) ──────────────────────────────
      if (nuevaPassword) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_user_password', {
          target_user_id: usuarioEditando.id,
          new_password: nuevaPassword
        });
        if (rpcError) throw new Error(`Error al cambiar contraseña: ${rpcError.message}`);
        if (rpcData?.status === 'error') throw new Error(rpcData.message);
      }

      alert('✅ Usuario actualizado correctamente');
      cerrarEditar();
      cargarDatos();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setEditando(false);
    }
  };

  // ── Permisos inline (toggle en la tabla para módulos raíz) ─────────────
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

  // ── Helper para cambiar el estado del árbol (crear/editar) ──────────────
  const handleTreeChange = (setter, moduleName, value, isParent = true, childName = null) => {
    setter(prev => {
      const current = { ...prev };
      const mod = current[moduleName] || { checked: false, children: {} };
      const newMod = { ...mod };
      if (isParent) {
        newMod.checked = value;
        // Si se marca el padre, todos los hijos se marcan automáticamente
        if (value) {
          const children = { ...newMod.children };
          Object.keys(children).forEach(k => { children[k] = true; });
          newMod.children = children;
        }
      } else {
        // Es un hijo
        const children = { ...newMod.children, [childName]: value };
        newMod.children = children;
        // Si se desmarca cualquier hijo, el padre debe desmarcarse (si estuviera marcado)
        if (!value && newMod.checked) {
          newMod.checked = false;
        }
        // Si todos los hijos se marcan, podríamos sugerir marcar el padre? Mejor dejamos manual.
      }
      current[moduleName] = newMod;
      return current;
    });
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="animate-spin text-[#185FA5]" size={28} />
      <p className="text-gray-500 font-medium">Cargando usuarios...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 animate-in fade-in duration-500">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
              <Shield size={24} className="text-[#185FA5]" />
            </div>
            <h1 className="text-3xl font-black text-[#0B1527] tracking-tight">Control de Accesos</h1>
          </div>
          <p className="text-sm text-gray-500 font-medium ml-12">Gestiona identidades, nombres y permisos (completos o parciales)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar usuario..."
              className="pl-10 pr-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-sm w-72 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <button
            onClick={abrirModalNuevo}
            className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-medium text-sm shadow-lg shadow-blue-500/25 active:scale-[0.98]"
          >
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* ── TABLA (muestra solo módulos raíz) ──────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                {modulosTree.map(m => (
                  <th key={m.id} className="px-3 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[90px]">
                    <span className="block text-lg mb-1">{m.icono}</span>
                    {m.nombre}
                  </th>
                ))}
                <th className="px-6 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(user => {
                const tieneCambios = permisosTemp[user.id] && Object.keys(permisosTemp[user.id]).length > 0;
                return (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#11284e] to-[#185FA5] flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {(user.nombre || user.email || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 text-sm">{user.nombre}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {modulosTree.map(modulo => {
                      const activo = getPermiso(user.id, modulo.nombre);
                      return (
                        <td key={modulo.id} className="px-3 py-4 text-center">
                          <button
                            onClick={() => togglePermiso(user.id, modulo.nombre, activo)}
                            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${activo ? 'bg-emerald-500 shadow-sm' : 'bg-gray-200'}`}
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
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-xl border border-emerald-200 transition-all"
                            title="Guardar permisos rápidos"
                          >
                            <Save size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => abrirEditar(user)}
                          className="p-2 text-gray-400 hover:text-[#185FA5] hover:bg-blue-50 rounded-xl transition-all border border-gray-100 hover:border-blue-200"
                          title="Editar nombre, contraseña y submódulos"
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
                  <td colSpan={modulosTree.length + 2} className="px-6 py-16 text-center text-gray-400">
                    <Shield size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No se encontraron usuarios</p>
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
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-[#11284e]">Alta de Usuario</h3>
                <p className="text-gray-500 text-sm mt-1">Crear acceso y asignar módulos (completos o parciales)</p>
              </div>
              <button onClick={() => setModalNuevo(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-5">
              {/* Nombre para saludo */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Nombre para saludo *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder='Ej: "Lic. Flores" o "Sara"' value={nuevoUsuario.nombre}
                    onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-sm transition-all" />
                </div>
              </div>
              <input type="email" placeholder="Email institucional *" value={nuevoUsuario.email}
                onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-sm transition-all" />
              <input type="password" placeholder="Contraseña *" value={nuevoUsuario.password}
                onChange={e => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-sm transition-all" />
              <input type="password" placeholder="Confirmar contraseña *" value={nuevoUsuario.confirmPassword}
                onChange={e => setNuevoUsuario({ ...nuevoUsuario, confirmPassword: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-sm transition-all" />

              {/* Árbol de módulos */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-bold text-[#0B1527] mb-3">Módulos accesibles:</p>
                <div className="space-y-2 max-h-80 overflow-y-auto p-2 bg-gray-50 rounded-2xl custom-scrollbar">
                  {modulosTree.map(mod => (
                    <div key={mod.id} className="border border-gray-100 rounded-2xl p-4 bg-white hover:border-blue-200 transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permisosTreeCrear[mod.nombre]?.checked || false}
                          onChange={e => handleTreeChange(setPermisosTreeCrear, mod.nombre, e.target.checked)}
                          className="w-5 h-5 rounded-lg border-2 border-gray-300 text-[#185FA5] focus:ring-blue-500"
                        />
                        <span className="font-semibold text-gray-800">{mod.icono} {mod.nombre}</span>
                      </label>
                      {mod.children.length > 0 && (
                        <div className="ml-9 mt-3 space-y-1.5 border-l-2 border-gray-100 pl-5">
                          {mod.children.map(child => {
                            const padChequeado = permisosTreeCrear[mod.nombre]?.checked;
                            const childChecked = padChequeado ? true : (permisosTreeCrear[mod.nombre]?.children?.[child.nombre] || false);
                            return (
                              <label key={child.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={childChecked}
                                  disabled={padChequeado}
                                  onChange={e => handleTreeChange(setPermisosTreeCrear, mod.nombre, e.target.checked, false, child.nombre)}
                                  className="w-4 h-4 rounded border-2 border-gray-300 text-[#185FA5] disabled:opacity-50"
                                />
                                <span className={padChequeado ? 'text-gray-400' : 'text-gray-700'}>{child.icono} {child.nombre}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                  Marca el módulo principal para acceso completo. Desmárcalo para elegir submódulos específicos.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button onClick={crearNuevoUsuario} disabled={creando}
                className="w-full bg-gradient-to-r from-[#11284e] to-[#185FA5] hover:from-[#185FA5] hover:to-[#1a6ab8] text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]">
                {creando ? <><RefreshCw className="animate-spin" size={20} /> Creando...</> : 'Crear Usuario y Asignar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL EDITAR USUARIO
      ══════════════════════════════════════════════════════════════════ */}
      {modalEditar && usuarioEditando && (
        <div className="fixed inset-0 bg-[#0a1930]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-[#11284e]">Editar Usuario</h3>
                <p className="text-gray-500 text-sm mt-1">{usuarioEditando.email}</p>
              </div>
              <button onClick={cerrarEditar} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Nombre para saludo en el Dashboard</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder='Ej: "Lic. Flores"' value={nombreEditando}
                    onChange={e => setNombreEditando(e.target.value)}
                    className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-sm font-medium transition-all" />
                </div>
              </div>

              {/* Contraseña */}
              <div className="border-2 border-amber-200 p-5 rounded-2xl bg-amber-50">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={18} className="text-amber-600" />
                  <p className="font-bold text-sm text-[#11284e]">Cambiar contraseña (opcional)</p>
                </div>
                <div className="space-y-3">
                  <input type="password" placeholder="Nueva contraseña (mín. 6 caracteres)" value={nuevaPassword}
                    onChange={e => setNuevaPassword(e.target.value)}
                    className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 text-sm transition-all" />
                  {nuevaPassword && (
                    <input type="password" placeholder="Confirmar nueva contraseña" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 text-sm transition-all" />
                  )}
                </div>
              </div>

              {/* Módulos (árbol) */}
              <div>
                <p className="text-sm font-bold text-[#11284e] mb-3">Módulos asignados:</p>
                <div className="space-y-2 max-h-80 overflow-y-auto p-2 bg-gray-50 rounded-2xl custom-scrollbar">
                  {modulosTree.map(mod => (
                    <div key={mod.id} className="border border-gray-100 rounded-2xl p-4 bg-white hover:border-blue-200 transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permisosTreeEditar[mod.nombre]?.checked || false}
                          onChange={e => handleTreeChange(setPermisosTreeEditar, mod.nombre, e.target.checked)}
                          className="w-5 h-5 rounded-lg border-2 border-gray-300 text-[#185FA5] focus:ring-blue-500"
                        />
                        <span className="font-semibold text-gray-800">{mod.icono} {mod.nombre}</span>
                      </label>
                      {mod.children.length > 0 && (
                        <div className="ml-9 mt-3 space-y-1.5 border-l-2 border-gray-100 pl-5">
                          {mod.children.map(child => {
                            const padChequeado = permisosTreeEditar[mod.nombre]?.checked;
                            const childChecked = padChequeado ? true : (permisosTreeEditar[mod.nombre]?.children?.[child.nombre] || false);
                            return (
                              <label key={child.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={childChecked}
                                  disabled={padChequeado}
                                  onChange={e => handleTreeChange(setPermisosTreeEditar, mod.nombre, e.target.checked, false, child.nombre)}
                                  className="w-4 h-4 rounded border-2 border-gray-300 text-[#185FA5] disabled:opacity-50"
                                />
                                <span className={padChequeado ? 'text-gray-400' : 'text-gray-700'}>{child.icono} {child.nombre}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                  {Object.keys(treePermisosToFlat(permisosTreeEditar)).length} módulo(s) activo(s)
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
              <button onClick={guardarCambios} disabled={editando}
                className="flex-1 bg-gradient-to-r from-[#11284e] to-[#185FA5] hover:from-[#185FA5] hover:to-[#1a6ab8] text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]">
                {editando ? <><RefreshCw className="animate-spin" size={20} /> Guardando...</> : <><Save size={20} /> Guardar cambios</>}
              </button>
              <button onClick={cerrarEditar} disabled={editando}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-2xl font-medium transition-all disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 20px; }
      `}} />
    </div>
  );
}