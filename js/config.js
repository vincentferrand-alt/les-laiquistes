// ============================================================
//  CONFIG — classement partagé (Firebase / Firestore)
//  Laisse à null pour un classement local (sur l'appareil uniquement).
//  Pour activer le classement en ligne, colle ici la config de ton
//  projet Firebase (console Firebase > Paramètres du projet > Vos applications).
//  Voir README.md, section « Classement en ligne ».
// ============================================================
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDJsiB1bN5OdrWSflLfk0V5FqzaqmTQvfE",
  authDomain: "les-laiquistes.firebaseapp.com",
  projectId: "les-laiquistes",
  storageBucket: "les-laiquistes.firebasestorage.app",
  messagingSenderId: "461388879896",
  appId: "1:461388879896:web:37fad393278dd15ed40b6d"
};

// Numéro de version affiché dans le menu. Pense à changer aussi VERSION dans sw.js
// à chaque mise en ligne (c'est ce qui déclenche le bandeau « Nouvelle version disponible »).
window.GAME_VERSION = '3.2.4';
/* Exemple :
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "les-laiquistes.firebaseapp.com",
  projectId: "les-laiquistes",
  storageBucket: "les-laiquistes.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
