// JS/authCheck.js
// Simple auth guard for GitHub Pages

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const auth = getAuth();

// Base path for your GitHub Pages repo
const BASE = "/Eco-Files-FullStack";

// Paths we care about
const DASHBOARD_PATHS = [
  `${BASE}/`,
  `${BASE}/index.html`,
];

const LOGIN_PREFIX = `${BASE}/forms/eco-wellness`;

const path = window.location.pathname;
const isDashboard = DASHBOARD_PATHS.includes(path);
const isLogin = path.startsWith(LOGIN_PREFIX);

console.log("🔎 authCheck route:", { path, isDashboard, isLogin });

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User is logged in:", user.email);

    // If user is on login while logged in → go to dashboard
    if (isLogin) {
      window.location.replace(`${BASE}/`);
    }
  } else {
    console.log("❌ No user logged in");

    // If user is on dashboard but NOT logged in → send to login
    if (isDashboard) {
      window.location.replace(`${LOGIN_PREFIX}/`);
    }
    // If already on login page: do nothing (no reload loop)
  }
});

// expose logout for buttons
export function logoutUser() {
  const userEmail = auth.currentUser?.email ?? "Unknown";
  console.log("🚪 Logging out:", userEmail);

  signOut(auth)
    .then(() => {
      console.log("✅ Signed out");
      window.location.replace(`${LOGIN_PREFIX}/`);
    })
    .catch((err) => {
      console.error("❌ Error during logout", err);
    });
}

console.log("✅ authCheck.js loaded");
