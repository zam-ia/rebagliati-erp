# Plan de mejora - Area de ventas

## Diagnostico ejecutivo

El proceso comercial tiene capacidad de venta, pero pierde velocidad por tres frentes: asignacion manual de leads, autenticacion operativa lenta y baja trazabilidad entre marketing, ventas, caja y finanzas.

Hallazgos principales:

- Kommo inicio con 204 mensajes sin asignar y 6 usuarios activos. La asignacion manual consumio cerca de 15 minutos.
- La autenticacion de doble factor agrega cerca de 25 minutos al arranque operativo. El acceso al correo KASANDRA tomo 45 minutos por cambio de autenticacion sin comunicacion previa.
- El tablero fisico controla pendientes, numeros de WhatsApp y redes, pero no genera trazabilidad ni alertas.
- Renato debe entregar entre el dia 1 y 4 de cada mes seguimiento de llamadas, ranking, UTMs, plantillas de automatizacion y plantillas informativas.
- El ranking actual usa meta total 180 y valores por tipo de producto: diplomados/intensivos S/ 6, cursos modulares S/ 2 y cursos S/ 1.
- Hay friccion en propiedad de comision cuando un lead se reasigna por demora y luego paga una promesa generada antes.

## Objetivo operativo

Convertir ventas en un modulo de control diario que conecte leads, seguimiento, promesas, caja, ranking, incidencias, marketing y comisiones. El modulo debe permitir operar sin depender de pizarras manuales, pero sin eliminar las hojas de calculo actuales mientras el equipo migra.

## Prioridades

P0 - Primeros 7 dias:

- Digitalizar tablero de turno con cola Kommo, WhatsApp disponibles y redes pendientes.
- Aplicar SLA de 10 minutos para primera respuesta.
- Registrar accesos criticos y responsables 2FA.
- Crear estado visible de promesas de pago, vencidas y reasignadas.

P1 - Dias 8 al 21:

- Automatizar reglas de asignacion por usuario activo, carga y cumplimiento de SLA.
- Versionar plantillas de Renato con estado borrador, aprobado y activo.
- Formalizar regla de propiedad de comision cuando hay reasignacion.
- Registrar incidencias con descuento sugerido segun antiguedad y etapa de adaptacion.

P2 - Dias 22 al 45:

- Crear base historica de eventos, cursos, diplomados, modalidad, canal y resultado.
- Conectar direccionales UTM con marketing y ventas.
- Medir catalogos por conversion, claridad y percepcion de valor.
- Implementar ranking ponderado por mix C, CM y D.

P3 - Dias 46 al 90:

- Crear recomendador de eventos ganadores por historico.
- Automatizar comisiones con reglas aprobadas.
- Medir remarketing y cross-sell por video, canal y producto.
- Dejar el tablero fisico solo como respaldo visual.

## Reglas de asignacion y SLA

La cola Kommo debe distribuir mensajes no asignados entre usuarios activos. Con 204 mensajes y 6 usuarios activos, la carga inicial recomendada es 34 mensajes por ejecutivo.

Regla propuesta:

- Si un lead no recibe respuesta en 10 minutos, entra a riesgo.
- Si supera el SLA y hay usuarios con menor carga, se reasigna.
- La venta de la hora posterior a la reasignacion queda marcada como propiedad revisable.
- El registro mantiene ejecutivo original, ejecutivo actual, fecha de promesa y fecha de pago.

## Promesas de pago y comision

Cada promesa debe guardar:

- Lead.
- Ejecutivo original.
- Ejecutivo actual.
- Fecha prometida.
- Monto.
- Estado: vigente, por vencer, vencida, pagada.
- Motivo de reasignacion.

Regla sugerida:

- Si el pago ocurre sin reasignacion, comisiona el ejecutivo original.
- Si el lead fue reasignado por demora mayor al SLA, comisiona el ejecutivo actual.
- Si existia promesa registrada y el ejecutivo actual solo cierra caja, marcar como comision compartida.
- Si caja confirma pago fuera de fecha, finanzas debe validar propiedad antes de liquidar.

## Comisiones e incidencias

Mantener los valores base porque son conocidos por el equipo:

- Diplomados / intensivos: S/ 6.
- Cursos modulares: S/ 2.
- Cursos: S/ 1.
- Meta total mensual: 180.
- Mix esperado: 50% diplomados/intensivos, 15% modulares, 35% cursos.

Mejora recomendada:

- Separar ejecutivos antiguos y nuevos durante el periodo de adaptacion.
- No castigar con la misma severidad a un ejecutivo nuevo que todavia no domina producto, objeciones y flujo de caja.
- Mantener descuento fuerte en diplomados cuando la incidencia afecta atencion o cierre, porque concentra valor.
- Agregar beneficios no monetarios por calidad: vales, permisos, medio dia libre, prioridad en bases ganadoras y reconocimiento interno.

## Marketing y catalogos

Acciones:

- Reducir texto de catalogos VIP y priorizar beneficios, duracion, modalidad, precio y resultado esperado.
- Evaluar nombres de cursos frente a precio para elevar percepcion de valor.
- Guardar historico de conversion por catalogo, UTM, evento y producto.
- Crear campanas de remarketing para alumnos antiguos y cross-sell por afinidad de carrera.

## Caja y finanzas

Caja debe validar pagos contra promesas y bloquear registros ambiguos hasta que ventas confirme propiedad.

Finanzas debe recibir:

- Ranking mensual.
- Promesas pagadas y vencidas.
- Incidencias con descuento sugerido.
- Comision preliminar por ejecutivo.
- Casos de comision compartida o disputada.

## Indicadores de control

- Mensajes Kommo sin asignar.
- Minutos perdidos por asignacion y autenticacion.
- Leads fuera de SLA.
- Promesas vencidas.
- Promesas reasignadas.
- Monto en riesgo.
- Cumplimiento por mix C/CM/D.
- Incidencias por ejecutivo.
- Conversion por UTM.
- Eventos ganadores por modalidad.

## Criterios de aceptacion

El modulo se considera funcional cuando:

- El lider puede ver cola, ranking, incidencias y promesas en una sola pantalla.
- Caja puede identificar pagos con propiedad clara.
- Finanzas puede calcular comisiones sin rehacer datos en Excel.
- Marketing puede comparar UTMs y eventos por resultado.
- El equipo puede seguir usando Google Sheets como fuente temporal sin perder trazabilidad en Supabase.
