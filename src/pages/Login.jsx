import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/');
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });

      if (authError) throw new Error('Las credenciales ingresadas no son validas.');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] px-5 py-8 text-[#020873]">
      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(2,8,115,.10)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden border-r border-slate-100 bg-[#F2F2F2] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <img src="/logo-ui.png" alt="Rebagliati Diplomados" className="brand-logo-panel object-contain" />
            <div className="mt-12 max-w-md">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#05C7F2]">ERP Corporativo</p>
              <h1 className="mt-4 text-5xl font-medium leading-tight tracking-tight text-[#020873]">
                Operacion clara, datos al dia.
              </h1>
              <p className="mt-5 text-[15px] leading-7 text-slate-600">
                Un entorno limpio para controlar ventas, caja, finanzas, marketing, RRHH y logistica sin ruido visual.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ['Ventas', 'Ranking y metas'],
              ['Caja', 'Cuadre diario'],
              ['Finanzas', 'Margen real'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white bg-white/70 p-4">
                <p className="text-sm font-medium text-[#020873]">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-10 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#020873] text-white shadow-[0_14px_34px_rgba(2,8,115,.20)]">
                <ShieldCheck size={32} />
              </div>
              <img src="/logo-ui.png" alt="Rebagliati Diplomados" className="brand-logo-login mx-auto mb-5 object-contain lg:hidden" />
              <h2 className="text-3xl font-medium tracking-tight text-[#020873]">Iniciar sesion</h2>
              <p className="mt-2 text-sm text-slate-500">Ingresa con tu cuenta institucional.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block">
                <span className="erp-label">Correo institucional</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    placeholder="correo@rebagliati.com"
                    required
                    className="erp-input rounded-2xl py-3.5 pl-12"
                  />
                </div>
              </label>

              <label className="block">
                <span className="erp-label">Contrasena</span>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                    placeholder="Ingresa tu contrasena"
                    required
                    className="erp-input rounded-2xl py-3.5 pl-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#020873]"
                    aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={cargando} className="btn-apple-primary w-full py-4">
                {cargando ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Verificando
                  </>
                ) : (
                  'Entrar al sistema'
                )}
              </button>
            </form>

            <p className="mt-10 text-center text-xs text-slate-400">
              Rebagliati Diplomados SAC - Sistema ERP
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
