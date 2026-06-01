export const ADMIN_EMAIL = 'admin@rebagliati.com';

export const ROUTE_PERMISSIONS = [
  { route: '/dashboard', permissions: [] },
  { route: '/inscripciones', permissions: ['Inscripciones'] },
  { route: '/ventas', permissions: ['Ventas', 'ventas_dashboard'] },
  { route: '/caja', permissions: ['Caja', 'Caja y Pagos'] },
  { route: '/marketing', permissions: ['Marketing', 'marketing_dashboard'] },
  { route: '/marketing/dashboard', permissions: ['Marketing', 'marketing_dashboard'] },
  { route: '/marketing/planeacion', permissions: ['Marketing', 'marketing_planeacion'] },
  { route: '/marketing/crm', permissions: ['Marketing', 'marketing_crm'] },
  { route: '/marketing/campanas', permissions: ['Marketing', 'marketing_campanas'] },
  { route: '/marketing/calendario', permissions: ['Marketing', 'marketing_calendario'] },
  { route: '/marketing/produccion', permissions: ['Marketing', 'marketing_produccion'] },
  { route: '/marketing/biblioteca', permissions: ['Marketing', 'marketing_biblioteca'] },
  { route: '/marketing/publicidad', permissions: ['Marketing', 'marketing_publicidad'] },
  { route: '/marketing/automatizacion', permissions: ['Marketing', 'marketing_automatizacion'] },
  { route: '/marketing/metricas', permissions: ['Marketing', 'marketing_metricas'] },
  { route: '/marketing/marca', permissions: ['Marketing', 'marketing_marca'] },
  { route: '/marketing/colaboracion', permissions: ['Marketing', 'marketing_colaboracion'] },
  { route: '/marketing/briefing', permissions: ['Marketing', 'marketing_briefing'] },
  { route: '/rrhh', permissions: ['RRHH'] },
  { route: '/finanzas', permissions: ['Finanzas'] },
  { route: '/logistica', permissions: ['Logística'] },
  { route: '/gestion', permissions: ['Gestión Estratégica'] },
  { route: '/reclamaciones', permissions: ['Reclamaciones'] },
  { route: '/reportes', permissions: ['Reportes'] },
  { route: '/admin/usuarios', permissions: ['admin usuarios', 'Administrar Usuarios'] },
];

export const RRHH_ROUTE_PERMISSIONS = [
  { route: '/rrhh/dashboard', path: 'dashboard', permissions: ['RRHH', 'rrhh_dashboard'] },
  { route: '/rrhh/perfil', path: 'perfil', permissions: ['RRHH', 'rrhh_perfil'] },
  { route: '/rrhh/base', path: 'base', permissions: ['RRHH', 'rrhh_base'] },
  { route: '/rrhh/directorio', path: 'directorio', permissions: ['RRHH', 'rrhh_directorio'] },
  { route: '/rrhh/reclutamiento', path: 'reclutamiento', permissions: ['RRHH', 'rrhh_reclutamiento'] },
  { route: '/rrhh/horarios', path: 'horarios', permissions: ['RRHH', 'rrhh_horarios'] },
  { route: '/rrhh/vacaciones', path: 'vacaciones', permissions: ['RRHH', 'rrhh_vacaciones'] },
  { route: '/rrhh/descansos', path: 'descansos', permissions: ['RRHH', 'rrhh_descansos'] },
  { route: '/rrhh/evaluacion', path: 'evaluacion', permissions: ['RRHH', 'rrhh_evaluacion'] },
  { route: '/rrhh/locadores', path: 'locadores', permissions: ['RRHH', 'rrhh_locadores'] },
  { route: '/rrhh/planilla_pagos', path: 'planilla_pagos', permissions: ['RRHH', 'rrhh_planilla_pagos'] },
  { route: '/rrhh/novedades', path: 'novedades', permissions: ['RRHH', 'rrhh_novedades'] },
  { route: '/rrhh/documentos', path: 'documentos', permissions: ['RRHH', 'rrhh_documentos'] },
  { route: '/rrhh/ceses', path: 'ceses', permissions: ['RRHH', 'rrhh_ceses'] },
];

export const normalizePermissionList = (permissions = []) =>
  permissions
    .map((permission) => {
      if (typeof permission === 'string') return permission;
      if (permission?.puede_ver === false) return null;
      return permission?.modulo;
    })
    .filter(Boolean);

export const hasAnyPermission = (userPermissions = [], requiredPermissions = []) => {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  const permissionSet = new Set(normalizePermissionList(userPermissions));
  return requiredPermissions.some((permission) => permissionSet.has(permission));
};

export const isAdminUser = (email) => email === ADMIN_EMAIL;

export const getFirstAllowedRoute = (email, permissions = []) => {
  if (isAdminUser(email)) return '/dashboard';
  const normalized = normalizePermissionList(permissions);
  const route = ROUTE_PERMISSIONS.find((item) => item.permissions.length > 0 && hasAnyPermission(normalized, item.permissions));
  if (route) return route.route;
  const rrhhRoute = RRHH_ROUTE_PERMISSIONS.find((item) => hasAnyPermission(normalized, item.permissions));
  return rrhhRoute?.route || '/dashboard';
};

export const getFirstAllowedRrhhRoute = (email, permissions = []) => {
  if (isAdminUser(email)) return '/rrhh/dashboard';
  const normalized = normalizePermissionList(permissions);
  const route = RRHH_ROUTE_PERMISSIONS.find((item) => hasAnyPermission(normalized, item.permissions));
  return route?.route || '/dashboard';
};
