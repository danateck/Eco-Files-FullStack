// JS/authCheck.js — idempotent, base-aware, and guarded (no redirect loops)

// ---- single-load guard ----
if (!window.__authCheckInit) {
  window.__authCheckInit = true;

  // one-time redirect guard
  if (typeof window.__redirecting === 'undefined') window.__redirecting = false;

  // base-aware navigation helper (safe if called many times)
  if (typeof window.go !== 'function') {
    window.go = function (path) {
      if (window.__redirecting) return;      // stop spam redirects
      window.__redirecting = true;
      location.replace(new URL(path, document.baseURI).href);
    };
  }

  // ---- your original helpers (preserved) ----
  if (typeof window.isUserLoggedIn !== 'function') {
    window.isUserLoggedIn = function () {
      const currentUser = sessionStorage.getItem("docArchiveCurrentUser");
      console.log("Checking login status. Current user:", currentUser);
      return currentUser !== null && currentUser !== "";
    };
  }

  if (typeof window.getCurrentUserEmail !== 'function') {
    window.getCurrentUserEmail = function () {
      return sessionStorage.getItem("docArchiveCurrentUser");
    };
  }

  if (typeof window.logoutUser !== 'function') {
    window.logoutUser = function () {
      sessionStorage.removeItem("docArchiveCurrentUser");
      sessionStorage.removeItem("loginSuccess");
      console.log("User logged out");
      window.go("forms/eco-wellness/index.html");
    };
  }

  // page detection (so we redirect only from the right page)
  const BASE = "/Eco-Files-FullStack/";
  const p = location.pathname;
  const isDashboard =
    p.endsWith(BASE) || p.endsWith(BASE + "index.html");
  const isLogin =
    p.startsWith(BASE + "forms/eco-wellness/") &&
    (p.endsWith("/") || p.endsWith("/index.html"));

  // keep your intent, but scoped per page
  window.redirectIfLoggedIn = function () {
    const loginSuccess = sessionStorage.getItem("loginSuccess");
    if (isLogin && window.isUserLoggedIn() && loginSuccess === "true") {
      console.log("User already logged in, redirecting to home...");
      sessionStorage.removeItem("loginSuccess");
      window.go("index.html");
      return true;
    }
    return false;
  };

  window.requireLogin = function () {
    console.log("requireLogin called");
    if (isDashboard && !window.isUserLoggedIn()) {
      console.log("User not logged in, redirecting to login page...");
      //window.go("forms/eco-wellness/index.html");
      return false;
    }
    if (isDashboard) {
      sessionStorage.removeItem("loginSuccess"); // clear flag only on home
      console.log("User is logged in:", window.getCurrentUserEmail());
    }
    return true;
  };

  console.log("authCheck.js loaded. Current user:", window.getCurrentUserEmail());
}
