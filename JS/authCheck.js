



// JS/authCheck.js
// Single auth guard for all pages – no loops 🤍

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const auth = getAuth();

// ---------- PATH HELPERS ----------
const BASE = "/Eco-Files-FullStack";

function getPathInfo() {
  const path = window.location.pathname;

  const isDashboard =
    path === `${BASE}/` ||
    path === `${BASE}/index.html`;

  const isLogin =
    path.startsWith(`${BASE}/forms/eco-wellness`);

  return { path, isDashboard, isLogin };
}

const { isDashboard, isLogin } = getPathInfo();

// ---------- MAIN AUTH LISTENER ----------
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User is logged in:", user.email);

    // If user is logged in and sitting on login page -> send to dashboard
    if (isLogin) {
      window.location.replace(`${BASE}/`);
    }
  } else {
    console.log("❌ No user logged in");

    // If user is NOT logged in and on dashboard -> send to login
    if (isDashboard) {
      window.location.replace(`${BASE}/forms/eco-wellness/`);
    }
  }
});

// ---------- LOGOUT HELPER ----------
export function logoutUser() {
  console.log("🔓 Logging out user...");

  signOut(auth)
    .then(() => {
      console.log("✅ User signed out");
      window.location.replace(`${BASE}/forms/eco-wellness/`);
    })
    .catch((err) => {
      console.error("❌ Sign-out error", err);
    });
}

console.log("✅ authCheck.js loaded");


