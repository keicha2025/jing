import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Note: In a real app, these would be in .env
// Given the prompt project ID 'gen-lang-client-0428297574'
// However, I will use placeholders that indicate they need to be replaced 
// or I can try to find existing firebase config if available.
// Since I'm creating a new project JING, I'll expect the user to provide these 
// or I'll use the provided Project ID to form a skeleton.

const firebaseConfig = {
    apiKey: "AIzaSyDFNKdGzAHeULoTfWOYatswKQmZ132FYVA",
    authDomain: "gen-lang-client-0428297574.firebaseapp.com",
    projectId: "gen-lang-client-0428297574",
    storageBucket: "gen-lang-client-0428297574.firebasestorage.app",
    messagingSenderId: "1082284355568",
    appId: "1:1082284355568:web:7ba5ed45794a68325f7735",
    measurementId: "G-3KNY88KK81"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, 'jing-finance');
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
