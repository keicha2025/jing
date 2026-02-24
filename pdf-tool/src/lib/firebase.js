import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDFNKdGzAHeULoTfWOYatswKQmZ132FYVA",
    authDomain: "gen-lang-client-0428297574.firebaseapp.com",
    projectId: "gen-lang-client-0428297574",
    storageBucket: "gen-lang-client-0428297574.firebasestorage.app",
    messagingSenderId: "1082284355568",
    appId: "1:1082284355568:web:a2cb4cd6d00c1e835f7735",
    measurementId: "G-44MYRJE7HD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
