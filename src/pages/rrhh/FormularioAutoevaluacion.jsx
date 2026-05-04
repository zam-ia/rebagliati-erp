// src/pages/rrhh/FormularioAutoevaluacion.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const COMPETENCIAS_GENERALES_NOMBRES = [
  'Responsabilidad', 'Comunicación', 'Trabajo en equipo', 'Adaptabilidad',
  'Inteligencia emocional', 'Proactividad', 'Organización', 'Cumplimiento de normas'
];

const COMPETENCIAS_POR_PUESTO = {
  'Ejecutivo de ventas': ['Persuasión', 'Seguimiento comercial', 'Cierre de ventas', 'Manejo de objeciones', 'Velocidad de respuesta', 'Registro en CRM'],
  'Coordinador académico': ['Coordinación académica', 'Comunicación con docentes', 'Gestión de cronogramas', 'Control de asistencias', 'Seguimiento de participantes', 'Validación de documentación'],
  'Cajera': ['Manejo de caja', 'Atención al cliente', 'Exactitud en pagos', 'Organización de documentos', 'Resolución de incidencias', 'Confidencialidad'],
  'Gerente': ['Liderazgo estratégico', 'Toma de decisiones', 'Gestión financiera', 'Gestión de equipos', 'Visión de crecimiento', 'Control de indicadores'],
};

function getCompetenciasPorPuesto(cargo) {
  return COMPETENCIAS_POR_PUESTO[cargo] || [
    'Responsabilidad técnica', 'Cumplimiento de plazos', 'Calidad de trabajo',
    'Trabajo en equipo', 'Comunicación', 'Iniciativa'
  ];
}

export default function FormularioAutoevaluacion() {
  const { token } = useParams();
  const [datos, setDatos] = useState(null);
  const [persona, setPersona] = useState(null);
  const [puntajes, setPuntajes] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verificarToken = async () => {
      try {
        // 1. Obtener token
        const { data: tokenData, error: tokenError } = await supabase
          .from('evaluacion_tokens')
          .select('*')
          .eq('token', token)
          .single();

        if (tokenError || !tokenData) throw new Error('Token inválido o expirado');
        if (tokenData.usado) throw new Error('Este enlace ya fue utilizado');

        // 2. Obtener la persona asociada según tipo
        let personaData = null;
        if (tokenData.tipo_persona === 'complementario') {
          const { data: loc } = await supabase
            .from('locadores')
            .select('*')
            .eq('id', tokenData.locador_id || tokenData.persona_id)
            .single();
          personaData = loc;
        } else {
          // planilla
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

        // Inicializar puntajes
        const inicial = {};
        COMPETENCIAS_GENERALES_NOMBRES.forEach(nombre => { inicial[nombre] = ''; });
        const especificas = getCompetenciasPorPuesto(personaData.cargo || personaData.modalidad || 'General');
        especificas.forEach(nombre => { inicial[nombre] = ''; });
        setPuntajes(inicial);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };
    verificarToken();
  }, [token]);

  const handleChange = (competencia, value) => {
    setPuntajes(prev => ({ ...prev, [competencia]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!datos || !persona) return;
    setCargando(true);
    try {
      const { data: competenciasData } = await supabase.from('competencias').select('id, nombre');
      const mapaIds = {};
      competenciasData?.forEach(c => { mapaIds[c.nombre] = c.id; });

      const personaId = persona.id;
      const inserts = Object.entries(puntajes)
        .filter(([_, val]) => val !== '' && !isNaN(val))
        .map(([nombre, val]) => ({
          empleado_id: personaId,
          competencia_id: mapaIds[nombre],
          periodo: datos.periodo,
          puntaje: Number(val),
          observacion: 'Autoevaluación'
        }))
        .filter(item => item.competencia_id);

      if (inserts.length === 0) {
        alert('Debe completar al menos una competencia');
        return;
      }

      const { error: insertError } = await supabase
        .from('colaborador_competencias')
        .upsert(inserts, { onConflict: 'empleado_id,competencia_id,periodo' });
      if (insertError) throw insertError;

      await supabase.from('evaluacion_tokens').update({ usado: true }).eq('token', token);

      setEnviado(true);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-slate-500">Verificando enlace...</div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-rose-600 mb-4">❌ Error</h2>
        <p className="text-slate-600">{error}</p>
      </div>
    </div>
  );
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-emerald-600 mb-4">✅ ¡Autoevaluación completada!</h2>
        <p className="text-slate-600">Tus respuestas han sido registradas exitosamente. Gracias por tu participación.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-[#11284e] mb-2">Autoevaluación de Competencias</h1>
        <p className="text-slate-500 mb-6">
          {persona?.apellido} {persona?.nombre} — {persona?.cargo || persona?.modalidad || 'General'} | Periodo: {datos?.periodo}
        </p>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-slate-700 mb-3">Competencias Generales</h3>
            <div className="space-y-4">
              {COMPETENCIAS_GENERALES_NOMBRES.map(nombre => (
                <div key={nombre} className="flex items-center gap-4">
                  <label className="w-48 text-sm text-slate-600">{nombre}</label>
                  <select
                    value={puntajes[nombre] || ''}
                    onChange={(e) => handleChange(nombre, e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Seleccione...</option>
                    {[1,2,3,4,5].map(n => (
                      <option key={n} value={n*20}>
                        {n*20} — {n === 1 ? 'Muy bajo' : n === 2 ? 'Bajo' : n === 3 ? 'Regular' : n === 4 ? 'Bueno' : 'Excelente'}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-700 mb-3">
              Competencias del Puesto ({persona?.cargo || persona?.modalidad || 'General'})
            </h3>
            <div className="space-y-4">
              {getCompetenciasPorPuesto(persona?.cargo || persona?.modalidad).map(nombre => (
                <div key={nombre} className="flex items-center gap-4">
                  <label className="w-48 text-sm text-slate-600">{nombre}</label>
                  <select
                    value={puntajes[nombre] || ''}
                    onChange={(e) => handleChange(nombre, e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Seleccione...</option>
                    {[1,2,3,4,5].map(n => (
                      <option key={n} value={n*20}>
                        {n*20} — {n === 1 ? 'Muy bajo' : n === 2 ? 'Bajo' : n === 3 ? 'Regular' : n === 4 ? 'Bueno' : 'Excelente'}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#11284e] text-white py-3 rounded-xl font-bold hover:bg-[#0c1d38] transition-colors disabled:opacity-50"
          >
            {cargando ? 'Enviando...' : 'Enviar Autoevaluación'}
          </button>
        </form>
      </div>
    </div>
  );
}