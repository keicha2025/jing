import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Export for use in index.html
window.firebaseApp = app;
window.firebaseAuth = auth;
window.onAuthStateChanged = onAuthStateChanged;

console.log("Firebase Modular SDK Initialized");
