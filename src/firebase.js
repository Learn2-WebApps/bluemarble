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

// 모바일에서는 WebSocket 이 연결만 되고 데이터가 흐르지 않는 경우가 있어 자동 감지가
// 실패했다. 매번 가능 여부를 재보는 대신 처음부터 long polling 으로 고정한다.
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export { app, db };
