// src/pages/rrhh/FormularioAutoevaluacion.jsx
import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ClipboardList, Star, Heart, Shield, Briefcase, TrendingUp,
  Send, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';

// ─── COMPETENCIAS Y PREGUNTAS BASE ──────────────────────────────────────
const GENERALES = [
  { nombre: 'Responsabilidad',                pregunta: 'Cumplo mis tareas y compromisos sin necesidad de seguimiento constante.' },
  { nombre: 'Comunicación',                   pregunta: 'Comunico avances, retrasos, dudas o problemas de manera oportuna.' },
  { nombre: 'Organización',                   pregunta: 'Mantengo ordenados mis pendientes, documentos, tiempos y prioridades.' },
  { nombre: 'Trabajo en equipo',              pregunta: 'Colaboro con otras áreas sin generar fricciones innecesarias.' },
  { nombre: 'Cumplimiento de normas',         pregunta: 'Respeto los procesos, canales y lineamientos internos establecidos.' },
  { nombre: 'Calidad del trabajo',            pregunta: 'Entrego trabajos completos, correctos y con bajo margen de error.' },
  { nombre: 'Proactividad',                   pregunta: 'Propongo soluciones o advierto problemas antes de que escalen.' },
  { nombre: 'Inteligencia emocional laboral', pregunta: 'Mantengo una actitud profesional ante presión, cambios o correcciones.' },
];

const BIENESTAR = [
  { nombre: 'Carga laboral',          pregunta: 'Mi carga de trabajo es manejable dentro de mi jornada habitual.' },
  { nombre: 'Claridad del rol',       pregunta: 'Tengo claridad sobre mis funciones, prioridades y responsabilidades.' },
  { nombre: 'Motivación',             pregunta: 'Me siento motivado/a para cumplir mis objetivos laborales.' },
  { nombre: 'Manejo de presión',      pregunta: 'Puedo manejar adecuadamente los momentos de alta exigencia.' },
  { nombre: 'Apoyo del jefe',         pregunta: 'Recibo orientación cuando tengo dificultades o dudas.' },
  { nombre: 'Relación con el equipo', pregunta: 'Percibo respeto y colaboración en mi área de trabajo.' },
  { nombre: 'Seguridad psicológica',  pregunta: 'Puedo comunicar errores, dudas o problemas sin temor a represalias.' },
  { nombre: 'Energía laboral',        pregunta: 'Tengo energía suficiente para sostener mi desempeño durante el periodo.' },
];

const AUDITORIA = [
  { nombre: 'Funciones del puesto',   pregunta: 'Cumplí las funciones principales asignadas a mi cargo durante el periodo.' },
  { nombre: 'Evidencias',             pregunta: 'Mis entregables, reportes, documentos o registros cuentan con evidencia verificable.' },
  { nombre: 'Cumplimiento de plazos', pregunta: 'Cumplí los plazos establecidos para tareas, reportes o entregables.' },
  { nombre: 'Uso de sistemas',        pregunta: 'Registré información en el ERP, CRM, bases o canales correspondientes.' },
  { nombre: 'Incidencias',            pregunta: 'Reporté oportunamente errores, riesgos, retrasos o problemas del periodo.' },
];

const LIDERAZGO = [
  { nombre: 'Influencia positiva',      pregunta: 'Genero confianza y apoyo en otras personas de mi equipo o área.' },
  { nombre: 'Toma de decisiones',       pregunta: 'Tomo decisiones con criterio, responsabilidad y sentido institucional.' },
  { nombre: 'Resolución de conflictos', pregunta: 'Manejo diferencias o problemas con respeto y enfoque en soluciones.' },
  { nombre: 'Formación de otros',       pregunta: 'Puedo orientar, enseñar o acompañar a otros colaboradores cuando lo necesitan.' },
  { nombre: 'Pensamiento estratégico',  pregunta: 'Comprendo cómo mi trabajo impacta en los objetivos de mi área y la empresa.' },
];

const COMPETENCIAS_POR_PUESTO = {
  'Ejecutivo de ventas': [
    { nombre: 'Persuasión',             pregunta: 'Logro persuadir a clientes potenciales de manera efectiva y profesional.' },
    { nombre: 'Seguimiento comercial',  pregunta: 'Realizo seguimiento oportuno y constante a prospectos y clientes en cartera.' },
    { nombre: 'Cierre de ventas',       pregunta: 'Concluyo negociaciones con resultados concretos y en el tiempo esperado.' },
    { nombre: 'Manejo de objeciones',   pregunta: 'Respondo apropiadamente a las objeciones y dudas de los clientes.' },
    { nombre: 'Velocidad de respuesta', pregunta: 'Atiendo consultas y solicitudes comerciales de forma rápida y efectiva.' },
    { nombre: 'Registro en CRM',        pregunta: 'Registro correctamente la información de clientes y gestiones en el CRM.' },
  ],
  'Coordinador académico': [
    { nombre: 'Coordinación académica',       pregunta: 'Coordino efectivamente los procesos académicos a mi cargo.' },
    { nombre: 'Comunicación con docentes',    pregunta: 'Mantengo comunicación fluida y oportuna con los docentes.' },
    { nombre: 'Gestión de cronogramas',       pregunta: 'Administro y cumplo los cronogramas académicos establecidos.' },
    { nombre: 'Control de asistencias',       pregunta: 'Registro y controlo correctamente la asistencia de participantes y docentes.' },
    { nombre: 'Seguimiento de participantes', pregunta: 'Hago seguimiento activo al avance y situación de los participantes.' },
    { nombre: 'Validación de documentación',  pregunta: 'Verifico y valido correctamente la documentación académica requerida.' },
  ],
  'Cajera': [
    { nombre: 'Manejo de caja',             pregunta: 'Realizo el manejo de caja con exactitud y sin descuadres.' },
    { nombre: 'Atención al cliente cajera', pregunta: 'Atiendo a los clientes con amabilidad y eficiencia en caja.' },
    { nombre: 'Exactitud en pagos',         pregunta: 'Proceso pagos y vueltos con total exactitud.' },
    { nombre: 'Organización de documentos', pregunta: 'Mantengo ordenados y correctamente archivados los documentos de caja.' },
    { nombre: 'Resolución de incidencias',  pregunta: 'Resuelvo incidencias en caja de manera rápida y apropiada.' },
    { nombre: 'Confidencialidad',           pregunta: 'Mantengo la confidencialidad de la información financiera y de clientes.' },
  ],
  'Gerente': [
    { nombre: 'Liderazgo estratégico',  pregunta: 'Ejerzo liderazgo con visión estratégica y orientación a resultados.' },
    { nombre: 'Decisiones gerenciales', pregunta: 'Tomo decisiones oportunas con criterio y responsabilidad institucional.' },
    { nombre: 'Gestión financiera',     pregunta: 'Administro y controlo los recursos financieros con eficiencia.' },
    { nombre: 'Gestión de equipos',     pregunta: 'Dirijo y desarrollo a los equipos bajo mi cargo efectivamente.' },
    { nombre: 'Visión de crecimiento',  pregunta: 'Identifico oportunidades de crecimiento y las traduzco en acciones concretas.' },
    { nombre: 'Control de indicadores', pregunta: 'Monitoreo y gestiono los indicadores clave de mi área de forma sistemática.' },
  ],
  // ⭐ Recursos Humanos
  'Recursos Humanos': [
    { nombre: 'Gestión de personal',         pregunta: 'Gestiono correctamente los procesos de personal a mi cargo.' },
    { nombre: 'Reclutamiento y selección',   pregunta: 'Ejecuto procesos de reclutamiento con criterio y eficiencia.' },
    { nombre: 'Administración de planillas', pregunta: 'Proceso pagos, beneficios y planillas sin errores ni retrasos.' },
    { nombre: 'Gestión del clima laboral',   pregunta: 'Identifico y atiendo situaciones que afectan el clima del equipo.' },
    { nombre: 'Cumplimiento normativo RRHH', pregunta: 'Aplico correctamente la normativa laboral vigente.' },
    { nombre: 'Gestión de evaluaciones',     pregunta: 'Coordino y ejecuto procesos de evaluación de desempeño oportunamente.' },
  ],
};

const FALLBACK_TECNICAS = [
  { nombre: 'Responsabilidad técnica', pregunta: 'Asumo con responsabilidad las tareas técnicas propias de mi puesto.' },
  { nombre: 'Cumplimiento de plazos',  pregunta: 'Entrego mis productos o tareas dentro de los plazos establecidos.' },
  { nombre: 'Calidad de trabajo',      pregunta: 'El resultado de mi trabajo cumple con los estándares de calidad esperados.' },
  { nombre: 'Colaboración de equipo',  pregunta: 'Colaboro activamente con mi equipo para alcanzar los objetivos comunes.' },
  { nombre: 'Comunicación efectiva',   pregunta: 'Me comunico de forma clara y oportuna con mis compañeros y superiores.' },
  { nombre: 'Iniciativa',              pregunta: 'Propongo mejoras o tomo acción sin esperar instrucciones en situaciones claras.' },
];

function getCompetenciasPorPuesto(cargo) {
  return COMPETENCIAS_POR_PUESTO[cargo] || FALLBACK_TECNICAS;
}

function getNombresNecesarios(cargo) {
  return [
    ...GENERALES.map(c => c.nombre),
    ...BIENESTAR.map(c => c.nombre),
    ...AUDITORIA.map(c => c.nombre),
    ...LIDERAZGO.map(c => c.nombre),
    'Comentario Final de Mejora',
    ...getCompetenciasPorPuesto(cargo).map(c => c.nombre),
  ];
}

// ─── OBTENER MAPA DE COMPETENCIAS (solo lectura) ────────────────────────
async function obtenerMapaCompetencias(todosLosNombres) {
  const { data, error } = await supabase
    .from('competencias')
    .select('id, nombre')
    .in('nombre', todosLosNombres);
  if (error) throw new Error('Error al consultar competencias: ' + error.message);
  const mapa = {};
  (data || []).forEach(c => { mapa[c.nombre] = c.id; });
  return mapa;
}

// ─── PUNTUACIÓN ─────────────────────────────────────────────────────────
const PUNTAJES = [
  { value: '',    label: 'Seleccione',       color: 'text-gray-400' },
  { value: 'NA',  label: 'N/A',             color: 'text-gray-500' },
  { value: '20',  label: '20 — Crítico',    color: 'text-red-600' },
  { value: '40',  label: '40 — Bajo',       color: 'text-orange-500' },
  { value: '60',  label: '60 — Aceptable',  color: 'text-amber-600' },
  { value: '80',  label: '80 — Bueno',      color: 'text-emerald-600' },
  { value: '100', label: '100 — Excelente', color: 'text-blue-600' },
];

// ─── COMPONENTE BLOQUE ─────────────────────────────────────────────────
const Bloque = memo(({ titulo, items, onSelectChange, comentarioRef, icono, colorClase }) => {
  const [puntajesLocales, setPuntajesLocales] = useState({});

  const handleSelectLocal = (competencia, value) => {
    setPuntajesLocales(prev => ({ ...prev, [competencia]: value }));
    onSelectChange(competencia, value);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`p-2 rounded-xl ${colorClase}`}>{icono}</div>
        <h3 className="text-base font-black text-[#0B1527] uppercase tracking-wide">{titulo}</h3>
      </div>
      <div className="space-y-3">
        {items.map(item => {
          const puntajeSeleccionado = PUNTAJES.find(p => p.value === (puntajesLocales[item.nombre] || ''));
          return (
            <div
              key={item.nombre}
              className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors"
            >
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-0.5">{item.nombre}</p>
              <p className="text-sm text-gray-800 font-semibold mb-3">{item.pregunta}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-44">
                  <select
                    value={puntajesLocales[item.nombre] || ''}
                    onChange={(e) => handleSelectLocal(item.nombre, e.target.value)}
                    className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-white outline-none transition-all appearance-none cursor-pointer
                      ${puntajeSeleccionado?.value && puntajeSeleccionado.value !== '' && puntajeSeleccionado.value !== 'NA'
                        ? 'border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15'}`}
                  >
                    {PUNTAJES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {puntajeSeleccionado?.value && puntajeSeleccionado.value !== '' && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black ${puntajeSeleccionado.color}`}>
                      {puntajeSeleccionado.value === 'NA' ? 'N/A' : puntajeSeleccionado.value}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  defaultValue=""
                  data-competencia={item.nombre}
                  placeholder="Observación (opcional)"
                  className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-xs bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
          ¿Qué necesita para mejorar esta dimensión?
        </label>
        <textarea
          ref={comentarioRef}
          rows={2}
          className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all resize-y"
          placeholder="Herramientas, capacitación, claridad de funciones, coordinación, etc."
        />
      </div>
    </div>
  );
});

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────
export default function FormularioAutoevaluacion() {
  const { token } = useParams();
  const [datos, setDatos] = useState(null);
  const [persona, setPersona] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [respuestasSelect, setRespuestasSelect] = useState({});
  const [mapaIdsCache, setMapaIdsCache] = useState(null);

  const refComentarioGeneral   = useRef(null);
  const refComentarioBienestar = useRef(null);
  const refComentarioAuditoria = useRef(null);
  const refComentarioTecnico   = useRef(null);
  const refComentarioLiderazgo = useRef(null);
  const refComentarioFinal     = useRef(null);

  useEffect(() => {
    const verificarToken = async () => {
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('evaluacion_tokens')
          .select('*')
          .eq('token', token)
          .single();

        if (tokenError || !tokenData) throw new Error('Token inválido o expirado');
        if (tokenData.usado) throw new Error('Este enlace ya fue utilizado');

        let personaData = null;
        if (tokenData.tipo_persona === 'complementario') {
          const { data: loc } = await supabase
            .from('locadores')
            .select('*')
            .eq('id', tokenData.locador_id || tokenData.persona_id)
            .single();
          personaData = loc;
        } else {
          const { data: emp } = await supabase
            .from('empleados')
            .select('*')
            .eq('id', tokenData.empleado_id || tokenData.persona_id)
            .single();
          personaData = emp;
        }

        if (!personaData) throw new Error('No se encontraron los datos del colaborador');

        setDatos(tokenData);
        setPersona(personaData);

        const cargo = personaData.cargo || personaData.modalidad || 'General';
        const nombres = getNombresNecesarios(cargo);

        // Cargar y cachear mapa de IDs (solo lectura)
        const mapa = await obtenerMapaCompetencias(nombres);
        setMapaIdsCache(mapa);

        // Advertir en consola si hay competencias faltantes (seed SQL no ejecutado)
        const faltantes = nombres.filter(n => !mapa[n]);
        if (faltantes.length > 0) {
          console.warn('[RRHH] Competencias no encontradas en BD (ejecutar seed_competencias.sql):', faltantes);
        }

        // Inicializar estado vacío de respuestas
        const inicial = {};
        [
          ...GENERALES,
          ...BIENESTAR,
          ...AUDITORIA,
          ...LIDERAZGO,
          ...getCompetenciasPorPuesto(cargo),
        ].forEach(c => { inicial[c.nombre] = ''; });
        setRespuestasSelect(inicial);

      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };
    verificarToken();
  }, [token]);

  const handleSelectChange = useCallback((competencia, value) => {
    setRespuestasSelect(prev => ({ ...prev, [competencia]: value }));
  }, []);

  /**
   * Intenta crear una competencia faltante en la base de datos.
   * Retorna el ID si tiene éxito, o null si falla.
   */
  const crearCompetenciaSiNoExiste = async (nombre) => {
    try {
      const { data, error } = await supabase
        .from('competencias')
        .insert({ nombre, tipo: 'general' })
        .select('id')
        .single();
      if (error) {
        console.warn(`No se pudo crear la competencia "${nombre}":`, error.message);
        return null;
      }
      return data?.id || null;
    } catch (err) {
      console.warn(`Error al crear competencia "${nombre}":`, err.message);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!datos || !persona) return;
    setGuardando(true);

    try {
      const cargo = persona.cargo || persona.modalidad || 'General';
      const nombres = getNombresNecesarios(cargo);

      // Obtener mapa actual de competencias
      let mapaIds = mapaIdsCache ?? await obtenerMapaCompetencias(nombres);

      // Recolectar observaciones de inputs no controlados
      const observaciones = {};
      document.querySelectorAll('input[data-competencia]').forEach(input => {
        const comp = input.getAttribute('data-competencia');
        if (comp) observaciones[comp] = input.value.trim() || null;
      });

      const inserts = [];
      const nombresFaltantes = [];
      const faltantesNoCreados = [];

      for (const [nombre, puntaje] of Object.entries(respuestasSelect)) {
        if (puntaje === '' || puntaje === 'NA') continue;
        const puntajeNum = Number(puntaje);
        if (isNaN(puntajeNum)) continue;

        let competenciaId = mapaIds[nombre];

        // Si no tiene ID, intentar crearla
        if (!competenciaId) {
          const nuevoId = await crearCompetenciaSiNoExiste(nombre);
          if (nuevoId) {
            competenciaId = nuevoId;
            mapaIds[nombre] = nuevoId; // actualizar mapa local
          } else {
            // No se pudo crear, registrar como faltante definitivo
            faltantesNoCreados.push(nombre);
            continue;
          }
        }

        inserts.push({
          empleado_id:    persona.id,
          competencia_id: competenciaId,
          periodo:        datos.periodo,
          puntaje:        puntajeNum,
          observacion:    observaciones[nombre] || null,
        });
      }

      // Comentario final
      const textoFinal = refComentarioFinal.current?.value?.trim();
      if (textoFinal) {
        let idFinal = mapaIds['Comentario Final de Mejora'];
        if (!idFinal) {
          const nuevoId = await crearCompetenciaSiNoExiste('Comentario Final de Mejora');
          if (nuevoId) idFinal = nuevoId;
        }
        if (idFinal) {
          inserts.push({
            empleado_id:    persona.id,
            competencia_id: idFinal,
            periodo:        datos.periodo,
            puntaje:        0,
            observacion:    textoFinal,
          });
        }
      }

      // Verificar faltantes que no se pudieron crear
      if (faltantesNoCreados.length > 0) {
        alert(
          `Error de configuración: las siguientes competencias no existen en la base de datos y no se pudieron crear automáticamente:\n\n` +
          `${faltantesNoCreados.join(', ')}\n\n` +
          `Solución para el administrador: ejecutar el siguiente script en Supabase > SQL Editor:\n\n` +
          `INSERT INTO competencias (nombre, tipo) VALUES\n` +
          faltantesNoCreados.map(n => `  ('${n}', 'tecnica')`).join(',\n') +
          `\nON CONFLICT (nombre) DO NOTHING;`
        );
        setGuardando(false);
        return;
      }

      if (inserts.length === 0) {
        alert('No ha seleccionado ningún puntaje. Complete al menos una competencia antes de enviar.');
        setGuardando(false);
        return;
      }

      // Guardar evaluaciones en BD
      const { error: insertError } = await supabase
        .from('colaborador_competencias')
        .upsert(inserts, { onConflict: 'empleado_id,competencia_id,periodo' });

      if (insertError) throw insertError;

      // Marcar token como usado
      await supabase
        .from('evaluacion_tokens')
        .update({ usado: true })
        .eq('token', token);

      setEnviado(true);

    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ─── ESTADOS DE PANTALLA ───────────────────────────────────────────
  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="text-center">
        <Loader2 className="animate-spin text-[#185FA5] mx-auto mb-4" size={32} />
        <p className="text-gray-500 font-medium">Verificando enlace...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-white p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-red-100 p-8 max-w-md text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Enlace inválido</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-blue-50 p-8 max-w-md text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Autoevaluación completada</h2>
        <p className="text-gray-500">Sus respuestas han sido registradas exitosamente. Gracias por su participación.</p>
      </div>
    </div>
  );

  const cargo    = persona?.cargo || persona?.modalidad || 'General';
  const tecnicas = getCompetenciasPorPuesto(cargo);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-blue-100/20 p-6 md:p-10 border border-blue-50">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
            <ClipboardList className="w-5 h-5 text-[#185FA5]" />
          </div>
          <h1 className="text-2xl font-black text-[#0B1527] tracking-tight">
            Evaluación Mensual de Desempeño, Funciones y Bienestar Laboral
          </h1>
        </div>
        <p className="text-sm text-gray-500 mb-1 ml-11">
          Este formulario permitirá conocer su nivel de cumplimiento de funciones, competencias, necesidades de apoyo y oportunidades de mejora.
        </p>
        <p className="text-sm text-gray-400 mb-6 ml-11">
          Responda con sinceridad y criterio profesional. Sus respuestas serán revisadas por las áreas autorizadas.
        </p>

        {/* Datos del colaborador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 p-4 bg-gradient-to-r from-blue-50/80 to-white rounded-2xl border border-blue-100">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider w-24">Colaborador:</span>
            <span className="font-semibold text-gray-800">{persona?.apellido} {persona?.nombre}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider w-24">Puesto:</span>
            <span className="font-semibold text-gray-800">{cargo}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider w-24">Periodo:</span>
            <span className="font-semibold text-gray-800">{datos?.periodo}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider w-24">Tipo:</span>
            <span className="font-semibold text-gray-800">Autoevaluación</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <Bloque
            titulo="Competencias Generales"
            items={GENERALES}
            onSelectChange={handleSelectChange}
            comentarioRef={refComentarioGeneral}
            icono={<Star size={16} className="text-amber-600" />}
            colorClase="bg-amber-50"
          />
          <Bloque
            titulo="Bienestar Laboral y Adaptación al Puesto"
            items={BIENESTAR}
            onSelectChange={handleSelectChange}
            comentarioRef={refComentarioBienestar}
            icono={<Heart size={16} className="text-rose-500" />}
            colorClase="bg-rose-50"
          />
          <Bloque
            titulo={`Competencias Técnicas del Puesto (${cargo})`}
            items={tecnicas}
            onSelectChange={handleSelectChange}
            comentarioRef={refComentarioTecnico}
            icono={<Briefcase size={16} className="text-blue-600" />}
            colorClase="bg-blue-50"
          />
          <Bloque
            titulo="Auditoría Funcional Mensual"
            items={AUDITORIA}
            onSelectChange={handleSelectChange}
            comentarioRef={refComentarioAuditoria}
            icono={<Shield size={16} className="text-purple-600" />}
            colorClase="bg-purple-50"
          />
          <Bloque
            titulo="Potencial de Liderazgo"
            items={LIDERAZGO}
            onSelectChange={handleSelectChange}
            comentarioRef={refComentarioLiderazgo}
            icono={<TrendingUp size={16} className="text-emerald-600" />}
            colorClase="bg-emerald-50"
          />

          {/* Comentario final */}
          <div className="bg-amber-50/80 p-6 rounded-2xl border border-amber-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <ClipboardList size={16} className="text-amber-700" />
              </div>
              <label className="text-sm font-black text-gray-800 uppercase tracking-wide">
                Comentario final obligatorio
              </label>
            </div>
            <p className="text-xs text-gray-500 mb-3 ml-11">
              ¿Qué considera que le ayudaría a lograr sus objetivos y mejorar su desempeño en los próximos 30 días?
            </p>
            <textarea
              ref={refComentarioFinal}
              rows={3}
              className="w-full border-2 border-amber-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/15 transition-all resize-y"
              placeholder="Indique recursos, capacitación, herramientas, coordinación, claridad de funciones o cualquier apoyo que necesite."
            />
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-gradient-to-r from-[#11284e] to-[#185FA5] hover:from-[#185FA5] hover:to-[#1a6ab8] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {guardando ? (
              <><Loader2 className="animate-spin" size={18} /> Enviando...</>
            ) : (
              <><Send size={18} /> Enviar Autoevaluación</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}