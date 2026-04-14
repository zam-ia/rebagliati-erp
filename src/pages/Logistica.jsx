// src/pages/Logistica.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Ruta corregida
import { Package, PlusCircle, Search, Edit, Trash2, X, CheckCircle, Truck, Building2, Calendar, DollarSign, Tag } from 'lucide-react';

function Logistica() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    tipo: 'Materiales', // 'Materiales', 'Servicios', 'Equipos', 'Otros'
    proveedor: '',
    monto: '',
    observaciones: ''
  });

  useEffect(() => {
    cargarCompras();
  }, []);

  const cargarCompras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('compras')
      .select('*')
      .order('fecha', { ascending: false });
    if (!error && data) setCompras(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.concepto || !formData.monto || !formData.proveedor) {
      alert('Completa los campos obligatorios: Concepto, Monto y Proveedor');
      return;
    }

    const compraData = {
      fecha: formData.fecha,
      concepto: formData.concepto,
      tipo: formData.tipo,
      proveedor: formData.proveedor,
      monto: parseFloat(formData.monto),
      observaciones: formData.observaciones || null,
      estado_pago: 'Pendiente', // Estado para control interno
    };

    if (editandoId) {
      // Actualizar compra existente
      const { error } = await supabase
        .from('compras')
        .update(compraData)
        .eq('id', editandoId);
      if (error) {
        alert('Error al actualizar: ' + error.message);
      } else {
        // También actualizar el egreso asociado si existe
        await supabase
          .from('egresos')
          .update({
            fecha: compraData.fecha,
            concepto: compraData.concepto,
            categoria: compraData.tipo,
            proveedor: compraData.proveedor,
            monto: compraData.monto,
          })
          .eq('origen', 'logistica_compra')
          .eq('origen_id', editandoId);
        resetForm();
        cargarCompras();
      }
    } else {
      // Insertar nueva compra
      const { data: nuevaCompra, error: compraError } = await supabase
        .from('compras')
        .insert(compraData)
        .select()
        .single();
      if (compraError) {
        alert('Error al registrar compra: ' + compraError.message);
        return;
      }

      // Insertar egreso automáticamente (para que aparezca en Finanzas)
      const { error: egresoError } = await supabase
        .from('egresos')
        .insert({
          fecha: nuevaCompra.fecha,
          concepto: nuevaCompra.concepto,
          area: 'Logística',
          categoria: nuevaCompra.tipo,
          proveedor: nuevaCompra.proveedor,
          monto: nuevaCompra.monto,
          estado: 'Pendiente',
          origen: 'logistica_compra',
          origen_id: nuevaCompra.id,
        });
      if (egresoError) console.error('Error al crear egreso:', egresoError);
      
      resetForm();
      cargarCompras();
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta compra? También se eliminará el egreso asociado.')) return;
    
    // Eliminar egreso asociado primero
    await supabase
      .from('egresos')
      .delete()
      .eq('origen', 'logistica_compra')
      .eq('origen_id', id);
    
    // Eliminar compra
    const { error } = await supabase
      .from('compras')
      .delete()
      .eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargarCompras();
  };

  const handleEditar = (compra) => {
    setFormData({
      fecha: compra.fecha,
      concepto: compra.concepto,
      tipo: compra.tipo,
      proveedor: compra.proveedor,
      monto: compra.monto,
      observaciones: compra.observaciones || ''
    });
    setEditandoId(compra.id);
    setMostrarForm(true);
  };

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      tipo: 'Materiales',
      proveedor: '',
      monto: '',
      observaciones: ''
    });
    setEditandoId(null);
    setMostrarForm(false);
  };

  const comprasFiltradas = compras.filter(c =>
    c.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.proveedor.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalCompras = comprasFiltradas.reduce((sum, c) => sum + c.monto, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Package className="text-[#185FA5]" size={28} />
            Logística y Compras
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de adquisiciones y proveedores</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-[#11284e] hover:bg-[#185FA5] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <PlusCircle size={18} /> Registrar Compra
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl"><DollarSign size={20} className="text-emerald-700"/></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Total en compras (filtrado)</p>
              <p className="text-2xl font-black text-slate-800">S/ {totalCompras.toLocaleString('es-PE')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl"><Truck size={20} className="text-blue-700"/></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Proveedores activos</p>
              <p className="text-2xl font-black text-slate-800">{new Set(compras.map(c => c.proveedor)).size}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl"><Tag size={20} className="text-amber-700"/></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Órdenes registradas</p>
              <p className="text-2xl font-black text-slate-800">{compras.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por concepto o proveedor..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] outline-none"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Formulario (Modal) */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">
                {editandoId ? 'Editar Compra' : 'Nueva Compra / Gasto'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-[#185FA5] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Gasto *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-[#185FA5] outline-none"
                  >
                    <option value="Materiales">📦 Materiales</option>
                    <option value="Servicios">⚙️ Servicios</option>
                    <option value="Equipos">🖥️ Equipos</option>
                    <option value="Otros">📄 Otros</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Concepto / Descripción *</label>
                  <input
                    type="text"
                    value={formData.concepto}
                    onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                    placeholder="Ej. Compra de material de oficina, Servicio de mensajería..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-[#185FA5] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor *</label>
                  <input
                    type="text"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                    placeholder="Nombre o RUC"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-[#185FA5] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({...formData, monto: e.target.value})}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-[#185FA5] outline-none"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                  <textarea
                    rows="2"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    placeholder="Notas adicionales..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-[#185FA5] outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={resetForm} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2 bg-[#11284e] text-white text-sm font-bold rounded-xl hover:bg-[#185FA5] flex items-center gap-2">
                  <CheckCircle size={16} /> {editandoId ? 'Actualizar' : 'Guardar y enviar a Finanzas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de compras */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-xs font-black text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Concepto</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-center">Estado Pago</th>
                <th className="px-5 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : comprasFiltradas.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay compras registradas</td></tr>
              ) : (
                comprasFiltradas.map(compra => (
                  <tr key={compra.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs">{compra.fecha}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{compra.concepto}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {compra.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3 flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      {compra.proveedor}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-800">
                      S/ {compra.monto.toLocaleString('es-PE')}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${compra.estado_pago === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {compra.estado_pago || 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditar(compra)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleEliminar(compra.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t">
              <tr>
                <td colSpan="4" className="px-5 py-3 text-right font-bold text-slate-600">Total compras:</td>
                <td className="px-5 py-3 text-right font-black text-slate-800">S/ {totalCompras.toLocaleString('es-PE')}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Info de integración */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 flex items-start gap-3">
        <Package size={16} className="flex-shrink-0 mt-0.5" />
        <p>
          Las compras registradas se envían automáticamente al <strong>módulo de Finanzas</strong> como egresos pendientes. 
          Desde allí podrás realizar el pago y actualizar el estado.
        </p>
      </div>
    </div>
  );
}

export default Logistica;