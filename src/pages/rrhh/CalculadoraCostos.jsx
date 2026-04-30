// src/pages/rrhh/CalculadoraCostos.jsx
import { useState } from 'react';
import { Calculator, DollarSign, Percent, Shield, Briefcase, Info } from 'lucide-react';

// Tasas AFP (comisión flujo, prima seguro)
const AFP_TASAS = {
  HABITAT:   { flujo: 0.0147, prima: 0.0137 },
  INTEGRA:   { flujo: 0.0155, prima: 0.0137 },
  PRIMA:     { flujo: 0.0160, prima: 0.0137 },
  PROFUTURO: { flujo: 0.0169, prima: 0.0137 },
};

// Porcentajes MYPE (50% de beneficios)
const ESSALUD = 0.09;
const CTS_MENSUAL = 0.0417;     // 1/24 ≈ 4.17%
const GRATIF_MENSUAL = 0.0417;
const VACACIONES_MENSUAL = 0.0417;
const SEGURO_VIDA = 0.0013;     // 0.13%

const fmt = (n) => new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function CalculadoraCostos() {
  const [sueldoBase, setSueldoBase] = useState(1700);
  const [comodato, setComodato] = useState(500);
  const [sistema, setSistema] = useState('ONP');        // 'ONP' o nombre de AFP
  const [afiliadoAntes2013, setAfiliadoAntes2013] = useState(true);

  const remBruta = sueldoBase + comodato;

  // Descuentos al trabajador
  let aporte = 0, comisionFlujo = 0, primaSeguro = 0;

  if (sistema === 'ONP') {
    aporte = remBruta * 0.13;
  } else if (AFP_TASAS[sistema]) {
    aporte = remBruta * 0.10;
    const tasas = AFP_TASAS[sistema];
    primaSeguro = remBruta * tasas.prima;
    comisionFlujo = afiliadoAntes2013 ? 0 : remBruta * tasas.flujo;
  }

  const totalDescuentos = aporte + comisionFlujo + primaSeguro;
  const sueldoNeto = remBruta - totalDescuentos;

  // Costo empresa
  const essalud = remBruta * ESSALUD;
  const cts = remBruta * CTS_MENSUAL;
  const gratif = remBruta * GRATIF_MENSUAL;
  const vac = remBruta * VACACIONES_MENSUAL;
  const segVida = remBruta * SEGURO_VIDA;

  const costoEmpresaMensual = remBruta + essalud + cts + gratif + vac + segVida;
  const costoSinBBSS = essalud;                     // solo EsSalud
  const costoConBBSS = essalud + cts + gratif + vac + segVida;

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 space-y-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-[#11284e] to-[#185FA5] rounded-2xl text-white shadow-xl shadow-blue-500/20">
            <Calculator size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#0B1527] tracking-tight">Calculadora de Costo Laboral</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Régimen MYPE · Beneficios al 50% · Proyección mensual</p>
          </div>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-50 shadow-xl shadow-blue-100/20 p-6 lg:p-8 space-y-8">
          
          {/* DATOS DE ENTRADA */}
          <div>
            <h3 className="text-sm font-black text-[#11284e] uppercase tracking-wide flex items-center gap-2 mb-5">
              <DollarSign size={18} className="text-[#185FA5]" /> Datos del Trabajador
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Sueldo Base (S/)</label>
                <input
                  type="number"
                  value={sueldoBase}
                  onChange={e => setSueldoBase(Number(e.target.value) || 0)}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Comodato (S/)</label>
                <input
                  type="number"
                  value={comodato}
                  onChange={e => setComodato(Number(e.target.value) || 0)}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Sistema Previsional</label>
                <select
                  value={sistema}
                  onChange={e => setSistema(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-bold"
                >
                  <option value="ONP">ONP (13%)</option>
                  <option value="HABITAT">AFP HABITAT</option>
                  <option value="INTEGRA">AFP INTEGRA</option>
                  <option value="PRIMA">AFP PRIMA</option>
                  <option value="PROFUTURO">AFP PROFUTURO</option>
                </select>
              </div>
              {sistema !== 'ONP' && (
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-3.5 w-full hover:border-blue-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={afiliadoAntes2013}
                      onChange={e => setAfiliadoAntes2013(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-gray-700">Afiliado antes de 2013</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* RESULTADOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Descuentos al trabajador */}
            <div className="bg-gradient-to-br from-red-50/80 to-white border border-red-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-red-800 text-sm uppercase flex items-center gap-2 mb-5">
                <Percent size={18} className="text-red-500" /> Descuentos al Trabajador
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remuneración Bruta</span>
                  <span className="font-mono font-bold text-gray-800">S/ {fmt(remBruta)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Aporte AFP / ONP</span>
                  <span className="font-mono text-red-600 font-bold">- S/ {fmt(aporte)}</span>
                </div>
                {comisionFlujo > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center gap-1">
                      Comisión Flujo AFP
                      <Info size={12} className="text-gray-400" />
                    </span>
                    <span className="font-mono text-red-600 font-bold">- S/ {fmt(comisionFlujo)}</span>
                  </div>
                )}
                {primaSeguro > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center gap-1">
                      Prima Seguro AFP
                      <Info size={12} className="text-gray-400" />
                    </span>
                    <span className="font-mono text-red-600 font-bold">- S/ {fmt(primaSeguro)}</span>
                  </div>
                )}
                <hr className="border-red-200 my-2" />
                <div className="flex justify-between items-center font-bold">
                  <span className="text-gray-800">Total Descuentos</span>
                  <span className="font-mono text-red-700 text-base">S/ {fmt(totalDescuentos)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-red-200">
                  <span className="text-base font-black text-red-900">Sueldo Neto</span>
                  <span className="font-mono text-lg font-black text-red-900">S/ {fmt(sueldoNeto)}</span>
                </div>
              </div>
            </div>

            {/* Costo Empresa */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-emerald-800 text-sm uppercase flex items-center gap-2 mb-5">
                <Briefcase size={18} className="text-emerald-600" /> Costo Empresa (MYPE)
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remuneración Bruta</span>
                  <span className="font-mono font-bold text-gray-800">S/ {fmt(remBruta)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">EsSalud (9%)</span>
                  <span className="font-mono text-emerald-600 font-bold">S/ {fmt(essalud)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">CTS (4.17%)</span>
                  <span className="font-mono text-emerald-600 font-bold">S/ {fmt(cts)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Gratificación (4.17%)</span>
                  <span className="font-mono text-emerald-600 font-bold">S/ {fmt(gratif)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Vacaciones (4.17%)</span>
                  <span className="font-mono text-emerald-600 font-bold">S/ {fmt(vac)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Seguro Vida Ley (0.13%)</span>
                  <span className="font-mono text-emerald-600 font-bold">S/ {fmt(segVida)}</span>
                </div>
                <hr className="border-emerald-200 my-2" />
                <div className="flex justify-between items-center font-bold text-base">
                  <span className="text-gray-800">Costo Empresa Mensual</span>
                  <span className="font-mono text-emerald-700 text-lg font-black">S/ {fmt(costoEmpresaMensual)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
                  <span>Costo adicional sin BBSS</span>
                  <span className="font-mono">S/ {fmt(costoSinBBSS)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Costo adicional con BBSS</span>
                  <span className="font-mono">S/ {fmt(costoConBBSS)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <Shield size={18} className="text-[#185FA5] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-gray-800">Régimen MYPE:</span> Los porcentajes de CTS, gratificación y vacaciones corresponden al 50% del régimen general según la Ley MYPE. 
              El costo empresa mensual incluye todos los beneficios sociales obligatorios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}