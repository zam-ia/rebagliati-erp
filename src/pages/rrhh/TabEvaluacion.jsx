import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const REGLAS = [
  { concepto: 'Puntaje base', puntos: 100, tipo: 'base' },
  { concepto: 'Tardanza leve (1–15 min)', puntos: -3, tipo: 'descuento' },
  { concepto: 'Tardanza grave (+15 min)', puntos: -5, tipo: 'descuento' },
  { concepto: 'Falta injustificada', puntos: -12, tipo: 'descuento' },
  { concepto: 'Permiso sin justificación', puntos: -8, tipo: 'descuento' },
  { concepto: 'Asistencia perfecta', puntos: +5, tipo: 'bono' },
  { concepto: 'Puntualidad perfecta', puntos: +5, tipo: 'bono' },
];

function calcularPuntaje(ev) {
  let p = 100;
  p -= (ev.tard_leve || 0) * 3;
  p -= (ev.tard_grave || 0) * 5;
  p -= (ev.falta_inj || 0) * 12;
  p -= (ev.permiso_sj || 0) * 8;
  if (ev.asist_perfecta) p += 5;
  if (ev.puntual_perfecta) p += 5;
  return Math.max(0, Math.min(100, p));
}

function scoreColor(s) {
  if (s >= 95) return 'text-green-700';
  if (s >= 80) return 'text-amber-700';
  return 'text-red-700';
}

function scoreBg(s) {
  if (s >= 95) return 'bg-green-50 text-green-800';
  if (s >= 80) return 'bg-amber-50 text-amber-800';
  return 'bg-red-50 text-red-800';
}

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

export default function TabEvaluacion() {
  const [vista, setVista] = useState('mensual');
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [mesSelec, setMesSelec] = useState(MES_ACTUAL);
  const [modalEv, setModalEv] = useState(null);
  const [historico, setHistorico] = useState({});
  const [form, setForm] = useState({
    tard_leve: 0, tard_grave: 0, falta_inj: 0, permiso_sj: 0,
    asist_perfecta: false, puntual_perfecta: false,
    observaciones: '', plan_mejora: 'Mantener'
  });

  useEffect(() => { cargar(); }, [mesSelec]);
  useEffect(() => { cargarHistorico(); }, []);

  const cargar = async () => {
    const { data: emp } = await supabase.from('empleados').select('*').eq('estado', 'activo').eq('tipo', 'planilla');
    setEmpleados(emp || []);
    const { data: ev } = await supabase.from('evaluaciones').select('*').eq('mes', mesSelec);
    setEvaluaciones(ev || []);
  };

  const cargarHistorico = async () => {
    const { data } = await supabase.from('evaluaciones').select('empleado_id, mes, punt_final');
    const agrupado = {};
    data?.forEach(ev => {
      if (!agrupado[ev.empleado_id]) agrupado[ev.empleado_id] = {};
      agrupado[ev.empleado_id][ev.mes.slice(5)] = ev.punt_final;
    });
    setHistorico(agrupado);
  };

  const guardarEvaluacion = async () => {
    if (!modalEv) return;
    const punt_final = calcularPuntaje(form);
    const registro = {
      empleado_id: modalEv.id,
      empleado_nombre: `${modalEv.nombre} ${modalEv.apellido || ''}`.trim(),
      mes: mesSelec,
      area: modalEv.area,
      ...form,
      punt_bruto: punt_final,
      punt_base: 100,
      punt_final,
    };
    await supabase.from('evaluaciones').upsert(registro, { onConflict: 'empleado_id,mes' });
    setModalEv(null);
    setForm({ tard_leve:0, tard_grave:0, falta_inj:0, permiso_sj:0, asist_perfecta:false, puntual_perfecta:false, observaciones:'', plan_mejora:'Mantener' });
    cargar();
    cargarHistorico();
  };

  const datos = empleados.map(emp => {
    const ev = evaluaciones.find(e => e.empleado_id === emp.id);
    return ev ? { ...emp, ...ev, evaluado: true } : { ...emp, evaluado: false, punt_final: null };
  });
  const ranking = [...datos].filter(d => d.evaluado).sort((a, b) => b.punt_final - a.punt_final);

  return (
    <div>
      <div className="flex gap-1 mb-5 border-b">
        {[
          ['mensual', 'Registro mensual'], ['ranking', 'Ranking'],
          ['historico', 'Histórico anual'], ['reglas', 'Reglas del sistema']
        ].map(([id, label]) => (
          <button key={id} onClick={() => setVista(id)} className={`text-sm px-4 py-2 border-b-2 ${vista === id ? 'border-[#185FA5] text-[#185FA5]' : 'border-transparent'}`}>{label}</button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">Periodo:</label>
        <input type="month" value={mesSelec} onChange={e => setMesSelec(e.target.value)} className="border rounded px-3 py-1.5" />
      </div>

      {vista === 'mensual' && (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs">
              <th className="p-3">Colaborador</th><th>Área</th><th>Tard.leves</th><th>Tard.graves</th><th>Faltas inj</th><th>Perm.s/just</th><th>Asist.perf</th><th>Punt.perf</th><th>Punt.final</th><th>Obs</th><th>Plan mejora</th><th>Acción</th>
            </tr></thead>
            <tbody>
              {datos.map(d => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-medium">{d.nombre} {d.apellido?.charAt(0)}.</td>
                  <td className="p-3">{d.area}</td>
                  <td className="p-3 text-center">{d.evaluado ? d.tard_leve : '—'}</td>
                  <td className="p-3 text-center">{d.evaluado ? d.tard_grave : '—'}</td>
                  <td className="p-3 text-center">{d.evaluado ? d.falta_inj : '—'}</td>
                  <td className="p-3 text-center">{d.evaluado ? d.permiso_sj : '—'}</td>
                  <td className="p-3 text-center">{d.evaluado ? (d.asist_perfecta ? '✓' : '') : '—'}</td>
                  <td className="p-3 text-center">{d.evaluado ? (d.puntual_perfecta ? '✓' : '') : '—'}</td>
                  <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${d.evaluado ? scoreBg(d.punt_final) : 'bg-gray-100'}`}>{d.evaluado ? d.punt_final : '—'}</span></td>
                  <td className="p-3 text-xs">{d.observaciones || '—'}</td>
                  <td className="p-3 text-center">{d.plan_mejora && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.plan_mejora}</span>}</td>
                  <td className="p-3"><button onClick={() => { setModalEv(d); if(d.evaluado) setForm({ tard_leve:d.tard_leve, tard_grave:d.tard_grave, falta_inj:d.falta_inj, permiso_sj:d.permiso_sj, asist_perfecta:d.asist_perfecta, puntual_perfecta:d.puntual_perfecta, observaciones:d.observaciones||'', plan_mejora:d.plan_mejora||'Mantener' }); }} className="text-xs text-[#185FA5] border px-2 py-1 rounded">{d.evaluado ? 'Editar' : 'Registrar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'ranking' && (
        <div className="max-w-lg bg-white border rounded-xl">
          {ranking.map((e,i)=>(
            <div key={e.id} className="flex items-center gap-4 p-4 border-b">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">{i+1}</div>
              <div className="flex-1"><div className="font-medium">{e.nombre} {e.apellido?.charAt(0)}.</div><div className="text-xs text-gray-400">{e.area}</div></div>
              <div className={`text-xl font-bold ${scoreColor(e.punt_final)}`}>{e.punt_final}</div>
            </div>
          ))}
        </div>
      )}

      {vista === 'historico' && (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="p-3">Colaborador</th>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(m=><th key={m} className="p-2">{m}</th>)}<th>Prom</th></tr></thead>
            <tbody>
              {empleados.map(e => {
                const scores = ['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => historico[e.id]?.[m] || null);
                const valid = scores.filter(s=>s!==null);
                const prom = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : null;
                return (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 font-medium">{e.nombre}</td>
                    {scores.map((s,i)=><td key={i} className="p-2 text-center">{s!==null ? <span className={`text-xs font-semibold ${scoreColor(s)}`}>{s}</span> : '—'}</td>)}
                    <td className="p-2 text-center font-bold">{prom ? <span className={scoreColor(prom)}>{prom}</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'reglas' && (
        <div className="max-w-xl bg-white border rounded-xl divide-y">
          {REGLAS.map(r=>(
            <div key={r.concepto} className="flex justify-between p-4">
              <span>{r.concepto}</span><span className={r.tipo==='bono'?'text-green-700':'text-red-700'}>{r.puntos>0?'+':''}{r.puntos} pts</span>
            </div>
          ))}
        </div>
      )}

      {modalEv && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h3 className="font-semibold mb-2">Evaluar: {modalEv.nombre} {modalEv.apellido}</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[['Tard. leves','tard_leve'],['Tard. graves','tard_grave'],['Faltas injust.','falta_inj'],['Permisos s/just.','permiso_sj']].map(([l,k])=>(
                <div key={k}><label className="text-xs block">{l}</label><input type="number" min="0" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:+e.target.value}))} className="border rounded w-full p-1.5 text-sm" /></div>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-3"><input type="checkbox" checked={form.asist_perfecta} onChange={e=>setForm(f=>({...f,asist_perfecta:e.target.checked}))} /><label>Asistencia perfecta (+5)</label></div>
            <div className="flex items-center gap-3 mb-3"><input type="checkbox" checked={form.puntual_perfecta} onChange={e=>setForm(f=>({...f,puntual_perfecta:e.target.checked}))} /><label>Puntualidad perfecta (+5)</label></div>
            <div className={`rounded-lg p-3 mb-3 text-center ${scoreBg(calcularPuntaje(form))}`}>Puntaje calculado: <span className="text-2xl font-bold">{calcularPuntaje(form)}</span></div>
            <textarea rows={2} placeholder="Observaciones semanales..." value={form.observaciones} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))} className="border rounded w-full p-2 mb-3 text-sm" />
            <select value={form.plan_mejora} onChange={e=>setForm(f=>({...f,plan_mejora:e.target.value}))} className="border rounded w-full p-2 mb-4 text-sm">
              <option>Mantener</option><option>Seguimiento</option><option>Compromiso escrito</option><option>Reunión supervisión</option>
            </select>
            <div className="flex gap-2"><button onClick={guardarEvaluacion} className="bg-[#185FA5] text-white flex-1 py-2 rounded">Guardar</button><button onClick={()=>setModalEv(null)} className="border px-4 py-2 rounded">Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}