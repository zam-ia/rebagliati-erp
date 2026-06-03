import { Megaphone, Plus, ExternalLink } from 'lucide-react';

const campanas = [
  {
    codigo: 'C.SALUDSEXUAL-0626',
    evento: 'Rol de la obstetra en salud sexual y reproductiva',
    utm: 'UTM_SALUDSEXUAL_0626',
    canal: 'WhatsApp + Meta',
    publico: 'Enfermeria',
    grupo: 'WSP Enfermeria Intensiva',
    fecha: '01/06 - 20/06',
    estado: 'Activa',
    leads: 620,
    preinscritos: 180,
    inscritos: 95,
    ventas: 35,
    monto: 24200,
    ejecutivoTop: 'Maria F.',
  },
  {
    codigo: 'D.FARMACIASISMED-0426',
    evento: 'Diplomado gestion SISMED',
    utm: 'UTM_FARMACIA_SISMED',
    canal: 'Google Ads',
    publico: 'Farmacia',
    grupo: 'WSP Farmacia SISMED',
    fecha: '15/04 - 30/06',
    estado: 'Programada',
    leads: 410,
    preinscritos: 120,
    inscritos: 58,
    ventas: 18,
    monto: 15600,
    ejecutivoTop: 'Carlos R.',
  },
  {
    codigo: 'C.ACUPUNTURAAVANZADA-0626',
    evento: 'Taller intensivo acupuntura avanzada',
    utm: 'UTM_ACUPUNTURA_0626',
    canal: 'Meta Ads',
    publico: 'Terapias',
    grupo: 'WSP Acupuntura Pro',
    fecha: '05/06 - 25/06',
    estado: 'Activa',
    leads: 340,
    preinscritos: 95,
    inscritos: 40,
    ventas: 16,
    monto: 9600,
    ejecutivoTop: 'Andrea P.',
  },
];

export default function TabCampanas() {
  const totalLeads = campanas.reduce((sum, item) => sum + item.leads, 0);
  const totalPreinscritos = campanas.reduce((sum, item) => sum + item.preinscritos, 0);
  const totalInscritos = campanas.reduce((sum, item) => sum + item.inscritos, 0);
  const totalVentas = campanas.reduce((sum, item) => sum + item.ventas, 0);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
            <Megaphone size={14} /> Campañas y UTMs
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Panel operativo de campañas</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Controla campañas, UTMs, leads, conversiones y monto vendido en un solo lugar.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#185FA5] to-[#144b82] px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[0.99]">
          <Plus size={16} /> Nueva campaña
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Leads generados', value: totalLeads },
          { label: 'Preinscritos', value: totalPreinscritos },
          { label: 'Inscritos', value: totalInscritos },
          { label: 'Ventas validadas', value: totalVentas },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{metric.label}</p>
            <p className="mt-3 text-2xl font-black text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_0.5fr]">
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Campañas y conversiones</h3>
          <div className="mt-4 grid gap-3 text-[11px] text-slate-500 sm:grid-cols-2">
            {campanas.map((item) => {
              const conversionUtm = item.leads ? Math.round((item.inscritos / item.leads) * 100) : 0;
              const conversionEvento = item.preinscritos ? Math.round((item.inscritos / item.preinscritos) * 100) : 0;
              const costoPorInscrito = item.inscritos ? Math.round(item.monto / item.inscritos) : 0;
              return (
                <div key={item.codigo} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-black text-slate-900">{item.codigo}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.evento}</p>
                  <div className="mt-3 space-y-2">
                    <div>Conv. UTM: <strong className="text-slate-900">{conversionUtm}%</strong></div>
                    <div>Conv. evento: <strong className="text-slate-900">{conversionEvento}%</strong></div>
                    <div>Costo por inscrito: <strong className="text-slate-900">S/ {costoPorInscrito}</strong></div>
                    <div>Monto vendido: <strong className="text-slate-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.monto)}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Indicadores clave</h3>
          <div className="mt-4 space-y-3">
            {campanas.map((item) => (
              <div key={item.codigo} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="font-black text-slate-900">{item.evento}</p>
                <p className="text-xs text-slate-500">{item.canal} · {item.publico}</p>
                <div className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
                  <div>Leads: {item.leads}</div>
                  <div>Inscritos: {item.inscritos}</div>
                  <div>Ejecutivo top: {item.ejecutivoTop}</div>
                  <div>Grupo WSP: {item.grupo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Código</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Evento</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">UTM</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Canal</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Leads</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Preinscritos</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Inscritos</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ventas</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Conversión</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Monto</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ejecutivo top</th>
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campanas.map((item) => {
              const conversion = item.leads ? `${Math.round((item.inscritos / item.leads) * 100)}%` : '0%';
              return (
                <tr key={item.codigo} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-black text-slate-900">{item.codigo}</td>
                  <td className="px-4 py-4 text-slate-700">{item.evento}</td>
                  <td className="px-4 py-4 text-slate-700">{item.utm}</td>
                  <td className="px-4 py-4 text-slate-700">{item.canal}</td>
                  <td className="px-4 py-4 font-black text-slate-900">{item.leads}</td>
                  <td className="px-4 py-4 text-slate-700">{item.preinscritos}</td>
                  <td className="px-4 py-4 text-slate-700">{item.inscritos}</td>
                  <td className="px-4 py-4 font-black text-slate-900">{item.ventas}</td>
                  <td className="px-4 py-4 text-slate-700">{conversion}</td>
                  <td className="px-4 py-4 font-black text-slate-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.monto)}</td>
                  <td className="px-4 py-4 text-slate-700">{item.ejecutivoTop}</td>
                  <td className="px-4 py-4 text-center">
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-blue-200 hover:text-blue-600">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
