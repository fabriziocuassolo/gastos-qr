# Kuento - Firebase setup

Para que el login y la nube funcionen, configurá Firebase:

1. Entrá a https://console.firebase.google.com
2. Crear proyecto: `kuento`
3. Authentication → Sign-in method → habilitar Google
4. Firestore Database → crear base de datos
5. Project settings → Web app → copiar config
6. En Vercel → Project → Settings → Environment Variables, cargar:

NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

Reglas recomendadas de Firestore:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Importante:
- En Firebase Authentication → Settings → Authorized domains, agregá tu dominio de Vercel.
- Ejemplo: `tu-app.vercel.app`
