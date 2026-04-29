'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';

export function useExpenses(uid) {
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ budget: 0, alertPct: 80 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    setExpenses([]);

    if (!uid) {
      setReady(true);
      return;
    }

    const expRef = collection(db, 'users', uid, 'expenses');
    const q = query(expRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      snap => {
        setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        setReady(true);
      },
      () => setReady(true)
    );

    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const settingRef = doc(db, 'users', uid, 'settings', 'prefs');

    getDoc(settingRef).then(d => {
      if (d.exists()) setSettings(d.data());
      else setSettings({ budget: 0, alertPct: 80 });
    }).catch(() => {});
  }, [uid]);

  const addExpense = useCallback(async expense => {
    if (!uid) return;

    const { id, ...cleanExpense } = expense || {};
    await addDoc(collection(db, 'users', uid, 'expenses'), {
      ...cleanExpense,
      uid,
      createdAt: serverTimestamp()
    });
  }, [uid]);

  const removeExpense = useCallback(async id => {
    if (!uid || !id) return;
    await deleteDoc(doc(db, 'users', uid, 'expenses', String(id)));
  }, [uid]);

  const saveSettings = useCallback(async newSettings => {
    if (!uid) return;

    setSettings(newSettings);
    await setDoc(doc(db, 'users', uid, 'settings', 'prefs'), newSettings);
  }, [uid]);

  return {
    expenses,
    settings,
    ready,
    addExpense,
    removeExpense,
    saveSettings,
    setSettings
  };
}
