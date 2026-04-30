'use client';

import { useState } from 'react';

function KuentoLogo({ size = 76 }) {
  return (
    <img
      src="/kuento-logo.png"
      alt="Kuento"
      width={size}
      height={size}
      className="loginLogoImg"
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function LoginScreen({
  loginGoogle,
  loginEmail,
  registerEmail,
  resetPassword,
  loginBiometric,
  hasBiometric,
  biometricOk,
  loading,
  error,
  setError
}) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleEmailAction() {
    if (mode === 'register') {
      const ok = await registerEmail(email, password, name);
      if (ok) {
        alert('Te enviamos un correo para verificar tu cuenta. Revisá también la carpeta de spam o correo no deseado.');
      }
    } else {
      await loginEmail(email, password);
    }
  }

  async function handleReset() {
    const ok = await resetPassword(email);
    if (ok) alert('Te enviamos un correo para restablecer la contraseña. Revisá también spam o correo no deseado.');
  }

  return (
    <div className="loginPage">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        * {
          box-sizing: border-box;
        }

        .loginPage {
          width: 100%;
          min-height: 100dvh;
          background:
            radial-gradient(ellipse at 70% 0%, rgba(51,255,204,.14) 0%, transparent 50%),
            radial-gradient(ellipse at -10% 60%, rgba(51,235,195,.08) 0%, transparent 40%),
            #1A2F3C;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 38px 24px calc(env(safe-area-inset-bottom) + 24px);
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .loginLogoImg {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          object-fit: cover;
          display: block;
          box-shadow: 0 0 28px rgba(51,255,204,.18);
        }

        .loginLogo {
          border-radius: 20px;
          box-shadow: 0 0 36px rgba(51,255,204,.28);
          margin-bottom: 16px;
          overflow: hidden;
        }
        .loginTitle {
          font-size: 38px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -.06em;
          margin: 0 0 8px;
        }
        .loginTitle span { color: #33FFCC; }
        .loginSub {
          color: rgba(255,255,255,.58);
          font-size: 15px;
          text-align: center;
          line-height: 1.45;
          margin: 0 0 20px;
        }
        .loginCard {
          width: 100%;
          max-width: 380px;
          overflow: hidden;
          background: rgba(31,54,71,.78);
          border: 1px solid rgba(51,235,195,.12);
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 16px 48px rgba(0,0,0,.25);
        }
        .loginTabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 14px;
        }
        .loginTab {
          border: 1px solid rgba(51,235,195,.14);
          background: rgba(22,39,56,.7);
          color: rgba(255,255,255,.62);
          border-radius: 14px;
          padding: 11px;
          font-weight: 800;
          font-family: inherit;
        }
        .loginTab.on {
          background: rgba(51,235,195,.12);
          color: #33FFCC;
          border-color: rgba(51,255,204,.35);
        }
        .loginInput {
          display: block;
          width: 100%;
          max-width: 100%;
          background: #162738;
          color: #fff;
          border: 1px solid rgba(51,235,195,.15);
          border-radius: 15px;
          padding: 14px;
          font-size: 16px;
          font-family: inherit;
          outline: none;
          margin-bottom: 10px;
        }
        .loginInput:focus {
          border-color: #33EBC3;
          box-shadow: 0 0 0 3px rgba(51,235,195,.12);
        }
        .loginBtn {
          width: 100%;
          padding: 16px 18px;
          border-radius: 18px;
          border: 0;
          font-size: 16px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        .loginBtn:active { transform: scale(.98); }
        .loginBtn:disabled { opacity: .55; pointer-events: none; }
        .mainBtn {
          background: linear-gradient(135deg, #33EBC3, #33FFCC);
          color: #0a1e27;
          box-shadow: 0 8px 28px rgba(51,255,204,.22);
        }
        .googleBtn {
          background: #fff;
          color: #162738;
          box-shadow: 0 12px 30px rgba(0,0,0,.22);
        }
        .bioBtn {
          background: linear-gradient(135deg, rgba(51,235,195,.16), rgba(51,255,204,.08));
          color: #33FFCC;
          border: 1px solid rgba(51,255,204,.32);
          box-shadow: 0 0 22px rgba(51,255,204,.14);
        }
        .textBtn {
          background: transparent;
          border: 0;
          color: #33FFCC;
          font-weight: 800;
          font-family: inherit;
          margin-top: 10px;
        }
        .divider {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,.32);
          font-size: 13px;
          margin: 14px 0 4px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,.12);
        }
        .loginError {
          width: 100%;
          border: 1px solid rgba(255,87,87,.32);
          background: rgba(255,87,87,.12);
          color: #ff8585;
          border-radius: 15px;
          padding: 12px 14px;
          margin-bottom: 12px;
          text-align: center;
          font-size: 14px;
        }
        @media (max-width: 430px) {
          .loginPage { padding-left: 16px; padding-right: 16px; }
          .loginCard { max-width: 100%; padding: 14px; border-radius: 22px; }
          .loginTabs { gap: 8px; }
          .loginTab { padding: 11px 8px; }
        }

        .terms {
          max-width: 330px;
          text-align: center;
          font-size: 12px;
          color: rgba(255,255,255,.28);
          margin: 18px 0 0;
          line-height: 1.4;
        }
        .hint {
          color: rgba(255,255,255,.46);
          font-size: 12px;
          line-height: 1.4;
          text-align: center;
          margin-top: 10px;
        }
      `}</style>

      <div className="loginLogo"><KuentoLogo /></div>

      <h1 className="loginTitle">Kuen<span>to</span></h1>
      <p className="loginSub">Control de gastos con QR.<br/>Tus datos sincronizados en la nube.</p>

      <div className="loginCard">
        <div className="loginTabs">
          <button className={`loginTab ${mode === 'login' ? 'on' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
            Ingresar
          </button>
          <button className={`loginTab ${mode === 'register' ? 'on' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
            Crear cuenta
          </button>
        </div>

        {error && (
          <div className="loginError">
            {error}
            <button
              onClick={() => setError('')}
              style={{ marginLeft: 8, background: 'transparent', border: 0, color: '#ff8585', fontWeight: 900 }}
            >
              ✕
            </button>
          </div>
        )}

        {mode === 'register' && (
          <input
            className="loginInput"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre"
            autoComplete="name"
          />
        )}

        <input
          className="loginInput"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Correo electrónico"
          type="email"
          autoComplete="email"
        />

        <input
          className="loginInput"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />

        <button className="loginBtn mainBtn" onClick={handleEmailAction} disabled={loading}>
          {loading ? 'Procesando...' : mode === 'register' ? 'Crear cuenta con email' : 'Ingresar con email'}
        </button>

        {mode === 'register' && (
          <div className="hint">Te vamos a enviar un correo para verificar tu cuenta antes de usar la app. Revisá también spam o correo no deseado.</div>
        )}

        {mode === 'login' && (
          <button className="textBtn" onClick={handleReset} disabled={loading}>
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <div className="divider">o</div>

        {hasBiometric && biometricOk && (
          <button className="loginBtn bioBtn" onClick={loginBiometric} disabled={loading}>
            🔒 {loading ? 'Verificando...' : 'Entrar con Face ID / Huella'}
          </button>
        )}

        <button className="loginBtn googleBtn" onClick={loginGoogle} disabled={loading}>
          <GoogleIcon />
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>
      </div>

      <p className="terms">Al continuar aceptás que tus gastos se guarden de forma segura en tu cuenta.</p>
    </div>
  );
}
