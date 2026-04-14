// src/pages/finanzas/components/TabDashboard.jsx
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, BarChart2, PieChart, CreditCard, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import KpiCard from './KpiCard';
import { fmt, pct } from '../data/demoData';

export default function TabDashboard() {
  const [loading, setLoading] = useState(true);
  const [totales, setTotales] = useState({
    ingresos: 0,
    egresos: 0,
    saldo: 0,
    porCobrar: 0,
    morosos: 0,
    egresosPendientes: 0,
  });
  const [topEgresos, setTopEgresos] = useState([]);
  const [alertas, setAlertas] = useState({
    morosos: 0,
    vencidos: 0,
    egresosPendientes: 0,
  });

  useEffect(() => {
    cargarDatosReales();
    // Suscripciones en tiempo real (opcional)
    const subIngresos = supabase
      .channel('ingresos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos' }, () => cargarDatosReales())
      .subscribe();
    const subEgresos = supabase
      .channel('egresos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'egresos' }, () => cargarDatosReales())
      .subscribe();

    return () => {
      subIngresos.unsubscribe();
      subEgresos.unsubscribe();
    };
  }, []);

  const cargarDatosReales = async () => {
    setLoading(true);
    try {
      // 1. Ingresos cobrados
      const { data: ingresosCobrados } = await supabase
        .from('ingresos')
        .select('monto')
        .eq('estado', 'Cobrado');
      const totalIngresos = ingresosCobrados?.reduce((sum, i) => sum + i.monto, 0) || 0;

      // 2. Ingresos pendientes (por cobrar)
      const { data: ingresosPendientes } = await supabase
        .from('ingresos')
        .select('monto')
        .eq('estado', 'Pendiente');
      const porCobrar = ingresosPendientes?.reduce((sum, i) => sum + i.monto, 0) || 0;

      // 3. Egresos pagados
      const { data: egresosPagados } = await supabase
        .from('egresos')
        .select('monto')
        .eq('estado', 'Pagado');
      const totalEgresos = egresosPagados?.reduce((sum, e) => sum + e.monto, 0) || 0;

      // 4. Egresos pendientes
      const { data: egresosPendientes } = await supabase
        .from('egresos')
        .select('monto, concepto, proveedor, fecha')
        .eq('estado', 'Pendiente')
        .order('monto', { ascending: false })
        .limit(5);
      const egresosPendientesCount = egresosPendientes?.length || 0;
      setTopEgresos(egresosPendientes || []);

      // 5. Alertas (simuladas: si tienes tabla de cobranzas real, conéctalas)
      // Por ahora usamos datos demo para morosos/vencidos, pero puedes reemplazar con consultas reales
      const { data: cobranzasReal } = await supabase.from('cobranzas').select('estado');
      let morosos = 0, vencidos = 0;
      if (cobranzasReal) {
        morosos = cobranzasReal.filter(c => c.estado === 'Moroso').length;
        vencidos = cobranzasReal.filter(c => c.estado === 'Vencido').length;
      } else {
        // Si no tienes tabla cobranzas, puedes usar datos demo o dejarlo en 0
        morosos = 0;
        vencidos = 0;
      }

      setTotales({
        ingresos: totalIngresos,
        egresos: totalEgresos,
        saldo: totalIngresos - totalEgresos,
        porCobrar,
        morosos,
        egresosPendientes: egresosPendientesCount,
      });
      setAlertas({ morosos, vencidos, egresosPendientes: egresosPendientesCount });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos Cobrados"
          valor={fmt(totales.ingresos)}
          sub="Pagos confirmados"
          icon={TrendingUp}
          color="border-emerald-500"
          delta={8.3}
        />
        <KpiCard
          label="Egresos Pagados"
          valor={fmt(totales.egresos)}
          sub="Pagos realizados"
          icon={TrendingDown}
          color="border-red-400"
          delta={-2.1}
        />
        <KpiCard
          label="Saldo Operativo"
          valor={fmt(totales.saldo)}
          sub="Resultado del período"
          icon={Wallet}
          color={totales.saldo >= 0 ? 'border-blue-500' : 'border-orange-500'}
        />
        <KpiCard
          label="Por Cobrar"
          valor={fmt(totales.porCobrar)}
          sub={`${totales.morosos} alumnos morosos`}
          icon={AlertCircle}
          color="border-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flujo de caja visual */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-bold text-slate-700 text-xs uppercase tracking-tighter flex items-center gap-2 mb-5">
            <BarChart2 size={15} className="text-blue-500" /> Flujo de Caja Actual
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Ingresos cobrados', monto: totales.ingresos, max: Math.max(totales.ingresos, totales.egresos), color: 'bg-emerald-500' },
              { label: 'Egresos pagados', monto: totales.egresos, max: Math.max(totales.ingresos, totales.egresos), color: 'bg-red-400' },
              { label: 'Saldo neto', monto: Math.abs(totales.saldo), max: Math.max(totales.ingresos, totales.egresos), color: totales.saldo >= 0 ? 'bg-blue-500' : 'bg-orange-400' },
            ].map(({ label, monto, max, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 font-bold">{label}</span>
                  <span className="font-black text-slate-700">{fmt(monto)}</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className={`${color} h-full rounded-full`} style={{ width: `${pct(monto, max)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-dashed text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Margen operativo</p>
            <p className={`text-xl font-black ${totales.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {pct(totales.saldo, totales.ingresos)}%
            </p>
          </div>
        </div>

        {/* Top egresos pendientes */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-bold text-slate-700 text-xs uppercase tracking-tighter flex items-center gap-2 mb-5">
            <PieChart size={15} className="text-red-400" /> Egresos Pendientes
          </h3>
          {topEgresos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No hay egresos pendientes</p>
          ) : (
            <div className="space-y-3">
              {topEgresos.map((e, i) => {
                const colores = ['bg-red-500', 'bg-orange-400', 'bg-amber-400', 'bg-yellow-400', 'bg-slate-300'];
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colores[i % colores.length]}`} />
                    <span className="flex-1 text-xs text-slate-600 truncate">{e.concepto}</span>
                    <span className="text-xs font-black text-slate-700">{fmt(e.monto)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Total pendiente</span>
              <span className="font-bold text-slate-700">{fmt(totales.porCobrar)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas financieras */}
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h3 className="font-bold text-slate-700 text-xs uppercase tracking-tighter flex items-center gap-2 mb-4">
          <AlertCircle size={15} className="text-amber-500" /> Alertas Financieras
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-red-50 border-red-200 text-red-700">
            <AlertCircle size={15} />
            <div>
              <p className="font-black text-lg leading-none">{alertas.morosos}</p>
              <p className="text-[11px] font-bold">Alumnos morosos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-orange-50 border-orange-200 text-orange-700">
            <Clock size={15} />
            <div>
              <p className="font-black text-lg leading-none">{alertas.vencidos}</p>
              <p className="text-[11px] font-bold">Cuotas vencidas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-700">
            <CreditCard size={15} />
            <div>
              <p className="font-black text-lg leading-none">{alertas.egresosPendientes}</p>
              <p className="text-[11px] font-bold">Egresos pendientes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}