// JS/authCheck.js — same logic, base-aware, and guarded (no redirect loops)

let __redirecting = false;
function go(path) {
  if (__redirecting) return;            // stop spam redirects
  __redirecting = true;
  location.replace(new URL(path, document.baseURI).href);
}

// Your original helpers (unchanged)
function isUserLoggedIn() {
  const currentUser = sessionStorage.getItem("docArchiveCurrentUser");
  console.log("Checking login status. Current user:", currentUser);
  return currentUser !== null && currentUser !== "";
}
function getCurrentUserEmail() {
  return sessionStorage.getItem("docArchiveCurrentUser");
}
function logoutUser() {
  sessionStorage.removeItem("docArchiveCurrentUser");
  sessionStorage.removeItem("loginSuccess");
  console.log("User logged out");
  go("forms/eco-wellness/index.html");
}

// Page detection (so we only redirect from the *right* page)
const BASE = "/Eco-Files-FullStack/";
const p = location.pathname;
const isDashboard = p.endsWith(BASE) || p.endsWith(BASE + "index.html");
const isLogin     = p.startsWith(BASE + "forms/eco-wellness/") &&
                    (p.endsWith("/") || p.endsWith("/index.html"));

// Keep your original intent, but scoped per page
function redirectIfLoggedIn() {
  const loginSuccess = sessionStorage.getItem("loginSuccess");
  if (isLogin && isUserLoggedIn() && loginSuccess === "true") {
    console.log("User already logged in, redirecting to home...");
    sessionStorage.removeItem("loginSuccess");
    go("index.html");
    return true;
  }
  return false;
}
function requireLogin() {
  console.log("requireLogin called");
  if (isDashboard && !isUserLoggedIn()) {
    console.log("User not logged in, redirecting to login page...");
    go("forms/eco-wellness/index.html");
    return false;
  }
  if (isDashboard) {
    sessionStorage.removeItem("loginSuccess"); // clear flag only on home
    console.log("User is logged in:", getCurrentUserEmail());
  }
  return true;
}

console.log("authCheck.js loaded. Current user:", getCurrentUserEmail());
