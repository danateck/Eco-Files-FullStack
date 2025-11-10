// authCheck.js
// FIXED: Prevents infinite redirect loops

// Check if user is logged in
function isUserLoggedIn() {
    const currentUser = sessionStorage.getItem("docArchiveCurrentUser");
    return currentUser !== null && currentUser !== "";
}

// Get current logged in user email
function getCurrentUserEmail() {
    return sessionStorage.getItem("docArchiveCurrentUser");
}

// Logout function
function logoutUser() {
    console.log("🚪 Logging out user:", getCurrentUserEmail());
    sessionStorage.removeItem("docArchiveCurrentUser");
    sessionStorage.removeItem("loginSuccess");
    // Redirect to login page
    window.location.replace("./forms/eco-wellness/index.html");
}

// For LOGIN PAGE: Redirect to home if already logged in
// ONLY checks once on page load, won't loop
function redirectIfLoggedIn() {
    // Prevent checking during active login attempt
    if (window.location.href.includes("index.html") && 
        document.getElementById("loginForm")) {
        
        const loginSuccess = sessionStorage.getItem("loginSuccess");
        
        // Only redirect if user is logged in AND login was successful
        if (isUserLoggedIn() && loginSuccess === "true") {
            console.log("✅ User already logged in, redirecting to dashboard...");
            sessionStorage.removeItem("loginSuccess"); // Clear flag
            window.location.replace("../../index.html");
            return true;
        }
    }
    return false;
}

// For HOME PAGE (Dashboard): Redirect to login if NOT logged in
// ONLY checks once on page load
function requireLogin() {
    // Only check if we're on the dashboard page
    if (window.location.pathname.endsWith("index.html") && 
        !window.location.pathname.includes("eco-wellness")) {
        
        if (!isUserLoggedIn()) {
            console.log("❌ User not logged in, redirecting to login...");
            window.location.replace("./forms/eco-wellness/index.html");
            return false;
        }
        
        // Clear the login success flag once on dashboard
        sessionStorage.removeItem("loginSuccess");
        console.log("✅ User authenticated:", getCurrentUserEmail());
        return true;
    }
    return true;
}

console.log("✅ authCheck.js loaded");