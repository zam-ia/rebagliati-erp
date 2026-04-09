import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Kardex() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo: 'Ingreso',
    producto_id: '',
    lote_id: '',
    cantidad: 1,
    almacen_origen_id: '',
    almacen_destino_id: '',
    motivo: '',
    documento_soporte: ''
  });

  const cargarDatos = async () => {
    setLoading(true);
    const [movRes, prodRes, almRes, lotesRes] = await Promise.all([
      supabase.from('movimientos_inventario').select('*, productos(nombre_comercial), inventario_lotes(lote)').order('created_at', { ascending: false }).limit(50),
      supabase.from('productos').select('id, nombre_comercial').eq('activo', true),
      supabase.from('almacenes').select('id, nombre').eq('activo', true),
      supabase.from('inventario_lotes').select('id, lote, producto_id, stock_actual')
    ]);
    setMovimientos(movRes.data || []);
    setProductos(prodRes.data || []);
    setAlmacenes(almRes.data || []);
    setLotes(lotesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleSubmit = async () => {
    if (!form.producto_id || !form.cantidad || form.cantidad <= 0) {
      return alert('Producto y cantidad son obligatorios');
    }
    if (form.tipo === 'Ingreso' && !form.lote_id) {
      return alert('Para ingresos, debes seleccionar o crear un lote');
    }
    if (form.tipo === 'Salida' && !form.almacen_origen_id) {
      return alert('Para salidas, debes seleccionar el almacén de origen');
    }

    setLoading(true);
    const registro = { ...form };
    delete registro.id;

    let error;
    if (form.tipo === 'Ingreso') {
      const lote = lotes.find(l => l.id === form.lote_id);
      if (lote) {
        const nuevoStock = (lote.stock_actual || 0) + form.cantidad;
        const { error: updateError } = await supabase
          .from('inventario_lotes')
          .update({ stock_actual: nuevoStock })
          .eq('id', form.lote_id);
        error = updateError;
      }
    } else if (form.tipo === 'Salida') {
      const { data: lotesAlmacen } = await supabase
        .from('inventario_lotes')
        .select('*')
        .eq('producto_id', form.producto_id)
        .eq('almacen_id', form.almacen_origen_id)
        .gt('stock_actual', 0)
        .order('fecha_vencimiento', { ascending: true });
      if (!lotesAlmacen || lotesAlmacen.length === 0) {
        alert('No hay stock disponible para este producto en el almacén seleccionado');
        setLoading(false);
        return;
      }
      let cantidadRestante = form.cantidad;
      for (const l of lotesAlmacen) {
        if (cantidadRestante <= 0) break;
        const descontar = Math.min(l.stock_actual, cantidadRestante);
        const nuevoStock = l.stock_actual - descontar;
        await supabase.from('inventario_lotes').update({ stock_actual: nuevoStock }).eq('id', l.id);
        cantidadRestante -= descontar;
        registro.lote_id = l.id;
      }
      if (cantidadRestante > 0) {
        alert(`Stock insuficiente. Faltan ${cantidadRestante} unidades.`);
        setLoading(false);
        return;
      }
    }

    if (!error) {
      const { error: insertError } = await supabase.from('movimientos_inventario').insert([registro]);
      error = insertError;
    }

    if (error) alert('Error: ' + error.message);
    else {
      setModal(false);
      cargarDatos();
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kardex / Movimientos de Inventario</h1>
        <button
          onClick={() => setModal(true)}
          className="bg-[#185FA5] text-white px-4 py-2 rounded-lg"
        >
          + Nuevo Movimiento
        </button>
      </div>

      {loading && <div className="text-center py-10">Cargando...</div>}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-left">Producto</th>
              <th className="p-3 text-left">Lote</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-left">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-3">{new Date(m.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    m.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' :
                    m.tipo === 'Salida' ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                  }`}>{m.tipo}</span>
                </td>
                <td className="p-3">{m.productos?.nombre_comercial}</td>
                <td className="p-3">{m.inventario_lotes?.lote || '—'}</td>
                <td className="p-3 text-right font-medium">{m.cantidad}</td>
                <td className="p-3">{m.motivo || '—'}</td>
              </tr>
            ))}
            {movimientos.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">No hay movimientos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para nuevo movimiento */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Registrar Movimiento</h3>
            <div className="space-y-4">
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full border rounded-lg p-2">
                <option value="Ingreso">Ingreso (compra, devolución)</option>
                <option value="Salida">Salida (consumo, despacho)</option>
              </select>

              <select value={form.producto_id} onChange={e => setForm({...form, producto_id: e.target.value})} className="w-full border rounded-lg p-2">
                <option value="">Seleccionar producto</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial}</option>)}
              </select>

              {form.tipo === 'Ingreso' && (
                <select value={form.lote_id} onChange={e => setForm({...form, lote_id: e.target.value})} className="w-full border rounded-lg p-2">
                  <option value="">Seleccionar lote (o crea uno en Lotes y Vencimientos)</option>
                  {lotes.filter(l => l.producto_id === form.producto_id).map(l => <option key={l.id} value={l.id}>Lote: {l.lote} (Stock: {l.stock_actual})</option>)}
                </select>
              )}

              {form.tipo === 'Salida' && (
                <select value={form.almacen_origen_id} onChange={e => setForm({...form, almacen_origen_id: e.target.value})} className="w-full border rounded-lg p-2">
                  <option value="">Almacén de origen</option>
                  {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              )}

              <input type="number" placeholder="Cantidad" value={form.cantidad} onChange={e => setForm({...form, cantidad: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" />
              <input placeholder="Motivo (opcional)" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} className="w-full border rounded-lg p-2" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="bg-[#185FA5] text-white px-6 py-2 rounded-lg flex-1">Guardar</button>
              <button onClick={() => setModal(false)} className="border px-6 py-2 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}