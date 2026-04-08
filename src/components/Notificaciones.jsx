import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    cargarNotificaciones();
    // Suscripción en tiempo real
    const subscription = supabase
      .channel('notificaciones')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, payload => {
        setNotificaciones(prev => [payload.new, ...prev]);
        setNoLeidas(prev => prev + 1);
      })
      .subscribe();
    return () => subscription.unsubscribe();
  }, []);

  const cargarNotificaciones = async () => {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setNotificaciones(data || []);
    const { count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false);
    setNoLeidas(count || 0);
  };

  const marcarLeida = async (id, link) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setNoLeidas(prev => Math.max(0, prev - 1));
    if (link) navigate(link);
    setAbierto(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-gray-50"
        style={{ borderColor: '#e8ecf0', color: '#64748b' }}
      >
        <BellIcon />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white"
            style={{ background: '#ef4444', fontSize: 8, lineHeight: 1 }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          <div className="p-3 border-b font-semibold text-sm text-gray-700">Notificaciones</div>
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">Sin notificaciones</div>
            ) : (
              notificaciones.map(n => (
                <div
                  key={n.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!n.leida ? 'bg-blue-50' : ''}`}
                  onClick={() => marcarLeida(n.id, n.link)}
                >
                  <div className="font-semibold text-sm">{n.titulo}</div>
                  <div className="text-xs text-gray-500 mt-1">{n.descripcion}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}