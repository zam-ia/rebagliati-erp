import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, X, Eye, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TabPlanillaPagos() {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7));
  const [colaboradores, setColaboradores] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState('planilla');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: emp } = await supabase.from('empleados').select('*').eq('estado', 'activo');
      const { data: loc } = await supabase.from('locadores').select('*').eq('estado', 'activo');
      const primerDia = `${mesSeleccionado}-01`;
      const ultimoDia = new Date(mesSeleccionado.split('-')[0], mesSeleccionado.split('-')[1], 0).toISOString().slice(0, 10);

      const { data: asis } = await supabase
        .from('asistencia')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia);

      setColaboradores(emp || []);
      setLocadores(loc || []);
      setAsistencias(asis || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [mesSeleccionado]);

  const calcularDetallePlanilla = (emp) => {
    const sueldoBasico = Number(emp.sueldo_bruto || 0);
    const asigFamiliar = emp.tiene_hijos ? 102.50 : 0;
    const comodato = Number(emp.comodato || 0);
    const movilidad = Number(emp.movilidad || 0);
    const totalRemun = sueldoBasico + asigFamiliar + comodato + movilidad;

    // Retenciones
    const esAFP = emp.sistema_pensionario === 'AFP';
    const pensionMonto = esAFP ? (totalRemun * 0.1334) : (totalRemun * 0.13);
    
    const asisEmp = asistencias.filter(a => String(a.empleado_id) === String(emp.id));
    let minsTardanza = 0;
    let faltasCount = 0;
    asisEmp.forEach(a => {
      if (!a.justificacion) {
        if (a.tardanza) minsTardanza += Number(a.minutos || 0);
        if (a.falta) faltasCount++;
      }
    });

    const costoDia = sueldoBasico / 30;
    const costoMin = costoDia / 8 / 60;
    const descTardanzas = minsTardanza * costoMin;
    const descFaltas = costoDia * faltasCount;

    const totalDescuentos = pensionMonto + descTardanzas + descFaltas + Number(emp.adelantos || 0);
    const netoPagar = totalRemun - totalDescuentos;

    return {
      sueldoBasico, asigFamiliar, comodato, movilidad, totalRemun,
      pensionMonto, descTardanzas, descFaltas, minsTardanza, faltasCount,
      totalDescuentos, netoPagar,
      essalud: totalRemun * 0.09,
      sistema: emp.sistema_pensionario,
      cuenta: emp.numero_cuenta || '—'
    };
  };

  const formatNumber = (num) => new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(num || 0);

  // Exportar CSV (resumen)
  const exportarCSV = () => {
    const headers = ['Colaborador', 'Sueldo Base', 'Incidencias', 'Descuentos', 'Neto a Pagar', 'Número de Cuenta'];
    const rows = colaboradores.map(emp => {
      const calc = calcularDetallePlanilla(emp);
      const incidencias = `${calc.minsTardanza > 0 ? calc.minsTardanza + 'm tardanza ' : ''}${calc.faltasCount > 0 ? calc.faltasCount + ' falta(s)' : ''}`.trim() || '—';
      return [
        `${emp.nombre} ${emp.apellido}`,
        formatNumber(calc.sueldoBasico),
        incidencias,
        formatNumber(calc.totalDescuentos),
        formatNumber(calc.netoPagar),
        calc.cuenta
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `planilla_${mesSeleccionado}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Exportar PDF con todas las boletas (una por página)
  const exportarPDFMasivo = () => {
    const doc = new jsPDF();
    colaboradores.forEach((emp, index) => {
      const calc = calcularDetallePlanilla(emp);
      if (index > 0) doc.addPage();
      
      doc.setFontSize(14);
      doc.text('BOLETA DE PAGO', 14, 20);
      doc.setFontSize(10);
      doc.text(`Periodo: ${mesSeleccionado}`, 14, 30);
      doc.text(`Colaborador: ${emp.nombre} ${emp.apellido}`, 14, 38);
      doc.text(`Cargo: ${emp.cargo || '—'}`, 14, 46);
      doc.text(`DNI: ${emp.dni || '—'}`, 14, 54);
      
      autoTable(doc, {
        startY: 65,
        head: [['Concepto', 'Monto (S/)']],
        body: [
          ['Sueldo Básico', formatNumber(calc.sueldoBasico)],
          ['Asignación Familiar', formatNumber(calc.asigFamiliar)],
          ['Comodato', formatNumber(calc.comodato)],
          ['Total Remuneración', formatNumber(calc.totalRemun)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [24, 95, 165] },
        margin: { left: 14 }
      });
      let y = doc.lastAutoTable.finalY + 10;
      
      autoTable(doc, {
        startY: y,
        head: [['Descuento', 'Monto (S/)']],
        body: [
          [calc.sistema, formatNumber(calc.pensionMonto)],
          ['Tardanzas', formatNumber(calc.descTardanzas)],
          ['Faltas', formatNumber(calc.descFaltas)],
          ['Adelantos', formatNumber(emp.adelantos || 0)],
          ['Total Descuentos', formatNumber(calc.totalDescuentos)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [24, 95, 165] },
        margin: { left: 14 }
      });
      y = doc.lastAutoTable.finalY + 10;
      
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.text(`Neto a Pagar: S/ ${formatNumber(calc.netoPagar)}`, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 10;
      doc.text(`Número de Cuenta: ${calc.cuenta}`, 14, y);
    });
    doc.save(`boletas_${mesSeleccionado}.pdf`);
  };

  // Exportar boleta individual (desde modal)
  const exportarBoletaIndividual = (emp) => {
    const calc = calcularDetallePlanilla(emp);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('BOLETA DE PAGO', 14, 20);
    doc.setFontSize(10);
    doc.text(`Periodo: ${mesSeleccionado}`, 14, 30);
    doc.text(`Colaborador: ${emp.nombre} ${emp.apellido}`, 14, 38);
    doc.text(`Cargo: ${emp.cargo || '—'}`, 14, 46);
    doc.text(`DNI: ${emp.dni || '—'}`, 14, 54);
    
    autoTable(doc, {
      startY: 65,
      head: [['Concepto', 'Monto (S/)']],
      body: [
        ['Sueldo Básico', formatNumber(calc.sueldoBasico)],
        ['Asignación Familiar', formatNumber(calc.asigFamiliar)],
        ['Comodato', formatNumber(calc.comodato)],
        ['Total Remuneración', formatNumber(calc.totalRemun)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [24, 95, 165] },
      margin: { left: 14 }
    });
    let y = doc.lastAutoTable.finalY + 10;
    
    autoTable(doc, {
      startY: y,
      head: [['Descuento', 'Monto (S/)']],
      body: [
        [calc.sistema, formatNumber(calc.pensionMonto)],
        ['Tardanzas', formatNumber(calc.descTardanzas)],
        ['Faltas', formatNumber(calc.descFaltas)],
        ['Adelantos', formatNumber(emp.adelantos || 0)],
        ['Total Descuentos', formatNumber(calc.totalDescuentos)]
      ],
      theme: 'striped',
      headStyles: { fillColor: [24, 95, 165] },
      margin: { left: 14 }
    });
    y = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text(`Neto a Pagar: S/ ${formatNumber(calc.netoPagar)}`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.text(`Número de Cuenta: ${calc.cuenta}`, 14, y);
    doc.save(`boleta_${emp.nombre}_${emp.apellido}_${mesSeleccionado}.pdf`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      {/* Header con opciones de exportación general */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tighter">FINANZAS & PLANILLAS</h2>
          <p className="text-blue-600 font-bold text-xs uppercase tracking-widest">Rebagliati Diplomados S.A.C.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={exportarCSV} className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-50 shadow-sm transition-all">
             <Download size={16} /> EXPORTAR RESUMEN (CSV)
           </button>
           <button onClick={exportarPDFMasivo} className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-50 shadow-sm transition-all">
             <Printer size={16} /> BOLETAS COMPLETAS
           </button>
           <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="border-2 border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" />
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-5">Colaborador</th>
              <th className="p-5 text-right">Sueldo Base</th>
              <th className="p-5 text-center">Incidencias</th>
              <th className="p-5 text-right">Descuentos</th>
              <th className="p-5 text-right">Neto a Pagar</th>
              <th className="p-5 text-center">Cuenta Bancaria</th>
              <th className="p-5 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {colaboradores.map(emp => {
              const c = calcularDetallePlanilla(emp);
              return (
                <tr key={emp.id} className="hover:bg-blue-50/40 transition-all group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                        <img src={emp.foto_url || `https://ui-avatars.com/api/?name=${emp.nombre}+${emp.apellido}&background=185FA5&color=fff`} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-gray-900 font-black text-sm">{emp.nombre} {emp.apellido}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{emp.cargo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-right font-mono text-gray-500">S/ {formatNumber(c.sueldoBasico)}</td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                       {c.minsTardanza > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[9px] font-black">{c.minsTardanza}m</span>}
                       {c.faltasCount > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[9px] font-black">{c.faltasCount}F</span>}
                       {c.minsTardanza === 0 && c.faltasCount === 0 && <span className="text-gray-300">—</span>}
                    </div>
                   </td>
                  <td className="p-5 text-right text-red-500 font-bold">- S/ {formatNumber(c.totalDescuentos)}</td>
                  <td className="p-5 text-right font-black text-blue-700 text-lg">S/ {formatNumber(c.netoPagar)}</td>
                  <td className="p-5 text-center text-xs font-mono text-gray-500">{c.cuenta}</td>
                  <td className="p-5 text-center">
                    <button 
                      onClick={() => setEmpleadoSeleccionado(emp)}
                      className="p-2 hover:bg-blue-600 hover:text-white rounded-full transition-all text-blue-600"
                    >
                      <Eye size={20} />
                    </button>
                   </td>
                 </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALLE DE BOLETA (ESTILO PDF) */}
      {empleadoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            {/* Header del Modal */}
            <div className="bg-gray-900 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black text-xl uppercase tracking-tighter">Detalle de Boleta</h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{mesSeleccionado}</p>
              </div>
              <button onClick={() => setEmpleadoSeleccionado(null)} className="hover:bg-white/10 p-2 rounded-full transition-all"><X /></button>
            </div>

            {/* Contenido Boleta (Simil PDF adjunto) */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Info Empresa/Empleado */}
              <div className="grid grid-cols-2 gap-8 text-[11px] border-b pb-6">
                <div>
                  <p className="font-black text-blue-600 mb-2 uppercase">Empleador</p>
                  <p className="font-bold text-gray-800">CONSORCIO REBAGLIATI DIPLOMADOS SAC</p>
                  <p className="text-gray-500">RUC: 20601225175</p>
                </div>
                <div>
                  <p className="font-black text-blue-600 mb-2 uppercase">Trabajador</p>
                  <p className="font-bold text-gray-800">{empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}</p>
                  <p className="text-gray-500">DNI: {empleadoSeleccionado.dni || '—'}</p>
                  <p className="text-gray-500">CTA: {empleadoSeleccionado.numero_cuenta || 'No registrada'}</p>
                </div>
              </div>

              {/* Cuerpo de la Boleta */}
              <div className="grid grid-cols-2 gap-0 border rounded-2xl overflow-hidden">
                {/* Remuneraciones */}
                <div className="border-r">
                  <div className="bg-gray-50 p-3 font-black text-[10px] uppercase border-b">Remuneraciones</div>
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between"><span>Sueldo Básico</span><span className="font-mono">S/ {formatNumber(calcularDetallePlanilla(empleadoSeleccionado).sueldoBasico)}</span></div>
                    {empleadoSeleccionado.tiene_hijos && <div className="flex justify-between"><span>Asignación Familiar</span><span className="font-mono">S/ 102.50</span></div>}
                    <div className="flex justify-between"><span>Comodato</span><span className="font-mono">S/ {formatNumber(empleadoSeleccionado.comodato)}</span></div>
                    <div className="flex justify-between border-t pt-2 font-black text-blue-600"><span>TOTAL BRUTO</span><span className="font-mono">S/ {formatNumber(calcularDetallePlanilla(empleadoSeleccionado).totalRemun)}</span></div>
                  </div>
                </div>
                {/* Descuentos */}
                <div>
                  <div className="bg-gray-50 p-3 font-black text-[10px] uppercase border-b">Retenciones / Dsctos</div>
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between"><span>{calcularDetallePlanilla(empleadoSeleccionado).sistema}</span><span className="font-mono text-red-500">-{formatNumber(calcularDetallePlanilla(empleadoSeleccionado).pensionMonto)}</span></div>
                    {calcularDetallePlanilla(empleadoSeleccionado).minsTardanza > 0 && <div className="flex justify-between"><span>Tardanzas</span><span className="font-mono text-red-500">-{formatNumber(calcularDetallePlanilla(empleadoSeleccionado).descTardanzas)}</span></div>}
                    {calcularDetallePlanilla(empleadoSeleccionado).faltasCount > 0 && <div className="flex justify-between"><span>Faltas</span><span className="font-mono text-red-500">-{formatNumber(calcularDetallePlanilla(empleadoSeleccionado).descFaltas)}</span></div>}
                    <div className="flex justify-between border-t pt-2 font-black text-red-600"><span>TOTAL DSCTOS</span><span className="font-mono">S/ {formatNumber(calcularDetallePlanilla(empleadoSeleccionado).totalDescuentos)}</span></div>
                  </div>
                </div>
              </div>

              {/* Total Neto */}
              <div className="bg-blue-600 rounded-2xl p-6 text-white flex justify-between items-center shadow-lg shadow-blue-200">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-80">Neto a percibir</p>
                  <p className="text-2xl font-black">S/ {formatNumber(calcularDetallePlanilla(empleadoSeleccionado).netoPagar)}</p>
                </div>
                <FileText size={40} className="opacity-20" />
              </div>
            </div>

            {/* Footer Modal con Exportación Individual */}
            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button onClick={() => exportarBoletaIndividual(empleadoSeleccionado)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
                <Download size={16} /> Descargar PDF Boleta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}