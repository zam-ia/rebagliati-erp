# Arquitectura del modulo de ventas

## Proposito

El modulo de ventas debe centralizar la operacion comercial sin romper las herramientas actuales. Supabase queda como base transaccional del ERP, Google Sheets funciona como fuente/importacion temporal y Kommo conserva el origen de leads hasta que la automatizacion este completa.

## Capas del sistema

1. Frontend ERP React/Vite

- Pantalla `/ventas`.
- Ranking ponderado.
- Registro de venta.
- Tablero Kommo.
- Promesas de pago.
- Incidencias.
- Entregables mensuales.
- Plan de mejora visible para lideres.

2. Supabase

- Base de datos transaccional.
- RLS para lectura/escritura autenticada.
- Tablas de ventas, metas, checklists, grupos, comisiones, promesas e incidencias.
- Punto de integracion para futuras Edge Functions.

3. Google Sheets

- Fuente historica temporal.
- Importacion controlada por URL, nombre de hoja y responsable.
- Mantiene continuidad mientras el equipo migra datos al ERP.

4. Integraciones externas

- Kommo: leads, mensajes, estado de asignacion y tiempo de respuesta.
- Marketing: UTMs, campanas, catalogos, remarketing y eventos.
- Caja: confirmacion de pago.
- Finanzas: liquidacion de comisiones y descuentos.

## Modelo de datos propuesto

Tablas existentes del modulo:

- `ventas_ejecutivos`.
- `ventas_periodos`.
- `ventas_metas`.
- `ventas_registros`.
- `ventas_checklists`.
- `ventas_grupos_whatsapp`.

Tablas nuevas de expansion:

- `ventas_kommo_turnos`: control diario de cola, usuarios activos, WhatsApp disponibles, redes pendientes y minutos perdidos.
- `ventas_promesas_pago`: promesas por lead con ejecutivo original, ejecutivo actual, monto, fecha y estado.
- `ventas_incidencias`: incidencias por ejecutivo, severidad, descuento base y descuento sugerido.
- `ventas_comisiones_modelos`: reglas de meta, valores por categoria y mix esperado.
- `ventas_entregables_mensuales`: entregables del dia 1 al 4 con responsable y estado.
- `ventas_fuentes_google`: enlaces de documentos y hojas que alimentan el modulo.

## Flujo de asignacion Kommo

Entrada:

- Mensajes no asignados.
- Usuarios activos.
- Carga actual por ejecutivo.
- Tiempo desde primer mensaje.

Regla:

```text
carga_sugerida = techo(mensajes_no_asignados / usuarios_activos)
fuera_sla = minutos_sin_respuesta > 10
```

Acciones:

- Distribuir carga inicial por usuario activo.
- Marcar lead fuera de SLA si supera 10 minutos.
- Reasignar a ejecutivo con menor carga cuando el lead esta fuera de SLA.
- Mantener ejecutivo original y ejecutivo actual para resolver comisiones.

## Flujo de promesa y pago

Estados:

- `vigente`.
- `por_vencer`.
- `vencida`.
- `pagada`.
- `disputada`.

Formula de riesgo:

```text
monto_en_riesgo = suma(monto donde estado != 'vigente' y estado != 'pagada')
promesas_reasignadas = conteo(ejecutivo_original != ejecutivo_actual)
```

Regla de propiedad:

- Pago sin reasignacion: propietario original.
- Reasignacion por SLA vencido: propietario actual.
- Promesa previa con cierre posterior de otro ejecutivo: revision o comision compartida.

## Ranking y comisiones

Categorias:

- C: cursos.
- CM: cursos modulares.
- D: diplomados/intensivos.

Comision base:

```text
comision = cursos * 1 + cursos_modulares * 2 + diplomados_intensivos * 6
```

Ranking ponderado operacional:

```text
puntaje = C * peso_C + CM * peso_CM + D * peso_D
avance_meta = ventas_totales / meta_total * 100
```

Modelo actual:

- Meta total: 180.
- Diplomados/intensivos: 50%.
- Cursos modulares: 15%.
- Cursos: 35%.

## Incidencias

Campos minimos:

- Ejecutivo.
- Antiguedad: antiguo o nuevo.
- Tipo de incidencia.
- Severidad.
- Descuento base.
- Descuento sugerido.
- Estado.

Regla:

- Ejecutivo antiguo: descuento base se mantiene salvo justificacion.
- Ejecutivo nuevo: descuento sugerido puede reducirse durante adaptacion.
- Incidencia critica en diplomados mantiene descuento alto por impacto comercial.

## Integracion con Google Sheets

Uso recomendado:

- Registrar cada fuente en `ventas_fuentes_google`.
- Importar de forma programada cuando se habilite Edge Function o tarea local.
- Guardar fecha de ultima sincronizacion.
- No depender de ediciones manuales invisibles para calculos finales.

Fuentes recibidas:

- Documento de auditoria y mejora.
- Seguimiento de llamadas 2026.
- Ranking de ventas - area de marketing.
- Cuadro de eventos 2026.
- Documentos de plantillas y procesos.

## Seguridad y permisos

Recomendacion:

- Frontend solo usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Nunca colocar `service_role` en React ni en `.env.local` del frontend.
- Operaciones administrativas futuras deben ir en Edge Functions o backend seguro.
- RLS debe permitir lectura/escritura a usuarios autenticados y restringir anonimos si el ERP pasa a produccion real.

## Enlace entre modulos

Ventas -> Caja:

- Caja confirma pagos por promesa o venta.
- Si hay disputa de propiedad, caja marca pendiente de validacion.

Ventas -> Finanzas:

- Finanzas calcula comision final con ventas, incidencias y casos disputados.
- Finanzas recibe descuento sugerido, no solo descuento bruto.

Marketing -> Ventas:

- Marketing entrega UTM, catalogo, campana y evento.
- Ventas devuelve conversion real por ejecutivo y producto.

Ventas -> Direccion:

- Direccion ve ranking, SLA, incidencias, promesas y productividad del periodo.

## Roadmap tecnico

Fase 1:

- Aplicar migraciones Supabase.
- Cargar datos iniciales.
- Validar pantalla `/ventas`.

Fase 2:

- Conectar importacion desde Google Sheets.
- Versionar plantillas y catalogos.
- Registrar promesas desde caja.

Fase 3:

- Integrar Kommo API.
- Automatizar asignacion por SLA.
- Crear historial de eventos ganadores.

Fase 4:

- Calcular comisiones finales.
- Generar reportes mensuales.
- Crear alertas para lider comercial, caja y finanzas.
