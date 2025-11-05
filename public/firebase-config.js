// firebase-config.js (ESM)
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  collection, addDoc, getDoc, getDocs, doc, query, where,
  updateDoc, setDoc, arrayUnion, onSnapshot
} from "firebase/firestore";       // <-- Firestore stuff comes from here!
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";          // <-- Storage stuff comes from here!

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
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  useFetchStreams: false
});
const storage = getStorage(app);

// Bundle Firestore+Storage helpers as your app expects
const fs = {
  // Firestore
  collection, addDoc, getDoc, getDocs, doc, query, where,
  updateDoc, setDoc, arrayUnion, onSnapshot,
  // Storage
  ref, uploadBytes, getDownloadURL, deleteObject
};

// Expose globals for main.js
window.app = app;
window.db = db;
window.storage = storage;
window.fs = fs;

// Optional: allow main.js to wait if needed
window.dispatchEvent(new Event("firebase-ready"));

// Also export (handy if you import this module elsewhere)
export { app, db, storage, fs };
