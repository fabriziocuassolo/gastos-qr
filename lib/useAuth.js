'use client';

import { useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

const WA_KEY = 'kuento_webauthn_credential';

function isBiometricSupported() {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

async function checkBiometricAvailable() {
  if (!isBiometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

async function registerBiometric(uid, displayName) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(uid);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Kuento', id: location.hostname },
      user: { id: userId, name: uid, displayName: displayName || 'Usuario Kuento' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    }
  });

  if (!credential) throw new Error('No se creó la credencial biométrica');

  localStorage.setItem(WA_KEY, JSON.stringify({
    rawId: bytesToBase64(credential.rawId),
    uid
  }));

  return true;
}

async function assertBiometric() {
  const stored = JSON.parse(localStorage.getItem(WA_KEY) || 'null');
  if (!stored) return null;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const rawIdBytes = base64ToBytes(stored.rawId);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: rawIdBytes }],
      userVerification: 'required',
      timeout: 60000
    }
  });

  return assertion ? stored.uid : null;
}

function friendlyError(e) {
  const code = e?.code || '';
  if (code === 'auth/email-already-in-use') return 'Ese correo ya está registrado.';
  if (code === 'auth/invalid-email') return 'El correo no tiene un formato válido.';
  if (code === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Correo o contraseña incorrectos.';
  if (code === 'auth/popup-closed-by-user') return '';
  return 'Ocurrió un error. Revisá la configuración de Firebase.';
}

export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricOk, setBiometricOk] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    const unsub = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser || null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    checkBiometricAvailable().then(ok => {
      setBiometricOk(ok);
      setHasBiometric(!!localStorage.getItem(WA_KEY));
    });
  }, []);

  async function loginGoogle() {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);

      if (biometricOk && !localStorage.getItem(WA_KEY)) {
        try {
          await registerBiometric(result.user.uid, result.user.displayName);
          setHasBiometric(true);
        } catch {
          // Biométrico opcional: no bloquea el login.
        }
      }
    } catch (e) {
      const msg = friendlyError(e);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function registerEmail(email, password, displayName = '') {
    setLoading(true);
    setError('');
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }
      await sendEmailVerification(result.user);
      setUser({ ...result.user });
      return true;
    } catch (e) {
      setError(friendlyError(e));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function loginEmail(email, password) {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await result.user.reload();
      setUser(auth.currentUser);
      return true;
    } catch (e) {
      setError(friendlyError(e));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(email) {
    setLoading(true);
    setError('');
    try {
      if (!email?.trim()) {
        setError('Ingresá tu correo para restablecer la contraseña.');
        return false;
      }
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (e) {
      setError(friendlyError(e));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setLoading(true);
    setError('');
    try {
      if (!auth.currentUser) return false;
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (e) {
      setError('No se pudo reenviar el correo de verificación.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser(auth.currentUser);
  }

  async function loginBiometric() {
    setLoading(true);
    setError('');
    try {
      const uid = await assertBiometric();
      if (!uid) throw new Error('Verificación fallida');

      if (auth.currentUser && auth.currentUser.uid === uid) {
        setUser(auth.currentUser);
      } else {
        setError('Sesión expirada. Ingresá con Google o email una vez más.');
      }
    } catch {
      setError('No se pudo usar Face ID / Touch ID.');
    } finally {
      setLoading(false);
    }
  }

  async function enableBiometric() {
    if (!user) return false;
    setLoading(true);
    setError('');
    try {
      await registerBiometric(user.uid, user.displayName);
      setHasBiometric(true);
      return true;
    } catch {
      setError('No se pudo activar Face ID / Touch ID en este dispositivo.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  return {
    user,
    loading,
    error,
    biometricOk,
    hasBiometric,
    loginGoogle,
    loginEmail,
    registerEmail,
    resetPassword,
    resendVerification,
    refreshUser,
    loginBiometric,
    enableBiometric,
    logout,
    setError
  };
}
