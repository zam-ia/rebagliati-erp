import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ETAPAS = [
  { id: 'nuevo_lead',      label: 'Nuevo lead',      bg: '#F1EFE8', color: '#444441', countBg: '#D3D1C7' },
  { id: 'interesado',      label: 'Interesado',      bg: '#E6F1FB', color: '#0C447C', countBg: '#B5D4F4' },
  { id: 'pendiente_pago',  label: 'Pendiente pago',  bg: '#FAEEDA', color: '#633806', countBg: '#FAC775' },
  { id: 'inscrito',        label: 'Inscrito',         bg: '#EAF3DE', color: '#27500A', countBg: '#C0DD97' },
  { id: 'fidelizado',      label: 'Fidelizado',       bg: '#E1F5EE', color: '#085041', countBg: '#9FE1CB' },
];

const AVATAR_COLORS = [
  { bg: '#E6F1FB', color: '#0C447C' },
  { bg: '#EAF3DE', color: '#27500A' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FBEAF0', color: '#72243E' },
];

function getInitials(nombre = '', apellido = '') {
  return `${nombre[0] || ''}${apellido[0] || ''}`.toUpperCase();
}

function getAvatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function CRM() {
  const [vista, setVista] = useState('kanban'); // 'kanban' | 'lista'
  const [participantes, setParticipantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [nota, setNota] = useState('');
  const [notas, setNotas] = useState([]);
  const [filtroPrograma, setFiltroPrograma] = useState('Todos');
  const [arrastrando, setArrastrando] = useState(null);

  useEffect(() => { cargar(); }, [busqueda, filtroPrograma]);

  const cargar = async () => {
    let q = supabase.from('participantes').select('*');
    if (busqueda) {
      q = q.or(
        `nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,` +
        `dni.ilike.%${busqueda}%,correo.ilike.%${busqueda}%`
      );
    }
    const { data } = await q.order('created_at', { ascending: false });
    setParticipantes(data || []);
  };

  const abrirDetalle = async (p) => {
    setSeleccionado(p);
    const { data: ins } = await supabase
      .from('inscripciones').select('*')
      .eq('participante_id', p.id)
      .order('created_at', { ascending: false });
    setHistorial(ins || []);

    // Cargar notas guardadas (columna "notas" en participantes, o tabla aparte)
    setNotas(p.notas_crm ? JSON.parse(p.notas_crm) : []);
  };

  const cambiarEtapa = async (participanteId, nuevaEtapa) => {
    await supabase.from('participantes')
      .update({ estado_seguimiento: nuevaEtapa })
      .eq('id', participanteId);
    // Actualizar localmente
    setParticipantes(prev =>
      prev.map(p => p.id === participanteId
        ? { ...p, estado_seguimiento: nuevaEtapa } : p)
    );
    if (seleccionado?.id === participanteId) {
      setSeleccionado(prev => ({ ...prev, estado_seguimiento: nuevaEtapa }));
    }
  };

  const guardarNota = async () => {
    if (!nota.trim() || !seleccionado) return;
    const nuevaNotas = [
      { texto: nota, fecha: new Date().toISOString(), autor: 'Ejecutiva' },
      ...notas
    ];
    await supabase.from('participantes')
      .update({ notas_crm: JSON.stringify(nuevaNotas) })
      .eq('id', seleccionado.id);
    setNotas(nuevaNotas);
    setNota('');
  };

  // Drag & drop Kanban
  const onDragStart = (p) => setArrastrando(p);
  const onDrop = (etapaId) => {
    if (arrastrando) cambiarEtapa(arrastrando.id, etapaId);
    setArrastrando(null);
  };

  const porEtapa = (etapaId) =>
    participantes.filter(p =>
      (p.estado_seguimiento || 'nuevo_lead') === etapaId
    );

  const stats = {
    total: participantes.length,
    inscritos: participantes.filter(p => p.estado_seguimiento === 'inscrito').length,
    pendientes: participantes.filter(p => p.estado_seguimiento === 'pendiente_pago').length,
    fidelizados: participantes.filter(p => p.estado_seguimiento === 'fidelizado').length,
  };

  return (
    <div className="flex flex-col h-full">

      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-800">CRM — Gestión de clientes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setVista(v => v === 'kanban' ? 'lista' : 'kanban')}
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            {vista === 'kanban' ? 'Vista lista' : 'Vista Kanban'}
          </button>
          <button className="text-sm bg-[#185FA5] text-white px-4 py-1.5 rounded-lg">
            + Nuevo contacto
          </button>
        </div>
      </div>

      {/* Pestañas de vista */}
      <div className="flex border-b border-gray-200 px-5">
        {['kanban', 'lista'].map(v => (
          <button key={v}
            onClick={() => setVista(v)}
            className={`text-sm px-4 py-2.5 border-b-2 mr-1 ${
              vista === v
                ? 'border-[#185FA5] text-[#185FA5] font-medium'
                : 'border-transparent text-gray-500'
            }`}
          >
            {v === 'kanban' ? 'Pipeline Kanban' : 'Lista de contactos'}
          </button>
        ))}
      </div>

      {/* Buscador y filtros */}
      <div className="flex gap-2 items-center px-5 py-2.5 border-b border-gray-200">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, DNI, correo o programa..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:border-[#185FA5]"
        />
        {['Todos', 'Diplomados', 'Cursos', 'Congresos'].map(f => (
          <button key={f}
            onClick={() => setFiltroPrograma(f)}
            className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${
              filtroPrograma === f
                ? 'bg-[#E6F1FB] text-[#0C447C] border-[#85B7EB]'
                : 'border-gray-200 text-gray-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-gray-200">
        {[
          { label: 'Total leads', val: stats.total, color: '' },
          { label: 'Inscritos', val: stats.inscritos, color: 'text-green-700' },
          { label: 'Pend. pago', val: stats.pendientes, color: 'text-amber-700' },
          { label: 'Fidelizados', val: stats.fidelizados, color: 'text-teal-700' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-xl font-semibold ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── VISTA KANBAN ── */}
      {vista === 'kanban' && (
        <div className="flex gap-3 p-4 overflow-x-auto flex-1">
          {ETAPAS.map(etapa => (
            <div key={etapa.id}
              className="flex-none w-52 flex flex-col gap-2"
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(etapa.id)}
            >
              {/* Cabecera columna */}
              <div className="flex items-center justify-between px-2.5 py-2 rounded-lg mb-1"
                style={{ background: etapa.bg }}>
                <span className="text-xs font-medium" style={{ color: etapa.color }}>
                  {etapa.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: etapa.countBg, color: etapa.color }}>
                  {porEtapa(etapa.id).length}
                </span>
              </div>

              {/* Tarjetas */}
              {porEtapa(etapa.id).map((p, i) => {
                const av = getAvatarColor(i);
                return (
                  <div key={p.id}
                    draggable
                    onDragStart={() => onDragStart(p)}
                    onClick={() => { abrirDetalle(p); setVista('lista'); }}
                    className={`bg-white border rounded-xl p-2.5 cursor-pointer hover:border-gray-300 transition-colors ${
                      seleccionado?.id === p.id ? 'border-2 border-[#185FA5]' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                        style={{ background: av.bg, color: av.color }}>
                        {getInitials(p.nombre, p.apellido)}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-800 leading-tight">
                          {p.apellido} {p.nombre?.charAt(0)}.
                        </div>
                        <div className="text-xs text-gray-400">{p.telefono}</div>
                      </div>
                    </div>
                    {p.programa_interes && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#E6F1FB] text-[#0C447C] mb-2 inline-block">
                        {p.programa_interes}
                      </span>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-[#185FA5]">
                        {p.monto_interes ? `S/ ${p.monto_interes}` : '—'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Botón agregar */}
              <button className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg py-2 hover:border-gray-300 hover:text-gray-500">
                + Agregar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── VISTA LISTA + PANEL DETALLE ── */}
      {vista === 'lista' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Lista */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
            {participantes.map((p, i) => {
              const av = getAvatarColor(i);
              const etapa = ETAPAS.find(e => e.id === (p.estado_seguimiento || 'nuevo_lead'));
              return (
                <div key={p.id}
                  onClick={() => abrirDetalle(p)}
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 cursor-pointer ${
                    seleccionado?.id === p.id ? 'bg-[#E6F1FB]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                    style={{ background: av.bg, color: av.color }}>
                    {getInitials(p.nombre, p.apellido)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {p.apellido}, {p.nombre}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {p.dni} · {p.programa_interes || p.correo}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {etapa && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: etapa.bg, color: etapa.color }}>
                        {etapa.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {participantes.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">Sin resultados</div>
            )}
          </div>

          {/* Panel detalle */}
          {seleccionado ? (
            <div className="flex-1 overflow-y-auto p-5">
              {/* Header ficha */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-base font-semibold">
                  {getInitials(seleccionado.nombre, seleccionado.apellido)}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {seleccionado.apellido}, {seleccionado.nombre}
                  </div>
                  <div className="text-sm text-gray-500">{seleccionado.grado_academico} · DNI {seleccionado.dni}</div>
                  <div className="text-sm text-gray-400">{seleccionado.correo} · {seleccionado.telefono}</div>
                </div>
              </div>

              {/* Selector de etapa */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Etapa del pipeline</div>
                <div className="flex flex-wrap gap-1.5">
                  {ETAPAS.map(e => (
                    <button key={e.id}
                      onClick={() => cambiarEtapa(seleccionado.id, e.id)}
                      className="text-xs px-3 py-1 rounded-full border font-medium transition-colors"
                      style={
                        (seleccionado.estado_seguimiento || 'nuevo_lead') === e.id
                          ? { background: e.bg, color: e.color, borderColor: e.countBg }
                          : { background: 'transparent', color: '#9CA3AF', borderColor: '#E5E7EB' }
                      }
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos */}
              <div className="mb-4 border border-gray-100 rounded-xl overflow-hidden">
                {[
                  ['Programa', seleccionado.programa_interes],
                  ['Monto estimado', seleccionado.monto_interes ? `S/ ${seleccionado.monto_interes}` : '—'],
                  ['Grado académico', seleccionado.grado_academico],
                  ['Teléfono', seleccionado.telefono],
                  ['Correo', seleccionado.correo],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-700">{val || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Historial inscripciones */}
              {historial.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Historial de inscripciones</div>
                  <div className="space-y-2">
                    {historial.map(ins => (
                      <div key={ins.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="text-sm font-medium text-gray-700">{ins.programa}</div>
                        <div className="text-xs text-gray-400">
                          S/ {ins.monto_total} · {ins.estado} · {new Date(ins.created_at).toLocaleDateString('es-PE')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline de notas */}
              {notas.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Actividad y notas</div>
                  <div className="space-y-2">
                    {notas.map((n, i) => (
                      <div key={i} className="flex gap-2.5 py-2 border-b border-gray-100 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-[#185FA5] mt-1.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-700">{n.texto}</div>
                          <div className="text-xs text-gray-400">
                            {n.autor} · {new Date(n.fecha).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agregar nota */}
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Agregar nota</div>
                <textarea
                  rows={3}
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Escribe una nota: llamó interesado, envió voucher, solicitó descuento..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 resize-none focus:outline-none focus:border-[#185FA5]"
                />
                <button onClick={guardarNota}
                  className="mt-2 text-sm bg-[#185FA5] text-white px-4 py-1.5 rounded-lg">
                  Guardar nota
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecciona un contacto para ver su ficha
            </div>
          )}
        </div>
      )}
    </div>
  );
}