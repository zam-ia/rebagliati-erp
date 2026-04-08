import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [correo,     setCorreo]     = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error,      setError]      = useState('');
  const [cargando,   setCargando]   = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (err) {
      setError('Correo o contraseña incorrectos.');
    } else {
      navigate('/dashboard');
    }
    setCargando(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f0f2f5' }}>

      {/* Panel izquierdo — marca */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12"
        style={{ background: '#11284e' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#1e4280' }}>
              <span className="text-sm font-bold" style={{ color: '#7eb3f5' }}>RD</span>
            </div>
            <div>
              <div className="text-white font-semibold text-base leading-tight">Rebagliati</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.3)', fontSize: 9 }}>
                Diplomados
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white leading-snug mb-4">
            Sistema de<br />Gestión ERP
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Plataforma integral para la administración académica, comercial y operativa de Rebagliati Diplomados SAC.
          </p>
        </div>

        {/* Módulos como lista */}
        <div className="space-y-3">
          {['Inscripciones y pagos','CRM de clientes','RRHH y planilla','Reportes en tiempo real'].map(m => (
            <div key={m} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7eb3f5' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo móvil */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#11284e' }}>
              <span className="text-xs font-bold text-white">RD</span>
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: '#11284e' }}>Rebagliati Diplomados</div>
              <div className="text-xs" style={{ color: '#94a3b8' }}>Sistema ERP</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: '#11284e' }}>Bienvenido</h2>
          <p className="text-sm mb-8" style={{ color: '#94a3b8' }}>
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Correo */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#64748b' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="ejecutiva@rebagliati.com"
                required
                className="w-full text-sm rounded-xl border outline-none transition-all"
                style={{
                  padding: '11px 14px',
                  borderColor: '#e2e8f0',
                  background: '#fff',
                  color: '#11284e',
                }}
                onFocus={e => e.target.style.borderColor = '#11284e'}
                onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#64748b' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full text-sm rounded-xl border outline-none transition-all pr-10"
                  style={{
                    padding: '11px 14px',
                    borderColor: '#e2e8f0',
                    background: '#fff',
                    color: '#11284e',
                  }}
                  onFocus={e => e.target.style.borderColor = '#11284e'}
                  onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: '#94a3b8' }}>
                  {showPass ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm px-4 py-3 rounded-xl"
                style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full text-sm font-semibold rounded-xl py-3 transition-all"
              style={{
                background: cargando ? '#64748b' : '#11284e',
                color: '#fff',
                letterSpacing: '.02em',
              }}>
              {cargando ? 'Verificando...' : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="text-center text-xs mt-8" style={{ color: '#cbd5e1' }}>
            Rebagliati Diplomados SAC · Lima, Perú
          </p>
        </div>
      </div>
    </div>
  );
}
