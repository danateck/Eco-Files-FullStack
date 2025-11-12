// authCheck.js
// FIXED: Prevents infinite redirect loops


import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";


const auth = getAuth();

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    console.log("✅ User is logged in:", user.email);
    // Redirect to dashboard
    if (window.location.pathname.includes("index.html")) {
window.location.replace("/Eco-Files-FullStack/");
    }
  } else {
    // User is signed out
    console.log("❌ User not logged in");
    if (!window.location.pathname.includes("login.html")) {
window.location.replace("/Eco-Files-FullStack/forms/eco-wellness/");
    }
  }
});



// Check if user is logged in
function isUserLoggedIn() {
    const currentUser = auth.currentUser?.email?.toLowerCase() ?? "";
    return currentUser !== null && currentUser !== "";
}

// Get current logged in user email
function getCurrentUserEmail() {
    return auth.currentUser?.email?.toLowerCase() ?? "";
}

// Logout function
function logoutUser() {
    const auth = getAuth();
    const userEmail = auth.currentUser?.email ?? "Unknown";
    console.log("🚪 Logging out user:", userEmail);

    signOut(auth)
        .then(() => {
            console.log("✅ User signed out successfully");
            // Redirect to login page
            window.location.replace("./forms/eco-wellness/index.html");
        })
        .catch((error) => {
            console.error("❌ Error signing out:", error);
        });
}

// For LOGIN PAGE: Redirect to home if already logged in
// ONLY checks once on page load, won't loop
function redirectIfLoggedIn() {
    // Prevent checking during active login attempt
    if (window.location.href.includes("index.html") && 
        document.getElementById("loginForm")) {
        
       onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in, redirect to dashboard
        console.log("✅ User already logged in, redirecting to dashboard:", user.email);
        if (!window.location.pathname.includes("index.html")) {
window.location.replace("/Eco-Files-FullStack/");
        }
    } else {
        // User not logged in, redirect to login page
        console.log("❌ No user logged in, redirecting to login page");
        if (!window.location.pathname.includes("login.html")) {
window.location.replace("/Eco-Files-FullStack/forms/eco-wellness/");
        }
    }
});

    }
    return false;
}

// For HOME PAGE (Dashboard): Redirect to login if NOT logged in
// ONLY checks once on page load
function requireLogin() {
    const path = window.location.pathname;
    const isDashboard = path.endsWith("/index.html") || path === "/" || path === "/index.html";
    const isLoginPage = path.includes("eco-wellness");
    
    // Only check auth on the dashboard page, not login page
    if (isDashboard && !isLoginPage) {
        if (!isUserLoggedIn()) {
            console.log("❌ User not logged in, redirecting to login...");
            window.location.replace("./forms/eco-wellness/index.html");
            return false;
        }
        
        // Clear the login success flag once on dashboard
        sessionStorage.removeItem("loginSuccess");
        console.log("✅ User authenticated on dashboard:", getCurrentUserEmail());
        return true;
    }
    return true;
}

console.log("✅ authCheck.js loaded");