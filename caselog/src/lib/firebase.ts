import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    projectId: "gen-lang-client-0428297574",
    appId: "1:1082284355568:web:a2cb4cd6d00c1e835f7735",
    storageBucket: "gen-lang-client-0428297574.firebasestorage.app",
    apiKey: "AIzaSyDFNKdGzAHeULoTfWOYatswKQmZ132FYVA",
    authDomain: "gen-lang-client-0428297574.firebaseapp.com",
    messagingSenderId: "1082284355568",
    measurementId: "G-44MYRJE7HD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the named database using the string option
const db = getFirestore(app, "case-log");

// Enable Offline Persistence
if (typeof window !== 'undefined') {
    import('firebase/firestore').then(({ enableIndexedDbPersistence }) => {
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a a time.
                console.warn('Persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                // The current browser does not support all of the features required to enable persistence
                console.warn('Persistence failed: Browser not supported');
            }
        });
    });
}

const auth = getAuth(app);

export { app, db, auth };
