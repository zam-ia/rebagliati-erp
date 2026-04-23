import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Wallet, Plus, DollarSign, CreditCard, Banknote, 
  CalendarClock, User, TrendingDown, TrendingUp, RefreshCw,
  FileText, AlertTriangle, X, Save
} from 'lucide-react';

function Caja() {
  const [pagos, setPagos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [totalDia, setTotalDia] = useState(0);
  const [totalEgresos, setTotalEgresos] = useState(0);
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

  const saldoReal = totalDia - totalEgresos;

  useEffect(() => {
    cargarDatos();
    cargarEgresosPagados();
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
    
    const hoy = new Date().toISOString().split('T')[0];
    const { data: pagosData } = await supabase
      .from('pagos')
      .select('*, inscripciones(programa, participante_id)')
      .gte('created_at', hoy)
      .order('created_at', { ascending: false });
    setPagos(pagosData || []);
    
    const total = pagosData?.reduce((sum, p) => sum + p.monto, 0) || 0;
    setTotalDia(total);
    
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
      alert('Pago registrado con éxito');
      setMostrarForm(false);
      setFormData({ 
        inscripcion_id: '', monto: '', tipo_comprobante: 'boleta', 
        numero_comprobante: '', metodo_pago: 'efectivo', turno: 'mañana', cajera: '' 
      });
      cargarDatos();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const alertaDeposito = (monto) => {
    if (monto > 700) {
      alert('⚠️ Monto superior a S/ 700 - Se recomienda realizar depósito bancario');
    }
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl shadow-sm">
              <Wallet className="w-6 h-6 text-[#185FA5]" />
            </div>
            <h1 className="text-3xl font-black text-[#0B1527] tracking-tight">Caja y Pagos</h1>
          </div>
          <p className="text-gray-500 text-sm font-medium ml-12">Gestión de ingresos diarios y cuadre de turno</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-gradient-to-r from-[#185FA5] to-[#144b82] hover:from-[#1a6ab8] hover:to-[#15569c] text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all"
        >
          <Plus size={20} /> Registrar Pago
        </button>
      </div>

      {/* Tarjeta de cuadre */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Total recaudado */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-blue-50 shadow-xl shadow-blue-100/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-70" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 rounded-2xl">
                <DollarSign className="w-5 h-5 text-[#185FA5]" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Recaudado Hoy</h3>
            </div>
            <div className="text-4xl font-black text-[#0B1527]">
              S/ {totalDia.toFixed(2)}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">Ingresos del turno actual</p>
          </div>
        </div>

        {/* Egresos pagados */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-blue-50 shadow-xl shadow-blue-100/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 rounded-2xl">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Egresos Pagados</h3>
            </div>
            <div className="text-4xl font-black text-[#0B1527]">
              S/ {totalEgresos.toFixed(2)}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">Compras, servicios, planillas</p>
          </div>
        </div>

        {/* Saldo Real */}
        <div className={`bg-white/80 backdrop-blur-sm rounded-3xl p-6 border shadow-xl relative overflow-hidden ${
          saldoReal >= 0 ? 'border-emerald-100 shadow-emerald-100/20' : 'border-red-100 shadow-red-100/20'
        }`}>
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 ${
            saldoReal >= 0 ? 'bg-emerald-50' : 'bg-red-50'
          }`} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-2xl ${saldoReal >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {saldoReal >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Saldo Real en Caja</h3>
            </div>
            <div className={`text-4xl font-black ${saldoReal >= 0 ? 'text-[#0B1527]' : 'text-red-600'}`}>
              S/ {saldoReal.toFixed(2)}
            </div>
            <p className={`text-xs mt-2 font-medium ${saldoReal >= 0 ? 'text-gray-400' : 'text-red-500'}`}>
              {saldoReal >= 0 ? 'Disponible para operar' : 'Atención: saldo negativo'}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de nuevo pago */}
      {mostrarForm && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 mb-8 border border-blue-50 shadow-xl shadow-blue-100/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <FileText className="w-5 h-5 text-[#185FA5]" />
              </div>
              <h2 className="text-xl font-black text-[#0B1527]">Nuevo Pago</h2>
            </div>
            <button 
              onClick={() => setMostrarForm(false)} 
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Inscripción *</label>
              <select
                value={formData.inscripcion_id}
                onChange={(e) => setFormData({...formData, inscripcion_id: e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-gray-700"
              >
                <option value="">Seleccionar inscripción</option>
                {inscripciones.map(ins => (
                  <option key={ins.id} value={ins.id}>{ins.programa} (ID: {ins.id})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Monto (S/) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => {
                  setFormData({...formData, monto: e.target.value});
                  alertaDeposito(parseFloat(e.target.value));
                }}
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Tipo Comprobante</label>
              <select
                value={formData.tipo_comprobante}
                onChange={(e) => setFormData({...formData, tipo_comprobante: e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
              >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">N° Comprobante</label>
              <input
                type="text"
                value={formData.numero_comprobante}
                onChange={(e) => setFormData({...formData, numero_comprobante: e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="001-000123"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Método de Pago</label>
              <select
                value={formData.metodo_pago}
                onChange={(e) => setFormData({...formData, metodo_pago: e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none capitalize"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Turno</label>
              <select
                value={formData.turno}
                onChange={(e) => setFormData({...formData, turno: e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none capitalize"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Cajera</label>
              <input
                type="text"
                value={formData.cajera}
                onChange={(e) => setFormData({...formData, cajera: e.target.value})}
                className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="Nombre de cajera"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button 
              onClick={() => setMostrarForm(false)} 
              className="px-5 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button 
              onClick={registrarPago} 
              className="bg-gradient-to-r from-[#185FA5] to-[#144b82] text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Save size={18} /> Guardar Pago
            </button>
          </div>
        </div>
      )}

      {/* Tabla de pagos */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-[#0B1527] text-lg">Historial de Pagos</h3>
          <button 
            onClick={cargarDatos} 
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
            title="Actualizar"
          >
            <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Programa</th>
                <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monto</th>
                <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Método</th>
                <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Comprobante</th>
                <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Turno</th>
                <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cajera</th>
                <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400">
                    <RefreshCw size={20} className="animate-spin inline mr-2" />
                    Cargando transacciones...
                  </td>
                </tr>
              ) : pagos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-gray-400">
                    <Wallet size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Sin pagos registrados en el día</p>
                  </td>
                </tr>
              ) : (
                pagos.map(pago => (
                  <tr key={pago.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{pago.inscripciones?.programa || '—'}</p>
                        <p className="text-xs text-gray-400">ID: {pago.inscripcion_id}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-[#185FA5]">S/ {pago.monto?.toFixed(2)}</span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium capitalize text-gray-700">
                        {pago.metodo_pago === 'efectivo' && <Banknote size={12} className="text-green-600" />}
                        {pago.metodo_pago === 'tarjeta' && <CreditCard size={12} className="text-purple-600" />}
                        {pago.metodo_pago}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700 font-medium">
                      {pago.tipo_comprobante} {pago.numero_comprobante && `#${pago.numero_comprobante}`}
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium capitalize">
                        <CalendarClock size={12} className="inline mr-1" />
                        {pago.turno}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700 font-medium flex items-center gap-1.5">
                      <User size={14} className="text-gray-400" />
                      {pago.cajera || '—'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(pago.created_at).toLocaleString('es-PE', { 
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
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