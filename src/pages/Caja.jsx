import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function Caja() {
  const [pagos, setPagos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [totalDia, setTotalDia] = useState(0);
  const [totalEgresos, setTotalEgresos] = useState(0); // Nuevo estado
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    inscripcion_id: '',
    monto: '',
    tipo_comprobante: 'boleta',
    numero_comprobante: '',
    metodo_pago: 'efectivo',
    turno: 'mañana',
    cajera: ''
  });

  // Cálculo del saldo real
  const saldoReal = totalDia - totalEgresos;

  useEffect(() => {
    cargarDatos();
    cargarEgresosPagados(); // Carga inicial de egresos
  }, []);

  const cargarEgresosPagados = async () => {
    const { data, error } = await supabase
      .from('egresos')
      .select('monto')
      .eq('estado', 'Pagado');
    
    if (!error && data) {
      const total = data.reduce((sum, e) => sum + e.monto, 0);
      setTotalEgresos(total);
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    
    // Cargar pagos del día
    const hoy = new Date().toISOString().split('T')[0];
    const { data: pagosData } = await supabase
      .from('pagos')
      .select('*, inscripciones(programa, participante_id)')
      .gte('created_at', hoy)
      .order('created_at', { ascending: false });
    setPagos(pagosData || []);
    
    // Calcular total del día
    const total = pagosData?.reduce((sum, p) => sum + p.monto, 0) || 0;
    setTotalDia(total);
    
    // Cargar inscripciones pendientes para asociar pago
    const { data: inscData } = await supabase
      .from('inscripciones')
      .select('id, programa')
      .in('estado', ['pendiente', 'parcial'])
      .limit(50);
    setInscripciones(inscData || []);
    
    setCargando(false);
  };

  const registrarPago = async () => {
    if (!formData.inscripcion_id || !formData.monto) {
      alert('Completa los campos obligatorios');
      return;
    }
    
    const { error } = await supabase.from('pagos').insert([{
      inscripcion_id: parseInt(formData.inscripcion_id),
      monto: parseFloat(formData.monto),
      tipo_comprobante: formData.tipo_comprobante,
      numero_comprobante: formData.numero_comprobante,
      metodo_pago: formData.metodo_pago,
      turno: formData.turno,
      cajera: formData.cajera || 'Ejecutiva'
    }]);
    
    if (!error) {
      alert('Pago registrado');
      setMostrarForm(false);
      setFormData({ inscripcion_id: '', monto: '', tipo_comprobante: 'boleta', numero_comprobante: '', metodo_pago: 'efectivo', turno: 'mañana', cajera: '' });
      cargarDatos();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const alertaDeposito = (monto) => {
    if (monto > 700) {
      alert('⚠️ Monto superior a S/ 700 - Realizar depósito bancario');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Caja y Pagos</h1>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: '#185FA5' }}
        >
          + Registrar Pago
        </button>
      </div>

      {/* Tarjeta de cuadre actualizada */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Cuadre de caja - Turno actual</h2>
        <div className="text-3xl font-bold text-primary" style={{ color: '#185FA5' }}>
          S/ {totalDia.toFixed(2)}
        </div>
        <p className="text-gray-500 text-sm mt-1">Total recaudado hoy</p>
        
        {/* Sección de Saldo Real e Integración con Egresos */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            Egresos pagados: S/ {totalEgresos.toFixed(2)}<br/>
            Saldo real en caja: <span className="font-bold" style={{ color: saldoReal >= 0 ? '#10b981' : '#ef4444' }}>
              S/ {saldoReal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Nuevo Pago</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Inscripción *</label>
              <select
                value={formData.inscripcion_id}
                onChange={(e) => setFormData({...formData, inscripcion_id: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full"
              >
                <option value="">Seleccionar</option>
                {inscripciones.map(ins => (
                  <option key={ins.id} value={ins.id}>{ins.programa}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Monto (S/) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => {
                  setFormData({...formData, monto: e.target.value});
                  alertaDeposito(parseFloat(e.target.value));
                }}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Tipo Comprobante</label>
              <select
                value={formData.tipo_comprobante}
                onChange={(e) => setFormData({...formData, tipo_comprobante: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full"
              >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">N° Comprobante</label>
              <input
                type="text"
                value={formData.numero_comprobante}
                onChange={(e) => setFormData({...formData, numero_comprobante: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Método de Pago</label>
              <select
                value={formData.metodo_pago}
                onChange={(e) => setFormData({...formData, metodo_pago: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Turno</label>
              <select
                value={formData.turno}
                onChange={(e) => setFormData({...formData, turno: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Cajera</label>
              <input
                type="text"
                value={formData.cajera}
                onChange={(e) => setFormData({...formData, cajera: e.target.value})}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Nombre"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={registrarPago} className="bg-primary text-white px-6 py-2 rounded-lg" style={{ backgroundColor: '#185FA5' }}>
              Guardar
            </button>
            <button onClick={() => setMostrarForm(false)} className="bg-gray-300 px-6 py-2 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de pagos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Programa</th>
                <th className="p-3 text-left">Monto</th>
                <th className="p-3 text-left">Método</th>
                <th className="p-3 text-left">Comprobante</th>
                <th className="p-3 text-left">Turno</th>
                <th className="p-3 text-left">Cajera</th>
                <th className="p-3 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="7" className="text-center p-4">Cargando...</td></tr>
              ) : pagos.length === 0 ? (
                <tr><td colSpan="7" className="text-center p-4 text-gray-500">Sin pagos hoy</td></tr>
              ) : (
                pagos.map(pago => (
                  <tr key={pago.id} className="border-t">
                    <td className="p-3">{pago.inscripciones?.programa || '-'}</td>
                    <td className="p-3">S/ {pago.monto}</td>
                    <td className="p-3 capitalize">{pago.metodo_pago}</td>
                    <td className="p-3">{pago.tipo_comprobante} {pago.numero_comprobante}</td>
                    <td className="p-3 capitalize">{pago.turno}</td>
                    <td className="p-3">{pago.cajera}</td>
                    <td className="p-3">{new Date(pago.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Caja;