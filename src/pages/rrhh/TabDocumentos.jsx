import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import html2pdf from 'html2pdf.js';
import {
  FileText, Upload, Download, Printer, Eye, Plus, Trash2,
  Edit, X, User, Briefcase
} from 'lucide-react';

// --------------------------------------------------------------
// PLANTILLAS PREDEFINIDAS (según los documentos reales)
// --------------------------------------------------------------
const PLANTILLAS_PREDEFINIDAS = [
  {
    nombre: 'Contrato indeterminado (planilla)',
    descripcion: 'Contrato individual de trabajo a plazo indeterminado - personal de planilla',
    tipo: 'contrato',
    contenido_html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body { font-family: 'Times New Roman', serif; margin: 2cm; line-height: 1.4; } h2 { text-align: center; } .underline { text-decoration: underline; }</style></head>
<body>
<h2 style="text-align:center;">CONTRATO INDIVIDUAL DE TRABAJO A PLAZO INDETERMINADO</h2>
<p>Conste por el presente documento privado el Contrato Individual de Trabajo a Plazo Indeterminado (en adelante, <strong>EL CONTRATO</strong>), que celebran de una parte <strong>CONSORCIO REBAGLIATI DIPLOMADOS S.A.C.</strong>, con RUC N.º 20601225175, con domicilio en Av. 28 de Julio N.º 1004, Cercado de Lima, debidamente representada por el Sr. <strong>Eddy Roger Flores Adriano</strong>, identificado con DNI Nº10180203, facultado mediante poder inscrito en la partida N° 13615585 de la Oficina Registral de Lima-SUNARP, a quien en adelante se le denominará <strong>EL EMPLEADOR</strong>; y de la otra parte, <strong>{{APELLIDOS_Y_NOMBRES}}</strong>, {{IDENTIFICADOA}} con DNI N.º <strong>{{DOC_IDEN}}</strong>, con domicilio en <strong>{{DIRECCION}}</strong>, distrito de <strong>{{DISTRITO}}</strong>, a quien en adelante se le denominará <strong>{{GENERO}}</strong>; en los términos y condiciones siguientes:</p>
<h3>PRIMERO: OBJETO DEL CONTRATO</h3>
<p>Por el presente contrato, <strong>EL EMPLEADOR</strong> contrata a <strong>{{GENERO}}</strong> para que preste servicios personales, subordinados y remunerados, a plazo indeterminado, en el puesto de <strong>{{Cargo}}</strong> conforme a lo dispuesto en el artículo 4 del Texto Único Ordenado del Decreto Legislativo N.º 728.</p>
<h3>SEGUNDO: FUNCIONES DEL PUESTO</h3>
<p><strong>{{GENERO}}</strong> desempeñará el cargo de <strong>{{Cargo}}</strong>, teniendo entre sus principales funciones las siguientes:</p>
<p>{{FUNCIONES}}</p>
<h3>TERCERO: SUBORDINACIÓN Y CARÁCTER PERSONAL</h3>
<p>La prestación de servicios se realiza de manera personal y bajo subordinación, debiendo <strong>{{GENERO}}</strong> cumplir las directivas impartidas por <strong>EL EMPLEADOR</strong> o su representante.</p>
<h3>CUARTO: JORNADA Y HORARIO DE TRABAJO</h3>
<p><strong>{{GENERO}}</strong> cumplirá una jornada ordinaria de trabajo de hasta ocho (8) horas diarias, cuarenta y ocho (48) horas semanales. <strong>EL EMPLEADOR</strong> podrá modificar razonablemente la jornada y horario según las necesidades del servicio.</p>
<h3>QUINTO: INICIO Y DURACIÓN DEL CONTRATO</h3>
<p>El presente contrato de trabajo es de duración indeterminada, iniciándose la relación laboral el día <strong>{{FECHA_DE_INICIO}}</strong> manteniéndose vigente mientras subsista la relación laboral entre las partes.</p>
<h3>SEXTO: REMUNERACIÓN</h3>
<p><strong>EL EMPLEADOR</strong> abonará a <strong>{{GENERO}}</strong> una remuneración mensual de S/ <strong>{{SUELDO}}</strong> (<strong>{{SUELDO_EN_LETRAS}}</strong>), sujeta a los descuentos de ley.</p>
<h3>SÉPTIMO: MODALIDAD DE PRESTACIÓN DEL SERVICIO (MODALIDAD MIXTA)</h3>
<p><strong>{{GENERO}}</strong> se encuentra debidamente incorporado en la planilla electrónica de <strong>EL EMPLEADOR</strong>. Las partes acuerdan una modalidad mixta, comprendiendo labores presenciales y, de manera excepcional, trabajo remoto o teletrabajo.</p>
<h3>OCTAVO: CONFIDENCIALIDAD</h3>
<p><strong>{{GENERO}}</strong> se obliga a guardar estricta confidencialidad respecto de toda información a la que tenga acceso, obligación que se mantiene vigente aun después de la extinción del vínculo laboral.</p>
<h3>NOVENO: RECOMENDACIONES DE SEGURIDAD Y SALUD EN EL TRABAJO</h3>
<p><strong>EL EMPLEADOR</strong> comunica los peligros y riesgos presentes en el centro de labores, y <strong>{{GENERO}}</strong> se compromete a acatar las medidas de seguridad establecidas.</p>
<h3>DÉCIMO: PROTECCIÓN DE DATOS PERSONALES</h3>
<p><strong>EL EMPLEADOR</strong> tratará los datos personales de <strong>{{GENERO}}</strong> conforme a la Ley N.° 29733.</p>
<h3>DÉCIMO PRIMERO: CLAUSULAS PENALES</h3>
<p>1. Por incumplimiento de confidencialidad, penalidad equivalente a tres (3) remuneraciones.<br>
2. Por abandono de trabajo sin aviso previo de 30 días, penalidad proporcional a los días no preavisados.<br>
3. Por daños a bienes ocasionados por dolo o culpa grave, pago del valor del daño acreditado.</p>
<h3>DÉCIMO SEGUNDO: DOMICILIOS Y JURISDICCIÓN</h3>
<p>Las partes señalan como domicilios los indicados. Será competente el juzgado laboral del lugar de prestación del servicio.</p>
<p>En señal de conformidad, se suscribe el contrato en la ciudad de Lima a los <strong>{{FECHA_DE_FIRMA_DE_CONTRATO}}</strong>.</p>
<hr>
<p style="text-align:center;">EDDY ROGER FLORES ADRIANO<br>GERENTE GENERAL<br>LA EMPRESA</p>
<p style="text-align:center;">{{APELLIDOS_Y_NOMBRES}}<br>DNI: {{DOC_IDEN}}<br>EL TRABAJADOR</p>
</body>
</html>`
  },
  {
    nombre: 'Contrato de confianza (planilla)',
    descripcion: 'Contrato a plazo indeterminado con cláusula de cargo de confianza',
    tipo: 'contrato',
    contenido_html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body { font-family: 'Times New Roman', serif; margin: 2cm; }</style></head>
<body>
<h2 style="text-align:center;">CONTRATO INDIVIDUAL DE TRABAJO A PLAZO INDETERMINADO (CARGO DE CONFIANZA)</h2>
<p>Conste por el presente documento ... (similar al anterior pero incluyendo la cláusula DÉCIMO CUARTO: CARGO DE CONFIANZA)</p>
<p><strong>DÉCIMO CUARTO: CARGO DE CONFIANZA</strong><br>El EMPLEADOR contrata para cargo de confianza los servicios de {{GENERO}} quien desempeñará el cargo de {{Cargo}}, cumpliendo labores de contacto directo con el empleador, guardar reserva de secretos industriales y emitir informes.</p>
<p>...</p>
</body>
</html>`
  },
  {
    nombre: 'Contrato de locación de servicios (locador)',
    descripcion: 'Para locadores externos (personas naturales)',
    tipo: 'contrato',
    contenido_html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body { font-family: 'Times New Roman', serif; margin: 2cm; }</style></head>
<body>
<h2 style="text-align:center;">CONTRATO POR LOCACIÓN DE SERVICIOS PERSONALES</h2>
<p>Conste por el presente documento, el contrato de locación de servicios que celebran de una parte <strong>CONSORCIO REBAGLIATI DIPLOMADOS SAC</strong>, con RUC N° 20601225175, con domicilio en Av. 28 de Julio N° 1004 Cercado de Lima, representado por el Sr. Eddy Roger Flores Adriano (en adelante <strong>LA EMPRESA</strong>); y de la otra parte <strong>{{NOMBRE_Y_APELLIDO}}</strong>, {{IDENTIFICADO_A}} con D.N.I Nº <strong>{{DNI}}</strong>, con domicilio en <strong>{{DIRECCION}}</strong>-<strong>{{DISTRITO}}</strong> (en adelante <strong>{{CONDICION}}</strong>).</p>
<h3>PRIMERO: ANTECEDENTES</h3>
<p>LA EMPRESA requiere cubrir necesidades de recursos humanos.</p>
<h3>SEGUNDO: CONDICIÓN DE LOCADOR</h3>
<p>{{CONDICION}} es persona natural que reúne los requisitos exigidos.</p>
<h3>TERCERO: DURACIÓN DEL CONTRATO</h3>
<p>El contrato regirá a partir del <strong>{{INICIO_DE_CONT}}</strong> hasta el <strong>{{FIN_DE_CONT}}</strong>.</p>
<h3>CUARTO: OBJETO</h3>
<p>LA EMPRESA requiere el servicio independiente de {{CONDICION}} a título de Locación de Servicios Personales.</p>
<h3>QUINTO: LUGAR Y HORARIO</h3>
<p>El servicio será prestado por {{CONDICION}} para realizar actividades de apoyo en el área de <strong>{{AREA}}</strong>.</p>
<h3>SEXTO: HONORARIOS</h3>
<p>LA EMPRESA abonará la cantidad de S/ <strong>{{PAGO}}</strong> (<strong>{{PAGO_EN_LETRAS}}</strong>) mensuales, previa presentación de recibo por honorarios e informe.</p>
<h3>DÉCIMO SEXTO: CONFIDENCIALIDAD</h3>
<p>Las partes guardarán confidencialidad de toda información, obligación que se extiende por 2 años después de terminado el contrato.</p>
<p>Se suscribe en Lima el <strong>{{INICIO_DE_CONT}}</strong>.</p>
<hr>
<p style="text-align:center;">Eddy Flores Adriano<br>GERENTE GENERAL</p>
<p style="text-align:center;">{{NOMBRE_Y_APELLIDO}}<br>DNI: {{DNI}}<br>{{CONDICION}}</p>
</body>
</html>`
  },
  {
    nombre: 'Comodato de equipos tecnológicos',
    descripcion: 'Cesión de laptop, celular, etc.',
    tipo: 'otros',
    contenido_html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body { font-family: 'Times New Roman', serif; margin: 2cm; }</style></head>
<body>
<h2 style="text-align:center;">CONTRATO DE COMODATO DE EQUIPOS TECNOLÓGICOS</h2>
<p>Conste por el presente acto jurídico un Contrato de Comodato que celebran de una parte el <strong>{{SRSRA}}</strong> <strong>{{APELLIDOS_Y_NOMBRES}}</strong> D.N.I. Nº <strong>{{DOC_IDEN}}</strong> con domicilio en <strong>{{DIRECCION}}</strong> (en adelante <strong>EL COMODANTE</strong>); y de otra parte la empresa <strong>CONSORCIO REBAGLIATI DIPLOMADOS S.A.C</strong> con RUC Nº 20601225175, con domicilio en Av. 28 DE JULIO, representada por EDDY ROGER FLORES ADRIANO (en adelante <strong>LA COMODATARIA</strong>).</p>
<h3>CLÁUSULA PRIMERA: DE REFERENCIA DE LAS PARTES</h3>
<p>LA COMODATARIA se dedica a la capacitación en salud. EL COMODANTE es propietario de una laptop y un teléfono celular.</p>
<h3>CLÁUSULA SEGUNDA: OBJETO</h3>
<p>EL COMODANTE cede en comodato los equipos tecnológicos mencionados para uso exclusivo de LA COMODATARIA.</p>
<h3>CLÁUSULA TERCERA: DESTINO DEL BIEN</h3>
<p>Los equipos serán usados por el COMODANTE de manera exclusiva en beneficio de la empresa.</p>
<h3>CLÁUSULA CUARTA: PLAZO DEL COMODATO</h3>
<p>El comodato tendrá vigencia mientras exista vínculo laboral.</p>
<h3>CLÁUSULA OCTAVA: MEDIO DE PAGO</h3>
<p>Se acuerda retribuir el desgaste o depreciación con una suma mensual de <strong>{{VALOR_DEL_COMODTO}} soles</strong>.</p>
<p>Las partes firman en Lima el <strong>{{FECHA_DE_INICIO}}</strong>.</p>
<hr>
<p>EDDY ROGER FLORES ADRIANO<br>CONSORCIO REBAGLIATI DIPLOMADOS S.A.C<br>EL COMODATARIO</p>
<p>{{APELLIDOS_Y_NOMBRES}}<br>DNI: {{DOC_IDEN}}<br>COMODANTE</p>
</body>
</html>`
  },
  {
    nombre: 'Adenda de ampliación (plazo fijo)',
    descripcion: 'Prorroga de contrato por necesidad de mercado',
    tipo: 'anexo',
    contenido_html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>body { font-family: 'Times New Roman', serif; margin: 2cm; }</style></head>
<body>
<h2 style="text-align:center;">ADENDA N° 1 AL CONTRATO DE TRABAJO POR NECESIDAD DE MERCADO</h2>
<p>Conste por el presente documento, adenda N° 1 al contrato de trabajo por necesidad de mercado, que celebran de una parte la empresa CONSORCIO REBAGLIATI DIPLOMADOS S.A.C (EL EMPLEADOR) y de la otra parte <strong>{{APELLIDOS_Y_NOMBRES}}</strong>, DNI <strong>{{DOC_IDEN}}</strong> (EL TRABAJADOR).</p>
<h3>PRIMERA: ANTECEDENTES</h3>
<p>EL EMPLEADOR contrató a EL TRABAJADOR mediante contrato a plazo fijo de fecha <strong>{{FECHA_CONTRATO_ORIGINAL}}</strong>.</p>
<h3>SEGUNDA: PRÓRROGA</h3>
<p>Se acuerda prorrogar el contrato por un período adicional desde el <strong>{{FECHA_INICIO_PRORROGA}}</strong> hasta el <strong>{{FECHA_FIN_PRORROGA}}</strong>.</p>
<h3>TERCERA: REMUNERACIÓN</h3>
<p>La remuneración se mantiene en S/ <strong>{{SUELDO}}</strong> (<strong>{{SUELDO_EN_LETRAS}}</strong>).</p>
<p>Se suscribe en Lima el <strong>{{FECHA_FIRMA_ADENDA}}</strong>.</p>
<hr>
<p>EDDY ROGER FLORES ADRIANO<br>GERENTE GENERAL</p>
<p>{{APELLIDOS_Y_NOMBRES}}<br>DNI: {{DOC_IDEN}}<br>EL TRABAJADOR</p>
</body>
</html>`
  }
];

// Placeholders que se completan automáticamente con datos del trabajador/locador
const PLACEHOLDERS_AUTOMATICOS = new Set([
  'nombre', 'apellido', 'nombre_completo', 'dni', 'direccion', 'telefono', 'email',
  'sueldo', 'fecha_actual', 'APELLIDOS_Y_NOMBRES', 'NOMBRE_Y_APELLIDO',
  'DOC_IDEN', 'DIRECCION', 'DNI', 'GENERO', 'CONDICION', 'IDENTIFICADOA', 'IDENTIFICADO_A',
  'SRSRA', 'tipo_documento'
]);

// --------------------------------------------------------------
// COMPONENTE PRINCIPAL
// --------------------------------------------------------------
export default function TabDocumentos() {
  const [plantillas, setPlantillas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [documentosGenerados, setDocumentosGenerados] = useState([]);
  const [documentosSubidos, setDocumentosSubidos] = useState([]);
  const [pestana, setPestana] = useState('generar');
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);

  // Generación
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [tipoPersona, setTipoPersona] = useState('planilla');
  const [personaId, setPersonaId] = useState('');
  const [datosManuales, setDatosManuales] = useState({
    nombre: '', apellido: '', dni: '', direccion: '', telefono: '', email: '', genero: ''
  });
  const [camposExtra, setCamposExtra] = useState([]);
  const [vistaPreviaHtml, setVistaPreviaHtml] = useState('');

  // Subir documento
  const [subirDocModal, setSubirDocModal] = useState(false);
  const [nuevoDoc, setNuevoDoc] = useState({ tipo_persona: 'planilla', persona_id: '', nombre: '', archivo: null });
  const [subiendo, setSubiendo] = useState(false);

  // Admin plantillas
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [editandoPlantilla, setEditandoPlantilla] = useState(null);
  const [formPlantilla, setFormPlantilla] = useState({ nombre: '', descripcion: '', tipo: 'contrato', contenido_html: '' });

  // --------------------------------------------------------------
  // Carga inicial y creación automática de plantillas
  // --------------------------------------------------------------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUsuario(data.user);
      setEsAdmin(data.user?.email === 'admin@rebagliati.com');
    });
  }, []);

  const cargarPlantillas = async () => {
    const { data } = await supabase.from('plantillas_documentos').select('*').order('nombre');
    if (data && data.length === 0 && esAdmin) {
      // Insertar plantillas predefinidas si no existen
      for (const plantilla of PLANTILLAS_PREDEFINIDAS) {
        await supabase.from('plantillas_documentos').insert([plantilla]);
      }
      const { data: nuevas } = await supabase.from('plantillas_documentos').select('*').order('nombre');
      setPlantillas(nuevas || []);
    } else {
      setPlantillas(data || []);
    }
  };

  const cargarEmpleados = async () => {
    // Se agregó 'genero' al SELECT
    const { data } = await supabase.from('empleados').select('id, nombre, apellido, dni, direccion, telefono, correo, sueldo_bruto, genero').eq('estado', 'activo');
    setEmpleados(data || []);
  };

  const cargarLocadores = async () => {
    const { data } = await supabase.from('locadores').select('id, nombre, apellido, dni, direccion, telefono, correo, sueldo_base, genero').eq('estado', 'activo');
    setLocadores(data || []);
  };

  const cargarDocumentosGenerados = async () => {
    const { data } = await supabase.from('documentos_generados').select('*, plantillas_documentos(nombre)').order('fecha_generacion', { ascending: false });
    setDocumentosGenerados(data || []);
  };

  const cargarDocumentosSubidos = async () => {
    const { data } = await supabase.from('documentos_personales').select('*').order('fecha_subida', { ascending: false });
    setDocumentosSubidos(data || []);
  };

  const cargarDatos = async () => {
    setLoading(true);
    await Promise.all([
      cargarPlantillas(),
      cargarEmpleados(),
      cargarLocadores(),
      cargarDocumentosGenerados(),
      cargarDocumentosSubidos()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [esAdmin]);

  // --------------------------------------------------------------
  // Extraer placeholders de la plantilla seleccionada
  // --------------------------------------------------------------
  const extraerPlaceholders = (html) => {
    const regex = /{{(.*?)}}/g;
    const matches = [...html.matchAll(regex)];
    return [...new Set(matches.map(m => m[1].trim()))];
  };

  // Cuando cambia la plantilla, reconstruimos camposExtra basados en los placeholders
  useEffect(() => {
    if (!plantillaSeleccionada) {
      setCamposExtra([]);
      return;
    }
    const placeholders = extraerPlaceholders(plantillaSeleccionada.contenido_html);
    const nuevosCampos = placeholders
      .filter(p => !PLACEHOLDERS_AUTOMATICOS.has(p))
      .map(p => ({ clave: p, valor: '' }));
    setCamposExtra(nuevosCampos);
  }, [plantillaSeleccionada]);

  // Mapeo automático de placeholders con datos de persona
  const mapearDatosAutomaticos = (persona, generoForzado = null) => {
    const datos = {
      fecha_actual: new Date().toLocaleDateString('es-PE')
    };

    if (!persona) return datos;

    const nombreCompleto = `${persona.nombre} ${persona.apellido}`;
    const genero = generoForzado || persona.genero || 'M'; // Por defecto masculino si no existe

    datos.nombre = persona.nombre;
    datos.apellido = persona.apellido;
    datos.nombre_completo = nombreCompleto;
    datos.dni = persona.dni;
    datos.direccion = persona.direccion || '';
    datos.telefono = persona.telefono || '';
    datos.email = persona.email || persona.correo || '';
    datos.sueldo = persona.sueldo_bruto ?? persona.sueldo_base ?? 0;

    // Placeholders específicos de los contratos
    datos.APELLIDOS_Y_NOMBRES = nombreCompleto;
    datos.NOMBRE_Y_APELLIDO = nombreCompleto;
    datos.DOC_IDEN = persona.dni;
    datos.DIRECCION = persona.direccion || '';
    datos.DNI = persona.dni;
    datos.GENERO = genero === 'F' ? 'LA TRABAJADORA' : 'EL TRABAJADOR';
    datos.CONDICION = genero === 'F' ? 'LA LOCADORA' : 'EL LOCADOR';
    datos.IDENTIFICADOA = 'identificado(a) con DNI';
    datos.IDENTIFICADO_A = 'identificado(a) con DNI';
    datos.SRSRA = genero === 'F' ? 'Sra.' : 'Sr.';
    datos.tipo_documento = 'DNI';

    return datos;
  };

  // Generar vista previa
  const generarVistaPrevia = () => {
    if (!plantillaSeleccionada) {
      setVistaPreviaHtml('<p class="text-gray-400 italic text-center py-12">Selecciona una plantilla para previsualizar</p>');
      return;
    }

    let datos = {};

    if (tipoPersona === 'planilla' || tipoPersona === 'locador') {
      const persona = tipoPersona === 'planilla'
        ? empleados.find(e => e.id === personaId)
        : locadores.find(l => l.id === personaId);
      datos = mapearDatosAutomaticos(persona);
    } else if (tipoPersona === 'manual') {
      datos = mapearDatosAutomaticos(
        {
          nombre: datosManuales.nombre,
          apellido: datosManuales.apellido,
          dni: datosManuales.dni,
          direccion: datosManuales.direccion,
          telefono: datosManuales.telefono,
          correo: datosManuales.email,
          genero: datosManuales.genero,
          sueldo_bruto: 0
        },
        datosManuales.genero
      );
    }

    // Sobrescribir con campos extra
    camposExtra.forEach(campo => {
      if (campo.clave && campo.valor) datos[campo.clave] = campo.valor;
    });

    let html = plantillaSeleccionada.contenido_html;
    Object.keys(datos).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, datos[key] || '');
    });
    // Los placeholders sin reemplazo se muestran como [PENDIENTE]
    html = html.replace(/{{.*?}}/g, '[PENDIENTE]');

    setVistaPreviaHtml(html);
  };

  useEffect(() => {
    generarVistaPrevia();
  }, [plantillaSeleccionada, tipoPersona, personaId, datosManuales, camposExtra]);

  // --------------------------------------------------------------
  // Acciones de documento
  // --------------------------------------------------------------
  const generarPDF = () => {
    const element = document.getElementById('vista-previa-documento');
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `documento_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const imprimir = () => {
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html>
        <head><title>Imprimir documento</title>
        <style>body { margin: 2cm; font-family: 'Times New Roman', serif; }</style>
        </head>
        <body>${vistaPreviaHtml}</body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
  };

  const guardarDocumentoGenerado = async () => {
    if (!plantillaSeleccionada) return alert('Selecciona una plantilla');
    let persona_id = null;
    if (tipoPersona !== 'manual' && !personaId) return alert('Selecciona una persona');
    if (tipoPersona !== 'manual') persona_id = personaId;

    const datosUsados = { camposExtra: camposExtra.reduce((acc, c) => ({ ...acc, [c.clave]: c.valor }), {}) };
    const { error } = await supabase.from('documentos_generados').insert({
      plantilla_id: plantillaSeleccionada.id,
      tipo_persona: tipoPersona,
      persona_id,
      contenido_html_generado: vistaPreviaHtml,
      datos_usados: datosUsados,
      usuario_id: usuario?.id
    });
    if (error) alert('Error al guardar: ' + error.message);
    else {
      alert('Documento guardado en el historial');
      cargarDocumentosGenerados();
    }
  };

  // Subir documento manual
  const subirDocumento = async () => {
    if (!nuevoDoc.archivo || !nuevoDoc.nombre) return alert('Completa todos los campos');
    setSubiendo(true);
    const ext = nuevoDoc.archivo.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `documentos_personales/${nuevoDoc.tipo_persona}/${nuevoDoc.persona_id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('documentos-empleados').upload(filePath, nuevoDoc.archivo);
    if (uploadError) { alert('Error al subir: ' + uploadError.message); setSubiendo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('documentos-empleados').getPublicUrl(filePath);
    const { error: dbError } = await supabase.from('documentos_personales').insert({
      tipo_persona: nuevoDoc.tipo_persona,
      persona_id: nuevoDoc.persona_id,
      nombre_documento: nuevoDoc.nombre,
      archivo_url: publicUrl,
      usuario_subio_id: usuario?.id
    });
    if (dbError) alert('Error al guardar metadata: ' + dbError.message);
    else {
      alert('Documento subido');
      setSubirDocModal(false);
      cargarDocumentosSubidos();
    }
    setSubiendo(false);
  };

  // Admin plantillas
  const guardarPlantilla = async () => {
    if (!formPlantilla.nombre || !formPlantilla.contenido_html) return alert('Nombre y contenido son obligatorios');
    setLoading(true);
    let error;
    if (editandoPlantilla) {
      const result = await supabase.from('plantillas_documentos').update(formPlantilla).eq('id', editandoPlantilla.id);
      error = result.error;
    } else {
      const result = await supabase.from('plantillas_documentos').insert([formPlantilla]);
      error = result.error;
    }
    if (error) alert('Error: ' + error.message);
    else {
      alert(editandoPlantilla ? 'Plantilla actualizada' : 'Plantilla creada');
      setModalPlantilla(false);
      cargarPlantillas();
    }
    setLoading(false);
  };

  const eliminarPlantilla = async (id) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    const { error } = await supabase.from('plantillas_documentos').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargarPlantillas();
  };

  // --------------------------------------------------------------
  // RENDER VIP
  // --------------------------------------------------------------
  if (loading && plantillas.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="h-10 w-10 bg-blue-200 rounded-full"></div>
        <p className="text-gray-400 font-medium">Cargando documentos...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6 lg:p-8 space-y-8">
      {/* Pestañas premium */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-xl shadow-blue-100/20 border border-blue-50">
        <nav className="flex flex-wrap gap-1" role="tablist">
          {[
            { id: 'generar', icon: FileText, label: 'Generar' },
            { id: 'mis_docs', icon: Briefcase, label: 'Historial' },
            { id: 'subidos', icon: Upload, label: 'Subidos' },
            ...(esAdmin ? [{ id: 'admin_plantillas', icon: Edit, label: 'Admin plantillas' }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPestana(tab.id)}
              role="tab"
              aria-selected={pestana === tab.id}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                pestana === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Pestaña GENERAR */}
      {pestana === 'generar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel izquierdo: configuración */}
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/20 border border-blue-50 p-6 lg:p-8 space-y-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Configuración</h3>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Plantilla</label>
              <select
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-gray-700"
                value={plantillaSeleccionada?.id || ''}
                onChange={(e) => setPlantillaSeleccionada(plantillas.find(p => p.id === e.target.value))}
              >
                <option value="">Seleccionar plantilla...</option>
                {plantillas.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Destinatario</label>
              <div className="flex flex-wrap gap-4 bg-gray-50 p-3 rounded-xl">
                {['planilla', 'locador', 'manual'].map(tipo => (
                  <label key={tipo} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      value={tipo}
                      checked={tipoPersona === tipo}
                      onChange={() => setTipoPersona(tipo)}
                      className="w-5 h-5 text-blue-600 border-2 border-gray-300 focus:ring-blue-500 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 capitalize">
                      {tipo === 'planilla' ? 'Planilla' : tipo === 'locador' ? 'Locador' : 'Manual'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {tipoPersona !== 'manual' ? (
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Persona</label>
                <select
                  className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                  value={personaId}
                  onChange={(e) => setPersonaId(e.target.value)}
                >
                  <option value="">Seleccionar persona...</option>
                  {(tipoPersona === 'planilla' ? empleados : locadores).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido} - {p.dni}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Nombre" className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none transition" value={datosManuales.nombre} onChange={e => setDatosManuales({...datosManuales, nombre: e.target.value})} />
                  <input type="text" placeholder="Apellido" className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none transition" value={datosManuales.apellido} onChange={e => setDatosManuales({...datosManuales, apellido: e.target.value})} />
                </div>
                <input type="text" placeholder="DNI" className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none transition" value={datosManuales.dni} onChange={e => setDatosManuales({...datosManuales, dni: e.target.value})} />
                <input type="text" placeholder="Dirección" className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none transition" value={datosManuales.direccion} onChange={e => setDatosManuales({...datosManuales, direccion: e.target.value})} />
                <input type="text" placeholder="Teléfono" className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none transition" value={datosManuales.telefono} onChange={e => setDatosManuales({...datosManuales, telefono: e.target.value})} />
                <input type="email" placeholder="Email" className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none transition" value={datosManuales.email} onChange={e => setDatosManuales({...datosManuales, email: e.target.value})} />
                <select className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none" value={datosManuales.genero} onChange={e => setDatosManuales({...datosManuales, genero: e.target.value})}>
                  <option value="">Género (opcional)</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            )}

            {camposExtra.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Campos adicionales</label>
                <div className="space-y-2">
                  {camposExtra.map((campo, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute -top-2 left-3 px-1 bg-white text-xs text-gray-400">{campo.clave}</span>
                        <input
                          type="text"
                          className="w-full border-2 border-gray-100 p-2.5 rounded-xl bg-white focus:border-blue-500 outline-none transition pt-4"
                          placeholder={`Valor para ${campo.clave}`}
                          value={campo.valor}
                          onChange={e => {
                            const nuevos = [...camposExtra];
                            nuevos[idx].valor = e.target.value;
                            setCamposExtra(nuevos);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-4">
              <button onClick={guardarDocumentoGenerado} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105 transition-all flex items-center gap-2">
                <FileText size={18} /> Guardar
              </button>
              <button onClick={generarPDF} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105 transition-all flex items-center gap-2">
                <Download size={18} /> PDF
              </button>
              <button onClick={imprimir} className="bg-gray-700 text-white px-5 py-3 rounded-xl font-medium shadow-lg hover:bg-gray-800 hover:scale-105 transition-all flex items-center gap-2">
                <Printer size={18} /> Imprimir
              </button>
            </div>
          </div>

          {/* Panel derecho: vista previa */}
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/20 border border-blue-50 overflow-hidden backdrop-blur-sm flex flex-col">
            <div className="border-b border-gray-100 p-4 bg-gradient-to-r from-blue-50 to-white flex items-center gap-2 font-semibold text-gray-700">
              <Eye size={18} className="text-blue-600" /> Vista previa
            </div>
            <div className="flex-1 p-2 flex items-start justify-center overflow-auto bg-gray-50/50">
              <div id="vista-previa-documento" className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-inner my-4 mx-auto p-8 lg:p-12 border border-gray-200 rounded-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: vistaPreviaHtml }} />
            </div>
          </div>
        </div>
      )}

      {/* Pestaña HISTORIAL */}
      {pestana === 'mis_docs' && (
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/20 border border-blue-50 p-6 lg:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">Historial de documentos generados</h3>
          </div>
          {documentosGenerados.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay documentos generados aún.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documentosGenerados.map(doc => (
                <div key={doc.id} className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{doc.plantillas_documentos?.nombre || 'Sin plantilla'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {doc.tipo_persona === 'planilla' ? 'Planilla' : doc.tipo_persona === 'locador' ? 'Locador' : 'Manual'}
                      </span>
                      <p className="text-xs text-gray-400">{new Date(doc.fecha_generacion).toLocaleString()}</p>
                    </div>
                  </div>
                  <button onClick={() => {
                    setPlantillaSeleccionada(plantillas.find(p => p.id === doc.plantilla_id));
                    setVistaPreviaHtml(doc.contenido_html_generado);
                    setPestana('generar');
                  }} className="text-blue-600 font-medium text-sm hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                    <Eye size={14} /> Ver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña SUBIDOS */}
      {pestana === 'subidos' && (
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/20 border border-blue-50 p-6 lg:p-8 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Documentos subidos manualmente</h3>
            </div>
            <button onClick={() => setSubirDocModal(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:scale-105 transition-all flex items-center gap-2">
              <Upload size={16} /> Subir documento
            </button>
          </div>
          {documentosSubidos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
              <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay documentos subidos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documentosSubidos.map(doc => (
                <div key={doc.id} className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{doc.nombre_documento}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {doc.tipo_persona === 'planilla' ? 'Planilla' : 'Locador'}
                      </span>
                      <span className="text-xs text-gray-400">ID: {doc.persona_id}</span>
                      <span className="text-xs text-gray-400">Subido: {new Date(doc.fecha_subida).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium text-sm hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                    <Eye size={14} /> Ver
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña ADMIN PLANTILLAS */}
      {pestana === 'admin_plantillas' && esAdmin && (
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/20 border border-blue-50 p-6 lg:p-8 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Administrar plantillas</h3>
            </div>
            <button onClick={() => {
              setEditandoPlantilla(null);
              setFormPlantilla({ nombre: '', descripcion: '', tipo: 'contrato', contenido_html: '<p>Contenido... {{nombre}}</p>' });
              setModalPlantilla(true);
            }} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:scale-105 transition-all flex items-center gap-2">
              <Plus size={16} /> Nueva plantilla
            </button>
          </div>
          {plantillas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay plantillas creadas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plantillas.map(p => (
                <div key={p.id} className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium capitalize">{p.tipo}</span>
                      <p className="text-xs text-gray-400">{p.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setEditandoPlantilla(p);
                      setFormPlantilla(p);
                      setModalPlantilla(true);
                    }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={18} /></button>
                    <button onClick={() => eliminarPlantilla(p.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL SUBIR DOCUMENTO (portal) */}
      {subirDocModal && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-gray-800">Subir documento</h3>
              <button onClick={() => setSubirDocModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <select className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 outline-none" value={nuevoDoc.tipo_persona} onChange={e => setNuevoDoc({...nuevoDoc, tipo_persona: e.target.value, persona_id: ''})}>
                <option value="planilla">Planilla</option>
                <option value="locador">Locador</option>
              </select>
              <select className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 outline-none" value={nuevoDoc.persona_id} onChange={e => setNuevoDoc({...nuevoDoc, persona_id: e.target.value})}>
                <option value="">Seleccionar persona</option>
                {(nuevoDoc.tipo_persona === 'planilla' ? empleados : locadores).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                ))}
              </select>
              <input type="text" placeholder="Nombre del documento" className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 outline-none" value={nuevoDoc.nombre} onChange={e => setNuevoDoc({...nuevoDoc, nombre: e.target.value})} />
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 transition cursor-pointer">
                <input type="file" onChange={e => setNuevoDoc({...nuevoDoc, archivo: e.target.files[0]})} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setSubirDocModal(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium">Cancelar</button>
                <button onClick={subirDocumento} disabled={subiendo} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all">
                  {subiendo ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PLANTILLA (portal) */}
      {modalPlantilla && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-gray-800">{editandoPlantilla ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
              <button onClick={() => setModalPlantilla(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input placeholder="Nombre de la plantilla" className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 outline-none" value={formPlantilla.nombre} onChange={e => setFormPlantilla({...formPlantilla, nombre: e.target.value})} />
              <input placeholder="Descripción corta" className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 outline-none" value={formPlantilla.descripcion} onChange={e => setFormPlantilla({...formPlantilla, descripcion: e.target.value})} />
              <select className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 outline-none" value={formPlantilla.tipo} onChange={e => setFormPlantilla({...formPlantilla, tipo: e.target.value})}>
                <option value="contrato">Contrato</option>
                <option value="anexo">Anexo</option>
                <option value="carta">Carta</option>
                <option value="otros">Otros</option>
              </select>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contenido HTML</label>
                <textarea rows="14" className="w-full border-2 border-gray-100 rounded-xl p-4 bg-gray-50 font-mono text-sm focus:border-blue-500 outline-none" value={formPlantilla.contenido_html} onChange={e => setFormPlantilla({...formPlantilla, contenido_html: e.target.value})} placeholder="Usa {{nombre}}, {{apellido}}, etc." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModalPlantilla(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium">Cancelar</button>
                <button onClick={guardarPlantilla} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all">
                  {editandoPlantilla ? 'Actualizar' : 'Crear plantilla'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}