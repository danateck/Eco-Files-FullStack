// JS/authCheck.js – Fixed version for GitHub Pages

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const auth = getAuth();

// -------- PATHS ON GITHUB PAGES --------
const ROOT_PATH = "/Eco-Files-FullStack/";
const LOGIN_PATH = "/Eco-Files-FullStack/forms/eco-wellness/";

function isOnLoginPage() {
  const path = window.location.pathname;
  // Check if path starts with login path OR is exactly login path
  return path === LOGIN_PATH || 
         path === LOGIN_PATH + "index.html" ||
         path.startsWith(LOGIN_PATH);
}

function isOnDashboard() {
  const path = window.location.pathname;
  // Check if on root or root/index.html
  return path === ROOT_PATH || 
         path === ROOT_PATH + "index.html";
}

// ---------- UPDATE HEADER USERNAME / EMAIL ----------
function paintUserHeader(user) {
  const label = document.getElementById("currentUserLabel");
  const mail = document.getElementById("currentUserEmail");

  if (!label && !mail) return;

  if (!user) {
    if (label) label.textContent = "שלום, אורח";
    if (mail) mail.textContent = "";
    return;
  }

  const email = user.email || "";
  const namePart = email.split("@")[0] || "משתמש";

  if (label) label.textContent = `שלום, ${namePart}`;
  if (mail) mail.textContent = email;
}

// Track if we've already redirected to prevent loops
let hasRedirected = false;

// ---------- MAIN AUTH LISTENER ----------
onAuthStateChanged(auth, (user) => {
  console.log(
    "🔍 Auth state changed:",
    "path =", window.location.pathname,
    "user =", user ? user.email : null,
    "hasRedirected =", hasRedirected
  );

  // Always try to paint username in header (if elements exist)
  paintUserHeader(user);

  if (user) {
    // ---------- USER LOGGED IN ----------
    console.log("✅ User logged in:", user.email);

    // If logged-in user is on the login page → send them to dashboard
    if (isOnLoginPage() && !hasRedirected) {
      console.log("➡ Logged-in user on login page, going to dashboard");
      hasRedirected = true;
      window.location.replace(ROOT_PATH);
      return;
    }
    
    // If on dashboard or other page, dispatch ready event
    if (isOnDashboard()) {
      console.log("✅ On dashboard, dispatching firebase-ready");
      window.dispatchEvent(new CustomEvent('firebase-ready'));
    }

  } else {
    // ---------- NO USER LOGGED IN ----------
    console.log("❌ No user logged in");

    // If not on login page → go there ONCE
    if (!isOnLoginPage() && !hasRedirected) {
      console.log("➡ Redirecting to login page…");
      hasRedirected = true;
      window.location.replace(LOGIN_PATH);
      return;
    } else {
      console.log("ℹ Already on login page or already redirected");
    }
  }
});

// ---------- OPTIONAL HELPERS FOR OTHER SCRIPTS ----------
export function isUserLoggedIn() {
  return !!auth.currentUser;
}

export function getCurrentUserEmail() {
  return auth.currentUser?.email ?? null;
}

export function logout() {
  hasRedirected = false; // Reset redirect flag
  return signOut(auth)
    .then(() => {
      console.log("✅ Logged out, going to login page");
      hasRedirected = true;
      window.location.replace(LOGIN_PATH);
    })
    .catch((err) => {
      console.error("❌ Error while logging out:", err);
    });
}

// Prevent multiple initializations
if (window._authCheckLoaded) {
  console.warn("⚠️ authCheck.js already loaded, skipping");
} else {
  window._authCheckLoaded = true;
  console.log("✅ authCheck.js loaded (fixed version)");
}