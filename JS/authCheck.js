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
  return path === LOGIN_PATH || 
         path === LOGIN_PATH + "index.html" ||
         path.startsWith(LOGIN_PATH);
}

function isOnDashboard() {
  const path = window.location.pathname;
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

// ---------- MAIN AUTH LISTENER ----------
onAuthStateChanged(auth, (user) => {
  console.log(
    "🔍 Auth state changed:",
    "path =", window.location.pathname,
    "user =", user ? user.email : null
  );

  // Always try to paint username in header (if elements exist)
  paintUserHeader(user);

  if (user) {
    // ---------- USER LOGGED IN ----------
    console.log("✅ User logged in:", user.email);

    // If logged-in user is on the login page → send them to dashboard
    if (isOnLoginPage()) {
      console.log("➡ Logged-in user on login page, going to dashboard");
      setTimeout(() => {
        window.location.replace(ROOT_PATH);
      }, 100);
      return;
    }
    
    // If on dashboard, dispatch ready event and boot app
    if (isOnDashboard()) {
      console.log("✅ On dashboard, dispatching firebase-ready and booting app");
      window.dispatchEvent(new CustomEvent('firebase-ready'));
      
      // Give main.js time to load, then boot
      setTimeout(() => {
        if (typeof window.bootFromCloud === 'function') {
          console.log("🚀 Calling bootFromCloud");
          window.bootFromCloud();
        } else {
          console.warn("⚠️ bootFromCloud not found");
        }
      }, 200);
    }

  } else {
    // ---------- NO USER LOGGED IN ----------
    console.log("❌ No user logged in");

    // If not on login page → go there
    if (!isOnLoginPage()) {
      console.log("➡ Redirecting to login page…");
      setTimeout(() => {
        window.location.replace(LOGIN_PATH);
      }, 100);
    } else {
      console.log("ℹ Already on login page");
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
  console.log("🚪 Logout initiated");
  return signOut(auth)
    .then(() => {
      console.log("✅ Signed out successfully");
      // Force redirect to login after a brief delay
      setTimeout(() => {
        window.location.href = LOGIN_PATH;
      }, 100);
    })
    .catch((err) => {
      console.error("❌ Error while logging out:", err);
    });
}

console.log("✅ authCheck.js loaded");