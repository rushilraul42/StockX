import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // ✅ Added GoogleAuthProvider
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlqX49jQ5JlKQAX4nC-uj2cW27rzX5_PM",
  authDomain: "stockx-70b72.firebaseapp.com",
  projectId: "stockx-70b72",
  storageBucket: "stockx-70b72.appspot.com",
  messagingSenderId: "787046154239",
  appId: "1:787046154239:web:701a196272ea46fbe671ca",
  measurementId: "G-G39JY97B8G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (only in browser)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { auth, db, analytics, googleProvider }; // ✅ Added googleProvider export
