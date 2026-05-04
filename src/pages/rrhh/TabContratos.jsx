import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, FileCheck, AlertTriangle, Plus, Eye, Settings, Users, Briefcase } from 'lucide-react';

function diasParaVencer(fecha) {
  if (!fecha) return 999;
  return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function TabContratos() {
  const [empleados, setEmpleados] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [vista, setVista] = useState('planilla'); // 'planilla' | 'complementario'
  const [documentos, setDocumentos] = useState([]);
  const [nuevoDocumento, setNuevoDocumento] = useState({ tipo: '', correlativo: 0, descripcion: '' });
  const [mostrarFormDoc, setMostrarFormDoc] = useState(false);
  const [correlativos, setCorrelativos] = useState({});

  useEffect(() => {
    Promise.all([
      supabase.from('empleados').select('*').eq('estado', 'activo'),
      supabase.from('locadores').select('*').eq('estado', 'activo'),
      supabase.from('documentos').select('*').order('tipo'),
      supabase.from('correlativos').select('*')
    ]).then(([empRes, locRes, docRes, corrRes]) => {
      setEmpleados(empRes.data || []);
      setLocadores(locRes.data || []);
      setDocumentos(docRes.data || []);
      const corrMap = {};
      (corrRes.data || []).forEach(c => { corrMap[c.tipo] = c.ultimo; });
      setCorrelativos(corrMap);
    });
  }, []);

  const semaforo = (dias) => {
    if (dias < 0) return { bg: 'bg-red-700', text: 'text-white', label: 'Vencido' };
    if (dias <= 30) return { bg: 'bg-red-500', text: 'text-white', label: 'Urgente' };
    if (dias <= 90) return { bg: 'bg-amber-400', text: 'text-amber-800', label: 'Próximo' };
    return { bg: 'bg-green-500', text: 'text-white', label: 'Vigente' };
  };

  const getInitials = (nombre, apellido) => `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

  const datos = vista === 'planilla' ? empleados : locadores;

  const guardarDocumento = async () => {
    if (!nuevoDocumento.tipo) return alert('Selecciona un tipo de documento');
    const proximo = (correlativos[nuevoDocumento.tipo] || 0) + 1;
    const { error } = await supabase.from('documentos').insert({
      tipo: nuevoDocumento.tipo,
      correlativo: proximo,
      descripcion: nuevoDocumento.descripcion,
      fecha: new Date().toISOString().split('T')[0]
    });
    if (error) alert('Error: ' + error.message);
    else {
      await supabase.from('correlativos').upsert({ tipo: nuevoDocumento.tipo, ultimo: proximo });
      setCorrelativos(prev => ({ ...prev, [nuevoDocumento.tipo]: proximo }));
      setNuevoDocumento({ tipo: '', correlativo: 0, descripcion: '' });
      setMostrarFormDoc(false);
      const { data } = await supabase.from('documentos').select('*').order('tipo');
      setDocumentos(data || []);
    }
  };

  return (
    <div>
      {/* Selector de Planilla/Complementarios + botón Nuevo Documento */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setVista('planilla')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              vista === 'planilla' ? 'bg-white text-[#185FA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={14} /> Planilla
          </button>
          <button
            onClick={() => setVista('complementario')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              vista === 'complementario' ? 'bg-white text-[#185FA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase size={14} /> Complementarios
          </button>
        </div>
        <button
          onClick={() => setMostrarFormDoc(true)}
          className="bg-[#185FA5] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#144b82] transition"
        >
          <Plus size={14} /> Nuevo Documento
        </button>
      </div>

      {/* Leyenda semáforo */}
      <div className="flex gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> &lt;30 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> 30-90 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> &gt;90 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-700"></span> Vencido</span>
      </div>

      {/* Tabla de contratos (Planilla o Complementarios) */}
      <div className="bg-white border rounded-xl overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Foto</th>
              <th className="p-3 text-left">Colaborador</th>
              <th className="p-3">{vista === 'planilla' ? 'Cargo' : 'Modalidad'}</th>
              <th className="p-3">Vencimiento</th>
              <th className="p-3">Días rest.</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {datos.map(e => {
              const dias = diasParaVencer(e.fecha_vence_contrato);
              const s = semaforo(dias);
              return (
                <tr key={e.id} className="border-t">
                  <td className="p-3">
                    {e.foto_url ? (
                      <img src={e.foto_url} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {getInitials(e.nombre, e.apellido)}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-medium">{e.nombre} {e.apellido}</td>
                  <td className="p-3">{vista === 'planilla' ? e.cargo : e.modalidad}</td>
                  <td className="p-3">{e.fecha_vence_contrato || '—'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{dias} días</span></td>
                  <td className="p-3">{dias <= 90 && <button className="text-xs text-[#185FA5] border px-2 py-1 rounded">Renovar</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sección de Documentos y Correlativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Correlativos actuales */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Settings size={18} className="text-[#185FA5]" /> Correlativos Actuales
          </h3>
          <div className="space-y-2">
            {['Carta', 'Memorandum', 'Oficio', 'Informe', 'Resolución'].map(tipo => (
              <div key={tipo} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm font-medium text-gray-700">{tipo}</span>
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-xl text-xs font-mono font-bold">{correlativos[tipo] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos documentos emitidos */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-[#185FA5]" /> Últimos Documentos Emitidos
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {documentos.length === 0 && <p className="text-gray-400 text-sm">No hay documentos registrados</p>}
            {documentos.slice(0, 10).map(doc => (
              <div key={doc.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                <FileCheck size={14} className="text-green-500" />
                <span className="text-sm font-medium text-gray-800">{doc.tipo} N° {doc.correlativo}</span>
                <span className="text-xs text-gray-400 ml-auto">{doc.fecha}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Nuevo Documento */}
      {mostrarFormDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo Documento</h3>
            <div className="space-y-3">
              <select
                value={nuevoDocumento.tipo}
                onChange={e => setNuevoDocumento({ ...nuevoDocumento, tipo: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Seleccione tipo</option>
                {['Carta', 'Memorandum', 'Oficio', 'Informe', 'Resolución'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                placeholder="Descripción (opcional)"
                value={nuevoDocumento.descripcion}
                onChange={e => setNuevoDocumento({ ...nuevoDocumento, descripcion: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500">
                Próximo correlativo: <strong>{nuevoDocumento.tipo ? (correlativos[nuevoDocumento.tipo] || 0) + 1 : '—'}</strong>
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardarDocumento} className="flex-1 bg-[#185FA5] text-white py-2 rounded-xl font-bold text-sm">Guardar</button>
              <button onClick={() => setMostrarFormDoc(false)} className="flex-1 bg-gray-200 py-2 rounded-xl font-bold text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}