import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCyp2RQN0HCcXp43Ef_3L_GVVhzni6oMo0",
  authDomain: "job-automation-11d95.firebaseapp.com",
  projectId: "job-automation-11d95",
  storageBucket: "job-automation-11d95.firebasestorage.app",
  messagingSenderId: "228417178332",
  appId: "1:228417178332:web:aceebad910a5fbae5a8219",
  measurementId: "G-6YCC569XJX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
