import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex font-sans bg-gradient-to-br from-slate-950 to-zinc-950 overflow-hidden">
      
      {/* PANEL IZQUIERDO: Identidad de Marca - Diseño VIP */}
      <div
        className="hidden lg:flex flex-col justify-between w-[460px] flex-shrink-0 p-16 relative overflow-hidden"
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

          {/* Título principal */}
          <div className="mb-8">
            <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tighter">
              Sistema ERP
            </h1>
            <p className="text-[#7eb3f5] text-4xl font-semibold tracking-tight mt-1">Rebagliati</p>
          </div>

          <p className="text-lg leading-relaxed max-w-[340px] text-white/80">
            Plataforma integral de gestión para inscripciones, finanzas, RRHH y operaciones.
          </p>
        </div>

        {/* Capacidades del sistema */}
        <div className="relative z-10 mt-auto">
          <div className="uppercase text-xs tracking-[0.1em] text-white/50 font-medium mb-6">Capacidades del sistema</div>
          <div className="space-y-6">
            {[
              'Gestión completa de inscripciones y pagos',
              'CRM avanzado y seguimiento de prospectos',
              'Administración profesional de RRHH y planillas',
              'Analítica en tiempo real y reportes ejecutivos'
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 group">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-[#7eb3f5] group-hover:scale-125 transition-transform" />
                <span className="text-white/90 text-[15px] leading-tight">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer sutil */}
        <div className="relative z-10 pt-12 border-t border-white/10 text-[10px] text-white/40 tracking-widest">
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
              Accede al sistema de gestión empresarial
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-7">
            {/* Campo Correo */}
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
                  placeholder="tu.correo@rebagliati.com"
                  required
                  className="w-full bg-white border border-gray-200 rounded-3xl pl-14 pr-6 py-4 text-base outline-none transition-all focus:border-[#185FA5] focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
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

            {/* Botón de Ingreso */}
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
                'Iniciar Sesión'
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