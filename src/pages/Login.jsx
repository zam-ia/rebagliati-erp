import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle, TrendingUp, Clock, BarChart3 } from 'lucide-react';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  // EFECTO: Si ya hay sesión activa, saltar el login
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/');
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });

      if (authError) throw new Error('Las credenciales ingresadas no son válidas.');
      
      // Redirección exitosa al Dashboard
      navigate('/'); 
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Mensaje dinámico según hora del día
  const getMensajeHora = () => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) {
      return {
        titular: 'Empieza el día con control total',
        subtitulo: 'Toda tu operación lista para arrancar.',
        icono: <Clock size={16} className="text-amber-400" />
      };
    } else if (hora >= 12 && hora < 18) {
      return {
        titular: 'Mantén el ritmo de tu negocio',
        subtitulo: 'Decisiones rápidas, resultados claros.',
        icono: <TrendingUp size={16} className="text-emerald-400" />
      };
    } else {
      return {
        titular: 'Cierra el día con claridad',
        subtitulo: 'Revisa, controla y prepárate para mañana.',
        icono: <BarChart3 size={16} className="text-indigo-400" />
      };
    }
  };

  const mensajeHora = getMensajeHora();

  return (
    <div className="min-h-screen flex font-sans bg-gradient-to-br from-slate-950 to-zinc-950 overflow-hidden">
      
      {/* PANEL IZQUIERDO: Identidad de Marca - Diseño VIP */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-16 relative overflow-hidden"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(10, 25, 48, 0.92), rgba(10, 25, 48, 0.96)), url('/fondo.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Efectos de luz premium */}
        <div className="absolute inset-0 bg-[radial-gradient(at_top_right,#185FA5_0%,transparent_60%)] opacity-30" />
        <div className="absolute top-12 -right-20 w-96 h-96 bg-[#185FA5] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute bottom-40 left-10 w-64 h-64 bg-blue-600 opacity-5 blur-[100px] rounded-full" />
        
        <div className="relative z-10">
          {/* Logo y Marca */}
          <div className="flex items-center gap-4 mb-16">
            <div 
              className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-950/50"
              style={{ 
                background: 'linear-gradient(135deg, #185FA5 0%, #0a1930 100%)',
                border: '2px solid rgba(255,255,255,0.15)'
              }}
            >
              <span className="text-2xl font-black text-white tracking-tighter">RD</span>
            </div>
            <div>
              <div className="text-white font-black text-3xl tracking-[-0.02em] leading-none">REBAGLIATI</div>
              <div className="text-xs uppercase tracking-[0.125em] text-[#7eb3f5] font-medium mt-1">Diplomados</div>
            </div>
          </div>

          {/* Título principal - Mejorado con hook emocional */}
          <div className="mb-6">
            <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tighter">
              Sistema ERP
            </h1>
            <p className="text-[#7eb3f5] text-4xl font-semibold tracking-tight mt-1">Rebagliati</p>
          </div>

          {/* Subtítulo con beneficio - NUEVO */}
          <p className="text-xl leading-relaxed max-w-[360px] text-white/90 font-medium">
            Controla tu operación. Decide con datos. Crece sin caos.
          </p>
          
          <p className="text-sm leading-relaxed max-w-[340px] text-white/60 mt-3">
            Plataforma diseñada para centralizar y optimizar cada área de tu empresa, sin complicaciones.
          </p>
        </div>

        {/* Beneficios percibidos (antes "capacidades") - MEJORADO */}
        <div className="relative z-10 mt-auto">
          <div className="uppercase text-xs tracking-[0.1em] text-white/50 font-medium mb-6">Lo que puedes hacer aquí</div>
          <div className="space-y-5">
            {[
              { icon: <CheckCircle size={16} />, texto: 'Evita errores en inscripciones y pagos' },
              { icon: <TrendingUp size={16} />, texto: 'No pierdas prospectos en el seguimiento' },
              { icon: <ShieldCheck size={16} />, texto: 'Ten tu planilla siempre bajo control' },
              { icon: <BarChart3 size={16} />, texto: 'Toma decisiones sin adivinar' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 group cursor-default">
                <div className="mt-0.5 text-[#7eb3f5] group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span className="text-white/90 text-[15px] leading-tight group-hover:text-white transition-colors">
                  {item.texto}
                </span>
              </div>
            ))}
          </div>

          {/* Métrica de confianza - NUEVO */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#7eb3f5]">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-white font-bold text-lg">+10,000</p>
                <p className="text-white/50 text-xs uppercase tracking-wider">Procesos gestionados sin errores</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje vivo según hora - NUEVO */}
        <div className="relative z-10 pt-8 border-t border-white/10">
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-5 py-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              {mensajeHora.icono}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{mensajeHora.titular}</p>
              <p className="text-white/50 text-xs">{mensajeHora.subtitulo}</p>
            </div>
          </div>
        </div>

        {/* Footer sutil */}
        <div className="relative z-10 pt-8 text-[10px] text-white/40 tracking-widest">
          Rebagliati Diplomados SAC • 2026
        </div>
      </div>

      {/* PANEL DERECHO: Formulario de Login - Diseño VIP */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white relative">
        {/* Decoración sutil en el fondo */}
        <div className="absolute inset-0 bg-[radial-gradient(at_bottom_right,#185FA5_0%,transparent_70%)] opacity-[0.015]" />

        <div className="w-full max-w-[420px] relative">
          {/* Cabecera del formulario */}
          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#185FA5] to-blue-800 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-900/30">
                <ShieldCheck size={42} className="text-white" />
              </div>
            </div>
            
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight">Iniciar Sesión</h2>
            <p className="mt-3 text-gray-500 text-[15px]">
              Accede a toda tu operación en segundos
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-7">
            {/* Campo Correo - Microcopy mejorado */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2.5 tracking-widest uppercase">
                Correo Institucional
              </label>
              <div className="relative group">
                <Mail 
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#185FA5] transition-colors" 
                  size={20} 
                />
                <input
                  type="email"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  placeholder="Ingresa tu correo de trabajo"
                  required
                  className="w-full bg-white border border-gray-200 rounded-3xl pl-14 pr-6 py-4 text-base outline-none transition-all focus:border-[#185FA5] focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Campo Contraseña - Microcopy mejorado */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2.5 tracking-widest uppercase">
                Contraseña
              </label>
              <div className="relative group">
                <Lock 
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#185FA5] transition-colors" 
                  size={20} 
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-white border border-gray-200 rounded-3xl pl-14 pr-14 py-4 text-base outline-none transition-all focus:border-[#185FA5] focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-5 py-4 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón de Ingreso - Microcopy mejorado */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-4 bg-gradient-to-r from-[#0a1930] via-[#185FA5] to-[#0a1930] hover:from-[#185FA5] hover:via-[#0a1930] hover:to-[#185FA5] text-white font-semibold text-base py-4.5 rounded-3xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-blue-900/30 active:scale-[0.985] disabled:opacity-70"
            >
              {cargando ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                'Entrar al sistema'
              )}
            </button>
          </form>

          {/* Pie de página */}
          <div className="mt-16 text-center">
            <p className="text-xs text-gray-400 tracking-widest">
              Rebagliati Diplomados SAC • 2026
            </p>
            <p className="text-[10px] text-gray-300 mt-1">Sistema de Gestión Empresarial v2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}