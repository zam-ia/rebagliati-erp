// src/pages/rrhh/TabDirectorio.jsx
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Users, Briefcase, Phone, Mail, MapPin, Gift, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // ← se usa como función

// ── Helpers ───────────────────────────────────────────────────────────────
const formatFecha = (s) => {
  if (!s) return '—';
  try {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  } catch { return s; }
};

const formatoCumple = (fecha) => {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  if (!m || !d) return '—';
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]}`;
};

const esCumpleEsteMes = (fecha) => {
  if (!fecha) return false;
  const mesActual = new Date().getMonth() + 1;
  const mesPersona = parseInt(fecha.split('-')[1]);
  return mesPersona === mesActual;
};

const getInitials = (nombre, apellido) =>
  `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

const formatSoles = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
};

export default function TabDirectorio() {
  const [tipo, setTipo] = useState('planilla'); // 'planilla' | 'complementario'
  const [empleados, setEmpleados] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const [empRes, locRes] = await Promise.all([
        supabase.from('empleados').select('*').order('apellido'),
        supabase.from('locadores').select('*').eq('estado', 'activo').order('apellido')
      ]);
      setEmpleados(empRes.data || []);
      setLocadores(locRes.data || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const datos = useMemo(() => {
    if (tipo === 'planilla') return empleados;
    return locadores;
  }, [tipo, empleados, locadores]);

  // ── Descargar PDF ────────────────────────────────────────────────────────
  const descargarPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const titulo = tipo === 'planilla' ? 'Directorio de Planilla' : 'Directorio de Complementarios';
    const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFont('helvetica', 'bold').setFontSize(14);
    doc.text(titulo, 14, 20);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(`Generado el ${fecha}`, 14, 26);

    const headers = [['Nombre', 'Cargo/Modalidad', 'Área', 'Teléfono', 'Correo', 'Sueldo', 'Cumpleaños']];
    const rows = datos.map(p => [
      `${p.apellido || ''} ${p.nombre || ''}`.trim(),
      p.cargo || p.modalidad || '—',
      p.area || '—',
      p.telefono || '—',
      p.correo || '—',
      tipo === 'planilla' ? formatSoles(p.sueldo_total || p.sueldo_bruto) : formatSoles(p.sueldo_base),
      formatoCumple(p.fecha_nacimiento)
    ]);

    autoTable(doc, {
      startY: 32,
      head: headers,
      body: rows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [17, 40, 78], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
    });

    doc.save(`directorio_${tipo}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // ── Descargar Excel (XML Spreadsheet 2003) ──────────────────────────────
  const descargarExcel = () => {
    // Construir archivo XML compatible con Excel
    const titulo = tipo === 'planilla' ? 'Planilla' : 'Complementarios';
    const encabezados = ['Nombre', 'Cargo/Modalidad', 'Área', 'Teléfono', 'Correo', 'Sueldo', 'Cumpleaños'];

    // Convertir datos a formato de texto (sin formato moneda complejo)
    const filas = datos.map(p => [
      `${p.apellido || ''} ${p.nombre || ''}`.trim(),
      p.cargo || p.modalidad || '—',
      p.area || '—',
      p.telefono || '—',
      p.correo || '—',
      tipo === 'planilla' ? (p.sueldo_total || p.sueldo_bruto || 0) : (p.sueldo_base || 0),
      formatoCumple(p.fecha_nacimiento)
    ]);

    // Plantilla XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += `<Worksheet ss:Name="Directorio ${titulo}">\n<Table>\n`;

    // Encabezados
    xml += '<Row>';
    encabezados.forEach(h => {
      xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
    });
    xml += '</Row>\n';

    // Filas de datos
    filas.forEach(fila => {
      xml += '<Row>';
      fila.forEach(valor => {
        const tipoDato = typeof valor === 'number' ? 'Number' : 'String';
        xml += `<Cell><Data ss:Type="${tipoDato}">${valor}</Data></Cell>`;
      });
      xml += '</Row>\n';
    });

    xml += '</Table>\n</Worksheet>\n</Workbook>';

    // Descargar como .xls
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `directorio_${tipo}_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Cargando directorio...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0B1527] tracking-tight flex items-center gap-2">
            <Users size={24} className="text-[#185FA5]" />
            Directorio Corporativo
          </h2>
          <p className="text-slate-400 text-sm mt-1">Consulta rápida de contactos, sueldos y cumpleaños</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTipo('planilla')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                tipo === 'planilla' ? 'bg-white text-[#185FA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={14} /> Planilla
            </button>
            <button
              onClick={() => setTipo('complementario')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                tipo === 'complementario' ? 'bg-white text-[#185FA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase size={14} /> Complementarios
            </button>
          </div>

          {/* ⭐ Botones de descarga (Excel + PDF) */}
          <div className="flex gap-2">
            <button
              onClick={descargarExcel}
              className="bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={descargarPDF}
              className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Download size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla ────────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Colaborador</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  {tipo === 'planilla' ? 'Cargo' : 'Modalidad'}
                </th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Área</th>
                <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Contacto</th>
                <th className="p-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">Sueldo</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Cumpleaños</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {datos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 italic">
                    No hay registros para mostrar.
                  </td>
                </tr>
              ) : (
                datos.map((p) => {
                  const cumple = p.fecha_nacimiento;
                  const destacar = esCumpleEsteMes(cumple);
                  return (
                    <tr key={p.id} className={`hover:bg-blue-50/30 transition-colors ${destacar ? 'bg-amber-50/50' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {p.foto_url ? (
                            <img src={p.foto_url} alt="foto" className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-md" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-[#185FA5] flex items-center justify-center text-xs font-bold shadow-inner">
                              {getInitials(p.nombre, p.apellido)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-800 text-xs">
                              {p.apellido}, {p.nombre}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {p.distrito || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-600 font-medium">
                        {tipo === 'planilla' ? p.cargo : p.modalidad}
                      </td>
                      <td className="p-4">
                        <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                          {p.area || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <Phone size={11} className="text-gray-400 flex-shrink-0" />
                            <span>{p.telefono || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-blue-600">
                            <Mail size={11} className="text-blue-400 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{p.correo || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-xs text-emerald-700">
                        {tipo === 'planilla'
                          ? formatSoles(p.sueldo_total || p.sueldo_bruto)
                          : formatSoles(p.sueldo_base)}
                      </td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                          destacar
                            ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                            : 'bg-gray-50 text-gray-600'
                        }`}>
                          {destacar && <Gift size={12} className="text-amber-500" />}
                          {formatoCumple(cumple)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}