import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 모바일 네트워크나 프록시에서 WebSocket 이 막히면 실시간 수신이 10초 가까이 지연된다.
// 자동 감지를 켜두면 그런 환경에서 long polling 으로 즉시 전환된다.
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});

export { app, db };
