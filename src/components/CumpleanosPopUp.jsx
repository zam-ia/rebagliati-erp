// src/components/CumpleanosPopUp.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Gift, X, Users } from 'lucide-react';

const getInitials = (nombre, apellido) =>
  `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();

const formatoCumple = (fecha) => {
  if (!fecha) return '';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
};

export default function CumpleanosPopUp() {
  const [cumpleaneros, setCumpleaneros] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = hoy.getMonth() + 1;

    const visto = localStorage.getItem('cumple_visto_fecha');
    const hoyStr = `${hoy.getFullYear()}-${mes}-${dia}`;
    if (visto === hoyStr) return;

    const cargarCumpleaneros = async () => {
      const [empRes, locRes] = await Promise.all([
        supabase.from('empleados')
          .select('nombre, apellido, fecha_nacimiento, foto_url, area')
          .eq('estado', 'activo')
          .not('fecha_nacimiento', 'is', null),
        supabase.from('locadores')
          .select('nombre, apellido, fecha_nacimiento, foto_url, area')
          .eq('estado', 'activo')
          .not('fecha_nacimiento', 'is', null)
      ]);

      const todos = [
        ...(empRes.data || []).map(e => ({ ...e, tipo: 'planilla' })),
        ...(locRes.data || []).map(l => ({ ...l, tipo: 'complementario' }))
      ];

      const cumplenHoy = todos.filter(p => {
        if (!p.fecha_nacimiento) return false;
        const parts = p.fecha_nacimiento.split('-');
        const mesNac = parseInt(parts[1]);
        const diaNac = parseInt(parts[2]);
        return mesNac === mes && diaNac === dia;
      });

      if (cumplenHoy.length > 0) {
        setCumpleaneros(cumplenHoy);
        setVisible(true);
        localStorage.setItem('cumple_visto_fecha', hoyStr);
      }
    };

    cargarCumpleaneros();
  }, []);

  const cerrar = () => {
    setVisible(false);
    localStorage.setItem('cumple_visto_fecha', new Date().toISOString().split('T')[0]);
  };

  if (!visible || cumpleaneros.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-200 rounded-full opacity-20" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-pink-200 rounded-full opacity-20" />
        <div className="absolute top-2 right-2 text-4xl select-none">🎂</div>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Gift size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800">¡Feliz Cumpleaños!</h2>
              <p className="text-xs text-gray-500">
                {cumpleaneros.length > 1
                  ? `Hoy ${cumpleaneros.length} compañeros están de fiesta 🎉`
                  : 'Hoy un compañero está de fiesta 🎉'}
              </p>
            </div>
          </div>
          <button onClick={cerrar} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar mb-4">
          {cumpleaneros.map((p, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
              {p.foto_url ? (
                <img src={p.foto_url} className="w-10 h-10 rounded-full object-cover border-2 border-amber-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-sm font-bold">
                  {getInitials(p.nombre, p.apellido)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">
                  {p.apellido}, {p.nombre}
                </p>
                <p className="text-[11px] text-gray-500">{p.area || 'Sin área'}</p>
                <p className="text-[11px] text-amber-600 font-medium">{formatoCumple(p.fecha_nacimiento)}</p>
              </div>
              <span className="text-2xl">🎈</span>
            </div>
          ))}
        </div>

        <button
          onClick={cerrar}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-200"
        >
          ¡Felicitar y cerrar!
        </button>
      </div>
    </div>,
    document.body
  );
}