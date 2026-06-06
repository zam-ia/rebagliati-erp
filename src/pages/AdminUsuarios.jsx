import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

const buildModuleTree = (flatList = []) => {
  const roots = [];
  const map = {};

  flatList.forEach((item) => {
    map[item.id] = { ...item, children: [] };
  });

  flatList.forEach((item) => {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  });

  roots.forEach((root) => root.children.sort((a, b) => (a.orden || 0) - (b.orden || 0)));
  roots.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  return roots;
};

const flatPermisosToTree = (modulosTree, permisosFlat = {}) => {
  const treeState = {};
  modulosTree.forEach((mod) => {
    const hasParent = permisosFlat[mod.nombre] === true;
    const children = {};
    mod.children?.forEach((child) => {
      children[child.nombre] = hasParent ? true : Boolean(permisosFlat[child.nombre]);
    });
    treeState[mod.nombre] = { checked: hasParent, children };
  });
  return treeState;
};

const treePermisosToFlat = (treeState = {}) => {
  const flat = {};
  Object.entries(treeState).forEach(([modName, state]) => {
    if (state.checked) {
      flat[modName] = true;
    } else {
      Object.entries(state.children || {}).forEach(([childName, checked]) => {
        if (checked) flat[childName] = true;
      });
    }
  });
  return flat;
};

const getFunctionErrorMessage = async (error) => {
  if (!error) return '';
  try {
    const payload = await error.context?.json?.();
    if (payload?.error) return payload.error;
    if (payload?.message) return payload.message;
  } catch {
    // Supabase Functions sometimes exposes only the generic FunctionsHttpError.
  }
  return error.message || 'Error desconocido de Edge Function';
};

const ACCESS_ROLES = [
  {
    id: 'superadmin_tecnico',
    title: 'Superadministrador tecnico',
    position: 'Administrador de sistemas',
    area: 'Sistemas',
    level: 'Sistema',
    permissions: ['Dashboard', 'Ventas', 'Caja', 'Finanzas', 'Marketing', 'RRHH', 'Reportes', 'Administrar Usuarios', 'admin usuarios'],
  },
  {
    id: 'administrador_general',
    title: 'Administrador general',
    position: 'Administrador general',
    area: 'Direccion',
    level: 'Administracion general',
    permissions: ['Dashboard', 'Ventas', 'Caja', 'Finanzas', 'Marketing', 'RRHH', 'Reportes', 'Administrar Usuarios'],
  },
  {
    id: 'direccion',
    title: 'Direccion',
    position: 'Direccion ejecutiva',
    area: 'Direccion',
    level: 'Direccion',
    permissions: ['Dashboard', 'Ventas', 'ventas_dashboard', 'ventas_ranking', 'ventas_metas', 'ventas_eventos', 'ventas_marketing', 'ventas_comisiones', 'ventas_entregables', 'ventas_alertas', 'Finanzas', 'Reportes'],
  },
  {
    id: 'jefe_ventas',
    title: 'Jefe de ventas',
    position: 'Jefe de ventas',
    area: 'Ventas',
    level: 'Jefatura',
    permissions: ['Ventas', 'ventas_dashboard', 'ventas_seguimiento', 'ventas_nueva_venta', 'ventas_ranking', 'ventas_metas', 'ventas_kommo', 'ventas_eventos', 'ventas_marketing', 'ventas_checklist', 'ventas_grupos', 'ventas_promesas', 'ventas_comisiones', 'ventas_biblioteca', 'ventas_show', 'ventas_coordinacion', 'ventas_plantillas', 'ventas_entregables', 'ventas_accesos', 'ventas_alertas', 'ventas_importador', 'ventas_administracion'],
  },
  {
    id: 'supervisor_comercial',
    title: 'Supervisor comercial',
    position: 'Supervisor comercial',
    area: 'Ventas',
    level: 'Supervision',
    permissions: ['Ventas', 'ventas_dashboard', 'ventas_seguimiento', 'ventas_ranking', 'ventas_metas', 'ventas_kommo', 'ventas_eventos', 'ventas_checklist', 'ventas_grupos', 'ventas_promesas', 'ventas_show', 'ventas_alertas'],
  },
  {
    id: 'ejecutivo_ventas',
    title: 'Ejecutivo ventas',
    position: 'Ejecutivo comercial',
    area: 'Ventas',
    level: 'Operativo',
    permissions: ['Ventas', 'ventas_seguimiento', 'ventas_nueva_venta', 'ventas_kommo', 'ventas_promesas', 'ventas_biblioteca', 'ventas_plantillas'],
  },
  {
    id: 'marketing_admin',
    title: 'Marketing administrador',
    position: 'Responsable de marketing',
    area: 'Marketing',
    level: 'Jefatura',
    permissions: ['Marketing', 'marketing_dashboard', 'marketing_campanas', 'marketing_metricas', 'marketing_planeacion', 'marketing_crm', 'Ventas', 'ventas_marketing', 'ventas_eventos', 'ventas_biblioteca', 'ventas_grupos'],
  },
  {
    id: 'marketing_lectura',
    title: 'Marketing lectura',
    position: 'Analista de marketing',
    area: 'Marketing',
    level: 'Lectura',
    permissions: ['Marketing', 'marketing_dashboard', 'marketing_campanas', 'marketing_metricas', 'Ventas', 'ventas_marketing', 'ventas_eventos', 'ventas_biblioteca'],
  },
  {
    id: 'caja_operativo',
    title: 'Caja operativo',
    position: 'Asistente de caja',
    area: 'Caja',
    level: 'Operativo',
    permissions: ['Caja', 'Caja y Pagos', 'caja_dashboard', 'caja_turnos', 'caja_ingresos', 'caja_egresos', 'caja_arqueo', 'caja_historico'],
  },
  {
    id: 'finanzas',
    title: 'Finanzas',
    position: 'Responsable financiero',
    area: 'Finanzas',
    level: 'Jefatura',
    permissions: ['Finanzas', 'Reportes'],
  },
  {
    id: 'academico',
    title: 'Academico',
    position: 'Coordinacion academica',
    area: 'Academico',
    level: 'Operativo',
    permissions: ['Gestion Estrategica', 'Ventas', 'ventas_eventos', 'ventas_coordinacion', 'ventas_biblioteca', 'ventas_entregables', 'Reportes'],
  },
  {
    id: 'auditoria_lectura',
    title: 'Auditoria lectura',
    position: 'Usuario ERP',
    area: 'Direccion',
    level: 'Lectura',
    permissions: ['Dashboard', 'Reportes'],
  },
];

const MODULE_LABELS = {
  ventas_dashboard: 'Panel diario',
  ventas_seguimiento: 'Seguimiento comercial',
  ventas_nueva_venta: 'Ventas e inscripciones',
  ventas_ranking: 'Ranking y productividad',
  ventas_metas: 'Metas',
  ventas_kommo: 'Leads y KOMMO',
  ventas_eventos: 'Eventos 360',
  ventas_marketing: 'Campanas y UTMs',
  ventas_checklist: 'Rutina operativa',
  ventas_grupos: 'Comunidades y remarketing',
  ventas_promesas: 'Promesas',
  ventas_comisiones: 'Comisiones',
  ventas_biblioteca: 'Biblioteca comercial',
  ventas_show: 'Show de ventas',
  ventas_coordinacion: 'Coordinacion academica',
  ventas_plantillas: 'Plantillas',
  ventas_entregables: 'Reportes comerciales',
  ventas_accesos: 'Accesos',
  ventas_alertas: 'Alertas',
  ventas_importador: 'Importador',
  ventas_administracion: 'Admin ventas',
  caja_dashboard: 'Dashboard caja',
  caja_turnos: 'Apertura y cierre',
  caja_ingresos: 'Ingresos',
  caja_egresos: 'Egresos',
  caja_arqueo: 'Arqueo',
  caja_rendicion: 'Rendicion',
  caja_conciliacion: 'Conciliacion',
  caja_historico: 'Historico caja',
  caja_reportes: 'Reportes caja',
  caja_parametros: 'Parametros caja',
};

const ADMIN_TABS = [
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'roles', label: 'Roles', icon: ShieldCheck },
  { id: 'accesos', label: 'Accesos', icon: Layers },
  { id: 'solicitudes', label: 'Solicitudes', icon: FileText },
  { id: 'seguridad', label: 'Seguridad', icon: KeyRound },
  { id: 'actividad', label: 'Actividad', icon: Activity },
];

const AREAS = ['Todas', 'Ventas', 'Marketing', 'Caja', 'Finanzas', 'Academico', 'Direccion', 'Sistemas'];
const ESTADOS = ['Todos', 'Activo', 'Pendiente', 'Suspendido', 'Sin acceso', 'Requiere revision', 'Invitado'];
const LEVELS = ['Todos', 'Sistema', 'Direccion', 'Administracion general', 'Jefatura', 'Supervision', 'Operativo', 'Lectura'];

const CRITICAL_PERMISSIONS = new Set([
  'Administrar Usuarios',
  'admin usuarios',
  'Caja',
  'Caja y Pagos',
  'caja_rendicion',
  'caja_conciliacion',
  'caja_parametros',
  'Finanzas',
  'Reportes',
  'ventas_comisiones',
  'ventas_coordinacion',
  'ventas_importador',
  'ventas_administracion',
  'ventas_entregables',
]);

const FORM_INPUT_CLASS = 'h-10 w-full rounded-full border border-black/10 bg-white px-4 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-[#05C7F2] focus:ring-4 focus:ring-[#05C7F2]/15';
const PRIMARY_BUTTON_CLASS = 'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#020873] px-5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] transition hover:bg-[#03115f] active:scale-[0.97] disabled:opacity-60';
const SECONDARY_BUTTON_CLASS = 'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-[#05C7F2] hover:text-[#020873] active:scale-[0.97]';

const formatModuleName = (name = '') =>
  MODULE_LABELS[name] || name
    .replace(/^ventas_/, '')
    .replace(/^marketing_/, '')
    .replace(/^rrhh_/, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const initials = (value = '') =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'U';

const roleMatchScore = (userPermissions, role) =>
  role.permissions.reduce((score, permission) => score + (userPermissions.includes(permission) ? 1 : 0), 0);

const inferProfileFromPermissions = (permissions = []) => {
  const rankedRoles = ACCESS_ROLES
    .map((role) => ({ ...role, score: roleMatchScore(permissions, role) }))
    .sort((a, b) => b.score - a.score);
  return rankedRoles[0]?.score > 0
    ? rankedRoles[0]
    : ACCESS_ROLES.find((item) => item.id === 'auditoria_lectura');
};

const inferArea = (permissions = []) => {
  if (permissions.some((item) => item === 'Finanzas')) return 'Finanzas';
  if (permissions.some((item) => item === 'Caja' || item === 'Caja y Pagos')) return 'Caja';
  if (permissions.some((item) => item === 'Marketing' || item.startsWith('marketing_'))) return 'Marketing';
  if (permissions.some((item) => item === 'RRHH' || item.startsWith('rrhh_'))) return 'Sistemas';
  if (permissions.some((item) => item === 'Ventas' || item.startsWith('ventas_'))) return 'Ventas';
  if (permissions.some((item) => item === 'Gestion Estrategica')) return 'Academico';
  if (permissions.some((item) => item === 'Administrar Usuarios' || item === 'admin usuarios')) return 'Sistemas';
  return 'Direccion';
};

const deriveUserGovernance = (user) => {
  const permissions = Object.entries(user.permisos || {})
    .filter(([, value]) => value)
    .map(([permission]) => permission);
  const role = inferProfileFromPermissions(permissions);
  const criticalCount = permissions.filter((permission) => CRITICAL_PERMISSIONS.has(permission)).length;
  const risk = criticalCount >= 4 ? 'Alto' : criticalCount > 0 || permissions.length > 12 ? 'Medio' : 'Bajo';
  const state = permissions.length ? 'Activo' : 'Sin acceso';
  const area = inferArea(permissions);
  const autoProfile = user.raw?.perfil_auto !== false;
  const storedCargo = String(user.raw?.cargo || '').trim();
  const storedRol = String(user.raw?.rol || '').trim();
  const inferredRole = role?.title || 'Sin rol';
  const inferredPosition = role?.position || inferredRole || 'Usuario ERP';

  return {
    permissions,
    permissionCount: permissions.length,
    criticalCount,
    role: autoProfile ? inferredRole : storedRol || inferredRole,
    area,
    level: role?.level || 'Lectura',
    state,
    risk,
    lastAccess: 'Sin registro',
    position: autoProfile ? inferredPosition : storedCargo || inferredPosition,
    autoProfile,
    inferredRole,
    inferredPosition,
  };
};

function Badge({ children, tone = 'slate' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    navy: 'bg-[#020873] text-white ring-[#020873]',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone] || tones.blue}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function ModuleMark({ name, active = false }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-medium ${
      active ? 'bg-[#020873] text-white' : 'bg-slate-100 text-slate-600'
    }`}>
      {initials(formatModuleName(name))}
    </span>
  );
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modulosTree, setModulosTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [activeTab, setActiveTab] = useState('usuarios');
  const [filters, setFilters] = useState({ area: 'Todas', estado: 'Todos', nivel: 'Todos' });
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    cargo: '',
    rol: '',
    perfilAuto: true,
  });
  const [permisosTreeCrear, setPermisosTreeCrear] = useState({});

  const [modalEditar, setModalEditar] = useState(false);
  const [editando, setEditando] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [nombreEditando, setNombreEditando] = useState('');
  const [cargoEditando, setCargoEditando] = useState('');
  const [rolEditando, setRolEditando] = useState('');
  const [perfilAutoEditando, setPerfilAutoEditando] = useState(true);
  const [permisosTreeEditar, setPermisosTreeEditar] = useState({});
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: modulosData, error: modulosError } = await supabase
        .from('modulos_sistema')
        .select('*')
        .order('orden');
      if (modulosError) throw modulosError;

      const tree = buildModuleTree(modulosData || []);
      setModulosTree(tree);

      const { data: permisos, error: permisosError } = await supabase
        .from('permisos_usuarios')
        .select('*');
      if (permisosError) throw permisosError;

      const permisosMap = {};
      permisos?.forEach((permiso) => {
        if (!permisosMap[permiso.user_id]) permisosMap[permiso.user_id] = {};
        permisosMap[permiso.user_id][permiso.modulo] = permiso.puede_ver;
      });

      const { data: perfiles, error: perfilesError } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .order('email');
      if (perfilesError) throw perfilesError;

      const nextUsers = (perfiles || []).map((perfil) => ({
        id: perfil.id,
        email: perfil.email,
        nombre: perfil.nombre || perfil.email?.split('@')[0],
        raw: perfil,
        permisos: permisosMap[perfil.id] || {},
      }));

      setUsuarios(nextUsers);
      setSelectedUserId((current) => current || nextUsers[0]?.id || null);
    } catch (err) {
      alert('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const enrichedUsers = useMemo(
    () => usuarios.map((user) => ({ ...user, governance: deriveUserGovernance(user) })),
    [usuarios],
  );

  const selectedUser = useMemo(
    () => enrichedUsers.find((user) => user.id === selectedUserId) || enrichedUsers[0] || null,
    [enrichedUsers, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return enrichedUsers.filter((user) => {
      const matchesTerm = !term || `${user.nombre} ${user.email} ${user.governance.position} ${user.governance.role}`.toLowerCase().includes(term);
      const matchesArea = filters.area === 'Todas' || user.governance.area === filters.area;
      const matchesState = filters.estado === 'Todos' || user.governance.state === filters.estado;
      const matchesLevel = filters.nivel === 'Todos' || user.governance.level === filters.nivel;
      return matchesTerm && matchesArea && matchesState && matchesLevel;
    });
  }, [busqueda, enrichedUsers, filters]);

  const metrics = useMemo(() => {
    const active = enrichedUsers.filter((user) => user.governance.state === 'Activo').length;
    const noAccess = enrichedUsers.filter((user) => user.governance.state === 'Sin acceso').length;
    const critical = enrichedUsers.filter((user) => user.governance.criticalCount > 0).length;
    const highRisk = enrichedUsers.filter((user) => user.governance.risk === 'Alto').length;
    return {
      active,
      pending: 0,
      suspended: 0,
      critical,
      recentChanges: 0,
      inactive: noAccess + highRisk,
    };
  }, [enrichedUsers]);

  const perfilCrearPreview = useMemo(
    () => deriveUserGovernance({
      raw: {
        cargo: nuevoUsuario.cargo,
        rol: nuevoUsuario.rol,
        perfil_auto: nuevoUsuario.perfilAuto,
      },
      permisos: treePermisosToFlat(permisosTreeCrear),
    }),
    [nuevoUsuario.cargo, nuevoUsuario.perfilAuto, nuevoUsuario.rol, permisosTreeCrear],
  );

  const perfilEditarPreview = useMemo(
    () => deriveUserGovernance({
      raw: {
        cargo: cargoEditando,
        rol: rolEditando,
        perfil_auto: perfilAutoEditando,
      },
      permisos: treePermisosToFlat(permisosTreeEditar),
    }),
    [cargoEditando, perfilAutoEditando, permisosTreeEditar, rolEditando],
  );

  const abrirModalNuevo = () => {
    const initialTree = {};
    modulosTree.forEach((mod) => {
      const children = {};
      mod.children?.forEach((child) => { children[child.nombre] = false; });
      initialTree[mod.nombre] = { checked: false, children };
    });
    setNuevoUsuario((current) => ({ ...current, cargo: '', rol: '', perfilAuto: true }));
    setPermisosTreeCrear(initialTree);
    setModalNuevo(true);
  };

  const abrirEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setNombreEditando(usuario.nombre || '');
    setCargoEditando(usuario.raw?.cargo || '');
    setRolEditando(usuario.raw?.rol || '');
    setPerfilAutoEditando(usuario.raw?.perfil_auto !== false);
    setPermisosTreeEditar(flatPermisosToTree(modulosTree, usuario.permisos));
    setNuevaPassword('');
    setConfirmPassword('');
    setModalEditar(true);
  };

  const cerrarEditar = () => {
    setModalEditar(false);
    setUsuarioEditando(null);
    setNombreEditando('');
    setCargoEditando('');
    setRolEditando('');
    setPerfilAutoEditando(true);
    setNuevaPassword('');
    setConfirmPassword('');
    setPermisosTreeEditar({});
  };

  const handleTreeChange = (setter, moduleName, value, isParent = true, childName = null) => {
    setter((prev) => {
      const current = { ...prev };
      const mod = current[moduleName] || { checked: false, children: {} };
      const nextMod = { ...mod };
      if (isParent) {
        nextMod.checked = value;
        if (value) {
          const children = { ...nextMod.children };
          Object.keys(children).forEach((key) => { children[key] = true; });
          nextMod.children = children;
        }
      } else {
        nextMod.children = { ...nextMod.children, [childName]: value };
        if (!value && nextMod.checked) nextMod.checked = false;
      }
      current[moduleName] = nextMod;
      return current;
    });
  };

  const crearNuevoUsuario = async () => {
    if (!nuevoUsuario.email || !nuevoUsuario.password) {
      alert('Correo y contrasena son obligatorios');
      return;
    }
    if (nuevoUsuario.password !== nuevoUsuario.confirmPassword) {
      alert('Las contrasenas no coinciden');
      return;
    }

    setCreando(true);
    try {
      const permisosFlat = treePermisosToFlat(permisosTreeCrear);
      const cargoFinal = nuevoUsuario.perfilAuto ? perfilCrearPreview.inferredPosition : nuevoUsuario.cargo.trim() || perfilCrearPreview.inferredPosition;
      const rolFinal = nuevoUsuario.perfilAuto ? perfilCrearPreview.inferredRole : nuevoUsuario.rol.trim() || perfilCrearPreview.inferredRole;
      const { data, error } = await supabase.functions.invoke('create-user', {
        method: 'POST',
        body: {
          email: nuevoUsuario.email,
          password: nuevoUsuario.password,
          nombre: nuevoUsuario.nombre,
          cargo: cargoFinal,
          rol: rolFinal,
          perfil_auto: nuevoUsuario.perfilAuto,
          permisos: Object.keys(permisosFlat),
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (!data.user?.id) throw new Error('La funcion no devolvio el ID del usuario creado');

      setModalNuevo(false);
      setNuevoUsuario({ email: '', password: '', confirmPassword: '', nombre: '', cargo: '', rol: '', perfilAuto: true });
      setPermisosTreeCrear({});
      cargarDatos();
    } catch (err) {
      alert('Error al crear usuario: ' + err.message);
    } finally {
      setCreando(false);
    }
  };

  const guardarCambios = async () => {
    if (nuevaPassword && nuevaPassword !== confirmPassword) {
      alert('Las contrasenas no coinciden');
      return;
    }
    if (!usuarioEditando) return;

    setEditando(true);
    try {
      const permisosFlat = treePermisosToFlat(permisosTreeEditar);
      const cargoFinal = perfilAutoEditando ? perfilEditarPreview.inferredPosition : cargoEditando.trim() || perfilEditarPreview.inferredPosition;
      const rolFinal = perfilAutoEditando ? perfilEditarPreview.inferredRole : rolEditando.trim() || perfilEditarPreview.inferredRole;
      let { error: errorPerfil } = await supabase
        .from('perfiles_usuarios')
        .update({
          nombre: nombreEditando,
          cargo: cargoFinal,
          rol: rolFinal,
          perfil_auto: perfilAutoEditando,
        })
        .eq('id', usuarioEditando.id);

      if (errorPerfil && /cargo|rol|perfil_auto|schema cache|column/i.test(errorPerfil.message || '')) {
        const fallback = await supabase
          .from('perfiles_usuarios')
          .update({ nombre: nombreEditando })
          .eq('id', usuarioEditando.id);
        errorPerfil = fallback.error;
      }

      if (errorPerfil) throw new Error(`Error al guardar nombre: ${errorPerfil.message}`);

      const { error: errorDelete } = await supabase
        .from('permisos_usuarios')
        .delete()
        .eq('user_id', usuarioEditando.id);
      if (errorDelete) throw new Error(`Error al limpiar permisos: ${errorDelete.message}`);

      const modulosActivos = Object.keys(permisosFlat);
      if (modulosActivos.length > 0) {
        const { error: errorInsert } = await supabase
          .from('permisos_usuarios')
          .insert(modulosActivos.map((modulo) => ({
            user_id: usuarioEditando.id,
            modulo,
            puede_ver: true,
          })));
        if (errorInsert) throw new Error(`Error al asignar modulos: ${errorInsert.message}`);
      }

      if (nuevaPassword) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_user_password', {
          target_user_id: usuarioEditando.id,
          new_password: nuevaPassword,
        });
        if (rpcError) throw new Error(`Error al cambiar contrasena: ${rpcError.message}`);
        if (rpcData?.status === 'error') throw new Error(rpcData.message);
      }

      cerrarEditar();
      cargarDatos();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditando(false);
    }
  };

  const exportarUsuarios = () => {
    const rows = filteredUsers.map((user) => ({
      usuario: user.nombre,
      email: user.email,
      area: user.governance.area,
      cargo: user.governance.position,
      rol: user.governance.role,
      nivel: user.governance.level,
      estado: user.governance.state,
      riesgo: user.governance.risk,
      permisos: user.governance.permissionCount,
    }));
    const csv = [
      Object.keys(rows[0] || { usuario: '', email: '', area: '', cargo: '', rol: '', nivel: '', estado: '', riesgo: '', permisos: '' }).join(','),
      ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_accesos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#020873]" size={30} />
        <p className="text-sm font-semibold text-slate-500">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-[#F2F2F2] p-3 md:p-5 xl:p-6">
      <section className="rounded-[24px] border border-black/5 bg-white/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#020873] p-3 text-white shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]">
                <Shield size={22} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Usuarios y accesos</h1>
                <p className="mt-1 text-sm font-normal text-slate-500">Control de usuarios, modulos, submodulos y permisos criticos.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative min-w-[280px]">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="h-11 w-full rounded-full border border-black/10 bg-slate-50 pl-10 pr-4 text-sm font-normal outline-none transition focus:border-[#05C7F2] focus:bg-white focus:ring-4 focus:ring-[#05C7F2]/15"
                placeholder="Buscar usuario, correo o rol"
              />
            </label>
            <button onClick={exportarUsuarios} className={SECONDARY_BUTTON_CLASS}>
              <Download size={16} /> Exportar
            </button>
            <button onClick={abrirModalNuevo} className={PRIMARY_BUTTON_CLASS}>
              <UserPlus size={16} /> Nuevo usuario
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            <SlidersHorizontal size={15} /> Filtros
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
            <select value={filters.area} onChange={(event) => setFilters({ ...filters, area: event.target.value })} className="h-10 rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition focus:border-[#05C7F2] focus:ring-4 focus:ring-[#05C7F2]/15">
              {AREAS.map((area) => <option key={area}>{area}</option>)}
            </select>
            <select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })} className="h-10 rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition focus:border-[#05C7F2] focus:ring-4 focus:ring-[#05C7F2]/15">
              {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
            </select>
            <select value={filters.nivel} onChange={(event) => setFilters({ ...filters, nivel: event.target.value })} className="h-10 rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-slate-600 outline-none transition focus:border-[#05C7F2] focus:ring-4 focus:ring-[#05C7F2]/15">
              {LEVELS.map((level) => <option key={level}>{level}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Usuarios activos" value={metrics.active} icon={Users} tone="green" />
        <MetricCard label="Pendientes" value={metrics.pending} icon={Clock} tone="amber" />
        <MetricCard label="Suspendidos" value={metrics.suspended} icon={Lock} tone="red" />
        <MetricCard label="Accesos criticos" value={metrics.critical} icon={AlertTriangle} tone="amber" />
        <MetricCard label="Cambios recientes" value={metrics.recentChanges} icon={RefreshCw} tone="blue" />
        <MetricCard label="Sin actividad" value={metrics.inactive} icon={Eye} tone="slate" />
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-full border border-black/5 bg-white/90 p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex min-w-max items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] ${
              activeTab === id ? 'bg-[#020873] text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-[#020873]'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'usuarios' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <UsersTable users={filteredUsers} selectedUserId={selectedUser?.id} onSelect={setSelectedUserId} onEdit={abrirEditar} />
          <UserDetail user={selectedUser} onEdit={abrirEditar} />
        </div>
      )}

      {activeTab === 'roles' && <RolesView roles={ACCESS_ROLES} />}
      {activeTab === 'accesos' && <AccessMatrix modulosTree={modulosTree} roles={ACCESS_ROLES} />}
      {activeTab === 'solicitudes' && <RequestsView />}
      {activeTab === 'seguridad' && <SecurityView users={enrichedUsers} />}
      {activeTab === 'actividad' && <ActivityView />}

      {modalNuevo && (
        <UserAccessModal
          title="Nuevo usuario"
          submitLabel={creando ? 'Creando...' : 'Crear usuario'}
          loading={creando}
          onClose={() => setModalNuevo(false)}
          onSubmit={crearNuevoUsuario}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Nombre</span>
              <input className={FORM_INPUT_CLASS} value={nuevoUsuario.nombre} onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, nombre: event.target.value })} placeholder="Nombre visible" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Correo institucional</span>
              <input className={FORM_INPUT_CLASS} type="email" value={nuevoUsuario.email} onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, email: event.target.value })} placeholder="correo@rebagliati.com" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Contrasena</span>
              <input className={FORM_INPUT_CLASS} type="password" value={nuevoUsuario.password} onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, password: event.target.value })} />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Confirmar contrasena</span>
              <input className={FORM_INPUT_CLASS} type="password" value={nuevoUsuario.confirmPassword} onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, confirmPassword: event.target.value })} />
            </label>
          </div>
          <ProfileFields
            auto={nuevoUsuario.perfilAuto}
            setAuto={(value) => setNuevoUsuario({ ...nuevoUsuario, perfilAuto: value })}
            cargo={nuevoUsuario.cargo}
            setCargo={(value) => setNuevoUsuario({ ...nuevoUsuario, cargo: value })}
            rol={nuevoUsuario.rol}
            setRol={(value) => setNuevoUsuario({ ...nuevoUsuario, rol: value })}
            preview={perfilCrearPreview}
          />
          <PermissionTree modulosTree={modulosTree} treeState={permisosTreeCrear} setter={setPermisosTreeCrear} onChange={handleTreeChange} />
        </UserAccessModal>
      )}

      {modalEditar && usuarioEditando && (
        <UserAccessModal
          title={usuarioEditando.email}
          submitLabel={editando ? 'Guardando...' : 'Guardar cambios'}
          loading={editando}
          onClose={cerrarEditar}
          onSubmit={guardarCambios}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Nombre visible</span>
              <input className={FORM_INPUT_CLASS} value={nombreEditando} onChange={(event) => setNombreEditando(event.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Nueva contrasena</span>
              <input className={FORM_INPUT_CLASS} type="password" value={nuevaPassword} onChange={(event) => setNuevaPassword(event.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Confirmar</span>
              <input className={FORM_INPUT_CLASS} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </label>
          </div>
          <ProfileFields
            auto={perfilAutoEditando}
            setAuto={setPerfilAutoEditando}
            cargo={cargoEditando}
            setCargo={setCargoEditando}
            rol={rolEditando}
            setRol={setRolEditando}
            preview={perfilEditarPreview}
          />
          <PermissionTree modulosTree={modulosTree} treeState={permisosTreeEditar} setter={setPermisosTreeEditar} onChange={handleTreeChange} />
        </UserAccessModal>
      )}
    </div>
  );
}

function UsersTable({ users, selectedUserId, onSelect, onEdit }) {
  const riskTone = { Bajo: 'green', Medio: 'amber', Alto: 'red' };
  const stateTone = { Activo: 'green', Pendiente: 'amber', Suspendido: 'red', 'Sin acceso': 'slate', 'Requiere revision': 'amber', Invitado: 'blue' };

  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Nivel</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ultimo acceso</th>
              <th className="px-4 py-3">Riesgo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr key={user.id} className={`${selectedUserId === user.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'} transition`}>
                <td className="px-4 py-3">
                  <button onClick={() => onSelect(user.id)} className="flex items-center gap-3 text-left">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#020873] text-xs font-medium text-white">
                      {initials(user.nombre || user.email)}
                    </span>
                    <span>
                      <span className="block font-medium text-slate-900">{user.nombre}</span>
                      <span className="block text-xs font-medium text-slate-400">{user.email}</span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 font-medium text-slate-600">{user.governance.area}</td>
                <td className="px-4 py-3 font-medium text-slate-600">{user.governance.position}</td>
                <td className="px-4 py-3"><Badge tone="blue">{user.governance.role}</Badge></td>
                <td className="px-4 py-3 font-medium text-slate-600">{user.governance.level}</td>
                <td className="px-4 py-3"><Badge tone={stateTone[user.governance.state]}>{user.governance.state}</Badge></td>
                <td className="px-4 py-3 text-xs font-medium text-slate-400">{user.governance.lastAccess}</td>
                <td className="px-4 py-3"><Badge tone={riskTone[user.governance.risk]}>{user.governance.risk}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onSelect(user.id)} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-slate-500 transition hover:border-[#05C7F2] hover:bg-slate-50 hover:text-[#020873] active:scale-[0.97]" title="Ver perfil">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => onEdit(user)} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-slate-500 transition hover:border-[#05C7F2] hover:bg-slate-50 hover:text-[#020873] active:scale-[0.97]" title="Editar accesos">
                      <KeyRound size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm font-medium text-slate-400">No hay usuarios para los filtros actuales.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserDetail({ user, onEdit }) {
  if (!user) {
    return (
      <aside className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-sm font-semibold text-slate-400">Selecciona un usuario.</p>
      </aside>
    );
  }

  const permissions = user.governance.permissions.slice(0, 10);

  return (
    <aside className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#020873] text-sm font-medium text-white">{initials(user.nombre)}</div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{user.nombre}</h2>
            <p className="text-xs font-semibold text-slate-400">{user.email}</p>
          </div>
        </div>
        <button onClick={() => onEdit(user)} className="inline-flex h-10 items-center justify-center rounded-full bg-[#020873] px-4 text-xs font-medium text-white transition hover:bg-[#03115f] active:scale-[0.97]">Editar</button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <InfoTile label="Area" value={user.governance.area} />
        <InfoTile label="Cargo" value={user.governance.position} />
        <InfoTile label="Rol" value={user.governance.role} />
        <InfoTile label="Nivel" value={user.governance.level} />
        <InfoTile label="Modo" value={user.governance.autoProfile ? 'Auto' : 'Manual'} />
      </div>

      <div className="mt-5 space-y-4">
        <DetailBlock title="Acceso asignado">
          <div className="flex flex-wrap gap-2">
            {permissions.map((permission) => <Badge key={permission}>{formatModuleName(permission)}</Badge>)}
            {user.governance.permissionCount > permissions.length && <Badge tone="blue">+{user.governance.permissionCount - permissions.length}</Badge>}
          </div>
        </DetailBlock>
        <DetailBlock title="Seguridad">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
            <span>Riesgo: {user.governance.risk}</span>
            <span>Criticos: {user.governance.criticalCount}</span>
            <span>Ultimo acceso: {user.governance.lastAccess}</span>
            <span>2FA: Pendiente</span>
          </div>
        </DetailBlock>
        <DetailBlock title="Actividad">
          <div className="space-y-2 text-xs font-medium text-slate-500">
            <p>Sin eventos recientes conectados.</p>
          </div>
        </DetailBlock>
      </div>
    </aside>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function DetailBlock({ title, children }) {
  return (
    <section className="rounded-2xl border border-black/5 p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function RolesView({ roles }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roles.map((role) => (
        <div key={role.id} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{role.title}</h2>
              <p className="mt-1 text-sm font-normal text-slate-500">{role.area}</p>
            </div>
            <Badge tone="blue">{role.level}</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {role.permissions.slice(0, 8).map((permission) => <Badge key={permission}>{formatModuleName(permission)}</Badge>)}
            {role.permissions.length > 8 && <Badge tone="blue">+{role.permissions.length - 8}</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AccessMatrix({ modulosTree, roles }) {
  const visibleModules = modulosTree.length ? modulosTree : [{ id: 'fallback-ventas', nombre: 'Ventas', children: [] }];
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
              <th className="px-5 py-4">Rol</th>
              {visibleModules.map((mod) => <th key={mod.id} className="px-5 py-4 text-center">{formatModuleName(mod.nombre)}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{role.title}</p>
                  <p className="text-xs font-semibold text-slate-400">{role.area} / {role.level}</p>
                </td>
                {visibleModules.map((mod) => {
                  const active = role.permissions.includes(mod.nombre) || mod.children?.some((child) => role.permissions.includes(child.nombre));
                  return (
                    <td key={`${role.id}-${mod.id}`} className="px-5 py-4 text-center">
                      {active ? <CheckCircle2 className="mx-auto text-emerald-600" size={18} /> : <span className="text-slate-300">-</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestsView() {
  const rows = [
    ['Crear usuario', 'Pendiente', 'Ventas'],
    ['Cambiar rol', 'En revision', 'Marketing'],
    ['Acceso temporal', 'Aprobada', 'Finanzas'],
  ];
  return <SimpleBoard title="Solicitudes" rows={rows} columns={['Tipo', 'Estado', 'Area']} />;
}

function SecurityView({ users }) {
  const highRisk = users.filter((user) => user.governance.risk !== 'Bajo');
  const rows = highRisk.map((user) => [user.nombre, user.governance.risk, `${user.governance.criticalCount} criticos`]);
  return <SimpleBoard title="Seguridad" rows={rows.length ? rows : [['Sin alertas', 'Bajo', '0 criticos']]} columns={['Usuario', 'Riesgo', 'Accesos']} />;
}

function ActivityView() {
  const rows = [
    ['Sistema', 'Cambio de permisos', 'Operativo'],
    ['Admin', 'Restablecer contrasena', 'Sensible'],
    ['Admin', 'Actualizar rol', 'Critico'],
  ];
  return <SimpleBoard title="Actividad" rows={rows} columns={['Responsable', 'Accion', 'Severidad']} />;
}

function SimpleBoard({ title, rows, columns }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
              {columns.map((column) => <th key={column} className="px-5 py-4">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="px-5 py-4 font-semibold text-slate-600">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileFields({ auto, setAuto, cargo, setCargo, rol, setRol, preview }) {
  return (
    <section className="rounded-[18px] border border-black/5 bg-slate-50 p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Cargo y rol</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-900">
            {auto ? `${preview.inferredPosition} / ${preview.inferredRole}` : `${cargo || preview.inferredPosition} / ${rol || preview.inferredRole}`}
          </p>
        </div>
        <label className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-black/10">
          <input
            type="checkbox"
            checked={auto}
            onChange={(event) => setAuto(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#020873] focus:ring-[#05C7F2]"
          />
          Auto
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Cargo</span>
          <input
            className={`${FORM_INPUT_CLASS} ${auto ? 'bg-slate-100 text-slate-400' : ''}`}
            value={auto ? preview.inferredPosition : cargo}
            onChange={(event) => setCargo(event.target.value)}
            disabled={auto}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Rol</span>
          <input
            className={`${FORM_INPUT_CLASS} ${auto ? 'bg-slate-100 text-slate-400' : ''}`}
            value={auto ? preview.inferredRole : rol}
            onChange={(event) => setRol(event.target.value)}
            disabled={auto}
          />
        </label>
      </div>
    </section>
  );
}

function PermissionTree({ modulosTree, treeState, setter, onChange }) {
  return (
    <section>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Accesos por modulo</p>
      <div className="grid max-h-[28vh] grid-cols-1 gap-2 overflow-y-auto rounded-[18px] bg-slate-50 p-2 custom-scrollbar">
        {modulosTree.map((mod) => (
          <div key={mod.id} className="rounded-[16px] border border-black/5 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={treeState[mod.nombre]?.checked || false}
                onChange={(event) => onChange(setter, mod.nombre, event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-[#020873] focus:ring-[#05C7F2]"
              />
              <ModuleMark name={mod.nombre} active={treeState[mod.nombre]?.checked || false} />
              <span className="text-sm font-medium text-slate-800">{formatModuleName(mod.nombre)}</span>
              <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{mod.children.length} submodulos</span>
            </label>
            {mod.children.length > 0 && (
              <div className="ml-10 mt-2 grid gap-1.5 border-l-2 border-slate-100 pl-4">
                {mod.children.map((child) => {
                  const parentChecked = treeState[mod.nombre]?.checked;
                  const childChecked = parentChecked ? true : Boolean(treeState[mod.nombre]?.children?.[child.nombre]);
                  return (
                    <label key={child.id} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm font-normal text-slate-600 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={childChecked}
                        disabled={parentChecked}
                        onChange={(event) => onChange(setter, mod.nombre, event.target.checked, false, child.nombre)}
                        className="h-4 w-4 rounded border-slate-300 text-[#020873] focus:ring-[#05C7F2] disabled:opacity-50"
                      />
                      {formatModuleName(child.nombre)}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function UserAccessModal({ title, submitLabel, loading, onClose, onSubmit, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-[#0a1930]/60 p-2 pt-3 backdrop-blur-md md:pt-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold leading-6 text-slate-950 md:text-xl">{title}</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-[0.97]">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-4 py-3 custom-scrollbar">{children}</div>
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 md:flex-row">
          <button onClick={onSubmit} disabled={loading} className={`${PRIMARY_BUTTON_CLASS} flex-1`}>
            {loading ? <RefreshCw className="animate-spin" size={17} /> : <Save size={17} />}
            {submitLabel}
          </button>
          <button onClick={onClose} disabled={loading} className="h-10 flex-1 rounded-full bg-slate-100 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 active:scale-[0.97] disabled:opacity-60">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
