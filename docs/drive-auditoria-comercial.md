# Auditoria de archivos Drive - Ventas, Marketing, Caja y Finanzas

## Archivos analizados

Los archivos descargados en `C:\Users\User\Downloads\DRIVE` se analizaron como fuentes operativas para el ERP:

- `1. EVENTOS 2026.xlsx`: calendario de eventos por mes, codigos, fichas, grupos WhatsApp, Zoom, modalidad, fechas y horarios.
- `Direccional de Campanas con UTMs l Rebagliati Diplomados.xlsx`: UTMs, publico objetivo, tipo de evento, celular, grupo de usuario y codigo de campana.
- `ESTRATEGIAS DE MARKETING 2026.xlsx`: estrategias, promociones, grupos WhatsApp, cursos, diplomados, avances y activos creativos.
- `RANKING DE VENTAS - AREA DE MARKETING (1).xlsx`: ranking C/CM/D, checklist diario, distribucion de grupos y dashboard de ejecutivos.
- `SEGUIMIENTO DE LLAMADAS 2026.xlsx`: llamadas, bases, Kommo, preinscritos, inscritos e incidencias.
- `PLANTILLA DE AUTOMATIZACION.md`: mensajes comerciales por codigo, certificacion, fecha, modalidad, duracion y publico.
- `PLANTILLAS INFORMATIVAS- EVENTOS*.md`: cuentas oficiales, correos, celulares, reglas de voucher y mensajes informativos.

## Hallazgos

- Los Excel tienen datos suficientes para construir historico real de eventos ganadores por modalidad, publico, canal y ejecutivo.
- Varias hojas usan fechas seriales de Excel, por ejemplo `46176`; la importacion debe convertir a fecha ISO antes de guardar en Supabase.
- Hay codigos repetidos por mes y por variacion de UTM. La llave operativa debe ser `codigo + mes + fecha_inicio`, no solo codigo.
- El ranking C/CM/D permite separar volumen comercial de valor comisionable.
- El seguimiento de llamadas permite calcular conversion real: `inscritos / preinscritos * 100`.
- Las plantillas de pago contienen reglas criticas para caja: tipo de programa, cuenta correcta, titular y voucher legible.

## Cambios aplicados en ERP

- Se agrego `src/lib/driveInsights.js` como mapa operativo de fuentes, formulas, riesgos y reglas.
- Ventas ahora muestra auditoria Drive, formulas automatizables, riesgos de importacion, fases y reglas de caja.
- Marketing ahora muestra fuentes Drive, eventos/UTMs detectados y formulas conectadas a ventas.
- Caja ahora muestra controles basados en plantillas informativas para evitar pagos mal validados.
- Supabase queda preparado con la migracion `20260602114500_drive_commercial_sources.sql`.

## Modelo de importacion propuesto

Tablas nuevas:

- `drive_comercial_fuentes`
- `marketing_eventos_drive`
- `marketing_utms_drive`
- `marketing_estrategias_drive`
- `ventas_llamadas_drive`
- `ventas_ranking_drive`
- `marketing_plantillas_drive`
- `caja_controles_pago_drive`

## Formulas a automatizar

```text
conversion_evento = inscritos / preinscritos * 100
incremento_estrategia = progreso - inicio
checklist_diario = tareas_completadas / tareas_requeridas * 100
puntaje_comision = C * 1 + CM * 2 + D * 6
lead_fuera_sla = minutos_sin_respuesta > 10
```

## Siguiente paso tecnico

La siguiente mejora es crear un importador local o Edge Function para leer los Excel y poblar las tablas nuevas. En frontend ya quedo el mapa operativo y en Supabase ya esta el modelo destino.
