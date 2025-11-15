// JS/authCheck.js – Fixed version

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

// ✅ NEW: Wait for DOM to be ready
function waitForDOM() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

// ✅ NEW: Wait for bootFromCloud to be defined
function waitForBootFunction() {
  return new Promise((resolve) => {
    const check = () => {
      if (typeof window.bootFromCloud === 'function') {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

// ---------- MAIN AUTH LISTENER ----------
onAuthStateChanged(auth, async (user) => {
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
    
    // If on dashboard, wait for DOM and boot app
    if (isOnDashboard()) {
      console.log("✅ On dashboard, waiting for DOM and functions...");
      
      // ✅ WAIT for DOM to be ready
      await waitForDOM();
      console.log("✅ DOM ready");
      
      // ✅ Dispatch firebase-ready event
      window.dispatchEvent(new CustomEvent('firebase-ready'));
      
      // ✅ WAIT for bootFromCloud to be defined
      await waitForBootFunction();
      console.log("✅ bootFromCloud function ready");
      
      // ✅ NOW call boot
      console.log("🚀 Calling bootFromCloud");
      window.bootFromCloud();
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
      setTimeout(() => {
        window.location.href = LOGIN_PATH;
      }, 100);
    })
    .catch((err) => {
      console.error("❌ Error while logging out:", err);
    });
}

console.log("✅ authCheck.js loaded");