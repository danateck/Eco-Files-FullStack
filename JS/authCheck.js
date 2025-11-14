// JS/authCheck.js
// Simple auth guard for GitHub Pages (no redirect loops)

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const auth = getAuth();

// Your GitHub Pages base
const BASE = "/Eco-Files-FullStack";

function getRouteInfo() {
  const path = window.location.pathname;

  const isDashboard =
    path === `${BASE}/` ||
    path === `${BASE}/index.html`;

  const isLogin =
    path === `${BASE}/forms/eco-wellness/` ||
    path === `${BASE}/forms/eco-wellness/index.html` ||
    path.startsWith(`${BASE}/forms/eco-wellness`);

  return { path, isDashboard, isLogin };
}

const { path, isDashboard, isLogin } = getRouteInfo();
console.log("🔎 authCheck route:", { path, isDashboard, isLogin });

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User is logged in:", user.email);

    // If user is logged in and still on the LOGIN page → send to dashboard
    if (isLogin) {
      window.location.replace(`${BASE}/`);
    }
  } else {
    console.log("❌ No user logged in");

    // If user is NOT logged in and is trying to see the DASHBOARD → send to login
    if (isDashboard) {
      window.location.replace(`${BASE}/forms/eco-wellness/`);
    }
    // If we’re already on the login page, do nothing (no spam reload)
  }
});

// Expose logout for buttons on the dashboard
export function logoutUser() {
  const userEmail = auth.currentUser?.email ?? "Unknown";
  console.log("🚪 Logging out:", userEmail);

  signOut(auth)
    .then(() => {
      console.log("✅ Signed out");
      window.location.replace(`${BASE}/forms/eco-wellness/`);
    })
    .catch((err) => {
      console.error("❌ Error during logout", err);
    });
}

console.log("✅ authCheck.js loaded");
