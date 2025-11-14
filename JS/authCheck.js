// authCheck.js
// Safer GitHub Pages auth guard: no redirect loops 💚

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const auth = getAuth();

// ===== PATH HELPERS (GitHub Pages) =====
const BASE = "/Eco-Files-FullStack"; // if you ever rename the repo, update this

const path = window.location.pathname;

// On GitHub Pages, dashboard is usually /Eco-Files-FullStack/ or /Eco-Files-FullStack/index.html
const isDashboard =
  path === `${BASE}/` ||
  path === `${BASE}/index.html` ||
  path === "/" ||
  path === "/index.html ";

// Login page is under /Eco-Files-FullStack/forms/eco-wellness/...
const isLoginPage = path.startsWith(`${BASE}/forms/eco-wellness`);

// ===== GLOBAL AUTH GUARD =====
// This runs once when Firebase knows if user is logged in or not
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User is logged in:", user.email);

    // If user is on LOGIN page while logged in → send to dashboard
    if (isLoginPage) {
      window.location.replace(`${BASE}/`);
    }
  } else {
    console.log("❌ User not logged in");

    // Only send to login if they’re on the DASHBOARD
    if (isDashboard) {
      window.location.replace(`${BASE}/forms/eco-wellness/`);
    }
  }
});

// ===== HELPERS =====
export function isUserLoggedIn() {
  const currentUser = auth.currentUser?.email?.toLowerCase() ?? "";
  return currentUser !== null && currentUser !== "";
}

export function getCurrentUserEmail() {
  return auth.currentUser?.email?.toLowerCase() ?? "";
}

// Logout function
export function logoutUser() {
  const authInstance = getAuth();
  const userEmail = authInstance.currentUser?.email ?? "Unknown";
  console.log(" Logging out user:", userEmail);

  signOut(authInstance)
    .then(() => {
      console.log("✅ User signed out successfully");
      // Go back to login page
      window.location.replace(`${BASE}/forms/eco-wellness/`);
    })
    .catch((error) => {
      console.error("❌ Error signing out:", error);
    });
}

// ===== OPTIONAL: page helpers (if you call them anywhere) =====
export function redirectIfLoggedIn() {
  // Only care about the login page
  if (!isLoginPage) return false;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ User already logged in, redirecting to dashboard:", user.email);
      window.location.replace(`${BASE}/`);
    }
  });

  return false;
}

export function requireLogin() {
  // Only guard the dashboard, not the login page
  if (isDashboard && !isLoginPage && !isUserLoggedIn()) {
    console.log("❌ User not logged in, redirecting to login...");
    window.location.replace(`${BASE}/forms/eco-wellness/`);
    return false;
  }

  if (isDashboard && isUserLoggedIn()) {
    sessionStorage.removeItem("loginSuccess");
    console.log("✅ User authenticated on dashboard:", getCurrentUserEmail());
  }

  return true;
}

console.log("✅ authCheck.js loaded");
