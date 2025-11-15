// Firebase Configuration with Auth Support
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  initializeFirestore, collection, addDoc, getDoc, getDocs, doc, query, where,
  updateDoc, setDoc, arrayUnion, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPr4X2_8JYCgXzMlTcVB0EJLhup9CdyYw",
  authDomain: "login-page-echo-file.firebaseapp.com",
  databaseURL: "https://login-page-echo-file-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "login-page-echo-file",
  storageBucket: "login-page-echo-file.appspot.com",
  messagingSenderId: "200723524735",
  appId: "1:200723524735:web:9eaed6ef10cbc2c406234a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  useFetchStreams: false
});
const storage = getStorage(app);

// Bundle Firestore+Storage helpers
const fs = {
  // Firestore
  collection, addDoc, getDoc, getDocs, doc, query, where,
  updateDoc, setDoc, arrayUnion, onSnapshot,
  // Storage
  ref, uploadBytes, getDownloadURL, deleteObject
};

// Expose globals for main.js
window.app = app;
window.auth = auth;
window.db = db;
window.storage = storage;
window.fs = fs;

// Helper function to get current user
window.getCurrentUser = function() {
  return auth.currentUser?.email || null;
};

// Dispatch ready event
window.dispatchEvent(new Event("firebase-ready"));

console.log("✅ Firebase config loaded");

// Export for ES modules
export { app, auth, db, storage, fs };